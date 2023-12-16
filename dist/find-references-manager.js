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
        this.showMatchesBehindScrollbar = true;
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
        this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
            let disposable = this.watchEditor(editor);
            editor.onDidDestroy(() => disposable === null || disposable === void 0 ? void 0 : disposable.dispose());
        }), atom.commands.add('atom-text-editor', {
            'pulsar-find-references': (event) => {
                return this.findReferences(event);
            }
        }), atom.config.observe('pulsar-find-references.scrollbarDecoration.enable', (value) => {
            this.showMatchesBehindScrollbar = value;
            console.log('showMatchesBehindScrollbar is now', value);
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
    onCursorMove(event) {
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
    requestReferencesUnderCursor() {
        return __awaiter(this, void 0, void 0, function* () {
            let editor = this.editor;
            if (!editor)
                return;
            return this.findReferencesForVisibleEditors(editor);
        });
    }
    findReferencesForEditor(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider = this.providerRegistry.getFirstProviderForEditor(editor);
            if (!provider)
                return;
            let cursors = editor.getCursors();
            if (cursors.length > 1)
                return;
            let [cursor] = cursors;
            let position = cursor.getBufferPosition();
            let result = yield provider.findReferences(editor, position);
            console.log('result:', result);
            if (!result || result.type === 'error') {
                console.log('error!');
                // TODO
                this.clearAllVisibleScrollGutters();
                // this.updateScrollGutter(editor, null);
                return;
            }
            this.highlightReferences(editor, result.references);
        });
    }
    findReferencesForVisibleEditors(mainEditor) {
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
            if (!result || result.type === 'error') {
                console.error(`Error getting references: ${(_a = result === null || result === void 0 ? void 0 : result.message) !== null && _a !== void 0 ? _a : 'null'}`);
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
                    this.highlightReferences(editor, references !== null && references !== void 0 ? references : []);
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
    highlightReferences(editor, references) {
        let editorMarkerLayer = this.getOrCreateMarkerLayerForEditor(editor);
        editorMarkerLayer.clear();
        let currentPath = editor.getPath();
        for (let reference of references) {
            let { range, uri } = reference;
            if (uri !== currentPath)
                continue;
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
                console.warn('onVisibilityChange received!');
                return this.onScrollGutterVisibilityChange(event);
            };
            console.warn('LISTENING for visibility-changed');
            editorView.addEventListener('visibility-changed', onVisibilityChange);
            this.subscriptions.add(new atom_1.Disposable(() => {
                console.warn('UNLISTENING for visibility-changed');
                editorView.removeEventListener('visibility-changed', onVisibilityChange);
            }));
        }
        return element;
    }
    onScrollGutterVisibilityChange(event) {
        let { detail: { visible, editor } } = event;
        let editorView = atom.views.getView(editor);
        console.warn('visible?', visible, event.detail);
        editorView.setAttribute('with-pulsar-find-references-scroll-gutter', visible ? 'active' : 'inactive');
    }
    clearAllVisibleScrollGutters() {
        let editors = this.getVisibleEditors();
        for (let editor of editors) {
            this.updateScrollGutter(editor, null);
        }
    }
    updateScrollGutter(editor, references) {
        let element = this.getOrCreateScrollGutterForEditor(editor);
        if (!element)
            return;
        element.attachToEditor(editor);
        console.log('ELEMENT references:', references);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUVyQyw2RUFHa0M7QUFFbEMsTUFBcUIscUJBQXFCO0lBaUJ4QztRQWhCTyxXQUFNLEdBQXNCLElBQUksQ0FBQztRQUNqQyxlQUFVLEdBQTZCLElBQUksQ0FBQztRQUUzQyxrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsK0JBQTBCLEdBQVksSUFBSSxDQUFDO1FBRTNDLG9CQUFlLEdBQVcsR0FBRyxDQUFDO1FBSXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxnQkFBMEM7UUFDbkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsUUFBUTtnQkFBRSxTQUFTO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxD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O1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxPQUFPO0lBRVAsaUJBQWlCO1FBQ2YsSUFBSSxPQUFPLEdBQWlCLEVBQUUsQ0FBQztRQUMvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUF4VUQsd0NBd1VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlckxheWVyLFxuICBEaXNwb3NhYmxlLFxuICBUZXh0RWRpdG9yLFxuICBUZXh0RWRpdG9yRWxlbWVudCxcblxuICBDb21tYW5kRXZlbnQsXG4gIEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50XG59IGZyb20gJ2F0b20nO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyIH0gZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMuZCc7XG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IFByb3ZpZGVyUmVnaXN0cnkgZnJvbSAnLi9wcm92aWRlci1yZWdpc3RyeSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbmltcG9ydCB7XG4gIGRlZmF1bHQgYXMgU2Nyb2xsR3V0dGVyLFxuICBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnRcbn0gZnJvbSAnLi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmluZFJlZmVyZW5jZXNNYW5hZ2VyIHtcbiAgcHVibGljIGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwdWJsaWMgZWRpdG9yVmlldzogVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwdWJsaWMgcHJvdmlkZXJSZWdpc3RyeTogUHJvdmlkZXJSZWdpc3RyeTxGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiA9IG5ldyBQcm92aWRlclJlZ2lzdHJ5KCk7XG5cbiAgcHJpdmF0ZSBlZGl0b3JTdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgd2F0Y2hlZEVkaXRvcnM6IFdlYWtTZXQ8VGV4dEVkaXRvcj4gPSBuZXcgV2Vha1NldCgpO1xuICBwcml2YXRlIG1hcmtlckxheWVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgRGlzcGxheU1hcmtlckxheWVyPiA9IG5ldyBXZWFrTWFwKCk7XG4gIHByaXZhdGUgc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgU2Nyb2xsR3V0dGVyPiA9IG5ldyBXZWFrTWFwKCk7XG5cbiAgcHJpdmF0ZSBzaG93TWF0Y2hlc0JlaGluZFNjcm9sbGJhcjogYm9vbGVhbiA9IHRydWU7XG5cbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlRGVsYXk6IG51bWJlciA9IDIwMDtcbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9uQ3Vyc29yTW92ZSA9IHRoaXMub25DdXJzb3JNb3ZlLmJpbmQodGhpcyk7XG4gIH1cblxuICBpbml0aWFsaXplKHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSkge1xuICAgIHdoaWxlIChwZW5kaW5nUHJvdmlkZXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHByb3ZpZGVyID0gcGVuZGluZ1Byb3ZpZGVycy5zaGlmdCgpO1xuICAgICAgaWYgKCFwcm92aWRlcikgY29udGludWU7XG4gICAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICAgIH1cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yID0+IHtcbiAgICAgICAgbGV0IGRpc3Bvc2FibGUgPSB0aGlzLndhdGNoRWRpdG9yKGVkaXRvcik7XG4gICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gZGlzcG9zYWJsZT8uZGlzcG9zZSgpKTtcbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCB7XG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzJzogKGV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXMoZXZlbnQpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnNjcm9sbGJhckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5zaG93TWF0Y2hlc0JlaGluZFNjcm9sbGJhciA9IHZhbHVlO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdzaG93TWF0Y2hlc0JlaGluZFNjcm9sbGJhciBpcyBub3cnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5nZW5lcmFsLmRlbGF5JyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmN1cnNvck1vdmVEZWxheSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIGFkZFByb3ZpZGVyKHByb3ZpZGVyOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyKSB7XG4gICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfVxuXG4gIGRpc3Bvc2UoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zPy5kaXNwb3NlKCk7XG4gIH1cblxuICAvLyBFRElUT1IgTUFOQUdFTUVOVFxuXG4gIHdhdGNoRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGlmICh0aGlzLndhdGNoZWRFZGl0b3JzLmhhcyhlZGl0b3IpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBpZiAoZWRpdG9yVmlldy5oYXNGb2N1cygpKSB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcblxuICAgIGxldCBvbkZvY3VzID0gKCkgPT4gdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG4gICAgbGV0IG9uQmx1ciA9ICgpID0+IHt9O1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgbGV0IGRpc3Bvc2FibGUgPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgICBpZiAodGhpcy5lZGl0b3IgPT09IGVkaXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IobnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmFkZChlZGl0b3IpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoZGlzcG9zYWJsZSk7XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKGRpc3Bvc2FibGUpO1xuICAgICAgdGhpcy53YXRjaGVkRWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCkge1xuICAgIGlmIChlZGl0b3IgPT09IHRoaXMuZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBudWxsO1xuXG4gICAgdGhpcy5lZGl0b3IgPSB0aGlzLmVkaXRvclZpZXcgPSBudWxsO1xuXG4gICAgaWYgKGVkaXRvciA9PT0gbnVsbCB8fCAhYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcodGhpcy5lZGl0b3IpO1xuXG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbih0aGlzLm9uQ3Vyc29yTW92ZSlcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5oYXNGb2N1cygpKVxuICAgICAgdGhpcy5vbkN1cnNvck1vdmUoKTtcbiAgfVxuXG4gIC8vIEVWRU5UIEhBTkRMRVJTXG5cbiAgb25DdXJzb3JNb3ZlKGV2ZW50PzogQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnQpIHtcbiAgICBpZiAodGhpcy5jdXJzb3JNb3ZlVGltZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID09PSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZWRpdG9yKSB7XG4gICAgICBsZXQgbGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IodGhpcy5lZGl0b3IpO1xuICAgICAgbGF5ZXIuY2xlYXIoKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcigpO1xuICAgICAgfSxcbiAgICAgIHRoaXMuY3Vyc29yTW92ZURlbGF5XG4gICAgKTtcbiAgfVxuXG4gIC8vIEZJTkQgUkVGRVJFTkNFU1xuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoKSB7XG4gICAgbGV0IGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKGVkaXRvcik7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihlZGl0b3IpO1xuXG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuO1xuXG4gICAgbGV0IGN1cnNvcnMgPSBlZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybjtcblxuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMoZWRpdG9yLCBwb3NpdGlvbik7XG5cbiAgICBjb25zb2xlLmxvZygncmVzdWx0OicsIHJlc3VsdCk7XG5cbiAgICBpZiAoIXJlc3VsdCB8fCByZXN1bHQudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgY29uc29sZS5sb2coJ2Vycm9yIScpO1xuICAgICAgLy8gVE9ET1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICAvLyB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIG51bGwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3IsIHJlc3VsdC5yZWZlcmVuY2VzKTtcbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMobWFpbkVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCB2aXNpYmxlRWRpdG9ycyA9IHRoaXMuZ2V0VmlzaWJsZUVkaXRvcnMoKTtcblxuICAgIGxldCBlZGl0b3JNYXAgPSBuZXcgTWFwKCk7XG4gICAgbGV0IHJlZmVyZW5jZU1hcCA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAobGV0IGVkaXRvciBvZiB2aXNpYmxlRWRpdG9ycykge1xuICAgICAgLy8gTW9yZSB0aGFuIG9uZSB2aXNpYmxlIGVkaXRvciBjYW4gYmUgcG9pbnRpbmcgdG8gdGhlIHNhbWUgcGF0aC5cbiAgICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGlmICghZWRpdG9yTWFwLmhhcyhwYXRoKSkge1xuICAgICAgICBlZGl0b3JNYXAuc2V0KHBhdGgsIFtdKTtcbiAgICAgIH1cbiAgICAgIGVkaXRvck1hcC5nZXQocGF0aCkucHVzaChlZGl0b3IpO1xuICAgIH1cblxuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKG1haW5FZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybjtcblxuICAgIGxldCBjdXJzb3JzID0gbWFpbkVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMobWFpbkVkaXRvciwgcG9zaXRpb24pO1xuXG4gICAgaWYgKCFyZXN1bHQgfHwgcmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVmZXJlbmNlczogJHtyZXN1bHQ/Lm1lc3NhZ2UgPz8gJ251bGwnfWApO1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlc3VsdC5yZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgeyB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGlmICghcmVmZXJlbmNlTWFwLmhhcyh1cmkpKSB7XG4gICAgICAgIHJlZmVyZW5jZU1hcC5zZXQodXJpLCBbXSk7XG4gICAgICB9XG4gICAgICByZWZlcmVuY2VNYXAuZ2V0KHVyaSkucHVzaChyZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGZvciAobGV0IHBhdGggb2YgZWRpdG9yTWFwLmtleXMoKSkge1xuICAgICAgbGV0IGVkaXRvcnMgPSBlZGl0b3JNYXAuZ2V0KHBhdGgpO1xuICAgICAgbGV0IHJlZmVyZW5jZXMgPSByZWZlcmVuY2VNYXAuZ2V0KHBhdGgpO1xuICAgICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRSZWZlcmVuY2VzKGVkaXRvciwgcmVmZXJlbmNlcyA/PyBbXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdKSB7XG4gICAgbGV0IGVkaXRvck1hcmtlckxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgZWRpdG9yTWFya2VyTGF5ZXIuY2xlYXIoKTtcbiAgICBsZXQgY3VycmVudFBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgIGZvciAobGV0IHJlZmVyZW5jZSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgeyByYW5nZSwgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICBpZiAodXJpICE9PSBjdXJyZW50UGF0aCkgY29udGludWU7XG4gICAgICBlZGl0b3JNYXJrZXJMYXllci5tYXJrQnVmZmVyUmFuZ2UocmFuZ2UpO1xuICAgIH1cblxuICAgIGVkaXRvci5kZWNvcmF0ZU1hcmtlckxheWVyKGVkaXRvck1hcmtlckxheWVyLCB7XG4gICAgICB0eXBlOiAnaGlnaGxpZ2h0JyxcbiAgICAgIGNsYXNzOiAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1yZWZlcmVuY2UnXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5zaG93TWF0Y2hlc0JlaGluZFNjcm9sbGJhcikge1xuICAgICAgY29uc29sZS5sb2coJ3Nob3dpbmcgbWF0Y2hlcyBiZWhpbmQgc2Nyb2xsYmFyIScpO1xuICAgICAgdGhpcy51cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yLCByZWZlcmVuY2VzKTtcbiAgICB9XG4gIH1cblxuICBnZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBsYXllciA9IHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGVkaXRvci5hZGRNYXJrZXJMYXllcigpO1xuICAgICAgdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGxheWVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxheWVyO1xuICB9XG5cbiAgLy8gU0NST0xMIEdVVFRFUlxuXG4gIGdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBuZXcgU2Nyb2xsR3V0dGVyKCk7XG4gICAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgICAgdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBlbGVtZW50KTtcblxuICAgICAgbGV0IG9uVmlzaWJpbGl0eUNoYW5nZSA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKCdvblZpc2liaWxpdHlDaGFuZ2UgcmVjZWl2ZWQhJyk7XG4gICAgICAgIHJldHVybiB0aGlzLm9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudCBhcyBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpO1xuICAgICAgfTtcbiAgICAgIGNvbnNvbGUud2FybignTElTVEVOSU5HIGZvciB2aXNpYmlsaXR5LWNoYW5nZWQnKTtcbiAgICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eS1jaGFuZ2VkJywgb25WaXNpYmlsaXR5Q2hhbmdlKTtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ1VOTElTVEVOSU5HIGZvciB2aXNpYmlsaXR5LWNoYW5nZWQnKTtcbiAgICAgICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIG9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudDogU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50KSB7XG4gICAgbGV0IHsgZGV0YWlsOiB7IHZpc2libGUsIGVkaXRvciB9IH0gPSBldmVudDtcblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgY29uc29sZS53YXJuKCd2aXNpYmxlPycsIHZpc2libGUsIGV2ZW50LmRldGFpbCk7XG4gICAgZWRpdG9yVmlldy5zZXRBdHRyaWJ1dGUoXG4gICAgICAnd2l0aC1wdWxzYXItZmluZC1yZWZlcmVuY2VzLXNjcm9sbC1ndXR0ZXInLFxuICAgICAgdmlzaWJsZSA/ICdhY3RpdmUnIDogJ2luYWN0aXZlJ1xuICAgICk7XG4gIH1cblxuICBjbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCkge1xuICAgIGxldCBlZGl0b3JzID0gdGhpcy5nZXRWaXNpYmxlRWRpdG9ycygpO1xuICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCkge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgZWxlbWVudC5hdHRhY2hUb0VkaXRvcihlZGl0b3IpO1xuICAgIGNvbnNvbGUubG9nKCdFTEVNRU5UIHJlZmVyZW5jZXM6JywgcmVmZXJlbmNlcyk7XG4gICAgZWxlbWVudC5oaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgLy8gVVRJTFxuXG4gIGdldFZpc2libGVFZGl0b3JzKCk6IFRleHRFZGl0b3JbXSB7XG4gICAgbGV0IGVkaXRvcnM6IFRleHRFZGl0b3JbXSA9IFtdO1xuICAgIGxldCBwYW5lcyA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVzKCk7XG4gICAgcGFuZXMuZm9yRWFjaChwYW5lID0+IHtcbiAgICAgIGxldCBpdGVtID0gcGFuZS5nZXRBY3RpdmVJdGVtKCk7XG4gICAgICBpZiAoYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGl0ZW0pKSB7XG4gICAgICAgIGVkaXRvcnMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlZGl0b3JzO1xuICB9XG59XG4iXX0=