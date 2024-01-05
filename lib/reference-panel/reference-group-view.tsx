import etch from 'etch';
import type { Reference } from 'atom-ide-base';
import cx from 'classnames';
import Path from 'path';
import ReferenceRowView from './reference-row-view';
import getIconServices from '../get-icon-services';
import * as console from '../console';

type ReferenceGroupViewProperties = {
  relativePath: string,
  references: Reference[],
  navigationIndex: number,
  activeNavigationIndex?: number,
  isCollapsed?: boolean
};

export default class ReferenceGroupView {
  public relativePath: string;
  public references: Reference[];
  public isCollapsed: boolean;

  protected navigationIndex: number;
  protected activeNavigationIndex: number;

  public element!: HTMLElement;
  public refs!: { [key: string]: HTMLElement };

  constructor(props: ReferenceGroupViewProperties) {
    let {
      relativePath,
      references,
      navigationIndex,
      activeNavigationIndex = -1,
      isCollapsed = false
    } = props;
    console.debug('ReferenceGroupView constructor:', props);
    this.relativePath = relativePath;
    this.references = references;
    this.isCollapsed = isCollapsed;
    this.navigationIndex = navigationIndex;
    this.activeNavigationIndex = activeNavigationIndex;

    etch.initialize(this);
    this.iconServices.updateIcon(this, this.relativePath);
  }

  get iconServices() {
    return getIconServices();
  }

  async update({
    relativePath,
    references,
    navigationIndex,
    activeNavigationIndex = -1,
    isCollapsed = false
  }: ReferenceGroupViewProperties) {
    let changed = false;
    if (this.relativePath !== relativePath) {
      this.relativePath = relativePath;
      changed = true;
    }
    if (this.references !== references) {
      this.references = references;
      changed = true;
    }
    if (this.isCollapsed !== isCollapsed) {
      this.isCollapsed = isCollapsed;
      changed = true;
    }
    if (this.navigationIndex !== navigationIndex) {
      this.navigationIndex = navigationIndex;
      changed = true;
    }
    if (this.activeNavigationIndex !== activeNavigationIndex) {
      this.activeNavigationIndex = activeNavigationIndex;
      changed = true;
    }
    return changed ? etch.update(this) : Promise.resolve();
  }

  writeAfterUpdate() {
    this.iconServices.updateIcon(this, this.relativePath);
  }

  get props(): ReferenceGroupViewProperties {
    return {
      relativePath: this.relativePath ?? '',
      references: this.references,
      isCollapsed: this.isCollapsed,
      navigationIndex: this.navigationIndex,
      activeNavigationIndex: this.activeNavigationIndex
    };
  }

  render() {
    // console.log('ReferenceGroupView render:', this.references);
    let classNames = cx(
      'list-nested-item',
      {
        'selected': this.navigationIndex === this.activeNavigationIndex,
        'collapsed': this.isCollapsed
      }
    );
    let matchCount = this.references.length;
    let matchText = `(${matchCount} match${matchCount === 1 ? '' : 'es'})`;

    let referenceRows = this.references.map((ref, i) => {
      let currentNavigationIndex = this.navigationIndex + i + 1;
      return (
        <ReferenceRowView
          reference={ref}
          relativePath={this.relativePath}
          isSelected={currentNavigationIndex === this.activeNavigationIndex}
          navigationIndex={currentNavigationIndex}
          activeNavigationIndex={this.activeNavigationIndex}
        />
      );
    });

    let listClassNames = cx('list-tree', { 'hidden': this.isCollapsed });

    return (
      <li className={classNames}>
        <div
          className="list-item path-row"
          dataset={{ filePath: this.relativePath, navigationIndex: String(this.navigationIndex) }}
        >
          <span
            ref="icon"
            className="icon"
            dataset={{ name: Path.basename(this.relativePath) }}
          />
          <span className="path-name bright">{this.relativePath}</span>
          <span ref="description" className="path-match-number">{matchText}</span>
        </div>
        <ul className={listClassNames}>{referenceRows}</ul>
      </li>
    );
  }
}
