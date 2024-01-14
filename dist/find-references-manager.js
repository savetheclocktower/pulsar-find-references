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
const scroll_gutter_1 = __importDefault(require("./elements/scroll-gutter"));
class FindReferencesManager {
    constructor() {
        this.editor = null;
        this.editorView = null;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.providerRegistry = new provider_registry_1.default();
        this.editorSubscriptions = null;
        this.watchedEditors = new WeakSet();
        this.markerLayersForEditors = new WeakMap();
        this.scrollGuttersForEditors = new WeakMap();
        this.enableScrollbarDecoration = true;
        this.enableEditorDecoration = true;
        this.splitDirection = 'none';
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
            console.log('enableScrollbarDecoration is now', value);
        }), atom.config.observe('pulsar-find-references.editorDecoration.enable', (value) => {
            this.enableEditorDecoration = value;
            console.log('enableEditorDecoration is now', value);
        }), atom.config.observe('pulsar-find-references.general.delay', (value) => {
            this.cursorMoveDelay = value;
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
        let disposable = new atom_1.Disposable(() => {
            editorView.removeEventListener('focus', onFocus);
            editorView.removeEventListener('blur', onBlur);
            if (this.editor === editor) {
                this.updateCurrentEditor(null);
            }
        });
        this.watchedEditors.add(editor);
        this.subscriptions.add(disposable);
        return new atom_1.Disposable(() => {
            disposable.dispose();
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
        if (!this.enableEditorDecoration && !this.enableScrollbarDecoration) {
            // There's no reason to proceed.
            return;
        }
        if (this.cursorMoveTimer !== undefined) {
            clearTimeout(this.cursorMoveTimer);
            this.cursorMoveTimer === undefined;
        }
        if (this.editor) {
            let layer = this.getOrCreateMarkerLayerForEditor(this.editor);
            layer.clear();
        }
        this.cursorMoveTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.requestReferencesUnderCursor();
        }), this.cursorMoveDelay);
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
            this.showReferencesPane(references);
        });
    }
    showReferencesPane(references) {
        if (references.type !== 'data')
            return;
        // HACK
        references_view_1.default.setReferences(references.references, references.referencedSymbolName);
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
            console.log('findReferencesForVisibleEditors', mainEditor, force);
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
        console.log('highlightReferences', editor, references, force);
        let editorMarkerLayer = this.getOrCreateMarkerLayerForEditor(editor);
        editorMarkerLayer.clear();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQW1CeEM7UUFsQk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0Msa0JBQWEsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBQ2hFLHFCQUFnQixHQUE2QyxJQUFJLDJCQUFnQixFQUFFLENBQUM7UUFFbkYsd0JBQW1CLEdBQStCLElBQUksQ0FBQztRQUN2RCxtQkFBYyxHQUF3QixJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3BELDJCQUFzQixHQUE0QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2hGLDRCQUF1QixHQUFzQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBRTNFLDhCQUF5QixHQUFZLElBQUksQ0FBQztRQUMxQywyQkFBc0IsR0FBWSxJQUFJLENBQUM7UUFDdkMsbUJBQWMsR0FBbUIsTUFBTSxDQUFDO1FBRXhDLG9CQUFlLEdBQVcsR0FBRyxDQUFDO1FBSXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxnQkFBMEM7UUFDbkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsUUFBUTtnQkFBRSxTQUFTO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FB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LHlCQUF5QjtZQUFFLE9BQU87UUFFNUMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTztRQUVyQixPQUFPLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELE9BQU87SUFFUCxpQkFBaUI7UUFDZixJQUFJLE9BQU8sR0FBaUIsRUFBRSxDQUFDO1FBQy9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FDRjtBQWhaRCx3Q0FnWkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBEaXNwbGF5TWFya2VyTGF5ZXIsXG4gIERpc3Bvc2FibGUsXG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxuICBUZXh0RWRpdG9yRWxlbWVudCxcbiAgQ29tbWFuZEV2ZW50LFxuICBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNQcm92aWRlciB9IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1JldHVybiwgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgUHJvdmlkZXJSZWdpc3RyeSBmcm9tICcuL3Byb3ZpZGVyLXJlZ2lzdHJ5JztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcbmltcG9ydCBSZWZlcmVuY2VzVmlldyBmcm9tICcuL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcnO1xuXG5pbXBvcnQge1xuICBkZWZhdWx0IGFzIFNjcm9sbEd1dHRlcixcbiAgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50XG59IGZyb20gJy4vZWxlbWVudHMvc2Nyb2xsLWd1dHRlcic7XG5cbnR5cGUgU3BsaXREaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyB8ICdub25lJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmluZFJlZmVyZW5jZXNNYW5hZ2VyIHtcbiAgcHVibGljIGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwdWJsaWMgZWRpdG9yVmlldzogVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwdWJsaWMgcHJvdmlkZXJSZWdpc3RyeTogUHJvdmlkZXJSZWdpc3RyeTxGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiA9IG5ldyBQcm92aWRlclJlZ2lzdHJ5KCk7XG5cbiAgcHJpdmF0ZSBlZGl0b3JTdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgd2F0Y2hlZEVkaXRvcnM6IFdlYWtTZXQ8VGV4dEVkaXRvcj4gPSBuZXcgV2Vha1NldCgpO1xuICBwcml2YXRlIG1hcmtlckxheWVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgRGlzcGxheU1hcmtlckxheWVyPiA9IG5ldyBXZWFrTWFwKCk7XG4gIHByaXZhdGUgc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgU2Nyb2xsR3V0dGVyPiA9IG5ldyBXZWFrTWFwKCk7XG5cbiAgcHJpdmF0ZSBlbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBlbmFibGVFZGl0b3JEZWNvcmF0aW9uOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBzcGxpdERpcmVjdGlvbjogU3BsaXREaXJlY3Rpb24gPSAnbm9uZSc7XG5cbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlRGVsYXk6IG51bWJlciA9IDIwMDtcbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9uQ3Vyc29yTW92ZSA9IHRoaXMub25DdXJzb3JNb3ZlLmJpbmQodGhpcyk7XG4gIH1cblxuICBpbml0aWFsaXplKHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSkge1xuICAgIHdoaWxlIChwZW5kaW5nUHJvdmlkZXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHByb3ZpZGVyID0gcGVuZGluZ1Byb3ZpZGVycy5zaGlmdCgpO1xuICAgICAgaWYgKCFwcm92aWRlcikgY29udGludWU7XG4gICAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICAgIH1cblxuICAgIGF0b20ud29ya3NwYWNlLmFkZE9wZW5lcihmaWxlUGF0aCA9PiB7XG4gICAgICBpZiAoZmlsZVBhdGguaW5kZXhPZihSZWZlcmVuY2VzVmlldy5VUkkpICE9PSAtMSlcbiAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzVmlldygpO1xuXG4gICAgICByZXR1cm47XG4gICAgfSk7XG5cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yID0+IHtcbiAgICAgICAgbGV0IGRpc3Bvc2FibGUgPSB0aGlzLndhdGNoRWRpdG9yKGVkaXRvcik7XG4gICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gZGlzcG9zYWJsZT8uZGlzcG9zZSgpKTtcbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCB7XG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOmhpZ2hsaWdodCc6IChfZXZlbnQ6IENvbW1hbmRFdmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOnNob3ctcGFuZWwnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc0ZvclBhbmVsKCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMucGFuZWwuc3BsaXREaXJlY3Rpb24nLFxuICAgICAgICAodmFsdWU6IFNwbGl0RGlyZWN0aW9uKSA9PiB7XG4gICAgICAgICAgdGhpcy5zcGxpdERpcmVjdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuc2Nyb2xsYmFyRGVjb3JhdGlvbi5lbmFibGUnLFxuICAgICAgICAodmFsdWU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICB0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZW5hYmxlU2Nyb2xsYmFyRGVjb3JhdGlvbiBpcyBub3cnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmVuYWJsZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiA9IHZhbHVlO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlbmFibGVFZGl0b3JEZWNvcmF0aW9uIGlzIG5vdycsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmdlbmVyYWwuZGVsYXknLFxuICAgICAgICAodmFsdWU6IG51bWJlcikgPT4ge1xuICAgICAgICAgIHRoaXMuY3Vyc29yTW92ZURlbGF5ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgYWRkUHJvdmlkZXIocHJvdmlkZXI6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIpIHtcbiAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICB9XG5cbiAgZGlzcG9zZSgpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8vIEVESVRPUiBNQU5BR0VNRU5UXG5cbiAgd2F0Y2hFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgaWYgKHRoaXMud2F0Y2hlZEVkaXRvcnMuaGFzKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgIGlmIChlZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpIHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3IpO1xuXG4gICAgbGV0IG9uRm9jdXMgPSAoKSA9PiB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcbiAgICBsZXQgb25CbHVyID0gKCkgPT4ge307XG4gICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uRm9jdXMpO1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1cik7XG5cbiAgICBsZXQgZGlzcG9zYWJsZSA9IG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1cik7XG5cbiAgICAgIGlmICh0aGlzLmVkaXRvciA9PT0gZWRpdG9yKSB7XG4gICAgICAgIHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihudWxsKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMud2F0Y2hlZEVkaXRvcnMuYWRkKGVkaXRvcik7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChkaXNwb3NhYmxlKTtcblxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5yZW1vdmUoZGlzcG9zYWJsZSk7XG4gICAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmRlbGV0ZShlZGl0b3IpO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsKSB7XG4gICAgaWYgKGVkaXRvciA9PT0gdGhpcy5lZGl0b3IpIHJldHVybjtcblxuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucyA9IG51bGw7XG5cbiAgICB0aGlzLmVkaXRvciA9IHRoaXMuZWRpdG9yVmlldyA9IG51bGw7XG5cbiAgICBpZiAoZWRpdG9yID09PSBudWxsIHx8ICFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmVkaXRvcik7XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKHRoaXMub25DdXJzb3JNb3ZlKVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5lZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpXG4gICAgICB0aGlzLm9uQ3Vyc29yTW92ZSgpO1xuICB9XG5cbiAgLy8gRVZFTlQgSEFORExFUlNcblxuICBvbkN1cnNvck1vdmUoX2V2ZW50PzogQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnQpIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiAmJiAhdGhpcy5lbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uKSB7XG4gICAgICAvLyBUaGVyZSdzIG5vIHJlYXNvbiB0byBwcm9jZWVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5jdXJzb3JNb3ZlVGltZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID09PSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZWRpdG9yKSB7XG4gICAgICBsZXQgbGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IodGhpcy5lZGl0b3IpO1xuICAgICAgbGF5ZXIuY2xlYXIoKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcigpO1xuICAgICAgfSxcbiAgICAgIHRoaXMuY3Vyc29yTW92ZURlbGF5XG4gICAgKTtcbiAgfVxuXG4gIC8vIEZJTkQgUkVGRVJFTkNFU1xuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzRm9yUGFuZWwoKSB7XG4gICAgbGV0IGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICBsZXQgcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UmVmZXJlbmNlc0ZvclByb2plY3QoZWRpdG9yKTtcbiAgICBpZiAoIXJlZmVyZW5jZXMpIHJldHVybjtcbiAgICB0aGlzLnNob3dSZWZlcmVuY2VzUGFuZShyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIHNob3dSZWZlcmVuY2VzUGFuZShyZWZlcmVuY2VzOiBGaW5kUmVmZXJlbmNlc1JldHVybikge1xuICAgIGlmIChyZWZlcmVuY2VzLnR5cGUgIT09ICdkYXRhJykgcmV0dXJuO1xuXG4gICAgLy8gSEFDS1xuICAgIFJlZmVyZW5jZXNWaWV3LnNldFJlZmVyZW5jZXMocmVmZXJlbmNlcy5yZWZlcmVuY2VzLCByZWZlcmVuY2VzLnJlZmVyZW5jZWRTeW1ib2xOYW1lKTtcblxuICAgIGxldCBzcGxpdERpcmVjdGlvbiA9IHRoaXMuc3BsaXREaXJlY3Rpb24gPT09ICdub25lJyA/IHVuZGVmaW5lZCA6IHRoaXMuc3BsaXREaXJlY3Rpb247XG4gICAgaWYgKHRoaXMuc3BsaXREaXJlY3Rpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3BsaXREaXJlY3Rpb24gPSAncmlnaHQnO1xuICAgIH1cblxuICAgIHJldHVybiBhdG9tLndvcmtzcGFjZS5vcGVuKFxuICAgICAgUmVmZXJlbmNlc1ZpZXcuVVJJLFxuICAgICAge1xuICAgICAgICBzZWFyY2hBbGxQYW5lczogdHJ1ZSxcbiAgICAgICAgc3BsaXQ6IHNwbGl0RGlyZWN0aW9uXG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGdldFJlZmVyZW5jZXNGb3JQcm9qZWN0KGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8RmluZFJlZmVyZW5jZXNSZXR1cm4gfCBudWxsPiB7XG4gICAgbGV0IHByb3ZpZGVyID0gdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmdldEZpcnN0UHJvdmlkZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXG4gICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJzb3JQb3NpdGlvbkZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghcG9zaXRpb24pIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG5cbiAgICByZXR1cm4gcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMoZWRpdG9yLCBwb3NpdGlvbik7XG4gIH1cblxuICBhc3luYyByZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBsZXQgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gICAgaWYgKCFlZGl0b3IpIHJldHVybjtcblxuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMoZWRpdG9yLCBmb3JjZSk7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKG1haW5FZGl0b3I6IFRleHRFZGl0b3IsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZygnZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycycsIG1haW5FZGl0b3IsIGZvcmNlKTtcbiAgICBsZXQgdmlzaWJsZUVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG5cbiAgICBsZXQgZWRpdG9yTWFwID0gbmV3IE1hcCgpO1xuICAgIGxldCByZWZlcmVuY2VNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGxldCBlZGl0b3Igb2YgdmlzaWJsZUVkaXRvcnMpIHtcbiAgICAgIC8vIE1vcmUgdGhhbiBvbmUgdmlzaWJsZSBlZGl0b3IgY2FuIGJlIHBvaW50aW5nIHRvIHRoZSBzYW1lIHBhdGguXG4gICAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBpZiAoIWVkaXRvck1hcC5oYXMocGF0aCkpIHtcbiAgICAgICAgZWRpdG9yTWFwLnNldChwYXRoLCBbXSk7XG4gICAgICB9XG4gICAgICBlZGl0b3JNYXAuZ2V0KHBhdGgpLnB1c2goZWRpdG9yKTtcbiAgICB9XG5cbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihtYWluRWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm47XG5cbiAgICBsZXQgY3Vyc29ycyA9IG1haW5FZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybjtcbiAgICBsZXQgW2N1cnNvcl0gPSBjdXJzb3JzO1xuICAgIGxldCBwb3NpdGlvbiA9IGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpO1xuXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKG1haW5FZGl0b3IsIHBvc2l0aW9uKTtcblxuICAgIGlmICghcmVzdWx0KSByZXR1cm47XG5cbiAgICBpZiAocmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVmZXJlbmNlczogJHtyZXN1bHQ/Lm1lc3NhZ2UgPz8gJ251bGwnfWApO1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS53YXJuKCdSRUZFUkVOQ0VTOicsIHJlc3VsdC5yZWZlcmVuY2VzKTtcblxuICAgIFJlZmVyZW5jZXNWaWV3LnNldFJlZmVyZW5jZXMocmVzdWx0LnJlZmVyZW5jZXMsIHJlc3VsdC5yZWZlcmVuY2VkU3ltYm9sTmFtZSk7XG5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVzdWx0LnJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKCFyZWZlcmVuY2VNYXAuaGFzKHVyaSkpIHtcbiAgICAgICAgcmVmZXJlbmNlTWFwLnNldCh1cmksIFtdKTtcbiAgICAgIH1cbiAgICAgIHJlZmVyZW5jZU1hcC5nZXQodXJpKS5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcGF0aCBvZiBlZGl0b3JNYXAua2V5cygpKSB7XG4gICAgICBsZXQgZWRpdG9ycyA9IGVkaXRvck1hcC5nZXQocGF0aCk7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IHJlZmVyZW5jZU1hcC5nZXQocGF0aCk7XG4gICAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yLCByZWZlcmVuY2VzID8/IFtdLCBmb3JjZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGNvbnNvbGUubG9nKCdoaWdobGlnaHRSZWZlcmVuY2VzJywgZWRpdG9yLCByZWZlcmVuY2VzLCBmb3JjZSk7XG4gICAgbGV0IGVkaXRvck1hcmtlckxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgZWRpdG9yTWFya2VyTGF5ZXIuY2xlYXIoKTtcblxuICAgIGlmICh0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gfHwgZm9yY2UpIHtcbiAgICAgIGxldCBmaWx0ZXJlZFJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgICBsZXQgcmFuZ2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGxldCBjdXJyZW50UGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgKHJlZmVyZW5jZXMgPz8gW10pKSB7XG4gICAgICAgIGxldCB7IHJhbmdlLCB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgICAgbGV0IGtleSA9IHJhbmdlLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmICh1cmkgIT09IGN1cnJlbnRQYXRoKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHJhbmdlU2V0LmhhcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgcmFuZ2VTZXQuYWRkKGtleSk7XG4gICAgICAgIGZpbHRlcmVkUmVmZXJlbmNlcy5wdXNoKHJlZmVyZW5jZSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IHsgcmFuZ2UgfSBvZiBmaWx0ZXJlZFJlZmVyZW5jZXMpIHtcbiAgICAgICAgZWRpdG9yTWFya2VyTGF5ZXIubWFya0J1ZmZlclJhbmdlKHJhbmdlKTtcbiAgICAgIH1cblxuICAgICAgZWRpdG9yLmRlY29yYXRlTWFya2VyTGF5ZXIoZWRpdG9yTWFya2VyTGF5ZXIsIHtcbiAgICAgICAgdHlwZTogJ2hpZ2hsaWdodCcsXG4gICAgICAgIGNsYXNzOiAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1yZWZlcmVuY2UnXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogUG9pbnQgfCBudWxsIHtcbiAgICBsZXQgY3Vyc29ycyA9IGVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuIG51bGw7XG4gICAgbGV0IFtjdXJzb3JdID0gY3Vyc29ycztcbiAgICBsZXQgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKTtcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICBnZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBsYXllciA9IHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGVkaXRvci5hZGRNYXJrZXJMYXllcigpO1xuICAgICAgdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGxheWVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxheWVyO1xuICB9XG5cbiAgLy8gU0NST0xMIEdVVFRFUlxuXG4gIGdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBuZXcgU2Nyb2xsR3V0dGVyKCk7XG4gICAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgICAgdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBlbGVtZW50KTtcblxuICAgICAgbGV0IG9uVmlzaWJpbGl0eUNoYW5nZSA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50IGFzIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBlbGVtZW50LmF0dGFjaFRvRWRpdG9yKGVkaXRvcik7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYW4gYXR0cmlidXRlIG9uIGBhdG9tLXRleHQtZWRpdG9yYCB3aGVuZXZlciBhIGBzY3JvbGwtZ3V0dGVyYCBlbGVtZW50XG4gICAqIGlzIHByZXNlbnQuIFRoaXMgYWxsb3dzIHVzIHRvIGRlZmluZSBjdXN0b20gc2Nyb2xsYmFyIG9wYWNpdHkgc3R5bGVzLlxuICAgKi9cbiAgb25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50OiBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpIHtcbiAgICBsZXQgeyBkZXRhaWw6IHsgdmlzaWJsZSwgZWRpdG9yIH0gfSA9IGV2ZW50O1xuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBlZGl0b3JWaWV3LnNldEF0dHJpYnV0ZShcbiAgICAgICd3aXRoLXB1bHNhci1maW5kLXJlZmVyZW5jZXMtc2Nyb2xsLWd1dHRlcicsXG4gICAgICB2aXNpYmxlID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnXG4gICAgKTtcbiAgfVxuXG4gIGNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKSB7XG4gICAgbGV0IGVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24pIHJldHVybjtcblxuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgZWxlbWVudC5oaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgLy8gVVRJTFxuXG4gIGdldFZpc2libGVFZGl0b3JzKCk6IFRleHRFZGl0b3JbXSB7XG4gICAgbGV0IGVkaXRvcnM6IFRleHRFZGl0b3JbXSA9IFtdO1xuICAgIGxldCBwYW5lcyA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVzKCk7XG4gICAgcGFuZXMuZm9yRWFjaChwYW5lID0+IHtcbiAgICAgIGxldCBpdGVtID0gcGFuZS5nZXRBY3RpdmVJdGVtKCk7XG4gICAgICBpZiAoYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGl0ZW0pKSB7XG4gICAgICAgIGVkaXRvcnMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlZGl0b3JzO1xuICB9XG59XG4iXX0=