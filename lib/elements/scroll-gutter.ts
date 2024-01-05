import {
  Color,
  CompositeDisposable,
  Disposable,
  Range,
  TextEditor,
  TextEditorElement
} from 'atom';
import elementResizeDetectorFactory from 'element-resize-detector';
import type { Reference } from 'atom-ide-base';
import * as console from '../console';

const TAG_NAME = 'pulsar-find-references-scroll-gutter';

const RESIZE_DETECTOR = elementResizeDetectorFactory({ strategy: 'scroll' });

function last<T>(list: Array<T>) {
  return list[list.length - 1];
}

type ScrollGutterConfig = {
  enable: boolean,
  markerColor: Color,
  markerOpacity: number
};

export type ScrollGutterVisibilityEvent = CustomEvent<{ visible: boolean, editor: TextEditor }>;

export default class ScrollGutter extends HTMLElement {
  // public enabled: boolean = true;
  public attached: boolean = false;

  public editor: TextEditor | null = null;
  private editorView: TextEditorElement | null = null;
  private scrollbar: HTMLElement | null = null;
  private scrollView: HTMLElement | null = null;

  private lastEditorWidth: number = 0;
  private lastEditorHeight: number = 0;

  private screenRanges: Range[] | null = null;

  private subscriptions: CompositeDisposable = new CompositeDisposable();
  private intersectionObserver?: IntersectionObserver;

  public height: number = 0;
  public width: number = 0;

  private resizeObserver: ResizeObserver;
  private frameRequested: boolean = false;

  private config!: ScrollGutterConfig;

  // CANVAS STUFF

  private canvas: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private visible: boolean = true;
  private created: boolean = false;

  private redrawTimeout?: NodeJS.Timeout;

  constructor() {
    super();
    this.resizeObserver ??= new ResizeObserver(_ => this.measureHeightAndWidth());
    if (this.created) return;
    this.initializeCanvas();
    this.created = true;
  }

  attachToEditor(editor: TextEditor) {
    console.log('attaching to editor:', editor);
    if (this.attached && this.editor === editor) return;

    this.editor = editor;
    this.getConfig(editor);
    let container = atom.views.getView(editor);

    let scrollView = container.querySelector('.scroll-view');
    let scrollbar = container.querySelector('.scroll-view .vertical-scrollbar');
    if (!scrollbar || !scrollView) {
      throw new Error(`No scrollbar or scroll-view!`);
    }
    this.scrollView = scrollView as HTMLElement;
    this.scrollbar = scrollbar as HTMLElement;

    this.resizeObserver.observe(this.scrollbar);

    let parent = scrollbar.parentNode;
    if (!parent) {
      throw new Error(`No node to attach to!`);
    }

    let grammar = editor.getGrammar();

    this.subscriptions.add(
      // Redraw the gutters when the grammar changes — a new root scope might
      // mean new config values.
      editor.onDidChangeGrammar(() => {
        this.getConfig(editor);
        this.redrawAfterConfigChange();
      }),
      // Redraw the gutters when the config changes.
      atom.config.observe(
        'pulsar-find-references.scrollbarDecoration',
        { scope: [grammar.scopeName] },
        _ => {
          this.getConfig(editor);
          this.redrawAfterConfigChange();
        }
      ),
    );

    parent.appendChild(this);
  }

  redrawAfterConfigChange() {
    if (this.isVisible()) {
      if (this.redrawTimeout) {
        clearTimeout(this.redrawTimeout);
        this.redrawTimeout = undefined;
      }
      this.redrawTimeout = setTimeout(() => {
        this.drawScreenRanges(true);
      }, 500);
    }
  }

  getConfig(editor: TextEditor) {
    this.config = this.getScopedSettingsForKey<ScrollGutterConfig>(
      'pulsar-find-references.scrollbarDecoration',
      editor
    );

    return this.config;
  }

  connectedCallback() {
    this.intersectionObserver = new IntersectionObserver(entries => {
      let { intersectionRect } = last(entries);
      if (intersectionRect.width > 0 || intersectionRect.height > 0) {
        this.measureHeightAndWidth(true, true);
      }
    });

    this.intersectionObserver.observe(this);
    if (this.isVisible()) {
      this.measureHeightAndWidth(true, true);
    }

    let measureDimensions = () => this.measureHeightAndWidth(false, false);
    RESIZE_DETECTOR.listenTo(this, measureDimensions);
    window.addEventListener('resize', measureDimensions, { passive: true });

    this.subscriptions.add(
      new Disposable(() => {
        RESIZE_DETECTOR.removeListener(this, measureDimensions);
      }),
      new Disposable(() => {
        window.removeEventListener('resize', measureDimensions);
      }),
    );

    this.measureHeightAndWidth();
    this.attached = true;
    this.editorView = this.queryParentSelector('atom-text-editor') as TextEditorElement | null;

    this.subscriptions.add(this.subscribeToMediaQuery());
  }

  subscribeToMediaQuery() {
    let mediaQuery = window.matchMedia('screen and (-webkit-min-device-pixel-ratio: 1.5)');
    let mediaListener = () => this.requestForcedUpdate();

    mediaQuery.addEventListener('change', mediaListener);
    return new Disposable(() => {
      mediaQuery.removeEventListener('change', mediaListener);
    });
  }

  initializeCanvas() {
    this.canvas ??= document.createElement('canvas');
    this.canvasContext = this.canvas.getContext(
      '2d',
      { desynchronized: false }
    );

    this.appendChild(this.canvas);
  }

  measureHeightAndWidth(visibilityChanged: boolean = false, forceUpdate: boolean = true) {
    let wasResized = this.width !== this.clientWidth || this.height !== this.clientHeight;

    if (!this.scrollbar || !this.scrollView) {
      this.height = this.clientHeight;
      this.width = this.clientWidth;
    } else {
      let barRect = this.scrollbar.getBoundingClientRect();
      this.height = barRect.height;
      this.width =  barRect.width;
      console.debug('Measuring width and height as:', this.width, this.height);
    }

    if (wasResized || visibilityChanged || forceUpdate) {
      this.requestForcedUpdate();
    }

    if (!this.isVisible()) return;
  }

  requestForcedUpdate() {
    this.requestUpdate();
  }

  requestUpdate() {
    if (this.frameRequested) return;

    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.update();
      this.frameRequested = false;
    });
  }

  update() {
    console.debug('Element update!');
    if (!this.visible) {
      this.style.visibility = 'hidden';
      return;
    } else {
      this.style.visibility = 'visible';
    }

    this.style.width = this.width ? `${this.width}px` : '';
    this.style.height = this.height ? `${this.height}px` : '';

    let shouldRedraw = false;

    if (!this.editorView) return;
    if (this.editorView.offsetWidth !== this.lastEditorWidth) {
      shouldRedraw = true;
    }
    if (this.editorView.offsetHeight !== this.lastEditorHeight) {
      shouldRedraw = true;
    }

    this.lastEditorWidth = this.editorView.offsetWidth;
    this.lastEditorHeight = this.editorView.offsetHeight;

    if (this.canvas) {
      if (this.canvas.width !== this.width) {
        this.canvas.width = this.width;
        shouldRedraw = true;
      }
      if (this.canvas.height !== this.height) {
        this.canvas.height = this.height;
        shouldRedraw = true;
      }
    }

    if (shouldRedraw) {
      this.drawScreenRanges();
    }
  }

  clearReferences() {
    this.screenRanges = [];
    if (!this.canvas || !this.canvasContext) return;
    this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  highlightReferences(references: Reference[] | null) {
    if (this.getEditorHeight() <= this.getScrollbarHeight()) {
      return;
    }
    let { editor } = this;
    if (!editor) return;

    let { config } = this;

    this.clearReferences();

    if (!references || !config.enable) {
      this.setVisibility(false);
      return;
    }

    let path = editor.getPath();
    for (let reference of references) {
      let { uri, range } = reference;
      if (uri !== path) continue;

      let screenRange = editor.screenRangeForBufferRange(range);
      console.debug('Buffer range', range.toString(), 'maps to screen range', screenRange.toString());
      this.screenRanges!.push(screenRange);
    }

    this.setVisibility(references.length !== 0);
    this.drawScreenRanges();
  }

  drawScreenRanges(clear = false) {
    if (!this.screenRanges || !this.editor || !this.canvas || !this.canvasContext) {
      return;
    }

    if (clear) {
      this.canvasContext!.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    let lineCount = this.editor.getScreenLineCount();
    for (let range of this.screenRanges) {
      let row = range.start.row;
      this.drawRectForEditorRow(row, lineCount);
    }
  }

  getEditorHeight() {
    if (!this.scrollView) return 0;
    let child = this.scrollView.firstChild as HTMLElement | null;
    return child ? child.clientHeight : 0;
  }

  getScrollbarHeight() {
    if (!this.scrollbar) return 0;
    let rect = this.scrollbar.getBoundingClientRect();
    return rect.height;
  }

  drawRectForEditorRow(row: number, totalRows: number) {
    let { height, width } = this.canvas!;
    let { markerColor, markerOpacity } = this.config!;

    let ctx = this.canvasContext!;
    ctx.fillStyle = markerColor.toHexString();
    ctx.globalAlpha = markerOpacity;

    let pixelHeightPerRow = height / totalRows;

    let rectHeight = Math.max(pixelHeightPerRow, devicePixelRatio);
    let startY = pixelHeightPerRow * row;
    if (rectHeight > devicePixelRatio) {
      startY += ((pixelHeightPerRow / 2) - (devicePixelRatio / 2));
    }

    ctx.fillRect(0, startY, width, devicePixelRatio);
  }

  setVisibility(shouldBeVisible: boolean) {
    console.log('setVisibility', shouldBeVisible);
    let shouldUpdate = shouldBeVisible === this.visible;
    if (shouldUpdate) {
      this.visible = shouldBeVisible;
      this.requestUpdate();
    }
    let event = new CustomEvent(
      'visibility-changed',
      {
        bubbles: true,
        detail: {
          visible: shouldBeVisible,
          editor: this.editor
        }
      }
    );
    console.warn('firing event!');
    this.dispatchEvent(event);
  }

  isVisible() {
    return this.offsetWidth > 0 || this.offsetHeight > 0;
  }

  // UTIL

  queryParentSelector(selector: string): HTMLElement | null {
    let parent = this.parentNode;
    while (true) {
      if (!parent) return null;
      if ((parent as HTMLElement).matches(selector))
        return (parent as HTMLElement);
      parent = parent.parentNode;
    }
  }

  getScopedSettingsForKey<T>(key: string, editor: TextEditor): T {
    let schema = atom.config.getSchema(key) as { type: string };
    if (!schema) {
      throw new Error(`Unknown config key: ${schema}`);
    }

    let grammar = editor.getGrammar();
    let base = atom.config.get(key);
    let scoped = atom.config.get(key, { scope: [grammar.scopeName] });

    if (schema?.type === 'object') {
      return { ...base, ...scoped };
    } else {
      return scoped ?? base;
    }
  }
}

customElements.define(TAG_NAME, ScrollGutter);
