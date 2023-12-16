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
        this.enableScrollbarDecoration = true;
        this.enableEditorDecoration = true;
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
            'pulsar-find-references:show': (_event) => {
                return this.requestReferencesUnderCursor(true);
            }
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
            if (!result || result.type === 'error') {
                console.error(`Error getting references: ${(_a = result === null || result === void 0 ? void 0 : result.message) !== null && _a !== void 0 ? _a : 'null'}`);
                this.clearAllVisibleScrollGutters();
                return;
            }
            console.warn('REFERENCES:', result.references);
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
            let currentPath = editor.getPath();
            for (let reference of (references !== null && references !== void 0 ? references : [])) {
                let { range, uri } = reference;
                if (uri !== currentPath)
                    continue;
                editorMarkerLayer.markBufferRange(range);
            }
            editor.decorateMarkerLayer(editorMarkerLayer, {
                type: 'highlight',
                class: 'pulsar-find-references-reference'
            });
        }
        this.updateScrollGutter(editor, references);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUVyQyw2RUFHa0M7QUFFbEMsTUFBcUIscUJBQXFCO0lBa0J4QztRQWpCTyxXQUFNLEdBQXNCLElBQUksQ0FBQztRQUNqQyxlQUFVLEdBQTZCLElBQUksQ0FBQztRQUUzQyxrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsOEJBQXlCLEdBQVksSUFBSSxDQUFDO1FBQzFDLDJCQUFzQixHQUFZLElBQUksQ0FBQztRQUV2QyxvQkFBZSxHQUFXLEdBQUcsQ0FBQztRQUlwQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxVQUFVLENBQUMsZ0JBQTBDO1FBQ25ELE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0IsSUFBSSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsU0FBUztZQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN6QyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxhQUFWLFVBQVUsdUJBQVYsVUFBVSxDQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLEVBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUU7WUFDcEMsNkJBQTZCLEVBQUUsQ0FBQyxNQUFvQixFQUFFLEVBQUU7Z0JBQ3RELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pELENBQUM7U0FDRixDQUFDLEVBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ2pCLG1EQUFtRCxFQUNuRCxDQUFDLEtBQWMsRUFBRSxFQUFFO1lBQ2pCLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQ0YsRUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDakIsZ0RBQWdELEVBQ2hELENBQUMsS0FBYyxFQUFFLEVBQUU7WUFDakIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQztZQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FDRixFQUNELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUNqQixzQ0FBc0MsRUFDdEMsQ0FBQyxLQUFhLEVBQUUsRUFBRTtZQUNoQixJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQztRQUMvQixDQUFDLENBQ0YsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFnQztRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxPQUFPOztRQUNMLE1BQUEsSUFBSSxDQUFDLGFBQWEsMENBQUUsT0FBTyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELG9CQUFvQjtJQUVwQixXQUFXLENBQUMsTUFBa0I7UUFDNUIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU87UUFDVCxDQUFDO1FBRUQsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFO1lBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTVELElBQUksT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxJQUFJLE1BQU0sR0FBRyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7UUFDdEIsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTVDLElBQUksVUFBVSxHQUFHLElBQUksaUJBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDbkMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNqRCxVQUFVLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRS9DLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRW5DLE9BQU8sSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRTtZQUN6QixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsTUFBeUI7O1FBQzNDLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTztRQUVuQyxNQUFBLElBQUksQ0FBQyxtQkFBbUIsMENBQUUsT0FBTyxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUVoQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBRXJDLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDNUQsT0FBTztRQUNULENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBQ3JELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUN6RCxDQUFDO1FBRUYsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtZQUM1QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELGlCQUFpQjtJQUVqQixZQUFZLENBQUMsTUFBbUM7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ3BFLGdDQUFnQztZQUNoQyxPQUFPO1FBQ1QsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN2QyxZQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxlQUFlLEtBQUssU0FBUyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNoQixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFVLENBQy9CLEdBQVMsRUFBRTtZQUNULE1BQU0sSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7UUFDNUMsQ0FBQyxDQUFBLEVBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FDckIsQ0FBQztJQUNKLENBQUM7SUFFRCxrQkFBa0I7SUFFWiw0QkFBNEIsQ0FBQyxRQUFpQixLQUFLOztZQUN2RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxNQUFNO2dCQUFFLE9BQU87WUFFcEIsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdELENBQUM7S0FBQTtJQUVLLCtCQUErQixDQUFDLFVBQXNCLEVBQUUsUUFBaUIsS0FBSzs7O1lBQ2xGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xFLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBRTlDLElBQUksU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7WUFDMUIsSUFBSSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUU3QixLQUFLLElBQUksTUFBTSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNsQyxpRUFBaUU7Z0JBQ2pFLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDekIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBQ0QsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUVELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzRSxJQUFJLENBQUMsUUFBUTtnQkFBRSxPQUFPO1lBRXRCLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFBRSxPQUFPO1lBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFFMUMsSUFBSSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVqRSxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLE1BQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLE9BQU8sbUNBQUksTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDeEUsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7Z0JBQ3BDLE9BQU87WUFDVCxDQUFDO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRS9DLEtBQUssSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO2dCQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMzQixZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUIsQ0FBQztnQkFDRCxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBRUQsS0FBSyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxVQUFVLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEMsS0FBSyxJQUFJLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxVQUFVLGFBQVYsVUFBVSxjQUFWLFVBQVUsR0FBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzVELENBQUM7WUFDSCxDQUFDOztLQUNGO0lBRUssY0FBYyxDQUFDLEtBQXNDOztZQUN6RCxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN6QyxPQUFPLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNqQyxDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsQ0FBQztLQUFBO0lBRUQsbUJBQW1CLENBQUMsTUFBa0IsRUFBRSxVQUE4QixFQUFFLFFBQWlCLEtBQUs7UUFDNUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlELElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JFLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTFCLElBQUksSUFBSSxDQUFDLHNCQUFzQixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3pDLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxLQUFLLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxhQUFWLFVBQVUsY0FBVixVQUFVLEdBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7Z0JBQy9CLElBQUksR0FBRyxLQUFLLFdBQVc7b0JBQUUsU0FBUztnQkFDbEMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFFRCxNQUFNLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUU7Z0JBQzVDLElBQUksRUFBRSxXQUFXO2dCQUNqQixLQUFLLEVBQUUsa0NBQWtDO2FBQzFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxNQUFrQjtRQUNoRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLEtBQUssR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELGdCQUFnQjtJQUVoQixnQ0FBZ0MsQ0FBQyxNQUFrQjtRQUNqRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sR0FBRyxJQUFJLHVCQUFZLEVBQUUsQ0FBQztZQUM3QixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVsRCxJQUFJLGtCQUFrQixHQUFHLENBQUMsS0FBWSxFQUFFLEVBQUU7Z0JBQ3hDLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQW9DLENBQUMsQ0FBQztZQUNuRixDQUFDLENBQUM7WUFFRixVQUFVLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUV0RSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDcEIsSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDbEIsVUFBVSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDM0UsQ0FBQyxDQUFDLENBQ0gsQ0FBQztZQUVGLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRDs7O09BR0c7SUFDSCw4QkFBOEIsQ0FBQyxLQUFrQztRQUMvRCxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTVDLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLFVBQVUsQ0FBQyxZQUFZLENBQ3JCLDJDQUEyQyxFQUMzQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUNoQyxDQUFDO0lBQ0osQ0FBQztJQUVELDRCQUE0QjtRQUMxQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN2QyxLQUFLLElBQUksTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEMsQ0FBQztJQUNILENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxNQUFrQixFQUFFLFVBQThCO1FBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCO1lBQUUsT0FBTztRQUU1QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPO1FBRXJCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsT0FBTztJQUVQLGlCQUFpQjtRQUNmLElBQUksT0FBTyxHQUFpQixFQUFFLENBQUM7UUFDL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGO0FBbFVELHdDQWtVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIERpc3BsYXlNYXJrZXJMYXllcixcbiAgRGlzcG9zYWJsZSxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnQsXG5cbiAgQ29tbWFuZEV2ZW50LFxuICBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNQcm92aWRlciB9IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCBQcm92aWRlclJlZ2lzdHJ5IGZyb20gJy4vcHJvdmlkZXItcmVnaXN0cnknO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuXG5pbXBvcnQge1xuICBkZWZhdWx0IGFzIFNjcm9sbEd1dHRlcixcbiAgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50XG59IGZyb20gJy4vZWxlbWVudHMvc2Nyb2xsLWd1dHRlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbmRSZWZlcmVuY2VzTWFuYWdlciB7XG4gIHB1YmxpYyBlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsID0gbnVsbDtcbiAgcHVibGljIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHVibGljIHByb3ZpZGVyUmVnaXN0cnk6IFByb3ZpZGVyUmVnaXN0cnk8RmluZFJlZmVyZW5jZXNQcm92aWRlcj4gPSBuZXcgUHJvdmlkZXJSZWdpc3RyeSgpO1xuXG4gIHByaXZhdGUgZWRpdG9yU3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHdhdGNoZWRFZGl0b3JzOiBXZWFrU2V0PFRleHRFZGl0b3I+ID0gbmV3IFdlYWtTZXQoKTtcbiAgcHJpdmF0ZSBtYXJrZXJMYXllcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIERpc3BsYXlNYXJrZXJMYXllcj4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIHNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIFNjcm9sbEd1dHRlcj4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIHByaXZhdGUgZW5hYmxlU2Nyb2xsYmFyRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgZW5hYmxlRWRpdG9yRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG5cbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlRGVsYXk6IG51bWJlciA9IDIwMDtcbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9uQ3Vyc29yTW92ZSA9IHRoaXMub25DdXJzb3JNb3ZlLmJpbmQodGhpcyk7XG4gIH1cblxuICBpbml0aWFsaXplKHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSkge1xuICAgIHdoaWxlIChwZW5kaW5nUHJvdmlkZXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHByb3ZpZGVyID0gcGVuZGluZ1Byb3ZpZGVycy5zaGlmdCgpO1xuICAgICAgaWYgKCFwcm92aWRlcikgY29udGludWU7XG4gICAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICAgIH1cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yID0+IHtcbiAgICAgICAgbGV0IGRpc3Bvc2FibGUgPSB0aGlzLndhdGNoRWRpdG9yKGVkaXRvcik7XG4gICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gZGlzcG9zYWJsZT8uZGlzcG9zZSgpKTtcbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCB7XG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzOnNob3cnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnNjcm9sbGJhckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uID0gdmFsdWU7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2VuYWJsZVNjcm9sbGJhckRlY29yYXRpb24gaXMgbm93JywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5lbmFibGUnLFxuICAgICAgICAodmFsdWU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICB0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiBpcyBub3cnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5nZW5lcmFsLmRlbGF5JyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmN1cnNvck1vdmVEZWxheSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIGFkZFByb3ZpZGVyKHByb3ZpZGVyOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyKSB7XG4gICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfVxuXG4gIGRpc3Bvc2UoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zPy5kaXNwb3NlKCk7XG4gIH1cblxuICAvLyBFRElUT1IgTUFOQUdFTUVOVFxuXG4gIHdhdGNoRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGlmICh0aGlzLndhdGNoZWRFZGl0b3JzLmhhcyhlZGl0b3IpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBpZiAoZWRpdG9yVmlldy5oYXNGb2N1cygpKSB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcblxuICAgIGxldCBvbkZvY3VzID0gKCkgPT4gdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG4gICAgbGV0IG9uQmx1ciA9ICgpID0+IHt9O1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgbGV0IGRpc3Bvc2FibGUgPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgICBpZiAodGhpcy5lZGl0b3IgPT09IGVkaXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IobnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmFkZChlZGl0b3IpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoZGlzcG9zYWJsZSk7XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKGRpc3Bvc2FibGUpO1xuICAgICAgdGhpcy53YXRjaGVkRWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCkge1xuICAgIGlmIChlZGl0b3IgPT09IHRoaXMuZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBudWxsO1xuXG4gICAgdGhpcy5lZGl0b3IgPSB0aGlzLmVkaXRvclZpZXcgPSBudWxsO1xuXG4gICAgaWYgKGVkaXRvciA9PT0gbnVsbCB8fCAhYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcodGhpcy5lZGl0b3IpO1xuXG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbih0aGlzLm9uQ3Vyc29yTW92ZSlcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5oYXNGb2N1cygpKVxuICAgICAgdGhpcy5vbkN1cnNvck1vdmUoKTtcbiAgfVxuXG4gIC8vIEVWRU5UIEhBTkRMRVJTXG5cbiAgb25DdXJzb3JNb3ZlKF9ldmVudD86IEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gJiYgIXRoaXMuZW5hYmxlU2Nyb2xsYmFyRGVjb3JhdGlvbikge1xuICAgICAgLy8gVGhlcmUncyBubyByZWFzb24gdG8gcHJvY2VlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuY3Vyc29yTW92ZVRpbWVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmN1cnNvck1vdmVUaW1lcik7XG4gICAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9PT0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmVkaXRvcikge1xuICAgICAgbGV0IGxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKHRoaXMuZWRpdG9yKTtcbiAgICAgIGxheWVyLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJzb3JNb3ZlVGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoKTtcbiAgICAgIH0sXG4gICAgICB0aGlzLmN1cnNvck1vdmVEZWxheVxuICAgICk7XG4gIH1cblxuICAvLyBGSU5EIFJFRkVSRU5DRVNcblxuICBhc3luYyByZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBsZXQgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gICAgaWYgKCFlZGl0b3IpIHJldHVybjtcblxuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMoZWRpdG9yLCBmb3JjZSk7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKG1haW5FZGl0b3I6IFRleHRFZGl0b3IsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZygnZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycycsIG1haW5FZGl0b3IsIGZvcmNlKTtcbiAgICBsZXQgdmlzaWJsZUVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG5cbiAgICBsZXQgZWRpdG9yTWFwID0gbmV3IE1hcCgpO1xuICAgIGxldCByZWZlcmVuY2VNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGxldCBlZGl0b3Igb2YgdmlzaWJsZUVkaXRvcnMpIHtcbiAgICAgIC8vIE1vcmUgdGhhbiBvbmUgdmlzaWJsZSBlZGl0b3IgY2FuIGJlIHBvaW50aW5nIHRvIHRoZSBzYW1lIHBhdGguXG4gICAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBpZiAoIWVkaXRvck1hcC5oYXMocGF0aCkpIHtcbiAgICAgICAgZWRpdG9yTWFwLnNldChwYXRoLCBbXSk7XG4gICAgICB9XG4gICAgICBlZGl0b3JNYXAuZ2V0KHBhdGgpLnB1c2goZWRpdG9yKTtcbiAgICB9XG5cbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihtYWluRWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm47XG5cbiAgICBsZXQgY3Vyc29ycyA9IG1haW5FZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybjtcbiAgICBsZXQgW2N1cnNvcl0gPSBjdXJzb3JzO1xuICAgIGxldCBwb3NpdGlvbiA9IGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpO1xuXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKG1haW5FZGl0b3IsIHBvc2l0aW9uKTtcblxuICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdC50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIHJlZmVyZW5jZXM6ICR7cmVzdWx0Py5tZXNzYWdlID8/ICdudWxsJ31gKTtcbiAgICAgIHRoaXMuY2xlYXJBbGxWaXNpYmxlU2Nyb2xsR3V0dGVycygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUud2FybignUkVGRVJFTkNFUzonLCByZXN1bHQucmVmZXJlbmNlcyk7XG5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVzdWx0LnJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKCFyZWZlcmVuY2VNYXAuaGFzKHVyaSkpIHtcbiAgICAgICAgcmVmZXJlbmNlTWFwLnNldCh1cmksIFtdKTtcbiAgICAgIH1cbiAgICAgIHJlZmVyZW5jZU1hcC5nZXQodXJpKS5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcGF0aCBvZiBlZGl0b3JNYXAua2V5cygpKSB7XG4gICAgICBsZXQgZWRpdG9ycyA9IGVkaXRvck1hcC5nZXQocGF0aCk7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IHJlZmVyZW5jZU1hcC5nZXQocGF0aCk7XG4gICAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yLCByZWZlcmVuY2VzID8/IFtdLCBmb3JjZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGNvbnNvbGUubG9nKCdoaWdobGlnaHRSZWZlcmVuY2VzJywgZWRpdG9yLCByZWZlcmVuY2VzLCBmb3JjZSk7XG4gICAgbGV0IGVkaXRvck1hcmtlckxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgZWRpdG9yTWFya2VyTGF5ZXIuY2xlYXIoKTtcblxuICAgIGlmICh0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gfHwgZm9yY2UpIHtcbiAgICAgIGxldCBjdXJyZW50UGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgKHJlZmVyZW5jZXMgPz8gW10pKSB7XG4gICAgICAgIGxldCB7IHJhbmdlLCB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgICAgaWYgKHVyaSAhPT0gY3VycmVudFBhdGgpIGNvbnRpbnVlO1xuICAgICAgICBlZGl0b3JNYXJrZXJMYXllci5tYXJrQnVmZmVyUmFuZ2UocmFuZ2UpO1xuICAgICAgfVxuXG4gICAgICBlZGl0b3IuZGVjb3JhdGVNYXJrZXJMYXllcihlZGl0b3JNYXJrZXJMYXllciwge1xuICAgICAgICB0eXBlOiAnaGlnaGxpZ2h0JyxcbiAgICAgICAgY2xhc3M6ICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLXJlZmVyZW5jZSdcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgcmVmZXJlbmNlcyk7XG4gIH1cblxuICBnZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBsYXllciA9IHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGVkaXRvci5hZGRNYXJrZXJMYXllcigpO1xuICAgICAgdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGxheWVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxheWVyO1xuICB9XG5cbiAgLy8gU0NST0xMIEdVVFRFUlxuXG4gIGdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBuZXcgU2Nyb2xsR3V0dGVyKCk7XG4gICAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgICAgdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBlbGVtZW50KTtcblxuICAgICAgbGV0IG9uVmlzaWJpbGl0eUNoYW5nZSA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50IGFzIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBlbGVtZW50LmF0dGFjaFRvRWRpdG9yKGVkaXRvcik7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYW4gYXR0cmlidXRlIG9uIGBhdG9tLXRleHQtZWRpdG9yYCB3aGVuZXZlciBhIGBzY3JvbGwtZ3V0dGVyYCBlbGVtZW50XG4gICAqIGlzIHByZXNlbnQuIFRoaXMgYWxsb3dzIHVzIHRvIGRlZmluZSBjdXN0b20gc2Nyb2xsYmFyIG9wYWNpdHkgc3R5bGVzLlxuICAgKi9cbiAgb25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50OiBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpIHtcbiAgICBsZXQgeyBkZXRhaWw6IHsgdmlzaWJsZSwgZWRpdG9yIH0gfSA9IGV2ZW50O1xuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBlZGl0b3JWaWV3LnNldEF0dHJpYnV0ZShcbiAgICAgICd3aXRoLXB1bHNhci1maW5kLXJlZmVyZW5jZXMtc2Nyb2xsLWd1dHRlcicsXG4gICAgICB2aXNpYmxlID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnXG4gICAgKTtcbiAgfVxuXG4gIGNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKSB7XG4gICAgbGV0IGVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24pIHJldHVybjtcblxuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgZWxlbWVudC5oaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgLy8gVVRJTFxuXG4gIGdldFZpc2libGVFZGl0b3JzKCk6IFRleHRFZGl0b3JbXSB7XG4gICAgbGV0IGVkaXRvcnM6IFRleHRFZGl0b3JbXSA9IFtdO1xuICAgIGxldCBwYW5lcyA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVzKCk7XG4gICAgcGFuZXMuZm9yRWFjaChwYW5lID0+IHtcbiAgICAgIGxldCBpdGVtID0gcGFuZS5nZXRBY3RpdmVJdGVtKCk7XG4gICAgICBpZiAoYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGl0ZW0pKSB7XG4gICAgICAgIGVkaXRvcnMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlZGl0b3JzO1xuICB9XG59XG4iXX0=