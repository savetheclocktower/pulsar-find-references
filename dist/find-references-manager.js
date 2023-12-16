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
        console.log('watchEditor:', editor);
        if (this.watchedEditors.has(editor)) {
            console.warn('Already has!', editor);
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
        console.log('updateCurrentEditor:', editor);
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
        this.cursorMoveTimer = setTimeout((_event) => __awaiter(this, void 0, void 0, function* () {
            yield this.requestReferencesUnderCursor();
        }), 100, event !== null && event !== void 0 ? event : '');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUVyQyw2RUFHa0M7QUFFbEMsTUFBcUIscUJBQXFCO0lBZ0J4QztRQWZPLFdBQU0sR0FBc0IsSUFBSSxDQUFDO1FBQ2pDLGVBQVUsR0FBNkIsSUFBSSxDQUFDO1FBRTNDLGtCQUFhLEdBQXdCLElBQUksMEJBQW1CLEVBQUUsQ0FBQztRQUNoRSxxQkFBZ0IsR0FBNkMsSUFBSSwyQkFBZ0IsRUFBRSxDQUFDO1FBRW5GLHdCQUFtQixHQUErQixJQUFJLENBQUM7UUFDdkQsbUJBQWMsR0FBd0IsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNwRCwyQkFBc0IsR0FBNEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNoRiw0QkFBdUIsR0FBc0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUUzRSwrQkFBMEIsR0FBWSxJQUFJLENBQUM7UUFLakQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsVUFBVSxDQUFDLGdCQUEwQztRQUNuRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9CLElBQUksUUFBUSxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxRQUFRO2dCQUFFLFNBQVM7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsa0JB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QUFNLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU87UUFFckIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsT0FBTztJQUVQLGlCQUFpQjtRQUNmLElBQUksT0FBTyxHQUFpQixFQUFFLENBQUM7UUFDL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGO0FBcFVELHdDQW9VQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIERpc3BsYXlNYXJrZXJMYXllcixcbiAgRGlzcG9zYWJsZSxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnQsXG5cbiAgQ29tbWFuZEV2ZW50LFxuICBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNQcm92aWRlciB9IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCBQcm92aWRlclJlZ2lzdHJ5IGZyb20gJy4vcHJvdmlkZXItcmVnaXN0cnknO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuXG5pbXBvcnQge1xuICBkZWZhdWx0IGFzIFNjcm9sbEd1dHRlcixcbiAgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50XG59IGZyb20gJy4vZWxlbWVudHMvc2Nyb2xsLWd1dHRlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbmRSZWZlcmVuY2VzTWFuYWdlciB7XG4gIHB1YmxpYyBlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsID0gbnVsbDtcbiAgcHVibGljIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHVibGljIHByb3ZpZGVyUmVnaXN0cnk6IFByb3ZpZGVyUmVnaXN0cnk8RmluZFJlZmVyZW5jZXNQcm92aWRlcj4gPSBuZXcgUHJvdmlkZXJSZWdpc3RyeSgpO1xuXG4gIHByaXZhdGUgZWRpdG9yU3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHdhdGNoZWRFZGl0b3JzOiBXZWFrU2V0PFRleHRFZGl0b3I+ID0gbmV3IFdlYWtTZXQoKTtcbiAgcHJpdmF0ZSBtYXJrZXJMYXllcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIERpc3BsYXlNYXJrZXJMYXllcj4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIHNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIFNjcm9sbEd1dHRlcj4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIHByaXZhdGUgc2hvd01hdGNoZXNCZWhpbmRTY3JvbGxiYXI6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIHByaXZhdGUgY3Vyc29yTW92ZVRpbWVyPzogTm9kZUpTLlRpbWVvdXQgfCBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5vbkN1cnNvck1vdmUgPSB0aGlzLm9uQ3Vyc29yTW92ZS5iaW5kKHRoaXMpO1xuICB9XG5cbiAgaW5pdGlhbGl6ZShwZW5kaW5nUHJvdmlkZXJzOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyW10pIHtcbiAgICB3aGlsZSAocGVuZGluZ1Byb3ZpZGVycy5sZW5ndGgpIHtcbiAgICAgIGxldCBwcm92aWRlciA9IHBlbmRpbmdQcm92aWRlcnMuc2hpZnQoKTtcbiAgICAgIGlmICghcHJvdmlkZXIpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgICB9XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKGVkaXRvciA9PiB7XG4gICAgICAgIGxldCBkaXNwb3NhYmxlID0gdGhpcy53YXRjaEVkaXRvcihlZGl0b3IpO1xuICAgICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IGRpc3Bvc2FibGU/LmRpc3Bvc2UoKSk7XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXRleHQtZWRpdG9yJywge1xuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcyc6IChldmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzKGV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5zY3JvbGxiYXJEZWNvcmF0aW9uLmVuYWJsZScsXG4gICAgICAgICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc2hvd01hdGNoZXNCZWhpbmRTY3JvbGxiYXIgPSB2YWx1ZTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnc2hvd01hdGNoZXNCZWhpbmRTY3JvbGxiYXIgaXMgbm93JywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIGFkZFByb3ZpZGVyKHByb3ZpZGVyOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyKSB7XG4gICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfVxuXG4gIGRpc3Bvc2UoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zPy5kaXNwb3NlKCk7XG4gIH1cblxuICAvLyBFRElUT1IgTUFOQUdFTUVOVFxuXG4gIHdhdGNoRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGNvbnNvbGUubG9nKCd3YXRjaEVkaXRvcjonLCBlZGl0b3IpO1xuICAgIGlmICh0aGlzLndhdGNoZWRFZGl0b3JzLmhhcyhlZGl0b3IpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0FscmVhZHkgaGFzIScsIGVkaXRvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBpZiAoZWRpdG9yVmlldy5oYXNGb2N1cygpKSB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcblxuICAgIGxldCBvbkZvY3VzID0gKCkgPT4gdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG4gICAgbGV0IG9uQmx1ciA9ICgpID0+IHt9O1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgbGV0IGRpc3Bvc2FibGUgPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgICBpZiAodGhpcy5lZGl0b3IgPT09IGVkaXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IobnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmFkZChlZGl0b3IpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoZGlzcG9zYWJsZSk7XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKGRpc3Bvc2FibGUpO1xuICAgICAgdGhpcy53YXRjaGVkRWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCkge1xuICAgIGNvbnNvbGUubG9nKCd1cGRhdGVDdXJyZW50RWRpdG9yOicsIGVkaXRvcik7XG4gICAgaWYgKGVkaXRvciA9PT0gdGhpcy5lZGl0b3IpIHJldHVybjtcblxuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucyA9IG51bGw7XG5cbiAgICB0aGlzLmVkaXRvciA9IHRoaXMuZWRpdG9yVmlldyA9IG51bGw7XG5cbiAgICBpZiAoZWRpdG9yID09PSBudWxsIHx8ICFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmVkaXRvcik7XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKHRoaXMub25DdXJzb3JNb3ZlKVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5lZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpXG4gICAgICB0aGlzLm9uQ3Vyc29yTW92ZSgpO1xuICB9XG5cbiAgLy8gRVZFTlQgSEFORExFUlNcblxuICBvbkN1cnNvck1vdmUoZXZlbnQ/OiBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudCkge1xuICAgIGlmICh0aGlzLmN1cnNvck1vdmVUaW1lciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jdXJzb3JNb3ZlVGltZXIpO1xuICAgICAgdGhpcy5jdXJzb3JNb3ZlVGltZXIgPT09IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lZGl0b3IpIHtcbiAgICAgIGxldCBsYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcih0aGlzLmVkaXRvcik7XG4gICAgICBsYXllci5jbGVhcigpO1xuICAgIH1cblxuICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID0gc2V0VGltZW91dChcbiAgICAgIGFzeW5jIChfZXZlbnQ6IEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcigpO1xuICAgICAgfSxcbiAgICAgIDEwMCxcbiAgICAgIGV2ZW50ID8/ICcnXG4gICAgKTtcbiAgfVxuXG4gIC8vIEZJTkQgUkVGRVJFTkNFU1xuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoKSB7XG4gICAgbGV0IGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKGVkaXRvcik7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihlZGl0b3IpO1xuXG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuO1xuXG4gICAgbGV0IGN1cnNvcnMgPSBlZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybjtcblxuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMoZWRpdG9yLCBwb3NpdGlvbik7XG5cbiAgICBjb25zb2xlLmxvZygncmVzdWx0OicsIHJlc3VsdCk7XG5cbiAgICBpZiAoIXJlc3VsdCB8fCByZXN1bHQudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgY29uc29sZS5sb2coJ2Vycm9yIScpO1xuICAgICAgLy8gVE9ET1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICAvLyB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIG51bGwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3IsIHJlc3VsdC5yZWZlcmVuY2VzKTtcbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMobWFpbkVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCB2aXNpYmxlRWRpdG9ycyA9IHRoaXMuZ2V0VmlzaWJsZUVkaXRvcnMoKTtcbiAgICBjb25zb2xlLmxvZygndmlzaWJsZUVkaXRvcnM6JywgdmlzaWJsZUVkaXRvcnMpO1xuICAgIGxldCBlZGl0b3JNYXAgPSBuZXcgTWFwKCk7XG4gICAgbGV0IHJlZmVyZW5jZU1hcCA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKGxldCBlZGl0b3Igb2YgdmlzaWJsZUVkaXRvcnMpIHtcbiAgICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGlmICghZWRpdG9yTWFwLmhhcyhwYXRoKSkge1xuICAgICAgICBlZGl0b3JNYXAuc2V0KHBhdGgsIFtdKTtcbiAgICAgIH1cbiAgICAgIGVkaXRvck1hcC5nZXQocGF0aCkucHVzaChlZGl0b3IpO1xuICAgIH1cblxuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKG1haW5FZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybjtcblxuICAgIGxldCBjdXJzb3JzID0gbWFpbkVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMobWFpbkVkaXRvciwgcG9zaXRpb24pO1xuXG4gICAgaWYgKCFyZXN1bHQgfHwgcmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVmZXJlbmNlczogJHtyZXN1bHQ/Lm1lc3NhZ2UgPz8gJ251bGwnfWApO1xuICAgICAgdGhpcy5jbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlc3VsdC5yZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgeyB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGlmICghcmVmZXJlbmNlTWFwLmhhcyh1cmkpKSB7XG4gICAgICAgIHJlZmVyZW5jZU1hcC5zZXQodXJpLCBbXSk7XG4gICAgICB9XG4gICAgICByZWZlcmVuY2VNYXAuZ2V0KHVyaSkucHVzaChyZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGZvciAobGV0IHBhdGggb2YgZWRpdG9yTWFwLmtleXMoKSkge1xuICAgICAgbGV0IGVkaXRvcnMgPSBlZGl0b3JNYXAuZ2V0KHBhdGgpO1xuICAgICAgbGV0IHJlZmVyZW5jZXMgPSByZWZlcmVuY2VNYXAuZ2V0KHBhdGgpO1xuICAgICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRSZWZlcmVuY2VzKGVkaXRvciwgcmVmZXJlbmNlcyA/PyBbXSk7XG4gICAgICB9XG4gICAgfVxuXG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlcyhldmVudDogQ29tbWFuZEV2ZW50PFRleHRFZGl0b3JFbGVtZW50Pikge1xuICAgIGxldCBlZGl0b3IgPSBldmVudC5jdXJyZW50VGFyZ2V0LmdldE1vZGVsKCk7XG4gICAgaWYgKCFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuIGV2ZW50LmFib3J0S2V5QmluZGluZygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKGVkaXRvcik7XG4gIH1cblxuICBoaWdobGlnaHRSZWZlcmVuY2VzKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10pIHtcbiAgICBsZXQgZWRpdG9yTWFya2VyTGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBlZGl0b3JNYXJrZXJMYXllci5jbGVhcigpO1xuICAgIGxldCBjdXJyZW50UGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHJhbmdlLCB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGlmICh1cmkgIT09IGN1cnJlbnRQYXRoKSBjb250aW51ZTtcbiAgICAgIGVkaXRvck1hcmtlckxheWVyLm1hcmtCdWZmZXJSYW5nZShyYW5nZSk7XG4gICAgfVxuXG4gICAgZWRpdG9yLmRlY29yYXRlTWFya2VyTGF5ZXIoZWRpdG9yTWFya2VyTGF5ZXIsIHtcbiAgICAgIHR5cGU6ICdoaWdobGlnaHQnLFxuICAgICAgY2xhc3M6ICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLXJlZmVyZW5jZSdcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLnNob3dNYXRjaGVzQmVoaW5kU2Nyb2xsYmFyKSB7XG4gICAgICBjb25zb2xlLmxvZygnc2hvd2luZyBtYXRjaGVzIGJlaGluZCBzY3JvbGxiYXIhJyk7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIHJlZmVyZW5jZXMpO1xuICAgIH1cbiAgfVxuXG4gIGdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgbGV0IGxheWVyID0gdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLmdldChlZGl0b3IpO1xuICAgIGlmICghbGF5ZXIpIHtcbiAgICAgIGxheWVyID0gZWRpdG9yLmFkZE1hcmtlckxheWVyKCk7XG4gICAgICB0aGlzLm1hcmtlckxheWVyc0ZvckVkaXRvcnMuc2V0KGVkaXRvciwgbGF5ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbGF5ZXI7XG4gIH1cblxuICAvLyBTQ1JPTEwgR1VUVEVSXG5cbiAgZ2V0T3JDcmVhdGVTY3JvbGxHdXR0ZXJGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLnNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzLmdldChlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkge1xuICAgICAgZWxlbWVudCA9IG5ldyBTY3JvbGxHdXR0ZXIoKTtcbiAgICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgICB0aGlzLnNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGVsZW1lbnQpO1xuXG4gICAgICBsZXQgb25WaXNpYmlsaXR5Q2hhbmdlID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4oJ29uVmlzaWJpbGl0eUNoYW5nZSByZWNlaXZlZCEnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMub25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50IGFzIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCk7XG4gICAgICB9O1xuICAgICAgY29uc29sZS53YXJuKCdMSVNURU5JTkcgZm9yIHZpc2liaWxpdHktY2hhbmdlZCcpO1xuICAgICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgICAgbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUud2FybignVU5MSVNURU5JTkcgZm9yIHZpc2liaWxpdHktY2hhbmdlZCcpO1xuICAgICAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eS1jaGFuZ2VkJywgb25WaXNpYmlsaXR5Q2hhbmdlKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgb25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50OiBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpIHtcbiAgICBsZXQgeyBkZXRhaWw6IHsgdmlzaWJsZSwgZWRpdG9yIH0gfSA9IGV2ZW50O1xuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBjb25zb2xlLndhcm4oJ3Zpc2libGU/JywgdmlzaWJsZSwgZXZlbnQuZGV0YWlsKTtcbiAgICBlZGl0b3JWaWV3LnNldEF0dHJpYnV0ZShcbiAgICAgICd3aXRoLXB1bHNhci1maW5kLXJlZmVyZW5jZXMtc2Nyb2xsLWd1dHRlcicsXG4gICAgICB2aXNpYmxlID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnXG4gICAgKTtcbiAgfVxuXG4gIGNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKSB7XG4gICAgbGV0IGVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFlbGVtZW50KSByZXR1cm47XG5cbiAgICBlbGVtZW50LmF0dGFjaFRvRWRpdG9yKGVkaXRvcik7XG4gICAgY29uc29sZS5sb2coJ0VMRU1FTlQgcmVmZXJlbmNlczonLCByZWZlcmVuY2VzKTtcbiAgICBlbGVtZW50LmhpZ2hsaWdodFJlZmVyZW5jZXMocmVmZXJlbmNlcyk7XG4gIH1cblxuICAvLyBVVElMXG5cbiAgZ2V0VmlzaWJsZUVkaXRvcnMoKTogVGV4dEVkaXRvcltdIHtcbiAgICBsZXQgZWRpdG9yczogVGV4dEVkaXRvcltdID0gW107XG4gICAgbGV0IHBhbmVzID0gYXRvbS53b3Jrc3BhY2UuZ2V0UGFuZXMoKTtcbiAgICBwYW5lcy5mb3JFYWNoKHBhbmUgPT4ge1xuICAgICAgbGV0IGl0ZW0gPSBwYW5lLmdldEFjdGl2ZUl0ZW0oKTtcbiAgICAgIGlmIChhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoaXRlbSkpIHtcbiAgICAgICAgZWRpdG9ycy5wdXNoKGl0ZW0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVkaXRvcnM7XG4gIH1cbn1cbiJdfQ==