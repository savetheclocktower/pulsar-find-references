import {
  CompositeDisposable,
  DisplayMarkerLayer,
  Disposable,
  TextEditor,
  TextEditorElement,

  CommandEvent,
  CursorPositionChangedEvent
} from 'atom';
import type { FindReferencesProvider } from './find-references.d';
import type { Reference } from 'atom-ide-base';
import ProviderRegistry from './provider-registry';
import * as console from './console';

import {
  default as ScrollGutter,
  ScrollGutterVisibilityEvent
} from './elements/scroll-gutter';

export default class FindReferencesManager {
  public editor: TextEditor | null = null;
  public editorView: TextEditorElement | null = null;

  private subscriptions: CompositeDisposable = new CompositeDisposable();
  public providerRegistry: ProviderRegistry<FindReferencesProvider> = new ProviderRegistry();

  private editorSubscriptions: CompositeDisposable | null = null;
  private watchedEditors: WeakSet<TextEditor> = new WeakSet();
  private markerLayersForEditors: WeakMap<TextEditor, DisplayMarkerLayer> = new WeakMap();
  private scrollGuttersForEditors: WeakMap<TextEditor, ScrollGutter> = new WeakMap();

  private showMatchesBehindScrollbar: boolean = true;

  private cursorMoveTimer?: NodeJS.Timeout | number;

  constructor() {
    this.onCursorMove = this.onCursorMove.bind(this);
  }

  initialize(pendingProviders: FindReferencesProvider[]) {
    while (pendingProviders.length) {
      let provider = pendingProviders.shift();
      if (!provider) continue;
      this.providerRegistry.addProvider(provider);
    }

    this.subscriptions.add(
      atom.workspace.observeTextEditors(editor => {
        let disposable = this.watchEditor(editor);
        editor.onDidDestroy(() => disposable?.dispose());
      }),
      atom.commands.add('atom-text-editor', {
        'pulsar-find-references': (event) => {
          return this.findReferences(event);
        }
      }),
      atom.config.observe(
        'pulsar-find-references.scrollbarDecoration.enable',
        (value) => {
          this.showMatchesBehindScrollbar = value;
          console.log('showMatchesBehindScrollbar is now', value);
        }
      )
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
    console.log('watchEditor:', editor);
    if (this.watchedEditors.has(editor)) {
      console.warn('Already has!', editor);
      return;
    }

    let editorView = atom.views.getView(editor);
    if (editorView.hasFocus()) this.updateCurrentEditor(editor);

    let onFocus = () => this.updateCurrentEditor(editor);
    let onBlur = () => {};
    editorView.addEventListener('focus', onFocus);
    editorView.addEventListener('blur', onBlur);

    let disposable = new Disposable(() => {
      editorView.removeEventListener('focus', onFocus);
      editorView.removeEventListener('blur', onBlur);

      if (this.editor === editor) {
        this.updateCurrentEditor(null);
      }
    });

    this.watchedEditors.add(editor);
    this.subscriptions.add(disposable);

    return new Disposable(() => {
      disposable.dispose();
      this.subscriptions.remove(disposable);
      this.watchedEditors.delete(editor);
    });
  }

  updateCurrentEditor(editor: TextEditor | null) {
    console.log('updateCurrentEditor:', editor);
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

  onCursorMove(event?: CursorPositionChangedEvent) {
    if (this.cursorMoveTimer !== undefined) {
      clearTimeout(this.cursorMoveTimer);
      this.cursorMoveTimer === undefined;
    }

    if (this.editor) {
      let layer = this.getOrCreateMarkerLayerForEditor(this.editor);
      layer.clear();
    }

    this.cursorMoveTimer = setTimeout(
      async (_event: CursorPositionChangedEvent) => {
        await this.requestReferencesUnderCursor();
      },
      100,
      event ?? ''
    );
  }

  // FIND REFERENCES

  async requestReferencesUnderCursor() {
    let editor = this.editor;
    if (!editor) return;

    return this.findReferencesForVisibleEditors(editor);
  }

  async findReferencesForEditor(editor: TextEditor) {
    let provider = this.providerRegistry.getFirstProviderForEditor(editor);

    if (!provider) return;

    let cursors = editor.getCursors();
    if (cursors.length > 1) return;

    let [cursor] = cursors;
    let position = cursor.getBufferPosition();

    let result = await provider.findReferences(editor, position);

    console.log('result:', result);

    if (!result || result.type === 'error') {
      console.log('error!');
      // TODO
      this.clearAllVisibleScrollGutters();
      // this.updateScrollGutter(editor, null);
      return;
    }

    this.highlightReferences(editor, result.references);
  }

  async findReferencesForVisibleEditors(mainEditor: TextEditor) {
    let visibleEditors = this.getVisibleEditors();
    console.log('visibleEditors:', visibleEditors);
    let editorMap = new Map();
    let referenceMap = new Map();
    for (let editor of visibleEditors) {
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

    if (!result || result.type === 'error') {
      console.error(`Error getting references: ${result?.message ?? 'null'}`);
      this.clearAllVisibleScrollGutters();
      return;
    }

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
        this.highlightReferences(editor, references ?? []);
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

  highlightReferences(editor: TextEditor, references: Reference[]) {
    let editorMarkerLayer = this.getOrCreateMarkerLayerForEditor(editor);
    editorMarkerLayer.clear();
    let currentPath = editor.getPath();
    for (let reference of references) {
      let { range, uri } = reference;
      if (uri !== currentPath) continue;
      editorMarkerLayer.markBufferRange(range);
    }

    editor.decorateMarkerLayer(editorMarkerLayer, {
      type: 'highlight',
      class: 'pulsar-find-references-reference'
    });

    if (this.showMatchesBehindScrollbar) {
      console.log('showing matches behind scrollbar!');
      this.updateScrollGutter(editor, references);
    }
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
        console.warn('onVisibilityChange received!');
        return this.onScrollGutterVisibilityChange(event as ScrollGutterVisibilityEvent);
      };
      console.warn('LISTENING for visibility-changed');
      editorView.addEventListener('visibility-changed', onVisibilityChange);
      this.subscriptions.add(
        new Disposable(() => {
          console.warn('UNLISTENING for visibility-changed');
          editorView.removeEventListener('visibility-changed', onVisibilityChange);
        })
      );
    }
    return element;
  }

  onScrollGutterVisibilityChange(event: ScrollGutterVisibilityEvent) {
    let { detail: { visible, editor } } = event;

    let editorView = atom.views.getView(editor);
    console.warn('visible?', visible, event.detail);
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
    let element = this.getOrCreateScrollGutterForEditor(editor);
    if (!element) return;

    element.attachToEditor(editor);
    console.log('ELEMENT references:', references);
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
