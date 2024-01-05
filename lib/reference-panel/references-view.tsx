import { CompositeDisposable, TextEditor } from 'atom';
import { Minimatch } from 'minimatch';
import etch from 'etch';
import Path from 'path';
import cx from 'classnames';

import ReferenceGroupView from './reference-group-view';
import * as console from '../console';

import type { Reference } from 'atom-ide-base';
import type { EtchComponent } from 'etch';

function isEtchComponent(el: unknown): el is EtchComponent {
  if (!el) return false;
  if (typeof el !== 'object') return false;
  return ('refs' in el) && ('element' in el);
}

function pluralize(singular: string, plural: string, count: number) {
  return count > 1 ? plural : singular;
}

function describeReferences(referenceCount: number, fileCount: number, symbolName: string) {
  return (
    <span ref="previewCount" className="preview-count inline-block">
      {referenceCount} {pluralize('result', 'results', referenceCount)} found in {fileCount} {pluralize('file', 'files', fileCount)} for {' '}
      <span className="highlight-info">{symbolName}</span>
    </span>
  );
}

function descendsFromAny(filePath: string, projectPaths: string[]): string | false {
  for (let projectPath of projectPaths) {
    if (descendsFrom(filePath, projectPath)) return projectPath;
  }
  return false;
}

function descendsFrom(filePath: string, projectPath: string) {
  if (typeof filePath !== 'string') return false;
  return filePath.startsWith(
    projectPath.endsWith(Path.sep) ? projectPath : `${projectPath}${Path.sep}`
  );
}

function matchesIgnoredNames(filePath: string, ignoredNames: Minimatch[]) {
  let repositories = atom.project.getRepositories();
  if (repositories.some(r => r.isPathIgnored(filePath))) return true;
  return ignoredNames.some(ig => {
    let result = ig.match(filePath);
    // if (result) {
    //   console.log('file', filePath, 'matches ignore pattern:', ig);
    // }
    return result;
  });
}

type SplitDirection = 'left' | 'right' | 'up' | 'down' | 'none';
type FormalSplitDirection = 'left' | 'right' | 'up' | 'down' | undefined;

type ReferencesViewProperties = {
  ref?: string,
  references: Reference[],
  symbolName: string
};

let lastReferences: { references: Reference[], symbolName: string } = {
  references: [],
  symbolName: ''
};

function getOppositeSplit(split: SplitDirection): FormalSplitDirection {
  return {
    left: 'right',
    right: 'left',
    down: 'up',
    up: 'down',
    none: undefined
  }[split] as FormalSplitDirection;
}

export default class ReferencesView {
  static URI = "atom://pulsar-find-references/results";

  static instances: Set<ReferencesView> = new Set();

  static setReferences(references: Reference[], symbolName: string) {
    console.log('ReferencesPaneView.setReferences:', references);
    lastReferences = { references, symbolName };

    for (let instance of ReferencesView.instances) {
      instance.update(lastReferences);
    }
  }

  private subscriptions: CompositeDisposable = new CompositeDisposable();
  private references: Reference[];
  private symbolName: string;
  private ignoredNameMatchers: Minimatch[] | null = null;
  private splitDirection: SplitDirection = 'none';

  private filteredAndGroupedReferences!: Map<string, Reference[]>;

  private activeNavigationIndex: number = -1;
  private lastNavigationIndex: number = -1;

  private collapsedIndices: Set<number> = new Set();

  private pinned: boolean = false;

  private previewStyle: { fontFamily: string } = { fontFamily: '' };

  public element!: HTMLElement;
  public refs!: { [key: string]: HTMLElement };

  constructor() {
    ReferencesView.instances.add(this);
    this.references = lastReferences.references;
    this.symbolName = lastReferences.symbolName;
    console.debug('ReferencesView constructor:', this.references, this.symbolName);

    if (!this.references) {
      throw new Error(`No references!`);
    }

    this.filterAndGroupReferences();

    etch.initialize(this);

    this.element.addEventListener('mousedown', this.handleClick.bind(this));

    this.subscriptions.add(
      atom.config.observe('editor.fontFamily', this.fontFamilyChanged.bind(this)),
      atom.config.observe('core.ignoredNames', this.ignoredNamesChanged.bind(this)),
      atom.config.observe('pulsar-find-references.panel.splitDirection', this.splitDirectionChanged.bind(this))
    );

    atom.commands.add<Node>(
      this.element,
      {
        'core:move-up': this.moveUp.bind(this),
        'core:move-down': this.moveDown.bind(this),
        'core:move-left': this.collapseActive.bind(this),
        'core:move-right': this.expandActive.bind(this),
        'core:page-up': this.pageUp.bind(this),
        'core:page-down': this.pageDown.bind(this),
        'core:move-to-top': this.moveToTop.bind(this),
        'core:move-to-bottom': this.moveToBottom.bind(this),
        'core:confirm': this.confirmResult.bind(this),
        'core:copy': this.copyResult.bind(this),
        'find-and-replace:copy-path': this.copyPath.bind(this),
        'find-and-replace:open-in-new-tab': this.openInNewTab.bind(this),
      }
    );

    this.refs.pinReferences.addEventListener(
      'click',
      this.handlePinReferencesClicked.bind(this)
    );

    this.focus();
  }

  moveUp() {
    if (this.activeNavigationIndex === this.lastNavigationIndex) return;
    let index = this.findVisibleNavigationIndex(-1);
    if (index === null) return;
    this.activeNavigationIndex = index;
    etch.update(this);
  }

  moveDown() {
    if (this.activeNavigationIndex === this.lastNavigationIndex) return;
    let index = this.findVisibleNavigationIndex(1);
    if (index === null) return;
    this.activeNavigationIndex = index;
    etch.update(this);
  }

  findVisibleNavigationIndex(delta: number) {
    let current = this.activeNavigationIndex;
    while (true) {
      current += delta;
      if (current < 0 || current > this.lastNavigationIndex) return null;
      let element = this.getElementAtIndex(current);
      if (element && element.clientHeight > 0) return current;
    }
  }

  isValidElementIndex(index: number) {
    if (index < 0) return false;
    if (index > this.lastNavigationIndex) return false;
    return true;
  }

  scrollOffsetOfElementAtIndex(index: number): number | null {
    if (!this.isValidElementIndex(index)) return -1;
    let { scrollContainer } = this.refs;
    let scrollRect = scrollContainer.getBoundingClientRect();
    let element = this.getElementAtIndex(index);
    if (!element || !element.clientHeight) return null;
    let elementRect = element.getBoundingClientRect();
    return elementRect.top - scrollRect.top;
  }

  findElementIndexNearHeight(top: number) {
    let closestEl = null, closestDiff = null;
    for (let i = 0; i <= this.lastNavigationIndex; i++) {
      let offset = this.scrollOffsetOfElementAtIndex(i);
      if (offset === null) continue;
      let diff = Math.abs(top - offset);
      if (offset === null) continue;
      if (closestEl === null || closestDiff !== null && closestDiff > diff) {
        closestDiff = diff;
        closestEl = i;
      }
    }

    return closestEl ?? -1;
  }

  collapseActive() {
    this.collapseResult(this.activeNavigationIndex);
  }

  expandActive() {
    this.expandResult(this.activeNavigationIndex);
  }

  collapseResult(index: number) {
    if (this.collapsedIndices.has(index)) return;
    this.collapsedIndices.add(index);
    etch.update(this);
  }

  expandResult(index: number) {
    if (!this.collapsedIndices.has(index)) return;
    this.collapsedIndices.delete(index);
    etch.update(this);
  }

  toggleResult(index: number) {
    let isCollapsed = this.collapsedIndices.has(index);
    if (isCollapsed) {
      this.expandResult(index);
    } else {
      this.collapseResult(index);
    }
  }

  pageUp() {
    let currentOffset = this.scrollOffsetOfElementAtIndex(this.activeNavigationIndex);
    if (currentOffset === null) return;

    let index = this.findElementIndexNearHeight(currentOffset - this.refs.scrollContainer.offsetHeight);

    this.activeNavigationIndex = index;
    etch.update(this);
  }

  pageDown() {
    let currentOffset = this.scrollOffsetOfElementAtIndex(this.activeNavigationIndex);
    if (currentOffset === null) return;

    let index = this.findElementIndexNearHeight(currentOffset + this.refs.scrollContainer.offsetHeight);

    this.activeNavigationIndex = index;
    etch.update(this);
  }

  moveToTop() {
    this.activeNavigationIndex = 0;
    etch.update(this);
  }

  moveToBottom() {
    this.activeNavigationIndex = this.lastNavigationIndex;
    etch.update(this);
  }

  confirmResult() {
    let element = this.activeElement;
    if (!element) return;
    let { filePath = '', lineNumberStr = '-1', range = '' } = element.dataset;
    let lineNumber = Number(lineNumberStr);

    this.openResult(filePath, lineNumber, range);
  }

  copyResult() {
    // TODO
  }

  copyPath() {
    // TODO
  }

  openInNewTab() {
    // TODO
  }

  getElementAtIndex(index: number): HTMLElement | null  {
    let element = this.element.querySelector(`[data-navigation-index="${index}"]`);
    return element ? (element as HTMLElement) : null;
  }

  get activeElement(): HTMLElement | null {
    if (this.activeNavigationIndex < 0) return null;
    return this.getElementAtIndex(this.activeNavigationIndex);
  }

  async update({ references, symbolName }: ReferencesViewProperties) {
    // Ignore new references when pinned.
    if (this.pinned) return Promise.resolve();

    let changed = false;
    if (references.length === 0 && symbolName === '')
      return Promise.resolve();

    if (this.references !== references) {
      this.references = references;
      this.filterAndGroupReferences();
      changed = true;
    }

    if (this.symbolName !== symbolName) {
      this.symbolName = symbolName;
      changed = true;
    }

    return changed ? etch.update(this) : Promise.resolve();
  }

  destroy() {
    ReferencesView.instances.delete(this);
    this.subscriptions.dispose();
  }

  fontFamilyChanged(fontFamily: string) {
    this.previewStyle = { fontFamily };
    etch.update(this);
  }

  ignoredNamesChanged(ignoredNames: string[]) {
    this.ignoredNameMatchers = ignoredNames.map(ig => new Minimatch(ig));
  }

  splitDirectionChanged(splitDirection: SplitDirection) {
    this.splitDirection = splitDirection;
  }

  handleClick(event: MouseEvent) {
    if (!event.target) return;
    let target = (event.target as HTMLElement)?.closest('[data-navigation-index]') as HTMLElement;
    if (target) {
      let navigationIndex = Number(target.dataset.navigationIndex);
      let viewportXOffset = event.clientX;
      let targetRect = target.getBoundingClientRect();

      if (target.matches('.list-item') && viewportXOffset - targetRect.left <= 16) {
        this.toggleResult(navigationIndex);
        return;
      }

      if (target.matches('[data-line-number][data-file-path]')) {
        let filePath = target.dataset.filePath ?? '';
        let lineNumber = Number(target.dataset.lineNumber || '-1');
        let rangeSpec = target.dataset.range ?? '';

        this.openResult(filePath, lineNumber, rangeSpec);
      }

      this.activeNavigationIndex = navigationIndex;
    } else {
      this.activeNavigationIndex = -1;
    }

    etch.update(this);
    event.preventDefault();
    // this.activate();
  }

  activate(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        this.element.focus();
        resolve();
      });
    });
  }

  handlePinReferencesClicked() {
    this.pinned = !this.pinned;
    etch.update(this);
  }

  async openResult(
    filePath: string,
    row: number,
    rangeSpec: string,
    { pending = true }: { pending: boolean } = { pending: true }
  ) {
    let referencesForFilePath = this.filteredAndGroupedReferences.get(filePath);
    if (!referencesForFilePath) return;
    let referencesForLineNumber = referencesForFilePath.filter(({ range }) => {
      return range.start.row == row;
    });
    let ranges = referencesForLineNumber.map(r => r.range);
    let targetRange = rangeSpec === '' ? ranges[0] : ranges.find(r => {
      return r.toString() === rangeSpec;
    });
    let editor = await atom.workspace.open(
      filePath,
      {
        pending,
        searchAllPanes: true,
        split: getOppositeSplit(this.splitDirection)
      }
    ) as TextEditor;
    editor.unfoldBufferRow(row);
    if (ranges.length > 0) {
      // @ts-expect-error undocumented option
      editor.getLastSelection().setBufferRange(targetRange ?? ranges[0], { flash: true });
    }
    editor.scrollToCursorPosition();
  }

  filterAndGroupReferences(): Map<string, Reference[]> {
    let paths = atom.project.getPaths();
    let results = new Map<string, Reference[]>();
    if (!this.references) return results;

    for (let reference of this.references) {
      let { uri } = reference;
      let projectPath = descendsFromAny(uri, paths);
      if (projectPath === false) continue;
      if (matchesIgnoredNames(uri, this.ignoredNameMatchers ?? [])) continue;

      let [_, relativePath] = atom.project.relativizePath(uri);
      let resultsForPath = results.get(relativePath);
      if (!resultsForPath) {
        resultsForPath = [];
        results.set(relativePath, resultsForPath);
      }
      resultsForPath.push(reference);
    }

    this.filteredAndGroupedReferences = results;
    return results;
  }

  get props(): ReferencesViewProperties {
    return {
      references: this.references ?? [],
      symbolName: this.symbolName ?? ''
    };
  }

  writeAfterUpdate() {
    let selected = this.element.querySelector(
      '[data-navigation-index].selected, .list-nested-item.selected'
    );
    if (!selected) return;
    // @ts-expect-error proprietary method
    selected.scrollIntoViewIfNeeded();
  }

  copy() {
    return new ReferencesView();
  }

  getTitle() {
    return 'Find References Results';
  }

  getIconName() {
    return 'search';
  }

  getURI() {
    return ReferencesView.URI;
  }

  focus() {
    let referencesView = this.refs.referencesView;
    if (!isEtchComponent(referencesView)) return;
    referencesView.element.focus();
  }

  render() {
    // console.log('ReferencesView render:', this.props, this.activeNavigationIndex);
    let listStyle = {
      position: 'absolute',
      overflow: 'hidden',
      left: '0',
      top: '0',
      right: '0'
    };

    let index = this.filteredAndGroupedReferences;
    let children = [];

    let navigationIndex = 0;
    for (let [relativePath, references] of index) {
      let view = (
        <ReferenceGroupView
          relativePath={relativePath}
          references={references}
          navigationIndex={navigationIndex}
          activeNavigationIndex={this.activeNavigationIndex}
          isCollapsed={this.collapsedIndices.has(navigationIndex)}
        />
      );
      // console.log('ReferencesView adding child:', view);
      children.push(view);
      navigationIndex += references.length + 1;
    }

    this.lastNavigationIndex = navigationIndex;

    let containerStyle =  {
      position: 'relative',
      height: '100%',
      overflow: 'auto',
    };

    let matchCount = this.references.length;
    let classNames = cx('find-references-pane', 'preview-pane', 'pane-item', { 'no-results': matchCount === 0 });

    let pinButtonClassNames = cx('btn', 'icon', 'icon-pin', { 'selected': this.pinned });
    return (
      <div className={classNames} tabIndex={-1}>
        <div className="preview-header">
          {describeReferences(this.references.length, this.filteredAndGroupedReferences.size, this.symbolName)}

          <div ref="pinReferences" className={pinButtonClassNames}>Pin references</div>
        </div>

        <div ref="referencesView" className="results-view focusable-panel" tabIndex={-1} style={this.previewStyle}>
          <div ref="scrollContainer" className="results-view-container" style={containerStyle}>
            <ol
              className="list-tree has-collapsable-children"
              style={listStyle}
            >
              {children}
            </ol>
          </div>
        </div>
      </div>
    );
  }
}
