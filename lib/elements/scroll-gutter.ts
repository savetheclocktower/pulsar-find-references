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
  private attachedToTextEditor: boolean = false;

  private screenRanges: Range[] | null = null;

  private subscriptions: CompositeDisposable = new CompositeDisposable();
  private intersectionObserver?: IntersectionObserver;

  public height: number = 0;
  public width: number = 0;

  private offscreenFirstRow: number | null = null;
  private offscreenLastRow: number | null = null;

  private frameRequested: boolean = false;

  // CANVAS STUFF

  private canvas: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private visible: boolean = true;
  private created: boolean = false;

  private scrollbarDecorationEnabled?: boolean;
  private markerColor?: Color;
  private markerOpacity?: number;

  private config?: ScrollGutterConfig;

  private redrawTimeout?: NodeJS.Timeout;

  constructor() {
    super();
    if (this.created) return;
    this.initializeContent();
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

    let parent = scrollbar.parentNode;
    if (!parent) {
      throw new Error(`No node to attach to!`);
    }

    let grammar = editor.getGrammar();

    this.subscriptions.add(
      editor.onDidChangeGrammar(() => {
        this.getConfig(editor);
      }),
      atom.config.observe(
        'pulsar-find-references.scrollbarDecoration',
        { scope: [grammar.scopeName] },
        _ => {
          this.getConfig(editor);
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
      ),
    );

    parent.appendChild(this);
  }

  getConfig(editor: TextEditor) {
    let config: ScrollGutterConfig = this.getScopedSettingsForKey<ScrollGutterConfig>(
      'pulsar-find-references.scrollbarDecoration',
      editor
    );

    this.config = config;
    return config;
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
    this.attachedToTextEditor = !!this.editorView;

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

  initializeContent() {
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
    console.log('measureHeightAndWidth');
    let wasResized = this.width !== this.clientWidth || this.height !== this.clientHeight;

    if (!this.scrollbar || !this.scrollView) {
      console.log('no scrollbar!');
      this.height = this.clientHeight;
      this.width = this.clientWidth;
    } else {
      console.log('scrollbar!', this.scrollbar);
      let barRect = this.scrollbar.getBoundingClientRect();
      // let viewRect = this.scrollView.getBoundingClientRect();
      this.height = barRect.height;
      this.width =  barRect.width;
      console.log('measuring width and height as:', this.width, this.height);
    }

    console.log('wasResized:', wasResized, 'visibilityChanged:', visibilityChanged, 'forceUpdate:', forceUpdate);

    if (wasResized || visibilityChanged || forceUpdate) {
      this.requestForcedUpdate();
    }

    if (!this.isVisible()) return;

    if (wasResized || forceUpdate) {

    }
  }

  requestForcedUpdate() {
    this.offscreenFirstRow = null;
    this.offscreenLastRow = null;
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
    console.log('Element update!');
    // if (!(this.attached && this.isVisible())) return;
    if (!this.visible) {
      this.style.visibility = 'hidden';
      return;
    } else {
      this.style.visibility = 'visible';
    }

    // let pixelRatio = window.devicePixelRatio;
    // let width = Math.min(this.canvas.width / devicePixelRatio, this.width);

    this.style.width = this.width ? `${this.width}px` : '';
    this.style.height = this.height ? `${this.height}px` : '';

    let canvasDimensionsChanged = false;

    if (this.canvas) {
      if (this.canvas.width !== this.width) {
        this.canvas.width = this.width;
        canvasDimensionsChanged = true;
      }
      if (this.canvas.height !== this.height) {
        this.canvas.height = this.height;
        canvasDimensionsChanged = true;
      }
    }

    if (canvasDimensionsChanged) {
      this.drawScreenRanges();
    }
  }

  clearReferences() {
    this.screenRanges = [];
    if (!this.canvas || !this.canvasContext) return;
    console.warn('clearing ranges!');
    this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  highlightReferences(references: Reference[] | null) {
    console.log('ELEMENT highlightReferences');
    if (this.getEditorHeight() <= this.getScrollbarHeight()) {
      return;
    }
    let { editor } = this;
    if (!editor) {
      console.warn('WTF? no editor!');
      return;
    }
    let path = editor.getPath();

    let { config } = this;
    if (!config) {
      throw new Error(`No config defined!`);
    }

    this.clearReferences();
    if (!references || !config.enable) {
      this.setVisibility(false);
      return;
    }

    for (let reference of references) {
      let { uri, range } = reference;
      if (uri !== path) {
        console.log('skipping:', reference, uri, path);
        continue;
      }
      let screenRange = editor.screenRangeForBufferRange(range);
      console.log('buffer range', range.toString(), 'maps to screen range:', screenRange.toString());
      this.screenRanges!.push(screenRange);
    }

    this.setVisibility(references.length !== 0);
    this.drawScreenRanges();
  }

  drawScreenRanges(clear = false) {
    console.log('drawScreenRanges on canvas:', this.canvas, clear, this.screenRanges);
    if (!this.screenRanges || !this.editor || !this.canvas) {
      console.warn('oops!');
      return;
    }
    if (clear) {
      console.log('CLEARING!');
      this.canvasContext!.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    for (let range of this.screenRanges) {
      let row = range.start.row;
      let lineCount = this.editor.getScreenLineCount();
      this.drawRectForEditorRow(row, lineCount);
    }
  }

  getEditorHeight() {
    if (!this.scrollView) return 0;
    let child = this.scrollView.firstChild as HTMLElement | null;
    if (!child) return 0;
    return child.clientHeight;
  }

  getScrollbarHeight() {
    if (!this.scrollbar) return 0;
    let rect = this.scrollbar.getBoundingClientRect();
    return rect.height;
  }

  drawRectForEditorRow(row: number, totalRows: number) {
    // if (!this.canvas) return;
    let { height, width } = this.canvas!;
    let { markerColor, markerOpacity } = this.config!;


    let editorHeight = this.getEditorHeight();
    let scrollbarHeight = this.getScrollbarHeight();
    // let scaledHeight = editorHeight - height;
    let pillHeight = (height / editorHeight) * height;

    let scrollbarHeightWithoutPillHeight = height - pillHeight;
    let finalScaleFactor =  height / scrollbarHeightWithoutPillHeight;

    console.log('editor height is', editorHeight);
    console.log('scrollbar height is', this.scrollbar!.clientHeight);
    console.log('canvas height is', height);

    console.log('pillHeight should be about', pillHeight);
    console.log('scrollbarHeightWithoutPillHeight is', scrollbarHeightWithoutPillHeight);

    let ctx = this.canvasContext!;
    ctx.fillStyle = markerColor.toHexString();
    ctx.globalAlpha = markerOpacity;

    if (!ctx) {
      console.warn('no context!');
      return;
    }
    console.log('FILL IS', ctx.fillStyle);
    console.log('ALPHA IS', ctx.globalAlpha);
    let rowPercentage = row / totalRows;
    console.log('rowPercentage for', row, 'is', rowPercentage);
    // console.log('thus the ');
    let pixelHeightPerRow = height / totalRows;
    // let pixelHeightPerRow = scrollbarHeightWithoutPillHeight / totalRows;
    let rectHeight = Math.max(pixelHeightPerRow, devicePixelRatio);
    let startY = pixelHeightPerRow * row;
    console.log('drawing rect for row', row, 'at:', 0, startY, width, rectHeight, ctx.fillStyle);
    ctx.fillRect(0, startY, width, rectHeight);
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

export function createScrollGutterElement(): ScrollGutter {
  let element: ScrollGutter = document.createElement(TAG_NAME) as ScrollGutter;
  // element.createdCallback();
  return element;
}
