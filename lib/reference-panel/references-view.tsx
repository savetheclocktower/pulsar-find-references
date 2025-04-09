import {
  CompositeDisposable,
  DisplayMarker,
  Emitter,
  TextBuffer,
  TextEditor
} from 'atom';
import { Minimatch } from 'minimatch';
import etch from 'etch';
import Path from 'path';
import cx from 'classnames';

import ReferenceGroupView from './reference-group-view';
import * as console from '../console';

import type { Reference } from 'atom-ide-base';
import type { EtchComponent } from 'etch';
import FindReferencesManager from '../find-references-manager';

function isEtchComponent(el: unknown): el is EtchComponent {
  if (!el) return false;
  if (typeof el !== 'object') return false;
  return ('refs' in el) && ('element' in el);
}


function pluralize(count: number, singular: string, plural: string = `${singular}s`) {
  let noun = count === 1 ? singular : plural;
  return `${count} ${noun}`;
}

function describeReferences(referenceCount: number, fileCount: number, symbolName: string) {
  return (
    <span ref="previewCount" className="preview-count inline-block">
      {pluralize(referenceCount, 'result')} found in {' '}
      {pluralize(fileCount, 'file')} for {' '}
      <span className="highlight-info">{symbolName}</span>
    </span>
  );
}

function descendsFrom(filePath: string, projectPath: string) {
  if (typeof filePath !== 'string') return false;
  return filePath.startsWith(
    projectPath.endsWith(Path.sep) ? projectPath : `${projectPath}${Path.sep}`
  );
}

function descendsFromAny(filePath: string, projectPaths: string[]): string | false {
  for (let projectPath of projectPaths) {
    if (descendsFrom(filePath, projectPath)) return projectPath;
  }
  return false;
}

function matchesIgnoredNames(filePath: string, ignoredNames: Minimatch[]) {
  let repositories = atom.project.getRepositories();
  if (repositories.some(r => r.isPathIgnored(filePath))) return true;
  return ignoredNames.some(ig => {
    let result = ig.match(filePath);
    return result;
  });
}

type SplitDirection = 'left' | 'right' | 'up' | 'down' | 'none';
type FormalSplitDirection = 'left' | 'right' | 'up' | 'down' | undefined;

type ReferencesViewContext = {
  manager: FindReferencesManager,
  editor: TextEditor,
  marker: DisplayMarker,
  references: Reference[],
  symbolName: string
}

type ReferencesViewProperties = { ref?: string } & ReferencesViewContext;

function getOppositeSplit(split: SplitDirection): FormalSplitDirection {
  return {
    left: 'right',
    right: 'left',
    down: 'up',
    up: 'down',
    none: undefined
  }[split] as FormalSplitDirection;
}

let panelId = 1;

export default class ReferencesView {
  // Base URI. We add `/1`, `/2`, etc., so that different instances of the
  // panel can be distinguished.
  static URI = "atom://pulsar-find-references/results";

  // Initialization data for panels that have not yet been instantiated.
  static CONTEXTS: Map<string, ReferencesViewContext> = new Map();

  // Instances of `ReferencesView`.
  static instances: Map<string, ReferencesView> = new Map();

  static nextUri () {
    return `${ReferencesView.URI}/${panelId++}`;
  }

  static setReferences(
    uri: string,
    context: ReferencesViewContext
  ) {
    if (ReferencesView.instances.has(uri)) {
      // This instance already exists, so we can update it directly.
      ReferencesView.instances.get(uri)!.update(context);
    } else {
      // This instance will soon exist, so we'll store this data for future
      // lookup.
      ReferencesView.CONTEXTS.set(uri, context);
    }
  }

  public uri: string;

  // Whether this panel can be reused the next time the “Show Panel” command is
  // invoked.
  public overridable: boolean = true;

  private subscriptions: CompositeDisposable = new CompositeDisposable();

  // Component properties.
  private references: Reference[];
  private symbolName: string;
  private editor: TextEditor;
  private marker: DisplayMarker;
  private manager: FindReferencesManager;

  private ignoredNameMatchers: Minimatch[] | null = null;
  private splitDirection: SplitDirection = 'none';

  private emitter: Emitter = new Emitter();

  private filteredAndGroupedReferences!: Map<string, Reference[]>;

  // URIs of buffers in the current result set.
  private uris: Set<string> = new Set();

  // Keeps track of which result has keyboard focus.
  private activeNavigationIndex: number = -1;
  private lastNavigationIndex: number = -1;

  private bufferCache: Map<string, TextBuffer> = new Map();
  private indexToReferenceMap: Map<number, Reference> = new Map();

  // Keeps track of which result groups are collapsed.
  private collapsedIndices: Set<number> = new Set();

  private previewStyle: { fontFamily: string } = { fontFamily: '' };

  public element!: HTMLElement;
  public refs!: { [key: string]: HTMLElement };

  constructor(uri: string, props?: ReferencesViewContext) {
    ReferencesView.instances.set(uri, this);
    this.uri = uri;
    let context: ReferencesViewContext
    if (props) {
      context = props;
    } else if (ReferencesView.CONTEXTS.has(uri)) {
      context = ReferencesView.CONTEXTS.get(uri)!
    } else {
      throw new Error(`Expected context data for URI: ${uri}`)
    }

    let { references, symbolName, editor, marker, manager } = context;
    this.references = references;
    this.symbolName = symbolName;
    this.editor = editor;
    this.marker = marker;
    this.manager = manager;

    ReferencesView.CONTEXTS.delete(uri);

    console.debug('ReferencesView constructor:', this.uri, this.props);

    if (!this.references) {
      throw new Error(`No references!`);
    }

    this.filterAndGroupReferences();

    etch.initialize(this);

    this.subscriptions.add(
      atom.config.observe('editor.fontFamily', this.fontFamilyChanged.bind(this)),
      atom.config.observe('core.ignoredNames', this.ignoredNamesChanged.bind(this)),
      atom.config.observe('pulsar-find-references.panel.splitDirection', this.splitDirectionChanged.bind(this)),

      atom.workspace.observeTextEditors((editor) => {
        // Since this panel updates in real time, we should arguably fetch new
        // references whenever _any_ editor changes. For now, we'll refetch
        // whenever one of the files in the result set is edited, even though
        // this could end up missing new references as they are created.
        editor.onDidStopChanging((_event) => {
          if (this.referencesIncludeBuffer(editor.getBuffer())) {
            this.refreshPanel();
          }
        })
      }),

      // If the marker is destroyed or made invalid, it means a buffer change
      // has caused us not to be able to track the logical position of the
      // point that initially trigged this panel. This makes it impossible for
      // us to continue to update the results, so the panel must close.
      this.marker.onDidChange(() => {
        if (this.marker?.isValid()) return;
        this.close();
      }),
      this.marker.onDidDestroy(() => this.close())
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
        // Piggyback on the user's keybindings for these functions, since the
        // UI is practically identical to that of `find-and-replace`.
        'find-and-replace:copy-path': this.copyPath.bind(this),
        'find-and-replace:open-in-new-tab': this.openInNewTab.bind(this),
      }
    );

    this.element.addEventListener('mousedown', this.handleClick.bind(this));

    this.refs.pinReferences.addEventListener(
      'click',
      this.handlePinReferencesClicked.bind(this)
    );

    this.focus();

    this.buildBufferCache()
      .then((cache) => {
        this.bufferCache = cache
        return etch.update(this);
      });
  }

  // Pane items that provide `onDidChangeTitle` can trigger updates to their
  // tab and window titles.
  onDidChangeTitle (callback: () => void) {
    return this.emitter.on('did-change-title', callback);
  }

  // Move keyboard focus to the previous visible result.
  moveUp() {
    if (this.activeNavigationIndex === 0) return;
    let index = this.findVisibleNavigationIndex(-1);
    if (index === null) return;
    this.activeNavigationIndex = index;
    etch.update(this).then(() => this.ensureSelectedItemInView());
  }

  // Move keyboard focus to the next visible result.
  moveDown() {
    if (this.activeNavigationIndex === this.lastNavigationIndex) return;
    let index = this.findVisibleNavigationIndex(1);
    if (index === null) return;
    this.activeNavigationIndex = index;
    etch.update(this).then(() => this.ensureSelectedItemInView());
  }

  // Move the navigation index some number of increments, skipping any results
  // that are collapsed.
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
    etch.update(this).then(() => this.ensureSelectedItemInView());
  }

  pageDown() {
    let currentOffset = this.scrollOffsetOfElementAtIndex(this.activeNavigationIndex);
    if (currentOffset === null) return;

    let index = this.findElementIndexNearHeight(currentOffset + this.refs.scrollContainer.offsetHeight);

    this.activeNavigationIndex = index;
    etch.update(this).then(() => this.ensureSelectedItemInView());
  }

  moveToTop() {
    this.activeNavigationIndex = 0;
    etch.update(this).then(() => this.ensureSelectedItemInView());
  }

  moveToBottom() {
    this.activeNavigationIndex = this.lastNavigationIndex;
    etch.update(this).then(() => this.ensureSelectedItemInView());
  }

  ensureSelectedItemInView() {
    if (!this.activeElement) return;
    let containerRect = this.refs.scrollContainer.getBoundingClientRect();
    let itemRect = this.activeElement.getBoundingClientRect();

    let delta: number;
    if (itemRect.top < containerRect.top) {
      delta = itemRect.top - containerRect.top;
    } else if (itemRect.bottom > containerRect.bottom) {
      delta = itemRect.bottom - containerRect.bottom;
    } else {
      return;
    }
    this.refs.scrollContainer.scrollTop += delta;
  }

  confirmResult() {
    if (!this.activeElement) return;
    let metadata = this.getMetadataForTarget(this.activeElement);
    if (!metadata) return;

    let { filePath, lineNumber, rangeSpec } = metadata;
    this.openResult(filePath, lineNumber, rangeSpec);
  }

  // Copy the line of text from the reference. (Of limited utility, but
  // implemented for feature equivalence with the `find-and-replace` panel.)
  copyResult() {
    if (!this.activeElement) return;

    let reference = this.indexToReferenceMap.get(this.activeNavigationIndex);
    if (!reference) return;

    if (!this.bufferCache.has(reference.uri)) return;

    // All the buffers for results should be present in this cache because we
    // preloaded them during render.
    let buffer = this.bufferCache.get(reference.uri);
    if (!buffer) return;

    let text = buffer.lineForRow(reference.range.start.row);
    if (!text) return;

    atom.clipboard.write(text);
  }

  // Copy the relative file path of the keyboard-focused reference.
  // (Implemented for feature equivalence with the `find-and-replace` panel.)
  copyPath() {
    if (!this.activeElement) return;
    const { filePath = null } = this.activeElement.dataset;
    if (!filePath) return;
    let [projectPath, relativePath] = atom.project.relativizePath(filePath);
    if (projectPath && atom.project.getDirectories().length > 1) {
      relativePath = Path.join(Path.basename(projectPath), relativePath);
    }
    atom.clipboard.write(relativePath);
  }

  // Open the result in a new tab whether or not it already exists in the
  // workspace.
  async openInNewTab() {
    if (!this.activeElement) return;

    let metadata = this.getMetadataForTarget(this.activeElement);
    if (!metadata) return;

    let { filePath, lineNumber: row, rangeSpec } = metadata;
    if (!filePath) return;

    let editor;
    let exists = atom.workspace.getTextEditors().filter(e => e.getPath() === filePath);
    if (!exists) {
      editor = await atom.workspace.open(
        filePath,
        { activatePane: false, activateItem: false }
      ) as TextEditor;
    } else {
      editor = await atom.workspace.open(filePath) as TextEditor;
    }

    this.revealReferenceInEditor(filePath, row, rangeSpec, editor);
  }

  getElementAtIndex(index: number): HTMLElement | null  {
    let element = this.element.querySelector(`[data-navigation-index="${index}"]`);
    return element ? (element as HTMLElement) : null;
  }

  // The element that has keyboard focus.
  get activeElement(): HTMLElement | null {
    if (this.activeNavigationIndex < 0) return null;
    return this.getElementAtIndex(this.activeNavigationIndex);
  }

  async update({ references, symbolName, editor, marker, manager }: Partial<ReferencesViewProperties>) {
    let changed = false;

    if (references && this.references !== references) {
      this.references = references;
      this.filterAndGroupReferences();
      this.indexToReferenceMap.clear();
      this.bufferCache = await this.buildBufferCache();
      changed = true;
    }
    if (symbolName && this.symbolName !== symbolName) {
      this.symbolName = symbolName;
      // Triggers an update of the tab title.
      this.emitter.emit('did-change-title');
      changed = true;
    }

    // These properties don't trigger re-renders, but they must still be
    // updated if changed.
    if (editor) {
      this.editor = editor;
    }
    if (marker) {
      this.marker = marker;
    }
    if (manager) {
      this.manager = manager;
    }

    return changed ? etch.update(this) : Promise.resolve();
  }

  destroy() {
    ReferencesView.instances.delete(this.uri);
    this.subscriptions.dispose();
  }

  // Close this window.
  close() {
    this.destroy();
    const pane = atom.workspace.paneForItem(this);
    if (!pane) return;
    pane.destroyItem(this);
  }

  // Given a buffer, returns whether the buffer's file path matches any of the
  // current references.
  referencesIncludeBuffer (buffer: TextBuffer) {
    let bufferPath = buffer.getPath()
    if (!bufferPath) return false
    return this.uris.has(bufferPath)
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

  getMetadataForTarget (target: HTMLElement) {
    if (!target.matches('[data-line-number][data-file-path]')) return null;
    let {
      filePath = '',
      lineNumber: lineNumberString = '-1',
      rangeSpec = ''
    } = target.dataset;
    let lineNumber = Number(lineNumberString);
    return { filePath, lineNumber, rangeSpec };
  }

  handleClick(event: MouseEvent) {
    if (!event.target) return;
    let target = (event.target as HTMLElement)?.closest('[data-navigation-index]') as HTMLElement;
    if (target) {
      let navigationIndex = Number(target.dataset.navigationIndex);
      let viewportXOffset = event.clientX;
      let targetRect = target.getBoundingClientRect();

      // A bit of a hack, but copies the approach of the equivalent
      // `find-and-replace` result handler. Distinguishes between a click on
      // the result and a click on the disclosure triangle that
      // collapses/expands results.
      if (target.matches('.list-item') && viewportXOffset - targetRect.left <= 16) {
        this.toggleResult(navigationIndex);
        return;
      }

      let metadata = this.getMetadataForTarget(target);
      if (metadata) {
        let { filePath, lineNumber, rangeSpec } = metadata;
        this.openResult(filePath, lineNumber, rangeSpec);
      }

      this.activeNavigationIndex = navigationIndex;
    } else {
      this.activeNavigationIndex = -1;
    }

    etch.update(this);
    event.preventDefault();
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
    this.overridable = !this.overridable;
    etch.update(this);
  }

  // Brings the user to the given reference on click.
  async openResult(
    filePath: string,
    row: number,
    rangeSpec: string,
    { pending = true }: { pending: boolean } = { pending: true }
  ) {
    // Find an existing editor in the workspace for this file or else create
    // one if needed.
    let editor = await atom.workspace.open(
      filePath,
      {
        pending,
        searchAllPanes: true,
        split: getOppositeSplit(this.splitDirection)
      }
    ) as TextEditor;

    this.revealReferenceInEditor(filePath, row, rangeSpec, editor);
  }

  revealReferenceInEditor(filePath: string, row: number, rangeSpec: string, editor: TextEditor) {
    let referencesForFilePath = this.filteredAndGroupedReferences.get(filePath);
    if (!referencesForFilePath) return

    let referencesForLineNumber = referencesForFilePath.filter(({ range }) => {
      return range.start.row == row;
    });

    let ranges = referencesForLineNumber.map(r => r.range);
    let targetRange = rangeSpec === '' ? ranges[0] : ranges.find(r => {
      return r.toString() === rangeSpec;
    });

    // Reveal the row the result is on if it happens to be folded.
    editor.unfoldBufferRow(row);

    if (ranges.length > 0) {
      // @ts-expect-error undocumented option
      editor.getLastSelection().setBufferRange(targetRange ?? ranges[0], { flash: true });
    }

    editor.scrollToCursorPosition();
  }

  // Groups the references according to the files they belong to.
  filterAndGroupReferences(): Map<string, Reference[]> {
    let paths = atom.project.getPaths();
    let results = new Map<string, Reference[]>();
    let uris = new Set<string>();

    if (!this.references) return results;

    // Group references by file.
    for (let reference of this.references) {
      let { uri } = reference;
      uris.add(uri);
      let projectPath = descendsFromAny(uri, paths);

      // Ignore any results that aren't within this project.
      if (projectPath === false) continue;

      // Ignore any results within ignored files.
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
    this.uris = uris;
    return results;
  }

  get props(): ReferencesViewProperties {
    return {
      references: this.references ?? [],
      symbolName: this.symbolName ?? '',
      editor: this.editor,
      marker: this.marker,
      manager: this.manager
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
    let newUri = ReferencesView.nextUri();
    return new ReferencesView(newUri, this.props);
  }

  getTitle() {
    let { symbolName } = this;
    return `“${symbolName}”: Find References Results`;
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

  // Assembles a map between reference URIs and `TextBuffer`s for child views
  // to consult.
  async buildBufferCache() {
    let map = new Map<string, TextBuffer>();
    let editors = atom.workspace.getTextEditors();
    for (let editor of editors) {
      let path = editor.getPath();
      let buffer = editor.getBuffer();
      if (path === undefined) continue;
      if (map.has(path)) continue;
      map.set(path, buffer);
    }
    // Any buffers that aren't present already in the work space can be created
    // from files on disk.
    for (let uri of this.uris) {
      if (map.has(uri)) continue;
      map.set(uri, await TextBuffer.load(uri));
    }
    return map;
  }

  // How do we keep refreshing the references panel as we make changes in the
  // project?
  //
  // * Remember the cursor position that triggered the panel. Create a marker
  //   to track the logical buffer position through edits.
  // * Open the panel and show the results.
  // * When you open the panel, add an `onDidStopChanging` observer to every
  //   `TextEditor` in the project. The callback should return early if the
  //   editor isn't changing a buffer that is in the result set; otherwise it
  //   should re-request the list of references.
  // * When references are re-requested, they should use the current buffer
  //   position of the marker we created in step 1.
  //
  // This works for as long as the cursor position can be logically tracked. If
  // the marker is invalidated, that means a change has completely surrounded
  // it, and we can no longer affirm it refers to the same symbol. At this
  // point, we close the panel.
  async refreshPanel() {
    if (!this.manager || !this.editor || !this.marker) return;
    let bundle = await this.manager.findReferencesForProjectAtPosition(
      this.editor,
      this.marker.getBufferRange().start
    )
    if (!bundle || bundle.type === 'error') return;

    await this.update({
      references: bundle.references,
      symbolName: bundle.referencedSymbolName
    });
  }

  render() {
    let listStyle = {
      position: 'absolute',
      overflow: 'hidden',
      left: '0',
      top: '0',
      right: '0'
    };

    let children = [];

    let navigationIndex = 0;
    for (let [relativePath, references] of this.filteredAndGroupedReferences) {
      let view = (
        <ReferenceGroupView
          relativePath={relativePath}
          references={references}
          navigationIndex={navigationIndex}
          indexToReferenceMap={this.indexToReferenceMap}
          activeNavigationIndex={this.activeNavigationIndex}
          bufferCache={this.bufferCache}
          isCollapsed={this.collapsedIndices.has(navigationIndex)}
        />
      );
      children.push(view);
      navigationIndex += references.length + 1;
    }

    this.lastNavigationIndex = navigationIndex - 1;

    let containerStyle =  {
      position: 'relative',
      height: '100%',
      overflow: 'auto',
    };

    let matchCount = this.references.length;
    let classNames = cx('find-references-pane', 'preview-pane', 'pane-item', { 'no-results': matchCount === 0 });

    let pinButtonClassNames = cx('btn', 'icon', 'icon-pin', {
      'selected': !this.overridable
    });

    return (
      <div className={classNames} tabIndex={-1}>
        <div className="preview-header">
          {describeReferences(this.references.length, this.filteredAndGroupedReferences.size, this.symbolName)}

          <div ref="pinReferences" className={pinButtonClassNames}>Don’t override</div>
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
