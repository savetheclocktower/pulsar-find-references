"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const provider_registry_1 = __importDefault(require("./provider-registry"));
const console = __importStar(require("./console"));
const references_view_1 = __importDefault(require("./reference-panel/references-view"));
// How long after the user last typed a character before we consider them to no
// longer be typing.
const TYPING_DELAY = 1000;
const scroll_gutter_1 = __importDefault(require("./elements/scroll-gutter"));
class FindReferencesManager {
    constructor() {
        this.editor = null;
        this.editorView = null;
        this.isTyping = false;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.providerRegistry = new provider_registry_1.default();
        this.editorSubscriptions = null;
        this.watchedEditors = new WeakSet();
        this.markerLayersForEditors = new WeakMap();
        this.scrollGuttersForEditors = new WeakMap();
        this.enableScrollbarDecoration = true;
        this.splitDirection = 'none';
        this.enableEditorDecoration = true;
        this.skipCurrentReference = true;
        this.ignoreThreshold = 0;
        this.cursorMoveDelay = 200;
        this.onCursorMove = this.onCursorMove.bind(this);
    }
    initialize(pendingProviders) {
        while (pendingProviders.length) {
            let provider = pendingProviders.shift();
            if (!provider)
                continue;
            this.providerRegistry.addProvider(provider);
        }
        atom.workspace.addOpener(filePath => {
            if (filePath.indexOf(references_view_1.default.URI) !== -1)
                return new references_view_1.default();
            return;
        });
        this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
            let disposable = this.watchEditor(editor);
            editor.onDidDestroy(() => disposable === null || disposable === void 0 ? void 0 : disposable.dispose());
        }), atom.commands.add('atom-text-editor', {
            'pulsar-find-references:highlight': (_event) => {
                return this.requestReferencesUnderCursor(true);
            },
            'pulsar-find-references:show-panel': (_event) => {
                return this.requestReferencesForPanel();
            }
        }), atom.config.observe('pulsar-find-references.panel.splitDirection', (value) => {
            this.splitDirection = value;
        }), atom.config.observe('pulsar-find-references.scrollbarDecoration.enable', (value) => {
            this.enableScrollbarDecoration = value;
        }), atom.config.observe('pulsar-find-references.editorDecoration.enable', (value) => {
            this.enableEditorDecoration = value;
        }), atom.config.observe('pulsar-find-references.editorDecoration.delay', (value) => {
            this.cursorMoveDelay = value;
        }), atom.config.observe('pulsar-find-references.editorDecoration.ignoreThreshold', (value) => {
            this.ignoreThreshold = value;
        }), atom.config.observe('pulsar-find-references.editorDecoration.skipCurrentReference', (value) => {
            this.skipCurrentReference = value;
        }));
    }
    addProvider(provider) {
        this.providerRegistry.addProvider(provider);
    }
    dispose() {
        var _a;
        (_a = this.subscriptions) === null || _a === void 0 ? void 0 : _a.dispose();
    }
    // EDITOR MANAGEMENT
    watchEditor(editor) {
        if (this.watchedEditors.has(editor)) {
            return;
        }
        let editorView = atom.views.getView(editor);
        if (editorView.hasFocus())
            this.updateCurrentEditor(editor);
        let onFocus = () => this.updateCurrentEditor(editor);
        let onBlur = () => { };
        editorView.addEventListener('focus', onFocus);
        editorView.addEventListener('blur', onBlur);
        let subscriptions = new atom_1.CompositeDisposable();
        let disposable = new atom_1.Disposable(() => {
            editorView.removeEventListener('focus', onFocus);
            editorView.removeEventListener('blur', onBlur);
            if (this.editor === editor) {
                this.updateCurrentEditor(null);
            }
        });
        subscriptions.add(disposable, editor.getBuffer().onDidChange(() => {
            this.isTyping = true;
            clearTimeout(this.typingTimer);
            clearTimeout(this.cursorMoveTimer);
            this.typingTimer = setTimeout(() => this.isTyping = false, 1000);
        }));
        this.watchedEditors.add(editor);
        this.subscriptions.add(disposable);
        return new atom_1.Disposable(() => {
            subscriptions.dispose();
            this.subscriptions.remove(disposable);
            this.watchedEditors.delete(editor);
        });
    }
    updateCurrentEditor(editor) {
        var _a;
        if (editor === this.editor)
            return;
        (_a = this.editorSubscriptions) === null || _a === void 0 ? void 0 : _a.dispose();
        this.editorSubscriptions = null;
        this.editor = this.editorView = null;
        if (editor === null || !atom.workspace.isTextEditor(editor)) {
            return;
        }
        this.editor = editor;
        this.editorView = atom.views.getView(this.editor);
        this.editorSubscriptions = new atom_1.CompositeDisposable();
        this.editorSubscriptions.add(this.editor.onDidChangeCursorPosition(this.onCursorMove));
        if (this.editorView.hasFocus())
            this.onCursorMove();
    }
    // EVENT HANDLERS
    onCursorMove(_event) {
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
        this.cursorMoveTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.requestReferencesUnderCursor();
        }), 
        // When the user is typing, wait at least as long as the typing delay
        // window.
        this.isTyping ? TYPING_DELAY : this.cursorMoveDelay);
    }
    // FIND REFERENCES
    requestReferencesForPanel() {
        return __awaiter(this, void 0, void 0, function* () {
            let editor = this.editor;
            if (!editor)
                return;
            let references = yield this.getReferencesForProject(editor);
            if (!references)
                return;
            this.showReferencesPanel(references);
        });
    }
    showReferencesPanel(result) {
        if (result.type !== 'data')
            return;
        // HACK
        references_view_1.default.setReferences(result.references, result.referencedSymbolName);
        let splitDirection = this.splitDirection === 'none' ? undefined : this.splitDirection;
        if (this.splitDirection === undefined) {
            splitDirection = 'right';
        }
        return atom.workspace.open(
        // Vary the URL so that different reference lookups tend to use different
        // views. We don't want to force everything to use the same view
        // instance.
        `${references_view_1.default.URI}/${result.referencedSymbolName}`, {
            searchAllPanes: true,
            split: splitDirection
        });
    }
    getReferencesForProject(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider = this.providerRegistry.getFirstProviderForEditor(editor);
            if (!provider)
                return Promise.resolve(null);
            let position = this.getCursorPositionForEditor(editor);
            if (!position)
                return Promise.resolve(null);
            return provider.findReferences(editor, position);
        });
    }
    requestReferencesUnderCursor(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let editor = this.editor;
            if (!editor)
                return;
            return this.findReferencesForVisibleEditors(editor, force);
        });
    }
    findReferencesForVisibleEditors(mainEditor, force = false) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
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
            if (!provider)
                return;
            let cursors = mainEditor.getCursors();
            if (cursors.length > 1)
                return;
            let [cursor] = cursors;
            let position = cursor.getBufferPosition();
            let result = yield provider.findReferences(mainEditor, position);
            if (!result)
                return;
            if (result.type === 'error') {
                console.error(`Error getting references: ${(_a = result === null || result === void 0 ? void 0 : result.message) !== null && _a !== void 0 ? _a : 'null'}`);
                this.clearAllVisibleScrollGutters();
                return;
            }
            console.debug('REFERENCES:', result.references);
            references_view_1.default.setReferences(result.references, result.referencedSymbolName);
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
                    this.highlightReferences(editor, references !== null && references !== void 0 ? references : [], force);
                }
            }
        });
    }
    findReferences(event) {
        return __awaiter(this, void 0, void 0, function* () {
            let editor = event.currentTarget.getModel();
            if (!atom.workspace.isTextEditor(editor)) {
                return event.abortKeyBinding();
            }
            return this.findReferencesForVisibleEditors(editor);
        });
    }
    highlightReferences(editor, references, force = false) {
        let editorMarkerLayer = this.getOrCreateMarkerLayerForEditor(editor);
        let lineCount = editor.getBuffer().getLineCount();
        if (editorMarkerLayer.isDestroyed())
            return;
        editorMarkerLayer.clear();
        let cursorPosition = editor.getLastCursor().getBufferPosition();
        if (this.enableEditorDecoration || force) {
            let filteredReferences = [];
            let rangeSet = new Set();
            let currentPath = editor.getPath();
            for (let reference of (references !== null && references !== void 0 ? references : [])) {
                let { range, uri } = reference;
                let key = range.toString();
                if (uri !== currentPath)
                    continue;
                if (rangeSet.has(key))
                    continue;
                if (this.skipCurrentReference && range.containsPoint(cursorPosition))
                    continue;
                rangeSet.add(key);
                filteredReferences.push(reference);
            }
            // Compare how many references we have to the number of buffer lines. If
            // it's over a configurable quotient, then the language server may be
            // giving us references for something really mundane, like `true` or
            // `div`. This can be a performance issue (Pulsar seems not to like to
            // have _lots_ of marker decorations) and it's also a sign that the
            // references themselves won't be very helpful.
            if (this.ignoreThreshold > 0 && (filteredReferences.length / lineCount) >= this.ignoreThreshold) {
                this.updateScrollGutter(editor, []);
                return;
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
    getCursorPositionForEditor(editor) {
        let cursors = editor.getCursors();
        if (cursors.length > 1)
            return null;
        let [cursor] = cursors;
        let position = cursor.getBufferPosition();
        return position;
    }
    getOrCreateMarkerLayerForEditor(editor) {
        let layer = this.markerLayersForEditors.get(editor);
        if (!layer) {
            layer = editor.addMarkerLayer();
            this.markerLayersForEditors.set(editor, layer);
        }
        return layer;
    }
    // SCROLL GUTTER
    getOrCreateScrollGutterForEditor(editor) {
        let element = this.scrollGuttersForEditors.get(editor);
        if (!element) {
            element = new scroll_gutter_1.default();
            let editorView = atom.views.getView(editor);
            this.scrollGuttersForEditors.set(editor, element);
            let onVisibilityChange = (event) => {
                return this.onScrollGutterVisibilityChange(event);
            };
            editorView.addEventListener('visibility-changed', onVisibilityChange);
            this.subscriptions.add(new atom_1.Disposable(() => {
                editorView.removeEventListener('visibility-changed', onVisibilityChange);
            }));
            element.attachToEditor(editor);
        }
        return element;
    }
    /**
     * Sets an attribute on `atom-text-editor` whenever a `scroll-gutter` element
     * is present. This allows us to define custom scrollbar opacity styles.
     */
    onScrollGutterVisibilityChange(event) {
        let { detail: { visible, editor } } = event;
        let editorView = atom.views.getView(editor);
        editorView.setAttribute('with-pulsar-find-references-scroll-gutter', visible ? 'active' : 'inactive');
    }
    clearAllVisibleScrollGutters() {
        let editors = this.getVisibleEditors();
        for (let editor of editors) {
            this.updateScrollGutter(editor, null);
        }
    }
    updateScrollGutter(editor, references) {
        if (!this.enableScrollbarDecoration)
            return;
        let element = this.getOrCreateScrollGutterForEditor(editor);
        if (!element)
            return;
        element.highlightReferences(references);
    }
    // UTIL
    getVisibleEditors() {
        let editors = [];
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
exports.default = FindReferencesManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFFMUIsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQXlCeEM7UUF4Qk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsOEJBQXlCLEdBQVksSUFBSSxDQUFDO1FBQzFDLG1CQUFjLEdBQW1CLE1BQU0sQ0FBQztRQUV4QywyQkFBc0IsR0FBWSxJQUFJLENBQUM7UUFDdkMseUJBQW9CLEdBQVksSUFBSSxDQUFDO1FBQ3JDLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBQzVCLG9CQUFlLEdBQVcsR0FBRyxDQUFDO1FBTXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxnQkFBMEM7UUFDbkQs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SUFFRCw0QkFBNEI7UUFDMUIsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDdkMsS0FBSyxJQUFJLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLENBQUM7SUFDSCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsTUFBa0IsRUFBRSxVQUE4QjtRQUNuRSxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QjtZQUFFLE9BQU87UUFFNUMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTztRQUVyQixPQUFPLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELE9BQU87SUFFUCxpQkFBaUI7UUFDZixJQUFJLE9BQU8sR0FBaUIsRUFBRSxDQUFDO1FBQy9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FDRjtBQTliRCx3Q0E4YkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBEaXNwbGF5TWFya2VyTGF5ZXIsXG4gIERpc3Bvc2FibGUsXG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxuICBUZXh0RWRpdG9yRWxlbWVudCxcbiAgQ29tbWFuZEV2ZW50LFxuICBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNQcm92aWRlciB9IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1JldHVybiwgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgUHJvdmlkZXJSZWdpc3RyeSBmcm9tICcuL3Byb3ZpZGVyLXJlZ2lzdHJ5JztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcbmltcG9ydCBSZWZlcmVuY2VzVmlldyBmcm9tICcuL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcnO1xuXG4vLyBIb3cgbG9uZyBhZnRlciB0aGUgdXNlciBsYXN0IHR5cGVkIGEgY2hhcmFjdGVyIGJlZm9yZSB3ZSBjb25zaWRlciB0aGVtIHRvIG5vXG4vLyBsb25nZXIgYmUgdHlwaW5nLlxuY29uc3QgVFlQSU5HX0RFTEFZID0gMTAwMDtcblxuaW1wb3J0IHtcbiAgZGVmYXVsdCBhcyBTY3JvbGxHdXR0ZXIsXG4gIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudFxufSBmcm9tICcuL2VsZW1lbnRzL3Njcm9sbC1ndXR0ZXInO1xuXG50eXBlIFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCAnbm9uZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbmRSZWZlcmVuY2VzTWFuYWdlciB7XG4gIHB1YmxpYyBlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsID0gbnVsbDtcbiAgcHVibGljIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBpc1R5cGluZzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gIHB1YmxpYyBwcm92aWRlclJlZ2lzdHJ5OiBQcm92aWRlclJlZ2lzdHJ5PEZpbmRSZWZlcmVuY2VzUHJvdmlkZXI+ID0gbmV3IFByb3ZpZGVyUmVnaXN0cnkoKTtcblxuICBwcml2YXRlIGVkaXRvclN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB3YXRjaGVkRWRpdG9yczogV2Vha1NldDxUZXh0RWRpdG9yPiA9IG5ldyBXZWFrU2V0KCk7XG4gIHByaXZhdGUgbWFya2VyTGF5ZXJzRm9yRWRpdG9yczogV2Vha01hcDxUZXh0RWRpdG9yLCBEaXNwbGF5TWFya2VyTGF5ZXI+ID0gbmV3IFdlYWtNYXAoKTtcbiAgcHJpdmF0ZSBzY3JvbGxHdXR0ZXJzRm9yRWRpdG9yczogV2Vha01hcDxUZXh0RWRpdG9yLCBTY3JvbGxHdXR0ZXI+ID0gbmV3IFdlYWtNYXAoKTtcblxuICBwcml2YXRlIGVuYWJsZVNjcm9sbGJhckRlY29yYXRpb246IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbiA9ICdub25lJztcblxuICBwcml2YXRlIGVuYWJsZUVkaXRvckRlY29yYXRpb246IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIHNraXBDdXJyZW50UmVmZXJlbmNlOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBpZ25vcmVUaHJlc2hvbGQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgY3Vyc29yTW92ZURlbGF5OiBudW1iZXIgPSAyMDA7XG5cbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcbiAgcHJpdmF0ZSB0eXBpbmdUaW1lcj86IE5vZGVKUy5UaW1lb3V0IHwgbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMub25DdXJzb3JNb3ZlID0gdGhpcy5vbkN1cnNvck1vdmUuYmluZCh0aGlzKTtcbiAgfVxuXG4gIGluaXRpYWxpemUocGVuZGluZ1Byb3ZpZGVyczogRmluZFJlZmVyZW5jZXNQcm92aWRlcltdKSB7XG4gICAgd2hpbGUgKHBlbmRpbmdQcm92aWRlcnMubGVuZ3RoKSB7XG4gICAgICBsZXQgcHJvdmlkZXIgPSBwZW5kaW5nUHJvdmlkZXJzLnNoaWZ0KCk7XG4gICAgICBpZiAoIXByb3ZpZGVyKSBjb250aW51ZTtcbiAgICAgIHRoaXMucHJvdmlkZXJSZWdpc3RyeS5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gICAgfVxuXG4gICAgYXRvbS53b3Jrc3BhY2UuYWRkT3BlbmVyKGZpbGVQYXRoID0+IHtcbiAgICAgIGlmIChmaWxlUGF0aC5pbmRleE9mKFJlZmVyZW5jZXNWaWV3LlVSSSkgIT09IC0xKVxuICAgICAgICByZXR1cm4gbmV3IFJlZmVyZW5jZXNWaWV3KCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9KTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yID0+IHtcbiAgICAgICAgbGV0IGRpc3Bvc2FibGUgPSB0aGlzLndhdGNoRWRpdG9yKGVkaXRvcik7XG4gICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gZGlzcG9zYWJsZT8uZGlzcG9zZSgpKTtcbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCB7XG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOmhpZ2hsaWdodCc6IChfZXZlbnQ6IENvbW1hbmRFdmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOnNob3ctcGFuZWwnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc0ZvclBhbmVsKCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMucGFuZWwuc3BsaXREaXJlY3Rpb24nLFxuICAgICAgICAodmFsdWU6IFNwbGl0RGlyZWN0aW9uKSA9PiB7XG4gICAgICAgICAgdGhpcy5zcGxpdERpcmVjdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuc2Nyb2xsYmFyRGVjb3JhdGlvbi5lbmFibGUnLFxuICAgICAgICAodmFsdWU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICB0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmVkaXRvckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmRlbGF5JyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmN1cnNvck1vdmVEZWxheSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5pZ25vcmVUaHJlc2hvbGQnLFxuICAgICAgICAodmFsdWU6IG51bWJlcikgPT4ge1xuICAgICAgICAgIHRoaXMuaWdub3JlVGhyZXNob2xkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLnNraXBDdXJyZW50UmVmZXJlbmNlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5za2lwQ3VycmVudFJlZmVyZW5jZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICk7XG4gIH1cblxuICBhZGRQcm92aWRlcihwcm92aWRlcjogRmluZFJlZmVyZW5jZXNQcm92aWRlcikge1xuICAgIHRoaXMucHJvdmlkZXJSZWdpc3RyeS5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gIH1cblxuICBkaXNwb3NlKCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICB9XG5cbiAgLy8gRURJVE9SIE1BTkFHRU1FTlRcblxuICB3YXRjaEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBpZiAodGhpcy53YXRjaGVkRWRpdG9ycy5oYXMoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgaWYgKGVkaXRvclZpZXcuaGFzRm9jdXMoKSkgdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG5cbiAgICBsZXQgb25Gb2N1cyA9ICgpID0+IHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3IpO1xuICAgIGxldCBvbkJsdXIgPSAoKSA9PiB7fTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgb25CbHVyKTtcblxuICAgIGxldCBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICAgIGxldCBkaXNwb3NhYmxlID0gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uRm9jdXMpO1xuICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdibHVyJywgb25CbHVyKTtcblxuICAgICAgaWYgKHRoaXMuZWRpdG9yID09PSBlZGl0b3IpIHtcbiAgICAgICAgdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBkaXNwb3NhYmxlLFxuICAgICAgZWRpdG9yLmdldEJ1ZmZlcigpLm9uRGlkQ2hhbmdlKCgpID0+IHtcbiAgICAgICAgdGhpcy5pc1R5cGluZyA9IHRydWU7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnR5cGluZ1RpbWVyKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgICAgdGhpcy50eXBpbmdUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgKCkgPT4gdGhpcy5pc1R5cGluZyA9IGZhbHNlLFxuICAgICAgICAgIDEwMDBcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIHRoaXMud2F0Y2hlZEVkaXRvcnMuYWRkKGVkaXRvcik7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChkaXNwb3NhYmxlKTtcblxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5yZW1vdmUoZGlzcG9zYWJsZSk7XG4gICAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmRlbGV0ZShlZGl0b3IpO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsKSB7XG4gICAgaWYgKGVkaXRvciA9PT0gdGhpcy5lZGl0b3IpIHJldHVybjtcblxuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucyA9IG51bGw7XG5cbiAgICB0aGlzLmVkaXRvciA9IHRoaXMuZWRpdG9yVmlldyA9IG51bGw7XG5cbiAgICBpZiAoZWRpdG9yID09PSBudWxsIHx8ICFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmVkaXRvcik7XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKHRoaXMub25DdXJzb3JNb3ZlKVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5lZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpXG4gICAgICB0aGlzLm9uQ3Vyc29yTW92ZSgpO1xuICB9XG5cbiAgLy8gRVZFTlQgSEFORExFUlNcblxuICBvbkN1cnNvck1vdmUoX2V2ZW50PzogQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnQpIHtcbiAgICBpZiAodGhpcy5jdXJzb3JNb3ZlVGltZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID09PSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZWRpdG9yKSB7XG4gICAgICBsZXQgbGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IodGhpcy5lZGl0b3IpO1xuICAgICAgbGF5ZXIuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1R5cGluZykge1xuICAgICAgY29uc29sZS5sb2coJ1VzZXIgaXMgdHlwaW5nLCBzbyB3YWl0IGxvbmdlciB0aGFuIHVzdWFs4oCmJyk7XG4gICAgfVxuICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID0gc2V0VGltZW91dChcbiAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKCk7XG4gICAgICB9LFxuICAgICAgLy8gV2hlbiB0aGUgdXNlciBpcyB0eXBpbmcsIHdhaXQgYXQgbGVhc3QgYXMgbG9uZyBhcyB0aGUgdHlwaW5nIGRlbGF5XG4gICAgICAvLyB3aW5kb3cuXG4gICAgICB0aGlzLmlzVHlwaW5nID8gVFlQSU5HX0RFTEFZIDogdGhpcy5jdXJzb3JNb3ZlRGVsYXlcbiAgICApO1xuICB9XG5cbiAgLy8gRklORCBSRUZFUkVOQ0VTXG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNGb3JQYW5lbCgpIHtcbiAgICBsZXQgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gICAgaWYgKCFlZGl0b3IpIHJldHVybjtcblxuICAgIGxldCByZWZlcmVuY2VzID0gYXdhaXQgdGhpcy5nZXRSZWZlcmVuY2VzRm9yUHJvamVjdChlZGl0b3IpO1xuICAgIGlmICghcmVmZXJlbmNlcykgcmV0dXJuO1xuICAgIHRoaXMuc2hvd1JlZmVyZW5jZXNQYW5lbChyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIHNob3dSZWZlcmVuY2VzUGFuZWwocmVzdWx0OiBGaW5kUmVmZXJlbmNlc1JldHVybikge1xuICAgIGlmIChyZXN1bHQudHlwZSAhPT0gJ2RhdGEnKSByZXR1cm47XG5cbiAgICAvLyBIQUNLXG4gICAgUmVmZXJlbmNlc1ZpZXcuc2V0UmVmZXJlbmNlcyhyZXN1bHQucmVmZXJlbmNlcywgcmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lKTtcblxuICAgIGxldCBzcGxpdERpcmVjdGlvbiA9IHRoaXMuc3BsaXREaXJlY3Rpb24gPT09ICdub25lJyA/IHVuZGVmaW5lZCA6IHRoaXMuc3BsaXREaXJlY3Rpb247XG4gICAgaWYgKHRoaXMuc3BsaXREaXJlY3Rpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3BsaXREaXJlY3Rpb24gPSAncmlnaHQnO1xuICAgIH1cblxuICAgIHJldHVybiBhdG9tLndvcmtzcGFjZS5vcGVuKFxuICAgICAgLy8gVmFyeSB0aGUgVVJMIHNvIHRoYXQgZGlmZmVyZW50IHJlZmVyZW5jZSBsb29rdXBzIHRlbmQgdG8gdXNlIGRpZmZlcmVudFxuICAgICAgLy8gdmlld3MuIFdlIGRvbid0IHdhbnQgdG8gZm9yY2UgZXZlcnl0aGluZyB0byB1c2UgdGhlIHNhbWUgdmlld1xuICAgICAgLy8gaW5zdGFuY2UuXG4gICAgICBgJHtSZWZlcmVuY2VzVmlldy5VUkl9LyR7cmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lfWAsXG4gICAgICB7XG4gICAgICAgIHNlYXJjaEFsbFBhbmVzOiB0cnVlLFxuICAgICAgICBzcGxpdDogc3BsaXREaXJlY3Rpb25cbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgYXN5bmMgZ2V0UmVmZXJlbmNlc0ZvclByb2plY3QoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTxGaW5kUmVmZXJlbmNlc1JldHVybiB8IG51bGw+IHtcbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG5cbiAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnNvclBvc2l0aW9uRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFwb3NpdGlvbikgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblxuICAgIHJldHVybiBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhlZGl0b3IsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCBlZGl0b3IgPSB0aGlzLmVkaXRvcjtcbiAgICBpZiAoIWVkaXRvcikgcmV0dXJuO1xuXG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IsIGZvcmNlKTtcbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMobWFpbkVkaXRvcjogVGV4dEVkaXRvciwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCB2aXNpYmxlRWRpdG9ycyA9IHRoaXMuZ2V0VmlzaWJsZUVkaXRvcnMoKTtcblxuICAgIGxldCBlZGl0b3JNYXAgPSBuZXcgTWFwKCk7XG4gICAgbGV0IHJlZmVyZW5jZU1hcCA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAobGV0IGVkaXRvciBvZiB2aXNpYmxlRWRpdG9ycykge1xuICAgICAgLy8gTW9yZSB0aGFuIG9uZSB2aXNpYmxlIGVkaXRvciBjYW4gYmUgcG9pbnRpbmcgdG8gdGhlIHNhbWUgcGF0aC5cbiAgICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGlmICghZWRpdG9yTWFwLmhhcyhwYXRoKSkge1xuICAgICAgICBlZGl0b3JNYXAuc2V0KHBhdGgsIFtdKTtcbiAgICAgIH1cbiAgICAgIGVkaXRvck1hcC5nZXQocGF0aCkucHVzaChlZGl0b3IpO1xuICAgIH1cblxuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKG1haW5FZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybjtcblxuICAgIGxldCBjdXJzb3JzID0gbWFpbkVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMobWFpbkVkaXRvciwgcG9zaXRpb24pO1xuICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgaWYgKHJlc3VsdC50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIHJlZmVyZW5jZXM6ICR7cmVzdWx0Py5tZXNzYWdlID8/ICdudWxsJ31gKTtcbiAgICAgIHRoaXMuY2xlYXJBbGxWaXNpYmxlU2Nyb2xsR3V0dGVycygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUuZGVidWcoJ1JFRkVSRU5DRVM6JywgcmVzdWx0LnJlZmVyZW5jZXMpO1xuICAgIFJlZmVyZW5jZXNWaWV3LnNldFJlZmVyZW5jZXMocmVzdWx0LnJlZmVyZW5jZXMsIHJlc3VsdC5yZWZlcmVuY2VkU3ltYm9sTmFtZSk7XG5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVzdWx0LnJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKCFyZWZlcmVuY2VNYXAuaGFzKHVyaSkpIHtcbiAgICAgICAgcmVmZXJlbmNlTWFwLnNldCh1cmksIFtdKTtcbiAgICAgIH1cbiAgICAgIHJlZmVyZW5jZU1hcC5nZXQodXJpKS5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcGF0aCBvZiBlZGl0b3JNYXAua2V5cygpKSB7XG4gICAgICBsZXQgZWRpdG9ycyA9IGVkaXRvck1hcC5nZXQocGF0aCk7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IHJlZmVyZW5jZU1hcC5nZXQocGF0aCk7XG4gICAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yLCByZWZlcmVuY2VzID8/IFtdLCBmb3JjZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCBlZGl0b3JNYXJrZXJMYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGxldCBsaW5lQ291bnQgPSBlZGl0b3IuZ2V0QnVmZmVyKCkuZ2V0TGluZUNvdW50KCk7XG4gICAgaWYgKGVkaXRvck1hcmtlckxheWVyLmlzRGVzdHJveWVkKCkpIHJldHVybjtcbiAgICBlZGl0b3JNYXJrZXJMYXllci5jbGVhcigpO1xuICAgIGxldCBjdXJzb3JQb3NpdGlvbiA9IGVkaXRvci5nZXRMYXN0Q3Vyc29yKCkuZ2V0QnVmZmVyUG9zaXRpb24oKTtcblxuICAgIGlmICh0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gfHwgZm9yY2UpIHtcbiAgICAgIGxldCBmaWx0ZXJlZFJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgICBsZXQgcmFuZ2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGxldCBjdXJyZW50UGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgKHJlZmVyZW5jZXMgPz8gW10pKSB7XG4gICAgICAgIGxldCB7IHJhbmdlLCB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgICAgbGV0IGtleSA9IHJhbmdlLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmICh1cmkgIT09IGN1cnJlbnRQYXRoKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHJhbmdlU2V0LmhhcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHRoaXMuc2tpcEN1cnJlbnRSZWZlcmVuY2UgJiYgcmFuZ2UuY29udGFpbnNQb2ludChjdXJzb3JQb3NpdGlvbikpXG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgcmFuZ2VTZXQuYWRkKGtleSk7XG4gICAgICAgIGZpbHRlcmVkUmVmZXJlbmNlcy5wdXNoKHJlZmVyZW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbXBhcmUgaG93IG1hbnkgcmVmZXJlbmNlcyB3ZSBoYXZlIHRvIHRoZSBudW1iZXIgb2YgYnVmZmVyIGxpbmVzLiBJZlxuICAgICAgLy8gaXQncyBvdmVyIGEgY29uZmlndXJhYmxlIHF1b3RpZW50LCB0aGVuIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgbWF5IGJlXG4gICAgICAvLyBnaXZpbmcgdXMgcmVmZXJlbmNlcyBmb3Igc29tZXRoaW5nIHJlYWxseSBtdW5kYW5lLCBsaWtlIGB0cnVlYCBvclxuICAgICAgLy8gYGRpdmAuIFRoaXMgY2FuIGJlIGEgcGVyZm9ybWFuY2UgaXNzdWUgKFB1bHNhciBzZWVtcyBub3QgdG8gbGlrZSB0b1xuICAgICAgLy8gaGF2ZSBfbG90c18gb2YgbWFya2VyIGRlY29yYXRpb25zKSBhbmQgaXQncyBhbHNvIGEgc2lnbiB0aGF0IHRoZVxuICAgICAgLy8gcmVmZXJlbmNlcyB0aGVtc2VsdmVzIHdvbid0IGJlIHZlcnkgaGVscGZ1bC5cbiAgICAgIGlmICh0aGlzLmlnbm9yZVRocmVzaG9sZCA+IDAgJiYgKGZpbHRlcmVkUmVmZXJlbmNlcy5sZW5ndGggLyBsaW5lQ291bnQpID49IHRoaXMuaWdub3JlVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgW10pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IHsgcmFuZ2UgfSBvZiBmaWx0ZXJlZFJlZmVyZW5jZXMpIHtcbiAgICAgICAgZWRpdG9yTWFya2VyTGF5ZXIubWFya0J1ZmZlclJhbmdlKHJhbmdlKTtcbiAgICAgIH1cblxuICAgICAgZWRpdG9yLmRlY29yYXRlTWFya2VyTGF5ZXIoZWRpdG9yTWFya2VyTGF5ZXIsIHtcbiAgICAgICAgdHlwZTogJ2hpZ2hsaWdodCcsXG4gICAgICAgIGNsYXNzOiAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1yZWZlcmVuY2UnXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogUG9pbnQgfCBudWxsIHtcbiAgICBsZXQgY3Vyc29ycyA9IGVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuIG51bGw7XG4gICAgbGV0IFtjdXJzb3JdID0gY3Vyc29ycztcbiAgICBsZXQgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKTtcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICBnZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBsYXllciA9IHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGVkaXRvci5hZGRNYXJrZXJMYXllcigpO1xuICAgICAgdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGxheWVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxheWVyO1xuICB9XG5cbiAgLy8gU0NST0xMIEdVVFRFUlxuXG4gIGdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBuZXcgU2Nyb2xsR3V0dGVyKCk7XG4gICAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgICAgdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBlbGVtZW50KTtcblxuICAgICAgbGV0IG9uVmlzaWJpbGl0eUNoYW5nZSA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50IGFzIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBlbGVtZW50LmF0dGFjaFRvRWRpdG9yKGVkaXRvcik7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYW4gYXR0cmlidXRlIG9uIGBhdG9tLXRleHQtZWRpdG9yYCB3aGVuZXZlciBhIGBzY3JvbGwtZ3V0dGVyYCBlbGVtZW50XG4gICAqIGlzIHByZXNlbnQuIFRoaXMgYWxsb3dzIHVzIHRvIGRlZmluZSBjdXN0b20gc2Nyb2xsYmFyIG9wYWNpdHkgc3R5bGVzLlxuICAgKi9cbiAgb25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50OiBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpIHtcbiAgICBsZXQgeyBkZXRhaWw6IHsgdmlzaWJsZSwgZWRpdG9yIH0gfSA9IGV2ZW50O1xuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBlZGl0b3JWaWV3LnNldEF0dHJpYnV0ZShcbiAgICAgICd3aXRoLXB1bHNhci1maW5kLXJlZmVyZW5jZXMtc2Nyb2xsLWd1dHRlcicsXG4gICAgICB2aXNpYmxlID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnXG4gICAgKTtcbiAgfVxuXG4gIGNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKSB7XG4gICAgbGV0IGVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24pIHJldHVybjtcblxuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgZWxlbWVudC5oaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgLy8gVVRJTFxuXG4gIGdldFZpc2libGVFZGl0b3JzKCk6IFRleHRFZGl0b3JbXSB7XG4gICAgbGV0IGVkaXRvcnM6IFRleHRFZGl0b3JbXSA9IFtdO1xuICAgIGxldCBwYW5lcyA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVzKCk7XG4gICAgcGFuZXMuZm9yRWFjaChwYW5lID0+IHtcbiAgICAgIGxldCBpdGVtID0gcGFuZS5nZXRBY3RpdmVJdGVtKCk7XG4gICAgICBpZiAoYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGl0ZW0pKSB7XG4gICAgICAgIGVkaXRvcnMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlZGl0b3JzO1xuICB9XG59XG4iXX0=