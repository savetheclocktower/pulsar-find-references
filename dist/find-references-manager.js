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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFFMUIsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQXdCeEM7UUF2Qk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsOEJBQXlCLEdBQVksSUFBSSxDQUFDO1FBQzFDLG1CQUFjLEdBQW1CLE1BQU0sQ0FBQztRQUV4QywyQkFBc0IsR0FBWSxJQUFJLENBQUM7UUFDdkMseUJBQW9CLEdBQVksSUFBSSxDQUFDO1FBQ3JDLG9CQUFlLEdBQVcsR0FBRyxDQUFDO1FBTXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxnQkFBMEM7UUFDbkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUs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QUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUE5YUQsd0NBOGFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlckxheWVyLFxuICBEaXNwb3NhYmxlLFxuICBQb2ludCxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnQsXG4gIENvbW1hbmRFdmVudCxcbiAgQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnRcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIgfSBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy5kJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNSZXR1cm4sIFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IFByb3ZpZGVyUmVnaXN0cnkgZnJvbSAnLi9wcm92aWRlci1yZWdpc3RyeSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5pbXBvcnQgUmVmZXJlbmNlc1ZpZXcgZnJvbSAnLi9yZWZlcmVuY2UtcGFuZWwvcmVmZXJlbmNlcy12aWV3JztcblxuLy8gSG93IGxvbmcgYWZ0ZXIgdGhlIHVzZXIgbGFzdCB0eXBlZCBhIGNoYXJhY3RlciBiZWZvcmUgd2UgY29uc2lkZXIgdGhlbSB0byBub1xuLy8gbG9uZ2VyIGJlIHR5cGluZy5cbmNvbnN0IFRZUElOR19ERUxBWSA9IDEwMDA7XG5cbmltcG9ydCB7XG4gIGRlZmF1bHQgYXMgU2Nyb2xsR3V0dGVyLFxuICBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnRcbn0gZnJvbSAnLi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyJztcblxudHlwZSBTcGxpdERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIHwgJ25vbmUnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaW5kUmVmZXJlbmNlc01hbmFnZXIge1xuICBwdWJsaWMgZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCA9IG51bGw7XG4gIHB1YmxpYyBlZGl0b3JWaWV3OiBUZXh0RWRpdG9yRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgaXNUeXBpbmc6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwdWJsaWMgcHJvdmlkZXJSZWdpc3RyeTogUHJvdmlkZXJSZWdpc3RyeTxGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiA9IG5ldyBQcm92aWRlclJlZ2lzdHJ5KCk7XG5cbiAgcHJpdmF0ZSBlZGl0b3JTdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgd2F0Y2hlZEVkaXRvcnM6IFdlYWtTZXQ8VGV4dEVkaXRvcj4gPSBuZXcgV2Vha1NldCgpO1xuICBwcml2YXRlIG1hcmtlckxheWVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgRGlzcGxheU1hcmtlckxheWVyPiA9IG5ldyBXZWFrTWFwKCk7XG4gIHByaXZhdGUgc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgU2Nyb2xsR3V0dGVyPiA9IG5ldyBXZWFrTWFwKCk7XG5cbiAgcHJpdmF0ZSBlbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBzcGxpdERpcmVjdGlvbjogU3BsaXREaXJlY3Rpb24gPSAnbm9uZSc7XG5cbiAgcHJpdmF0ZSBlbmFibGVFZGl0b3JEZWNvcmF0aW9uOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBza2lwQ3VycmVudFJlZmVyZW5jZTogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgY3Vyc29yTW92ZURlbGF5OiBudW1iZXIgPSAyMDA7XG5cbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcbiAgcHJpdmF0ZSB0eXBpbmdUaW1lcj86IE5vZGVKUy5UaW1lb3V0IHwgbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMub25DdXJzb3JNb3ZlID0gdGhpcy5vbkN1cnNvck1vdmUuYmluZCh0aGlzKTtcbiAgfVxuXG4gIGluaXRpYWxpemUocGVuZGluZ1Byb3ZpZGVyczogRmluZFJlZmVyZW5jZXNQcm92aWRlcltdKSB7XG4gICAgd2hpbGUgKHBlbmRpbmdQcm92aWRlcnMubGVuZ3RoKSB7XG4gICAgICBsZXQgcHJvdmlkZXIgPSBwZW5kaW5nUHJvdmlkZXJzLnNoaWZ0KCk7XG4gICAgICBpZiAoIXByb3ZpZGVyKSBjb250aW51ZTtcbiAgICAgIHRoaXMucHJvdmlkZXJSZWdpc3RyeS5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gICAgfVxuXG4gICAgYXRvbS53b3Jrc3BhY2UuYWRkT3BlbmVyKGZpbGVQYXRoID0+IHtcbiAgICAgIGlmIChmaWxlUGF0aC5pbmRleE9mKFJlZmVyZW5jZXNWaWV3LlVSSSkgIT09IC0xKVxuICAgICAgICByZXR1cm4gbmV3IFJlZmVyZW5jZXNWaWV3KCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9KTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yID0+IHtcbiAgICAgICAgbGV0IGRpc3Bvc2FibGUgPSB0aGlzLndhdGNoRWRpdG9yKGVkaXRvcik7XG4gICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gZGlzcG9zYWJsZT8uZGlzcG9zZSgpKTtcbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCB7XG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOmhpZ2hsaWdodCc6IChfZXZlbnQ6IENvbW1hbmRFdmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOnNob3ctcGFuZWwnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc0ZvclBhbmVsKCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMucGFuZWwuc3BsaXREaXJlY3Rpb24nLFxuICAgICAgICAodmFsdWU6IFNwbGl0RGlyZWN0aW9uKSA9PiB7XG4gICAgICAgICAgdGhpcy5zcGxpdERpcmVjdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuc2Nyb2xsYmFyRGVjb3JhdGlvbi5lbmFibGUnLFxuICAgICAgICAodmFsdWU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICB0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmVkaXRvckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmRlbGF5JyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmN1cnNvck1vdmVEZWxheSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5za2lwQ3VycmVudFJlZmVyZW5jZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuc2tpcEN1cnJlbnRSZWZlcmVuY2UgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICApO1xuICB9XG5cblxuXG4gIGFkZFByb3ZpZGVyKHByb3ZpZGVyOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyKSB7XG4gICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfVxuXG4gIGRpc3Bvc2UoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zPy5kaXNwb3NlKCk7XG4gIH1cblxuICAvLyBFRElUT1IgTUFOQUdFTUVOVFxuXG4gIHdhdGNoRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGlmICh0aGlzLndhdGNoZWRFZGl0b3JzLmhhcyhlZGl0b3IpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBpZiAoZWRpdG9yVmlldy5oYXNGb2N1cygpKSB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcblxuICAgIGxldCBvbkZvY3VzID0gKCkgPT4gdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG4gICAgbGV0IG9uQmx1ciA9ICgpID0+IHt9O1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgbGV0IHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuXG4gICAgbGV0IGRpc3Bvc2FibGUgPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgICBpZiAodGhpcy5lZGl0b3IgPT09IGVkaXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IobnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGRpc3Bvc2FibGUsXG4gICAgICBlZGl0b3IuZ2V0QnVmZmVyKCkub25EaWRDaGFuZ2UoKCkgPT4ge1xuICAgICAgICB0aGlzLmlzVHlwaW5nID0gdHJ1ZTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudHlwaW5nVGltZXIpO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5jdXJzb3JNb3ZlVGltZXIpO1xuICAgICAgICB0aGlzLnR5cGluZ1RpbWVyID0gc2V0VGltZW91dChcbiAgICAgICAgICAoKSA9PiB0aGlzLmlzVHlwaW5nID0gZmFsc2UsXG4gICAgICAgICAgMTAwMFxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgdGhpcy53YXRjaGVkRWRpdG9ycy5hZGQoZWRpdG9yKTtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKGRpc3Bvc2FibGUpO1xuXG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIHN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpO1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnJlbW92ZShkaXNwb3NhYmxlKTtcbiAgICAgIHRoaXMud2F0Y2hlZEVkaXRvcnMuZGVsZXRlKGVkaXRvcik7XG4gICAgfSk7XG4gIH1cblxuICB1cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwpIHtcbiAgICBpZiAoZWRpdG9yID09PSB0aGlzLmVkaXRvcikgcmV0dXJuO1xuXG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zPy5kaXNwb3NlKCk7XG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zID0gbnVsbDtcblxuICAgIHRoaXMuZWRpdG9yID0gdGhpcy5lZGl0b3JWaWV3ID0gbnVsbDtcblxuICAgIGlmIChlZGl0b3IgPT09IG51bGwgfHwgIWF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcihlZGl0b3IpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lZGl0b3IgPSBlZGl0b3I7XG4gICAgdGhpcy5lZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KHRoaXMuZWRpdG9yKTtcblxuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIHRoaXMuZWRpdG9yLm9uRGlkQ2hhbmdlQ3Vyc29yUG9zaXRpb24odGhpcy5vbkN1cnNvck1vdmUpXG4gICAgKTtcblxuICAgIGlmICh0aGlzLmVkaXRvclZpZXcuaGFzRm9jdXMoKSlcbiAgICAgIHRoaXMub25DdXJzb3JNb3ZlKCk7XG4gIH1cblxuICAvLyBFVkVOVCBIQU5ETEVSU1xuXG4gIG9uQ3Vyc29yTW92ZShfZXZlbnQ/OiBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudCkge1xuICAgIGlmICh0aGlzLmN1cnNvck1vdmVUaW1lciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jdXJzb3JNb3ZlVGltZXIpO1xuICAgICAgdGhpcy5jdXJzb3JNb3ZlVGltZXIgPT09IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lZGl0b3IpIHtcbiAgICAgIGxldCBsYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcih0aGlzLmVkaXRvcik7XG4gICAgICBsYXllci5jbGVhcigpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzVHlwaW5nKSB7XG4gICAgICBjb25zb2xlLmxvZygnVXNlciBpcyB0eXBpbmcsIHNvIHdhaXQgbG9uZ2VyIHRoYW4gdXN1YWzigKYnKTtcbiAgICB9XG4gICAgdGhpcy5jdXJzb3JNb3ZlVGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoKTtcbiAgICAgIH0sXG4gICAgICAvLyBXaGVuIHRoZSB1c2VyIGlzIHR5cGluZywgd2FpdCBhdCBsZWFzdCBhcyBsb25nIGFzIHRoZSB0eXBpbmcgZGVsYXlcbiAgICAgIC8vIHdpbmRvdy5cbiAgICAgIHRoaXMuaXNUeXBpbmcgPyBUWVBJTkdfREVMQVkgOiB0aGlzLmN1cnNvck1vdmVEZWxheVxuICAgICk7XG4gIH1cblxuICAvLyBGSU5EIFJFRkVSRU5DRVNcblxuICBhc3luYyByZXF1ZXN0UmVmZXJlbmNlc0ZvclBhbmVsKCkge1xuICAgIGxldCBlZGl0b3IgPSB0aGlzLmVkaXRvcjtcbiAgICBpZiAoIWVkaXRvcikgcmV0dXJuO1xuXG4gICAgbGV0IHJlZmVyZW5jZXMgPSBhd2FpdCB0aGlzLmdldFJlZmVyZW5jZXNGb3JQcm9qZWN0KGVkaXRvcik7XG4gICAgaWYgKCFyZWZlcmVuY2VzKSByZXR1cm47XG4gICAgdGhpcy5zaG93UmVmZXJlbmNlc1BhbmVsKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgc2hvd1JlZmVyZW5jZXNQYW5lbChyZXN1bHQ6IEZpbmRSZWZlcmVuY2VzUmV0dXJuKSB7XG4gICAgaWYgKHJlc3VsdC50eXBlICE9PSAnZGF0YScpIHJldHVybjtcblxuICAgIC8vIEhBQ0tcbiAgICBSZWZlcmVuY2VzVmlldy5zZXRSZWZlcmVuY2VzKHJlc3VsdC5yZWZlcmVuY2VzLCByZXN1bHQucmVmZXJlbmNlZFN5bWJvbE5hbWUpO1xuXG4gICAgbGV0IHNwbGl0RGlyZWN0aW9uID0gdGhpcy5zcGxpdERpcmVjdGlvbiA9PT0gJ25vbmUnID8gdW5kZWZpbmVkIDogdGhpcy5zcGxpdERpcmVjdGlvbjtcbiAgICBpZiAodGhpcy5zcGxpdERpcmVjdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzcGxpdERpcmVjdGlvbiA9ICdyaWdodCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF0b20ud29ya3NwYWNlLm9wZW4oXG4gICAgICAvLyBWYXJ5IHRoZSBVUkwgc28gdGhhdCBkaWZmZXJlbnQgcmVmZXJlbmNlIGxvb2t1cHMgdGVuZCB0byB1c2UgZGlmZmVyZW50XG4gICAgICAvLyB2aWV3cy4gV2UgZG9uJ3Qgd2FudCB0byBmb3JjZSBldmVyeXRoaW5nIHRvIHVzZSB0aGUgc2FtZSB2aWV3XG4gICAgICAvLyBpbnN0YW5jZS5cbiAgICAgIGAke1JlZmVyZW5jZXNWaWV3LlVSSX0vJHtyZXN1bHQucmVmZXJlbmNlZFN5bWJvbE5hbWV9YCxcbiAgICAgIHtcbiAgICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgICAgIHNwbGl0OiBzcGxpdERpcmVjdGlvblxuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBhc3luYyBnZXRSZWZlcmVuY2VzRm9yUHJvamVjdChlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPEZpbmRSZWZlcmVuY2VzUmV0dXJuIHwgbnVsbD4ge1xuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblxuICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIXBvc2l0aW9uKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXG4gICAgcmV0dXJuIHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKGVkaXRvciwgcG9zaXRpb24pO1xuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcihmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgbGV0IGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKGVkaXRvciwgZm9yY2UpO1xuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhtYWluRWRpdG9yOiBUZXh0RWRpdG9yLCBmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgbGV0IHZpc2libGVFZGl0b3JzID0gdGhpcy5nZXRWaXNpYmxlRWRpdG9ycygpO1xuXG4gICAgbGV0IGVkaXRvck1hcCA9IG5ldyBNYXAoKTtcbiAgICBsZXQgcmVmZXJlbmNlTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIHZpc2libGVFZGl0b3JzKSB7XG4gICAgICAvLyBNb3JlIHRoYW4gb25lIHZpc2libGUgZWRpdG9yIGNhbiBiZSBwb2ludGluZyB0byB0aGUgc2FtZSBwYXRoLlxuICAgICAgbGV0IHBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgICAgaWYgKCFlZGl0b3JNYXAuaGFzKHBhdGgpKSB7XG4gICAgICAgIGVkaXRvck1hcC5zZXQocGF0aCwgW10pO1xuICAgICAgfVxuICAgICAgZWRpdG9yTWFwLmdldChwYXRoKS5wdXNoKGVkaXRvcik7XG4gICAgfVxuXG4gICAgbGV0IHByb3ZpZGVyID0gdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmdldEZpcnN0UHJvdmlkZXJGb3JFZGl0b3IobWFpbkVkaXRvcik7XG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuO1xuXG4gICAgbGV0IGN1cnNvcnMgPSBtYWluRWRpdG9yLmdldEN1cnNvcnMoKTtcbiAgICBpZiAoY3Vyc29ycy5sZW5ndGggPiAxKSByZXR1cm47XG4gICAgbGV0IFtjdXJzb3JdID0gY3Vyc29ycztcbiAgICBsZXQgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKTtcblxuICAgIGxldCByZXN1bHQgPSBhd2FpdCBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhtYWluRWRpdG9yLCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHQpIHJldHVybjtcbiAgICBpZiAocmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVmZXJlbmNlczogJHtyZXN1bHQ/Lm1lc3NhZ2UgPz8gJ251bGwnfWApO1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS53YXJuKCdSRUZFUkVOQ0VTOicsIHJlc3VsdC5yZWZlcmVuY2VzKTtcblxuICAgIFJlZmVyZW5jZXNWaWV3LnNldFJlZmVyZW5jZXMocmVzdWx0LnJlZmVyZW5jZXMsIHJlc3VsdC5yZWZlcmVuY2VkU3ltYm9sTmFtZSk7XG5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVzdWx0LnJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKCFyZWZlcmVuY2VNYXAuaGFzKHVyaSkpIHtcbiAgICAgICAgcmVmZXJlbmNlTWFwLnNldCh1cmksIFtdKTtcbiAgICAgIH1cbiAgICAgIHJlZmVyZW5jZU1hcC5nZXQodXJpKS5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcGF0aCBvZiBlZGl0b3JNYXAua2V5cygpKSB7XG4gICAgICBsZXQgZWRpdG9ycyA9IGVkaXRvck1hcC5nZXQocGF0aCk7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IHJlZmVyZW5jZU1hcC5nZXQocGF0aCk7XG4gICAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yLCByZWZlcmVuY2VzID8/IFtdLCBmb3JjZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCBlZGl0b3JNYXJrZXJMYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmIChlZGl0b3JNYXJrZXJMYXllci5pc0Rlc3Ryb3llZCgpKSByZXR1cm47XG4gICAgZWRpdG9yTWFya2VyTGF5ZXIuY2xlYXIoKTtcbiAgICBsZXQgY3Vyc29yUG9zaXRpb24gPSBlZGl0b3IuZ2V0TGFzdEN1cnNvcigpLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBpZiAodGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uIHx8IGZvcmNlKSB7XG4gICAgICBsZXQgZmlsdGVyZWRSZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgICAgbGV0IHJhbmdlU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBsZXQgY3VycmVudFBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIChyZWZlcmVuY2VzID8/IFtdKSkge1xuICAgICAgICBsZXQgeyByYW5nZSwgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICAgIGxldCBrZXkgPSByYW5nZS50b1N0cmluZygpO1xuICAgICAgICBpZiAodXJpICE9PSBjdXJyZW50UGF0aCkgY29udGludWU7XG4gICAgICAgIGlmIChyYW5nZVNldC5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgIGlmICh0aGlzLnNraXBDdXJyZW50UmVmZXJlbmNlICYmIHJhbmdlLmNvbnRhaW5zUG9pbnQoY3Vyc29yUG9zaXRpb24pKVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHJhbmdlU2V0LmFkZChrZXkpO1xuICAgICAgICBmaWx0ZXJlZFJlZmVyZW5jZXMucHVzaChyZWZlcmVuY2UpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCB7IHJhbmdlIH0gb2YgZmlsdGVyZWRSZWZlcmVuY2VzKSB7XG4gICAgICAgIGVkaXRvck1hcmtlckxheWVyLm1hcmtCdWZmZXJSYW5nZShyYW5nZSk7XG4gICAgICB9XG5cbiAgICAgIGVkaXRvci5kZWNvcmF0ZU1hcmtlckxheWVyKGVkaXRvck1hcmtlckxheWVyLCB7XG4gICAgICAgIHR5cGU6ICdoaWdobGlnaHQnLFxuICAgICAgICBjbGFzczogJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMtcmVmZXJlbmNlJ1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yLCByZWZlcmVuY2VzKTtcbiAgfVxuXG4gIGdldEN1cnNvclBvc2l0aW9uRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcik6IFBvaW50IHwgbnVsbCB7XG4gICAgbGV0IGN1cnNvcnMgPSBlZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybiBudWxsO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG4gICAgcmV0dXJuIHBvc2l0aW9uO1xuICB9XG5cbiAgZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgbGF5ZXIgPSB0aGlzLm1hcmtlckxheWVyc0ZvckVkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgaWYgKCFsYXllcikge1xuICAgICAgbGF5ZXIgPSBlZGl0b3IuYWRkTWFya2VyTGF5ZXIoKTtcbiAgICAgIHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBsYXllcik7XG4gICAgfVxuICAgIHJldHVybiBsYXllcjtcbiAgfVxuXG4gIC8vIFNDUk9MTCBHVVRURVJcblxuICBnZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICBlbGVtZW50ID0gbmV3IFNjcm9sbEd1dHRlcigpO1xuICAgICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICAgIHRoaXMuc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnMuc2V0KGVkaXRvciwgZWxlbWVudCk7XG5cbiAgICAgIGxldCBvblZpc2liaWxpdHlDaGFuZ2UgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudCBhcyBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpO1xuICAgICAgfTtcblxuICAgICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuXG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgZWxlbWVudC5hdHRhY2hUb0VkaXRvcihlZGl0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGFuIGF0dHJpYnV0ZSBvbiBgYXRvbS10ZXh0LWVkaXRvcmAgd2hlbmV2ZXIgYSBgc2Nyb2xsLWd1dHRlcmAgZWxlbWVudFxuICAgKiBpcyBwcmVzZW50LiBUaGlzIGFsbG93cyB1cyB0byBkZWZpbmUgY3VzdG9tIHNjcm9sbGJhciBvcGFjaXR5IHN0eWxlcy5cbiAgICovXG4gIG9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudDogU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50KSB7XG4gICAgbGV0IHsgZGV0YWlsOiB7IHZpc2libGUsIGVkaXRvciB9IH0gPSBldmVudDtcblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgZWRpdG9yVmlldy5zZXRBdHRyaWJ1dGUoXG4gICAgICAnd2l0aC1wdWxzYXItZmluZC1yZWZlcmVuY2VzLXNjcm9sbC1ndXR0ZXInLFxuICAgICAgdmlzaWJsZSA/ICdhY3RpdmUnIDogJ2luYWN0aXZlJ1xuICAgICk7XG4gIH1cblxuICBjbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCkge1xuICAgIGxldCBlZGl0b3JzID0gdGhpcy5nZXRWaXNpYmxlRWRpdG9ycygpO1xuICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCkge1xuICAgIGlmICghdGhpcy5lbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uKSByZXR1cm47XG5cbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0T3JDcmVhdGVTY3JvbGxHdXR0ZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHJldHVybjtcblxuICAgIGVsZW1lbnQuaGlnaGxpZ2h0UmVmZXJlbmNlcyhyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIC8vIFVUSUxcblxuICBnZXRWaXNpYmxlRWRpdG9ycygpOiBUZXh0RWRpdG9yW10ge1xuICAgIGxldCBlZGl0b3JzOiBUZXh0RWRpdG9yW10gPSBbXTtcbiAgICBsZXQgcGFuZXMgPSBhdG9tLndvcmtzcGFjZS5nZXRQYW5lcygpO1xuICAgIHBhbmVzLmZvckVhY2gocGFuZSA9PiB7XG4gICAgICBsZXQgaXRlbSA9IHBhbmUuZ2V0QWN0aXZlSXRlbSgpO1xuICAgICAgaWYgKGF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcihpdGVtKSkge1xuICAgICAgICBlZGl0b3JzLnB1c2goaXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZWRpdG9ycztcbiAgfVxufVxuIl19