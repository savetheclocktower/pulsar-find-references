import { TextBuffer } from 'atom';
import etch from 'etch';
import Path from 'path';
import cx from 'classnames';

import * as console from '../console';

import type { Reference } from 'atom-ide-base';

type ReferenceRowViewProperties = {
  relativePath: string,
  reference: Reference,
  isSelected?: boolean,
  activeNavigationIndex?: number
  navigationIndex: number,
  bufferCache?: Map<string, TextBuffer>
};

export default class ReferenceRowView {
  public relativePath: string;
  public reference: Reference;
  public isSelected: boolean;

  public element!: HTMLElement;
  public refs!: { [key: string]: HTMLElement };

  protected navigationIndex: number;
  protected activeNavigationIndex: number;

  private buffer?: TextBuffer;
  private textLine?: string;
  private textLineParts?: [string, string, string]
  private bufferCache?: Map<string, TextBuffer>;

  constructor(props: ReferenceRowViewProperties) {
    let {
      relativePath,
      reference,
      navigationIndex,
      activeNavigationIndex = -1,
      isSelected = false,
      bufferCache
    } = props;
    console.debug('ReferenceRowView constructor:', props);
    this.relativePath = relativePath;
    this.reference = reference;
    this.isSelected = isSelected;
    this.navigationIndex = navigationIndex;
    this.activeNavigationIndex = activeNavigationIndex;
    this.bufferCache = bufferCache;

    etch.initialize(this);
    this.getLineForReference().then(() => etch.update(this));
  }

  destroy() {
    return etch.destroy(this);
  }

  async getLineForReference() {
    if (this.textLine) return this.textLine;

    // The language server’s results are positioned according to the current
    // state of the project — including what may be any number of unsaved
    // buffers that have local changes.
    //
    // For this reason, we must reuse a buffer in the workspace if it exists
    // before giving up and loading from disk.
    if (!this.buffer) {
      this.buffer = this.bufferCache?.get(this.reference.uri) ??
        await TextBuffer.load(this.reference.uri);
    }
    if (!this.buffer) {
      throw new Error('No buffer')
    }

    let textLineParts: [string, string, string] | undefined = undefined;
    let { range } = this.reference;
    let row = range.start.row;
    let from = null, to = null;
    let line = this.buffer.lineForRow(row) ?? '';
    if (range.start.row === range.end.row) {
      from = range.start.column;
      to = range.end.column;
      let before = line.substring(0, from);
      let after = line.substring(to);
      let middle = line.substring(from, to);

      textLineParts = [before, middle, after];
    }

    this.textLineParts = textLineParts;
    this.textLine = line;
    return line;
  }

  async update(newProps: Partial<ReferenceRowViewProperties>) {
    let props = { ...this.props, ...newProps };

    let { relativePath, reference, isSelected = false, bufferCache } = props;
    let changed = false;

    if (this.relativePath !== relativePath) {
      this.relativePath = relativePath;
      changed = true;
    }

    if (this.reference !== reference) {
      this.buffer = undefined;
      this.textLine = undefined;
      this.reference = reference;
      await this.getLineForReference();
      changed = true;
    }

    if (this.bufferCache !== bufferCache) {
      this.bufferCache = bufferCache;
      await this.getLineForReference();
      changed = true;
    }

    if (this.isSelected !== isSelected) {
      this.isSelected = isSelected;
      changed = true;
    }

    return changed ? etch.update(this) : Promise.resolve();
  }

  get props(): ReferenceRowViewProperties {
    return {
      relativePath: this.relativePath,
      reference: this.reference,
      isSelected: this.isSelected,
      navigationIndex: this.navigationIndex,
      activeNavigationIndex: this.activeNavigationIndex,
      bufferCache: this.bufferCache
    };
  }

  get lineNumber(): number {
    return this.reference.range.start.row + 1;
  }

  render() {
    let { relativePath } = this;
    if (atom.project) {
      let [rootPath, _] = atom.project.relativize(this.reference.uri);
      if (rootPath && atom.project.getDirectories().length > 1) {
        // If there's more than one project root, add the last component of
        // each root to the front of the path in order to disambiguate.
        relativePath = Path.join(
          Path.basename(rootPath),
          relativePath
        );
      }
    }
    let classNames = cx(
      'list-item',
      'match-row',
      {
        'selected': this.isSelected
      }
    );
    let [before, middle, after] = this.textLineParts ?? ['', '', ''];
    return (
      <li className={classNames} dataset={{
        navigationIndex: String(this.navigationIndex),
        lineNumber: String(this.lineNumber - 1),
        filePath: this.relativePath,
        range: this.reference.range.toString()
      }}>
        <span className="line-number">{this.lineNumber}</span>
        <span className="preview">
          {before}<span className="match highlight-info">{middle}</span>{after}
        </span>
      </li>
    );
  }
}
