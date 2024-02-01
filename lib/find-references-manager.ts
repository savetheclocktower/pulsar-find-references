import {
  CompositeDisposable,
  DisplayMarkerLayer,
  Disposable,
  Point,
  TextEditor,
  TextEditorElement,
  CommandEvent,
  CursorPositionChangedEvent
} from 'atom';
import type { FindReferencesProvider } from './find-references.d';
import type { FindReferencesReturn, Reference } from 'atom-ide-base';
import ProviderRegistry from './provider-registry';
import * as console from './console';
import ReferencesView from './reference-panel/references-view';

// How long after the user last typed a character before we consider them to no
// longer be typing.
const TYPING_DELAY = 1000;

import {
  default as ScrollGutter,
  ScrollGutterVisibilityEvent
} from './elements/scroll-gutter';

type SplitDirection = 'left' | 'right' | 'up' | 'down' | 'none';

export default class FindReferencesManager {
  public editor: TextEditor | null = null;
  public editorView: TextEditorElement | null = null;

  private isTyping: boolean = false;

  private subscriptions: CompositeDisposable = new CompositeDisposable();
  public providerRegistry: ProviderRegistry<FindReferencesProvider> = new ProviderRegistry();

  private editorSubscriptions: CompositeDisposable | null = null;
  private watchedEditors: WeakSet<TextEditor> = new WeakSet();
  private markerLayersForEditors: WeakMap<TextEditor, DisplayMarkerLayer> = new WeakMap();
  private scrollGuttersForEditors: WeakMap<TextEditor, ScrollGutter> = new WeakMap();

  private enableScrollbarDecoration: boolean = true;
  private splitDirection: SplitDirection = 'none';

  private enableEditorDecoration: boolean = true;
  private skipCurrentReference: boolean = true;
  private cursorMoveDelay: number = 200;

  private cursorMoveTimer?: NodeJS.Timeout | number;
  private typingTimer?: NodeJS.Timeout | number;

  constructor() {
    this.onCursorMove = this.onCursorMove.bind(this);
  }

  initialize(pendingProviders: FindReferencesProvider[]) {
    while (pendingProviders.length) {
      let provider = pendingProviders.shift();
      if (!provider) continue;
      this.providerRegistry.addProvider(provider);
    }

    atom.workspace.addOpener(filePath => {
      if (filePath.indexOf(ReferencesView.URI) !== -1)
        return new ReferencesView();

      return;
    });

    this.subscriptions.add(
      atom.workspace.observeTextEditors(editor => {
        let disposable = this.watchEditor(editor);
        editor.onDidDestroy(() => disposable?.dispose());
      }),
      atom.commands.add('atom-text-editor', {
        'pulsar-find-references:highlight': (_event: CommandEvent) => {
          return this.requestReferencesUnderCursor(true);
        },
        'pulsar-find-references:show-panel': (_event: CommandEvent) => {
          return this.requestReferencesForPanel();
        }
      }),
      atom.config.observe(
        'pulsar-find-references.panel.splitDirection',
        (value: SplitDirection) => {
          this.splitDirection = value;
        }
      ),
      atom.config.observe(
        'pulsar-find-references.scrollbarDecoration.enable',
        (value: boolean) => {
          this.enableScrollbarDecoration = value;
        }
      ),
      atom.config.observe(
        'pulsar-find-references.editorDecoration.enable',
        (value: boolean) => {
          this.enableEditorDecoration = value;
        }
      ),
      atom.config.observe(
        'pulsar-find-references.editorDecoration.delay',
        (value: number) => {
          this.cursorMoveDelay = value;
        }
      ),
      atom.config.observe(
        'pulsar-find-references.editorDecoration.skipCurrentReference',
        (value: boolean) => {
          this.skipCurrentReference = value;
        }
      ),
    );
  }



  addProvider(provider: FindReferencesProvider) {
    this.providerRegistry.addProvider(provider);
  }

  dispose() {
    this.subscriptions?.dispose();
  }

  // EDITOR MANAGEMENT

  watchEditor(editor: TextEditor) {
    if (this.watchedEditors.has(editor)) {
      return;
    }

    let editorView = atom.views.getView(editor);
    if (editorView.hasFocus()) this.updateCurrentEditor(editor);

    let onFocus = () => this.updateCurrentEditor(editor);
    let onBlur = () => {};
    editorView.addEventListener('focus', onFocus);
    editorView.addEventListener('blur', onBlur);

    let subscriptions = new CompositeDisposable();

    let disposable = new Disposable(() => {
      editorView.removeEventListener('focus', onFocus);
      editorView.removeEventListener('blur', onBlur);

      if (this.editor === editor) {
        this.updateCurrentEditor(null);
      }
    });

    subscriptions.add(
      disposable,
      editor.getBuffer().onDidChange(() => {
        this.isTyping = true;
        clearTimeout(this.typingTimer);
        clearTimeout(this.cursorMoveTimer);
        this.typingTimer = setTimeout(
          () => this.isTyping = false,
          1000
        );
      })
    );

    this.watchedEditors.add(editor);
    this.subscriptions.add(disposable);

    return new Disposable(() => {
      subscriptions.dispose();
      this.subscriptions.remove(disposable);
      this.watchedEditors.delete(editor);
    });
  }

  updateCurrentEditor(editor: TextEditor | null) {
    if (editor === this.editor) return;

    this.editorSubscriptions?.dispose();
    this.editorSubscriptions = null;

    this.editor = this.editorView = null;

    if (editor === null || !atom.workspace.isTextEditor(editor)) {
      return;
    }

    this.editor = editor;
    this.editorView = atom.views.getView(this.editor);

    this.editorSubscriptions = new CompositeDisposable();
    this.editorSubscriptions.add(
      this.editor.onDidChangeCursorPosition(this.onCursorMove)
    );

    if (this.editorView.hasFocus())
      this.onCursorMove();
  }

  // EVENT HANDLERS

  onCursorMove(_event?: CursorPositionChangedEvent) {
    if (this.cursorMoveTimer !== undefined) {
      clearTimeout(this.cursorMoveTimer);
      this.cursorMoveTimer === undefined;
    }

    if (this.editor) {
      let layer = this.getOrCreateMarkerLayerForEditor(this.editor);
      layer.clear();
    }

    if (this.isTyping) {
      console.log('User is typing, so wait longer than usual…');
    }
    this.cursorMoveTimer = setTimeout(
      async () => {
        await this.requestReferencesUnderCursor();
      },
      // When the user is typing, wait at least as long as the typing delay
      // window.
      this.isTyping ? TYPING_DELAY : this.cursorMoveDelay
    );
  }

  // FIND REFERENCES

  async requestReferencesForPanel() {
    let editor = this.editor;
    if (!editor) return;

    let references = await this.getReferencesForProject(editor);
    if (!references) return;
    this.showReferencesPanel(references);
  }

  showReferencesPanel(result: FindReferencesReturn) {
    if (result.type !== 'data') return;

    // HACK
    ReferencesView.setReferences(result.references, result.referencedSymbolName);

    let splitDirection = this.splitDirection === 'none' ? undefined : this.splitDirection;
    if (this.splitDirection === undefined) {
      splitDirection = 'right';
    }

    return atom.workspace.open(
      // Vary the URL so that different reference lookups tend to use different
      // views. We don't want to force everything to use the same view
      // instance.
      `${ReferencesView.URI}/${result.referencedSymbolName}`,
      {
        searchAllPanes: true,
        split: splitDirection
      }
    );
  }

  async getReferencesForProject(editor: TextEditor): Promise<FindReferencesReturn | null> {
    let provider = this.providerRegistry.getFirstProviderForEditor(editor);
    if (!provider) return Promise.resolve(null);

    let position = this.getCursorPositionForEditor(editor);
    if (!position) return Promise.resolve(null);

    return provider.findReferences(editor, position);
  }

  async requestReferencesUnderCursor(force: boolean = false) {
    let editor = this.editor;
    if (!editor) return;

    return this.findReferencesForVisibleEditors(editor, force);
  }

  async findReferencesForVisibleEditors(mainEditor: TextEditor, force: boolean = false) {
    let visibleEditors = this.getVisibleEditors();

    let editorMap = new Map();
    let referenceMap = new Map();

    for (let editor of visibleEditors) {
      // More than one visible editor can be pointing to the same path.
      let path = editor.getPath();
      if (!editorMap.has(path)) {
        editorMap.set(path, []);
      }
      editorMap.get(path).push(editor);
    }

    let provider = this.providerRegistry.getFirstProviderForEditor(mainEditor);
    if (!provider) return;

    let cursors = mainEditor.getCursors();
    if (cursors.length > 1) return;
    let [cursor] = cursors;
    let position = cursor.getBufferPosition();

    let result = await provider.findReferences(mainEditor, position);
    if (!result) return;
    if (result.type === 'error') {
      console.error(`Error getting references: ${result?.message ?? 'null'}`);
      this.clearAllVisibleScrollGutters();
      return;
    }

    console.warn('REFERENCES:', result.references);

    ReferencesView.setReferences(result.references, result.referencedSymbolName);

    for (let reference of result.references) {
      let { uri } = reference;
      if (!referenceMap.has(uri)) {
        referenceMap.set(uri, []);
      }
      referenceMap.get(uri).push(reference);
    }

    for (let path of editorMap.keys()) {
      let editors = editorMap.get(path);
      let references = referenceMap.get(path);
      for (let editor of editors) {
        this.highlightReferences(editor, references ?? [], force);
      }
    }
  }

  async findReferences(event: CommandEvent<TextEditorElement>) {
    let editor = event.currentTarget.getModel();
    if (!atom.workspace.isTextEditor(editor)) {
      return event.abortKeyBinding();
    }
    return this.findReferencesForVisibleEditors(editor);
  }

  highlightReferences(editor: TextEditor, references: Reference[] | null, force: boolean = false) {
    let editorMarkerLayer = this.getOrCreateMarkerLayerForEditor(editor);
    if (editorMarkerLayer.isDestroyed()) return;
    editorMarkerLayer.clear();
    let cursorPosition = editor.getLastCursor().getBufferPosition();

    if (this.enableEditorDecoration || force) {
      let filteredReferences: Reference[] = [];
      let rangeSet = new Set<string>();
      let currentPath = editor.getPath();
      for (let reference of (references ?? [])) {
        let { range, uri } = reference;
        let key = range.toString();
        if (uri !== currentPath) continue;
        if (rangeSet.has(key)) continue;
        if (this.skipCurrentReference && range.containsPoint(cursorPosition))
          continue;

        rangeSet.add(key);
        filteredReferences.push(reference);
      }

      for (let { range } of filteredReferences) {
        editorMarkerLayer.markBufferRange(range);
      }

      editor.decorateMarkerLayer(editorMarkerLayer, {
        type: 'highlight',
        class: 'pulsar-find-references-reference'
      });
    }

    this.updateScrollGutter(editor, references);
  }

  getCursorPositionForEditor(editor: TextEditor): Point | null {
    let cursors = editor.getCursors();
    if (cursors.length > 1) return null;
    let [cursor] = cursors;
    let position = cursor.getBufferPosition();
    return position;
  }

  getOrCreateMarkerLayerForEditor(editor: TextEditor) {
    let layer = this.markerLayersForEditors.get(editor);
    if (!layer) {
      layer = editor.addMarkerLayer();
      this.markerLayersForEditors.set(editor, layer);
    }
    return layer;
  }

  // SCROLL GUTTER

  getOrCreateScrollGutterForEditor(editor: TextEditor) {
    let element = this.scrollGuttersForEditors.get(editor);
    if (!element) {
      element = new ScrollGutter();
      let editorView = atom.views.getView(editor);
      this.scrollGuttersForEditors.set(editor, element);

      let onVisibilityChange = (event: Event) => {
        return this.onScrollGutterVisibilityChange(event as ScrollGutterVisibilityEvent);
      };

      editorView.addEventListener('visibility-changed', onVisibilityChange);

      this.subscriptions.add(
        new Disposable(() => {
          editorView.removeEventListener('visibility-changed', onVisibilityChange);
        })
      );

      element.attachToEditor(editor);
    }
    return element;
  }

  /**
   * Sets an attribute on `atom-text-editor` whenever a `scroll-gutter` element
   * is present. This allows us to define custom scrollbar opacity styles.
   */
  onScrollGutterVisibilityChange(event: ScrollGutterVisibilityEvent) {
    let { detail: { visible, editor } } = event;

    let editorView = atom.views.getView(editor);
    editorView.setAttribute(
      'with-pulsar-find-references-scroll-gutter',
      visible ? 'active' : 'inactive'
    );
  }

  clearAllVisibleScrollGutters() {
    let editors = this.getVisibleEditors();
    for (let editor of editors) {
      this.updateScrollGutter(editor, null);
    }
  }

  updateScrollGutter(editor: TextEditor, references: Reference[] | null) {
    if (!this.enableScrollbarDecoration) return;

    let element = this.getOrCreateScrollGutterForEditor(editor);
    if (!element) return;

    element.highlightReferences(references);
  }

  // UTIL

  getVisibleEditors(): TextEditor[] {
    let editors: TextEditor[] = [];
    let panes = atom.workspace.getPanes();
    panes.forEach(pane => {
      let item = pane.getActiveItem();
      if (atom.workspace.isTextEditor(item)) {
        editors.push(item);
      }
    });

    return editors;
  }
}
