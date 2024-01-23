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
        return atom.workspace.open(references_view_1.default.URI, {
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
            console.warn('REFERENCES:', result.references);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFFMUIsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQXdCeEM7UUF2Qk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsOEJBQXlCLEdBQVksSUFBSSxDQUFDO1FBQzFDLG1CQUFjLEdBQW1CLE1BQU0sQ0FBQztRQUV4QywyQkFBc0IsR0FBWSxJQUFJLENBQUM7UUFDdkMseUJBQW9CLEdBQVksSUFBSSxDQUFDO1FBQ3JDLG9CQUFlLEdBQVcsR0FBRyxDQUFDO1FBTXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxnQkFBMEM7UUFDbkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUs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QyxFQUFFO1lBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGO0FBN2FELHdDQTZhQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIERpc3BsYXlNYXJrZXJMYXllcixcbiAgRGlzcG9zYWJsZSxcbiAgUG9pbnQsXG4gIFRleHRFZGl0b3IsXG4gIFRleHRFZGl0b3JFbGVtZW50LFxuICBDb21tYW5kRXZlbnQsXG4gIEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50XG59IGZyb20gJ2F0b20nO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyIH0gZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMuZCc7XG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUmV0dXJuLCBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCBQcm92aWRlclJlZ2lzdHJ5IGZyb20gJy4vcHJvdmlkZXItcmVnaXN0cnknO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuaW1wb3J0IFJlZmVyZW5jZXNWaWV3IGZyb20gJy4vcmVmZXJlbmNlLXBhbmVsL3JlZmVyZW5jZXMtdmlldyc7XG5cbi8vIEhvdyBsb25nIGFmdGVyIHRoZSB1c2VyIGxhc3QgdHlwZWQgYSBjaGFyYWN0ZXIgYmVmb3JlIHdlIGNvbnNpZGVyIHRoZW0gdG8gbm9cbi8vIGxvbmdlciBiZSB0eXBpbmcuXG5jb25zdCBUWVBJTkdfREVMQVkgPSAxMDAwO1xuXG5pbXBvcnQge1xuICBkZWZhdWx0IGFzIFNjcm9sbEd1dHRlcixcbiAgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50XG59IGZyb20gJy4vZWxlbWVudHMvc2Nyb2xsLWd1dHRlcic7XG5cbnR5cGUgU3BsaXREaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyB8ICdub25lJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmluZFJlZmVyZW5jZXNNYW5hZ2VyIHtcbiAgcHVibGljIGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwdWJsaWMgZWRpdG9yVmlldzogVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGlzVHlwaW5nOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHVibGljIHByb3ZpZGVyUmVnaXN0cnk6IFByb3ZpZGVyUmVnaXN0cnk8RmluZFJlZmVyZW5jZXNQcm92aWRlcj4gPSBuZXcgUHJvdmlkZXJSZWdpc3RyeSgpO1xuXG4gIHByaXZhdGUgZWRpdG9yU3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHdhdGNoZWRFZGl0b3JzOiBXZWFrU2V0PFRleHRFZGl0b3I+ID0gbmV3IFdlYWtTZXQoKTtcbiAgcHJpdmF0ZSBtYXJrZXJMYXllcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIERpc3BsYXlNYXJrZXJMYXllcj4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIHNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIFNjcm9sbEd1dHRlcj4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIHByaXZhdGUgZW5hYmxlU2Nyb2xsYmFyRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgc3BsaXREaXJlY3Rpb246IFNwbGl0RGlyZWN0aW9uID0gJ25vbmUnO1xuXG4gIHByaXZhdGUgZW5hYmxlRWRpdG9yRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgc2tpcEN1cnJlbnRSZWZlcmVuY2U6IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIGN1cnNvck1vdmVEZWxheTogbnVtYmVyID0gMjAwO1xuXG4gIHByaXZhdGUgY3Vyc29yTW92ZVRpbWVyPzogTm9kZUpTLlRpbWVvdXQgfCBudW1iZXI7XG4gIHByaXZhdGUgdHlwaW5nVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9uQ3Vyc29yTW92ZSA9IHRoaXMub25DdXJzb3JNb3ZlLmJpbmQodGhpcyk7XG4gIH1cblxuICBpbml0aWFsaXplKHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSkge1xuICAgIHdoaWxlIChwZW5kaW5nUHJvdmlkZXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHByb3ZpZGVyID0gcGVuZGluZ1Byb3ZpZGVycy5zaGlmdCgpO1xuICAgICAgaWYgKCFwcm92aWRlcikgY29udGludWU7XG4gICAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICAgIH1cblxuICAgIGF0b20ud29ya3NwYWNlLmFkZE9wZW5lcihmaWxlUGF0aCA9PiB7XG4gICAgICBpZiAoZmlsZVBhdGguaW5kZXhPZihSZWZlcmVuY2VzVmlldy5VUkkpICE9PSAtMSlcbiAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzVmlldygpO1xuXG4gICAgICByZXR1cm47XG4gICAgfSk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKGVkaXRvciA9PiB7XG4gICAgICAgIGxldCBkaXNwb3NhYmxlID0gdGhpcy53YXRjaEVkaXRvcihlZGl0b3IpO1xuICAgICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IGRpc3Bvc2FibGU/LmRpc3Bvc2UoKSk7XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXRleHQtZWRpdG9yJywge1xuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlczpoaWdobGlnaHQnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlczpzaG93LXBhbmVsJzogKF9ldmVudDogQ29tbWFuZEV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdFJlZmVyZW5jZXNGb3JQYW5lbCgpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnBhbmVsLnNwbGl0RGlyZWN0aW9uJyxcbiAgICAgICAgKHZhbHVlOiBTcGxpdERpcmVjdGlvbikgPT4ge1xuICAgICAgICAgIHRoaXMuc3BsaXREaXJlY3Rpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnNjcm9sbGJhckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmVuYWJsZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5kZWxheScsXG4gICAgICAgICh2YWx1ZTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgdGhpcy5jdXJzb3JNb3ZlRGVsYXkgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmVkaXRvckRlY29yYXRpb24uc2tpcEN1cnJlbnRSZWZlcmVuY2UnLFxuICAgICAgICAodmFsdWU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICB0aGlzLnNraXBDdXJyZW50UmVmZXJlbmNlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgKTtcbiAgfVxuXG5cblxuICBhZGRQcm92aWRlcihwcm92aWRlcjogRmluZFJlZmVyZW5jZXNQcm92aWRlcikge1xuICAgIHRoaXMucHJvdmlkZXJSZWdpc3RyeS5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gIH1cblxuICBkaXNwb3NlKCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICB9XG5cbiAgLy8gRURJVE9SIE1BTkFHRU1FTlRcblxuICB3YXRjaEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBpZiAodGhpcy53YXRjaGVkRWRpdG9ycy5oYXMoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgaWYgKGVkaXRvclZpZXcuaGFzRm9jdXMoKSkgdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG5cbiAgICBsZXQgb25Gb2N1cyA9ICgpID0+IHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3IpO1xuICAgIGxldCBvbkJsdXIgPSAoKSA9PiB7fTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgb25CbHVyKTtcblxuICAgIGxldCBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICAgIGxldCBkaXNwb3NhYmxlID0gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uRm9jdXMpO1xuICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdibHVyJywgb25CbHVyKTtcblxuICAgICAgaWYgKHRoaXMuZWRpdG9yID09PSBlZGl0b3IpIHtcbiAgICAgICAgdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBkaXNwb3NhYmxlLFxuICAgICAgZWRpdG9yLmdldEJ1ZmZlcigpLm9uRGlkQ2hhbmdlKCgpID0+IHtcbiAgICAgICAgdGhpcy5pc1R5cGluZyA9IHRydWU7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnR5cGluZ1RpbWVyKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgICAgdGhpcy50eXBpbmdUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgKCkgPT4gdGhpcy5pc1R5cGluZyA9IGZhbHNlLFxuICAgICAgICAgIDEwMDBcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIHRoaXMud2F0Y2hlZEVkaXRvcnMuYWRkKGVkaXRvcik7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChkaXNwb3NhYmxlKTtcblxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5yZW1vdmUoZGlzcG9zYWJsZSk7XG4gICAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmRlbGV0ZShlZGl0b3IpO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsKSB7XG4gICAgaWYgKGVkaXRvciA9PT0gdGhpcy5lZGl0b3IpIHJldHVybjtcblxuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucyA9IG51bGw7XG5cbiAgICB0aGlzLmVkaXRvciA9IHRoaXMuZWRpdG9yVmlldyA9IG51bGw7XG5cbiAgICBpZiAoZWRpdG9yID09PSBudWxsIHx8ICFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmVkaXRvcik7XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKHRoaXMub25DdXJzb3JNb3ZlKVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5lZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpXG4gICAgICB0aGlzLm9uQ3Vyc29yTW92ZSgpO1xuICB9XG5cbiAgLy8gRVZFTlQgSEFORExFUlNcblxuICBvbkN1cnNvck1vdmUoX2V2ZW50PzogQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnQpIHtcbiAgICBpZiAodGhpcy5jdXJzb3JNb3ZlVGltZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID09PSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZWRpdG9yKSB7XG4gICAgICBsZXQgbGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IodGhpcy5lZGl0b3IpO1xuICAgICAgbGF5ZXIuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1R5cGluZykge1xuICAgICAgY29uc29sZS5sb2coJ1VzZXIgaXMgdHlwaW5nLCBzbyB3YWl0IGxvbmdlciB0aGFuIHVzdWFs4oCmJyk7XG4gICAgfVxuICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID0gc2V0VGltZW91dChcbiAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKCk7XG4gICAgICB9LFxuICAgICAgLy8gV2hlbiB0aGUgdXNlciBpcyB0eXBpbmcsIHdhaXQgYXQgbGVhc3QgYXMgbG9uZyBhcyB0aGUgdHlwaW5nIGRlbGF5XG4gICAgICAvLyB3aW5kb3cuXG4gICAgICB0aGlzLmlzVHlwaW5nID8gVFlQSU5HX0RFTEFZIDogdGhpcy5jdXJzb3JNb3ZlRGVsYXlcbiAgICApO1xuICB9XG5cbiAgLy8gRklORCBSRUZFUkVOQ0VTXG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNGb3JQYW5lbCgpIHtcbiAgICBsZXQgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gICAgaWYgKCFlZGl0b3IpIHJldHVybjtcblxuICAgIGxldCByZWZlcmVuY2VzID0gYXdhaXQgdGhpcy5nZXRSZWZlcmVuY2VzRm9yUHJvamVjdChlZGl0b3IpO1xuICAgIGlmICghcmVmZXJlbmNlcykgcmV0dXJuO1xuICAgIHRoaXMuc2hvd1JlZmVyZW5jZXNQYW5lbChyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIHNob3dSZWZlcmVuY2VzUGFuZWwocmVzdWx0OiBGaW5kUmVmZXJlbmNlc1JldHVybikge1xuICAgIGlmIChyZXN1bHQudHlwZSAhPT0gJ2RhdGEnKSByZXR1cm47XG5cbiAgICAvLyBIQUNLXG4gICAgUmVmZXJlbmNlc1ZpZXcuc2V0UmVmZXJlbmNlcyhyZXN1bHQucmVmZXJlbmNlcywgcmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lKTtcblxuICAgIGxldCBzcGxpdERpcmVjdGlvbiA9IHRoaXMuc3BsaXREaXJlY3Rpb24gPT09ICdub25lJyA/IHVuZGVmaW5lZCA6IHRoaXMuc3BsaXREaXJlY3Rpb247XG4gICAgaWYgKHRoaXMuc3BsaXREaXJlY3Rpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3BsaXREaXJlY3Rpb24gPSAncmlnaHQnO1xuICAgIH1cblxuICAgIHJldHVybiBhdG9tLndvcmtzcGFjZS5vcGVuKFxuICAgICAgUmVmZXJlbmNlc1ZpZXcuVVJJLFxuICAgICAge1xuICAgICAgICBzZWFyY2hBbGxQYW5lczogdHJ1ZSxcbiAgICAgICAgc3BsaXQ6IHNwbGl0RGlyZWN0aW9uXG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGdldFJlZmVyZW5jZXNGb3JQcm9qZWN0KGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8RmluZFJlZmVyZW5jZXNSZXR1cm4gfCBudWxsPiB7XG4gICAgbGV0IHByb3ZpZGVyID0gdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmdldEZpcnN0UHJvdmlkZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXG4gICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJzb3JQb3NpdGlvbkZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghcG9zaXRpb24pIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG5cbiAgICByZXR1cm4gcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMoZWRpdG9yLCBwb3NpdGlvbik7XG4gIH1cblxuICBhc3luYyByZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBsZXQgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gICAgaWYgKCFlZGl0b3IpIHJldHVybjtcblxuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMoZWRpdG9yLCBmb3JjZSk7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKG1haW5FZGl0b3I6IFRleHRFZGl0b3IsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBsZXQgdmlzaWJsZUVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG5cbiAgICBsZXQgZWRpdG9yTWFwID0gbmV3IE1hcCgpO1xuICAgIGxldCByZWZlcmVuY2VNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGxldCBlZGl0b3Igb2YgdmlzaWJsZUVkaXRvcnMpIHtcbiAgICAgIC8vIE1vcmUgdGhhbiBvbmUgdmlzaWJsZSBlZGl0b3IgY2FuIGJlIHBvaW50aW5nIHRvIHRoZSBzYW1lIHBhdGguXG4gICAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBpZiAoIWVkaXRvck1hcC5oYXMocGF0aCkpIHtcbiAgICAgICAgZWRpdG9yTWFwLnNldChwYXRoLCBbXSk7XG4gICAgICB9XG4gICAgICBlZGl0b3JNYXAuZ2V0KHBhdGgpLnB1c2goZWRpdG9yKTtcbiAgICB9XG5cbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihtYWluRWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm47XG5cbiAgICBsZXQgY3Vyc29ycyA9IG1haW5FZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybjtcbiAgICBsZXQgW2N1cnNvcl0gPSBjdXJzb3JzO1xuICAgIGxldCBwb3NpdGlvbiA9IGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpO1xuXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKG1haW5FZGl0b3IsIHBvc2l0aW9uKTtcblxuICAgIGlmICghcmVzdWx0KSByZXR1cm47XG5cbiAgICBpZiAocmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVmZXJlbmNlczogJHtyZXN1bHQ/Lm1lc3NhZ2UgPz8gJ251bGwnfWApO1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS53YXJuKCdSRUZFUkVOQ0VTOicsIHJlc3VsdC5yZWZlcmVuY2VzKTtcblxuICAgIFJlZmVyZW5jZXNWaWV3LnNldFJlZmVyZW5jZXMocmVzdWx0LnJlZmVyZW5jZXMsIHJlc3VsdC5yZWZlcmVuY2VkU3ltYm9sTmFtZSk7XG5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVzdWx0LnJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKCFyZWZlcmVuY2VNYXAuaGFzKHVyaSkpIHtcbiAgICAgICAgcmVmZXJlbmNlTWFwLnNldCh1cmksIFtdKTtcbiAgICAgIH1cbiAgICAgIHJlZmVyZW5jZU1hcC5nZXQodXJpKS5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcGF0aCBvZiBlZGl0b3JNYXAua2V5cygpKSB7XG4gICAgICBsZXQgZWRpdG9ycyA9IGVkaXRvck1hcC5nZXQocGF0aCk7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IHJlZmVyZW5jZU1hcC5nZXQocGF0aCk7XG4gICAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yLCByZWZlcmVuY2VzID8/IFtdLCBmb3JjZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCBlZGl0b3JNYXJrZXJMYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmIChlZGl0b3JNYXJrZXJMYXllci5pc0Rlc3Ryb3llZCgpKSByZXR1cm47XG4gICAgZWRpdG9yTWFya2VyTGF5ZXIuY2xlYXIoKTtcbiAgICBsZXQgY3Vyc29yUG9zaXRpb24gPSBlZGl0b3IuZ2V0TGFzdEN1cnNvcigpLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBpZiAodGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uIHx8IGZvcmNlKSB7XG4gICAgICBsZXQgZmlsdGVyZWRSZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgICAgbGV0IHJhbmdlU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBsZXQgY3VycmVudFBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIChyZWZlcmVuY2VzID8/IFtdKSkge1xuICAgICAgICBsZXQgeyByYW5nZSwgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICAgIGxldCBrZXkgPSByYW5nZS50b1N0cmluZygpO1xuICAgICAgICBpZiAodXJpICE9PSBjdXJyZW50UGF0aCkgY29udGludWU7XG4gICAgICAgIGlmIChyYW5nZVNldC5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgIGlmICh0aGlzLnNraXBDdXJyZW50UmVmZXJlbmNlICYmIHJhbmdlLmNvbnRhaW5zUG9pbnQoY3Vyc29yUG9zaXRpb24pKVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHJhbmdlU2V0LmFkZChrZXkpO1xuICAgICAgICBmaWx0ZXJlZFJlZmVyZW5jZXMucHVzaChyZWZlcmVuY2UpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCB7IHJhbmdlIH0gb2YgZmlsdGVyZWRSZWZlcmVuY2VzKSB7XG4gICAgICAgIGVkaXRvck1hcmtlckxheWVyLm1hcmtCdWZmZXJSYW5nZShyYW5nZSk7XG4gICAgICB9XG5cbiAgICAgIGVkaXRvci5kZWNvcmF0ZU1hcmtlckxheWVyKGVkaXRvck1hcmtlckxheWVyLCB7XG4gICAgICAgIHR5cGU6ICdoaWdobGlnaHQnLFxuICAgICAgICBjbGFzczogJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMtcmVmZXJlbmNlJ1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yLCByZWZlcmVuY2VzKTtcbiAgfVxuXG4gIGdldEN1cnNvclBvc2l0aW9uRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcik6IFBvaW50IHwgbnVsbCB7XG4gICAgbGV0IGN1cnNvcnMgPSBlZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybiBudWxsO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG4gICAgcmV0dXJuIHBvc2l0aW9uO1xuICB9XG5cbiAgZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgbGF5ZXIgPSB0aGlzLm1hcmtlckxheWVyc0ZvckVkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgaWYgKCFsYXllcikge1xuICAgICAgbGF5ZXIgPSBlZGl0b3IuYWRkTWFya2VyTGF5ZXIoKTtcbiAgICAgIHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBsYXllcik7XG4gICAgfVxuICAgIHJldHVybiBsYXllcjtcbiAgfVxuXG4gIC8vIFNDUk9MTCBHVVRURVJcblxuICBnZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICBlbGVtZW50ID0gbmV3IFNjcm9sbEd1dHRlcigpO1xuICAgICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICAgIHRoaXMuc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnMuc2V0KGVkaXRvciwgZWxlbWVudCk7XG5cbiAgICAgIGxldCBvblZpc2liaWxpdHlDaGFuZ2UgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudCBhcyBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpO1xuICAgICAgfTtcblxuICAgICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuXG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgZWxlbWVudC5hdHRhY2hUb0VkaXRvcihlZGl0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGFuIGF0dHJpYnV0ZSBvbiBgYXRvbS10ZXh0LWVkaXRvcmAgd2hlbmV2ZXIgYSBgc2Nyb2xsLWd1dHRlcmAgZWxlbWVudFxuICAgKiBpcyBwcmVzZW50LiBUaGlzIGFsbG93cyB1cyB0byBkZWZpbmUgY3VzdG9tIHNjcm9sbGJhciBvcGFjaXR5IHN0eWxlcy5cbiAgICovXG4gIG9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudDogU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50KSB7XG4gICAgbGV0IHsgZGV0YWlsOiB7IHZpc2libGUsIGVkaXRvciB9IH0gPSBldmVudDtcblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgZWRpdG9yVmlldy5zZXRBdHRyaWJ1dGUoXG4gICAgICAnd2l0aC1wdWxzYXItZmluZC1yZWZlcmVuY2VzLXNjcm9sbC1ndXR0ZXInLFxuICAgICAgdmlzaWJsZSA/ICdhY3RpdmUnIDogJ2luYWN0aXZlJ1xuICAgICk7XG4gIH1cblxuICBjbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCkge1xuICAgIGxldCBlZGl0b3JzID0gdGhpcy5nZXRWaXNpYmxlRWRpdG9ycygpO1xuICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCkge1xuICAgIGlmICghdGhpcy5lbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uKSByZXR1cm47XG5cbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0T3JDcmVhdGVTY3JvbGxHdXR0ZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHJldHVybjtcblxuICAgIGVsZW1lbnQuaGlnaGxpZ2h0UmVmZXJlbmNlcyhyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIC8vIFVUSUxcblxuICBnZXRWaXNpYmxlRWRpdG9ycygpOiBUZXh0RWRpdG9yW10ge1xuICAgIGxldCBlZGl0b3JzOiBUZXh0RWRpdG9yW10gPSBbXTtcbiAgICBsZXQgcGFuZXMgPSBhdG9tLndvcmtzcGFjZS5nZXRQYW5lcygpO1xuICAgIHBhbmVzLmZvckVhY2gocGFuZSA9PiB7XG4gICAgICBsZXQgaXRlbSA9IHBhbmUuZ2V0QWN0aXZlSXRlbSgpO1xuICAgICAgaWYgKGF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcihpdGVtKSkge1xuICAgICAgICBlZGl0b3JzLnB1c2goaXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZWRpdG9ycztcbiAgfVxufVxuIl19