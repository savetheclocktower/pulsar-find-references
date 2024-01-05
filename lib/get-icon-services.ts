import DefaultFileIcons from './default-file-icons';
import { CompositeDisposable, Disposable, Emitter } from 'atom';

type IconService = any;
type Callback = () => any;

type EtchRefsCollection = { [key: string]: HTMLElement };
type EtchComponent = {
  refs: EtchRefsCollection,
  element: HTMLElement,
  iconDisposable?: Disposable
};

let iconServices: IconServices;

export default function getIconServices() {
  iconServices ??= new IconServices();
  return iconServices;
}

export class IconServices {
  private emitter: Emitter = new Emitter();
  private fileIcons: any = DefaultFileIcons;

  private elementIcons: IconService | null = null;
  private elementIconDisposables: CompositeDisposable | null = new CompositeDisposable();

  constructor() {
  }

  onDidChange(callback: Callback) {
    return this.emitter.on('did-change', callback);
  }

  resetElementIcons() {
    this.setElementIcons(null);
  }

  setElementIcons(service: IconService) {
    if (service === this.elementIcons) return;
    if (this.elementIconDisposables !== null) {
      this.elementIconDisposables.dispose();
    }
    if (service) {
      this.elementIconDisposables = new CompositeDisposable();
    }
    this.elementIcons = service;
    return this.emitter.emit('did-change');
  }

  setFileIcons(service: IconService) {
    if (service !== this.fileIcons) {
      this.fileIcons = service;
      return this.emitter.emit('did-change');
    }
  }

  updateIcon(view: EtchComponent, filePath: string) {
    console.log('IconServices updateIcon:', view);
    if (this.elementIcons) {
      if (view.refs && view.refs.icon instanceof Element) {
        if (view.iconDisposable) {
          view.iconDisposable.dispose();
          this.elementIconDisposables?.remove(view.iconDisposable);
        }
      }
    } else {
      let iconClass = this.fileIcons.iconClassForPath(filePath, 'find-and-replace') || '';
      if (Array.isArray(iconClass)) {
        iconClass = iconClass.join(' ');
      }
      view.refs.icon.className = iconClass + ' icon';
    }
  }
}
