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
            if (!result || result.type === 'error') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQW1CeEM7UUFsQk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0Msa0JBQWEsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBQ2hFLHFCQUFnQixHQUE2QyxJQUFJLDJCQUFnQixFQUFFLENBQUM7UUFFbkYsd0JBQW1CLEdBQStCLElBQUksQ0FBQztRQUN2RCxtQkFBYyxHQUF3QixJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3BELDJCQUFzQixHQUE0QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2hGLDRCQUF1QixHQUFzQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBRTNFLDhCQUF5QixHQUFZLElBQUksQ0FBQztRQUMxQywyQkFBc0IsR0FBWSxJQUFJLENBQUM7UUFDdkMsbUJBQWMsR0FBbUIsTUFBTSxDQUFDO1FBRXhDLG9CQUFlLEdBQVcsR0FBRyxDQUFDO1FBSXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxnQkFBMEM7UUFDbkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsUUFBUTtnQkFBRSxTQUFTO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FB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LGFBQWEsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUF0WUQsd0NBc1lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlckxheWVyLFxuICBEaXNwb3NhYmxlLFxuICBQb2ludCxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnQsXG4gIENvbW1hbmRFdmVudCxcbiAgQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnRcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIgfSBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy5kJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNSZXR1cm4sIFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IFByb3ZpZGVyUmVnaXN0cnkgZnJvbSAnLi9wcm92aWRlci1yZWdpc3RyeSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5pbXBvcnQgUmVmZXJlbmNlc1ZpZXcgZnJvbSAnLi9yZWZlcmVuY2UtcGFuZWwvcmVmZXJlbmNlcy12aWV3JztcblxuaW1wb3J0IHtcbiAgZGVmYXVsdCBhcyBTY3JvbGxHdXR0ZXIsXG4gIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudFxufSBmcm9tICcuL2VsZW1lbnRzL3Njcm9sbC1ndXR0ZXInO1xuXG50eXBlIFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCAnbm9uZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbmRSZWZlcmVuY2VzTWFuYWdlciB7XG4gIHB1YmxpYyBlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsID0gbnVsbDtcbiAgcHVibGljIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHVibGljIHByb3ZpZGVyUmVnaXN0cnk6IFByb3ZpZGVyUmVnaXN0cnk8RmluZFJlZmVyZW5jZXNQcm92aWRlcj4gPSBuZXcgUHJvdmlkZXJSZWdpc3RyeSgpO1xuXG4gIHByaXZhdGUgZWRpdG9yU3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHdhdGNoZWRFZGl0b3JzOiBXZWFrU2V0PFRleHRFZGl0b3I+ID0gbmV3IFdlYWtTZXQoKTtcbiAgcHJpdmF0ZSBtYXJrZXJMYXllcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIERpc3BsYXlNYXJrZXJMYXllcj4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIHNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIFNjcm9sbEd1dHRlcj4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIHByaXZhdGUgZW5hYmxlU2Nyb2xsYmFyRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgZW5hYmxlRWRpdG9yRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgc3BsaXREaXJlY3Rpb246IFNwbGl0RGlyZWN0aW9uID0gJ25vbmUnO1xuXG4gIHByaXZhdGUgY3Vyc29yTW92ZURlbGF5OiBudW1iZXIgPSAyMDA7XG4gIHByaXZhdGUgY3Vyc29yTW92ZVRpbWVyPzogTm9kZUpTLlRpbWVvdXQgfCBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5vbkN1cnNvck1vdmUgPSB0aGlzLm9uQ3Vyc29yTW92ZS5iaW5kKHRoaXMpO1xuICB9XG5cbiAgaW5pdGlhbGl6ZShwZW5kaW5nUHJvdmlkZXJzOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyW10pIHtcbiAgICB3aGlsZSAocGVuZGluZ1Byb3ZpZGVycy5sZW5ndGgpIHtcbiAgICAgIGxldCBwcm92aWRlciA9IHBlbmRpbmdQcm92aWRlcnMuc2hpZnQoKTtcbiAgICAgIGlmICghcHJvdmlkZXIpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgICB9XG5cbiAgICBhdG9tLndvcmtzcGFjZS5hZGRPcGVuZXIoZmlsZVBhdGggPT4ge1xuICAgICAgaWYgKGZpbGVQYXRoLmluZGV4T2YoUmVmZXJlbmNlc1ZpZXcuVVJJKSAhPT0gLTEpXG4gICAgICAgIHJldHVybiBuZXcgUmVmZXJlbmNlc1ZpZXcoKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH0pO1xuXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKGVkaXRvciA9PiB7XG4gICAgICAgIGxldCBkaXNwb3NhYmxlID0gdGhpcy53YXRjaEVkaXRvcihlZGl0b3IpO1xuICAgICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IGRpc3Bvc2FibGU/LmRpc3Bvc2UoKSk7XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXRleHQtZWRpdG9yJywge1xuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlczpoaWdobGlnaHQnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlczpzaG93LXBhbmVsJzogKF9ldmVudDogQ29tbWFuZEV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdFJlZmVyZW5jZXNGb3JQYW5lbCgpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnBhbmVsLnNwbGl0RGlyZWN0aW9uJyxcbiAgICAgICAgKHZhbHVlOiBTcGxpdERpcmVjdGlvbikgPT4ge1xuICAgICAgICAgIHRoaXMuc3BsaXREaXJlY3Rpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnNjcm9sbGJhckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbmFibGVTY3JvbGxiYXJEZWNvcmF0aW9uID0gdmFsdWU7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2VuYWJsZVNjcm9sbGJhckRlY29yYXRpb24gaXMgbm93JywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5lbmFibGUnLFxuICAgICAgICAodmFsdWU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICB0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiBpcyBub3cnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5nZW5lcmFsLmRlbGF5JyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmN1cnNvck1vdmVEZWxheSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIGFkZFByb3ZpZGVyKHByb3ZpZGVyOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyKSB7XG4gICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfVxuXG4gIGRpc3Bvc2UoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zPy5kaXNwb3NlKCk7XG4gIH1cblxuICAvLyBFRElUT1IgTUFOQUdFTUVOVFxuXG4gIHdhdGNoRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGlmICh0aGlzLndhdGNoZWRFZGl0b3JzLmhhcyhlZGl0b3IpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBpZiAoZWRpdG9yVmlldy5oYXNGb2N1cygpKSB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcblxuICAgIGxldCBvbkZvY3VzID0gKCkgPT4gdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG4gICAgbGV0IG9uQmx1ciA9ICgpID0+IHt9O1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgbGV0IGRpc3Bvc2FibGUgPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBvbkJsdXIpO1xuXG4gICAgICBpZiAodGhpcy5lZGl0b3IgPT09IGVkaXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IobnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmFkZChlZGl0b3IpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoZGlzcG9zYWJsZSk7XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKGRpc3Bvc2FibGUpO1xuICAgICAgdGhpcy53YXRjaGVkRWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCkge1xuICAgIGlmIChlZGl0b3IgPT09IHRoaXMuZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBudWxsO1xuXG4gICAgdGhpcy5lZGl0b3IgPSB0aGlzLmVkaXRvclZpZXcgPSBudWxsO1xuXG4gICAgaWYgKGVkaXRvciA9PT0gbnVsbCB8fCAhYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcodGhpcy5lZGl0b3IpO1xuXG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbih0aGlzLm9uQ3Vyc29yTW92ZSlcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5oYXNGb2N1cygpKVxuICAgICAgdGhpcy5vbkN1cnNvck1vdmUoKTtcbiAgfVxuXG4gIC8vIEVWRU5UIEhBTkRMRVJTXG5cbiAgb25DdXJzb3JNb3ZlKF9ldmVudD86IEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gJiYgIXRoaXMuZW5hYmxlU2Nyb2xsYmFyRGVjb3JhdGlvbikge1xuICAgICAgLy8gVGhlcmUncyBubyByZWFzb24gdG8gcHJvY2VlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuY3Vyc29yTW92ZVRpbWVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmN1cnNvck1vdmVUaW1lcik7XG4gICAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9PT0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmVkaXRvcikge1xuICAgICAgbGV0IGxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKHRoaXMuZWRpdG9yKTtcbiAgICAgIGxheWVyLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJzb3JNb3ZlVGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoKTtcbiAgICAgIH0sXG4gICAgICB0aGlzLmN1cnNvck1vdmVEZWxheVxuICAgICk7XG4gIH1cblxuICAvLyBGSU5EIFJFRkVSRU5DRVNcblxuICBhc3luYyByZXF1ZXN0UmVmZXJlbmNlc0ZvclBhbmVsKCkge1xuICAgIGxldCBlZGl0b3IgPSB0aGlzLmVkaXRvcjtcbiAgICBpZiAoIWVkaXRvcikgcmV0dXJuO1xuXG4gICAgbGV0IHJlZmVyZW5jZXMgPSBhd2FpdCB0aGlzLmdldFJlZmVyZW5jZXNGb3JQcm9qZWN0KGVkaXRvcik7XG4gICAgaWYgKCFyZWZlcmVuY2VzKSByZXR1cm47XG4gICAgdGhpcy5zaG93UmVmZXJlbmNlc1BhbmUocmVmZXJlbmNlcyk7XG4gIH1cblxuICBzaG93UmVmZXJlbmNlc1BhbmUocmVmZXJlbmNlczogRmluZFJlZmVyZW5jZXNSZXR1cm4pIHtcbiAgICBpZiAocmVmZXJlbmNlcy50eXBlICE9PSAnZGF0YScpIHJldHVybjtcblxuICAgIC8vIEhBQ0tcbiAgICBSZWZlcmVuY2VzVmlldy5zZXRSZWZlcmVuY2VzKHJlZmVyZW5jZXMucmVmZXJlbmNlcywgcmVmZXJlbmNlcy5yZWZlcmVuY2VkU3ltYm9sTmFtZSk7XG5cbiAgICBsZXQgc3BsaXREaXJlY3Rpb24gPSB0aGlzLnNwbGl0RGlyZWN0aW9uID09PSAnbm9uZScgPyB1bmRlZmluZWQgOiB0aGlzLnNwbGl0RGlyZWN0aW9uO1xuICAgIGlmICh0aGlzLnNwbGl0RGlyZWN0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNwbGl0RGlyZWN0aW9uID0gJ3JpZ2h0JztcbiAgICB9XG5cbiAgICByZXR1cm4gYXRvbS53b3Jrc3BhY2Uub3BlbihcbiAgICAgIFJlZmVyZW5jZXNWaWV3LlVSSSxcbiAgICAgIHtcbiAgICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgICAgIHNwbGl0OiBzcGxpdERpcmVjdGlvblxuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBhc3luYyBnZXRSZWZlcmVuY2VzRm9yUHJvamVjdChlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPEZpbmRSZWZlcmVuY2VzUmV0dXJuIHwgbnVsbD4ge1xuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblxuICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIXBvc2l0aW9uKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXG4gICAgcmV0dXJuIHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKGVkaXRvciwgcG9zaXRpb24pO1xuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcihmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgbGV0IGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKGVkaXRvciwgZm9yY2UpO1xuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhtYWluRWRpdG9yOiBUZXh0RWRpdG9yLCBmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgY29uc29sZS5sb2coJ2ZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMnLCBtYWluRWRpdG9yLCBmb3JjZSk7XG4gICAgbGV0IHZpc2libGVFZGl0b3JzID0gdGhpcy5nZXRWaXNpYmxlRWRpdG9ycygpO1xuXG4gICAgbGV0IGVkaXRvck1hcCA9IG5ldyBNYXAoKTtcbiAgICBsZXQgcmVmZXJlbmNlTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIHZpc2libGVFZGl0b3JzKSB7XG4gICAgICAvLyBNb3JlIHRoYW4gb25lIHZpc2libGUgZWRpdG9yIGNhbiBiZSBwb2ludGluZyB0byB0aGUgc2FtZSBwYXRoLlxuICAgICAgbGV0IHBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgICAgaWYgKCFlZGl0b3JNYXAuaGFzKHBhdGgpKSB7XG4gICAgICAgIGVkaXRvck1hcC5zZXQocGF0aCwgW10pO1xuICAgICAgfVxuICAgICAgZWRpdG9yTWFwLmdldChwYXRoKS5wdXNoKGVkaXRvcik7XG4gICAgfVxuXG4gICAgbGV0IHByb3ZpZGVyID0gdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmdldEZpcnN0UHJvdmlkZXJGb3JFZGl0b3IobWFpbkVkaXRvcik7XG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuO1xuXG4gICAgbGV0IGN1cnNvcnMgPSBtYWluRWRpdG9yLmdldEN1cnNvcnMoKTtcbiAgICBpZiAoY3Vyc29ycy5sZW5ndGggPiAxKSByZXR1cm47XG4gICAgbGV0IFtjdXJzb3JdID0gY3Vyc29ycztcbiAgICBsZXQgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKTtcblxuICAgIGxldCByZXN1bHQgPSBhd2FpdCBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhtYWluRWRpdG9yLCBwb3NpdGlvbik7XG5cbiAgICBpZiAoIXJlc3VsdCB8fCByZXN1bHQudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyByZWZlcmVuY2VzOiAke3Jlc3VsdD8ubWVzc2FnZSA/PyAnbnVsbCd9YCk7XG4gICAgICB0aGlzLmNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLndhcm4oJ1JFRkVSRU5DRVM6JywgcmVzdWx0LnJlZmVyZW5jZXMpO1xuXG4gICAgUmVmZXJlbmNlc1ZpZXcuc2V0UmVmZXJlbmNlcyhyZXN1bHQucmVmZXJlbmNlcywgcmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lKTtcblxuXG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlc3VsdC5yZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgeyB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGlmICghcmVmZXJlbmNlTWFwLmhhcyh1cmkpKSB7XG4gICAgICAgIHJlZmVyZW5jZU1hcC5zZXQodXJpLCBbXSk7XG4gICAgICB9XG4gICAgICByZWZlcmVuY2VNYXAuZ2V0KHVyaSkucHVzaChyZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGZvciAobGV0IHBhdGggb2YgZWRpdG9yTWFwLmtleXMoKSkge1xuICAgICAgbGV0IGVkaXRvcnMgPSBlZGl0b3JNYXAuZ2V0KHBhdGgpO1xuICAgICAgbGV0IHJlZmVyZW5jZXMgPSByZWZlcmVuY2VNYXAuZ2V0KHBhdGgpO1xuICAgICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRSZWZlcmVuY2VzKGVkaXRvciwgcmVmZXJlbmNlcyA/PyBbXSwgZm9yY2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzKGV2ZW50OiBDb21tYW5kRXZlbnQ8VGV4dEVkaXRvckVsZW1lbnQ+KSB7XG4gICAgbGV0IGVkaXRvciA9IGV2ZW50LmN1cnJlbnRUYXJnZXQuZ2V0TW9kZWwoKTtcbiAgICBpZiAoIWF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcihlZGl0b3IpKSB7XG4gICAgICByZXR1cm4gZXZlbnQuYWJvcnRLZXlCaW5kaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMoZWRpdG9yKTtcbiAgfVxuXG4gIGhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yOiBUZXh0RWRpdG9yLCByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSB8IG51bGwsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZygnaGlnaGxpZ2h0UmVmZXJlbmNlcycsIGVkaXRvciwgcmVmZXJlbmNlcywgZm9yY2UpO1xuICAgIGxldCBlZGl0b3JNYXJrZXJMYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGVkaXRvck1hcmtlckxheWVyLmNsZWFyKCk7XG5cbiAgICBpZiAodGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uIHx8IGZvcmNlKSB7XG4gICAgICBsZXQgY3VycmVudFBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIChyZWZlcmVuY2VzID8/IFtdKSkge1xuICAgICAgICBsZXQgeyByYW5nZSwgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICAgIGlmICh1cmkgIT09IGN1cnJlbnRQYXRoKSBjb250aW51ZTtcbiAgICAgICAgZWRpdG9yTWFya2VyTGF5ZXIubWFya0J1ZmZlclJhbmdlKHJhbmdlKTtcbiAgICAgIH1cblxuICAgICAgZWRpdG9yLmRlY29yYXRlTWFya2VyTGF5ZXIoZWRpdG9yTWFya2VyTGF5ZXIsIHtcbiAgICAgICAgdHlwZTogJ2hpZ2hsaWdodCcsXG4gICAgICAgIGNsYXNzOiAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1yZWZlcmVuY2UnXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogUG9pbnQgfCBudWxsIHtcbiAgICBsZXQgY3Vyc29ycyA9IGVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuIG51bGw7XG4gICAgbGV0IFtjdXJzb3JdID0gY3Vyc29ycztcbiAgICBsZXQgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKTtcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICBnZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBsYXllciA9IHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGVkaXRvci5hZGRNYXJrZXJMYXllcigpO1xuICAgICAgdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGxheWVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxheWVyO1xuICB9XG5cbiAgLy8gU0NST0xMIEdVVFRFUlxuXG4gIGdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBuZXcgU2Nyb2xsR3V0dGVyKCk7XG4gICAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgICAgdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBlbGVtZW50KTtcblxuICAgICAgbGV0IG9uVmlzaWJpbGl0eUNoYW5nZSA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50IGFzIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBlbGVtZW50LmF0dGFjaFRvRWRpdG9yKGVkaXRvcik7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYW4gYXR0cmlidXRlIG9uIGBhdG9tLXRleHQtZWRpdG9yYCB3aGVuZXZlciBhIGBzY3JvbGwtZ3V0dGVyYCBlbGVtZW50XG4gICAqIGlzIHByZXNlbnQuIFRoaXMgYWxsb3dzIHVzIHRvIGRlZmluZSBjdXN0b20gc2Nyb2xsYmFyIG9wYWNpdHkgc3R5bGVzLlxuICAgKi9cbiAgb25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50OiBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpIHtcbiAgICBsZXQgeyBkZXRhaWw6IHsgdmlzaWJsZSwgZWRpdG9yIH0gfSA9IGV2ZW50O1xuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBlZGl0b3JWaWV3LnNldEF0dHJpYnV0ZShcbiAgICAgICd3aXRoLXB1bHNhci1maW5kLXJlZmVyZW5jZXMtc2Nyb2xsLWd1dHRlcicsXG4gICAgICB2aXNpYmxlID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnXG4gICAgKTtcbiAgfVxuXG4gIGNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKSB7XG4gICAgbGV0IGVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVNjcm9sbGJhckRlY29yYXRpb24pIHJldHVybjtcblxuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgZWxlbWVudC5oaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgLy8gVVRJTFxuXG4gIGdldFZpc2libGVFZGl0b3JzKCk6IFRleHRFZGl0b3JbXSB7XG4gICAgbGV0IGVkaXRvcnM6IFRleHRFZGl0b3JbXSA9IFtdO1xuICAgIGxldCBwYW5lcyA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVzKCk7XG4gICAgcGFuZXMuZm9yRWFjaChwYW5lID0+IHtcbiAgICAgIGxldCBpdGVtID0gcGFuZS5nZXRBY3RpdmVJdGVtKCk7XG4gICAgICBpZiAoYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGl0ZW0pKSB7XG4gICAgICAgIGVkaXRvcnMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlZGl0b3JzO1xuICB9XG59XG4iXX0=