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
        this.splitDirection = 'none';
        this.enableEditorDecoration = true;
        this.skipCurrentReference = true;
        this.ignoreThreshold = 0;
        this.cursorMoveDelay = 400;
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
            if (!this.editor)
                return;
            let references = yield this.findReferencesForProject(this.editor);
            if (!references) {
                // When we have no new references to show, we'll return early rather than
                // clear the panel of results. No point in replacing the previous results
                // with an empty list.
                return;
            }
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
    findReferencesForProject(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider = this.providerRegistry.getFirstProviderForEditor(editor);
            if (!provider)
                return Promise.resolve(null);
            let position = this.getCursorPositionForEditor(editor);
            if (!position)
                return Promise.resolve(null);
            try {
                return provider.findReferences(editor, position);
            }
            catch (err) {
                // Some providers return errors when they don't strictly need to. For
                // instance, `gopls` will return an error if you ask it to resolve a
                // reference at a whitespace position.
                //
                // Even though all this does is log an uncaught exception to the console,
                // it's annoying… so instead we'll catch the error and log it ourselves
                // via our `console` helper. This means it'll be hidden unless the user
                // opts into debug logging.
                console.error(`Error while retrieving references:`);
                console.error(err);
                return null;
            }
        });
    }
    requestReferencesUnderCursor(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.editor)
                return;
            return this.findReferencesForVisibleEditors(this.editor, force);
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
            try {
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
            }
            catch (err) {
                console.error(`Error retrieving references:`);
                console.error(err);
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
        let element = this.getOrCreateScrollGutterForEditor(editor);
        if (!element)
            return;
        // We call this method even if scrollbar decoration is disabled; this is
        // what allows us to clear existing references if the user just unchecked
        // the “Enable” checkbox.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVNjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFFMUIsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQXdCeEM7UUF2Qk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsbUJBQWMsR0FBbUIsTUFBTSxDQUFDO1FBRXhDLDJCQUFzQixHQUFZLElBQUksQ0FBQztRQUN2Qyx5QkFBb0IsR0FBWSxJQUFJLENBQUM7UUFDckMsb0JBQWUsR0FBVyxDQUFDLENBQUM7UUFDNUIsb0JBQWUsR0FBVyxHQUFHLENBQUM7UUFNcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsVUFBVSxDQUFDLGdCQUEwQztRQUNuRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxD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SUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUE5Y0Qsd0NBOGNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlckxheWVyLFxuICBEaXNwb3NhYmxlLFxuICBQb2ludCxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnQsXG4gIENvbW1hbmRFdmVudCxcbiAgQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnRcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIgfSBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy5kJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNSZXR1cm4sIFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IFByb3ZpZGVyUmVnaXN0cnkgZnJvbSAnLi9wcm92aWRlci1yZWdpc3RyeSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5pbXBvcnQgUmVmZXJlbmNlc1ZpZXcgZnJvbSAnLi9yZWZlcmVuY2UtcGFuZWwvcmVmZXJlbmNlcy12aWV3JztcblxuLy8gSG93IGxvbmcgYWZ0ZXIgdGhlIHVzZXIgbGFzdCB0eXBlZCBhIGNoYXJhY3RlciBiZWZvcmUgd2UgY29uc2lkZXIgdGhlbSB0byBub1xuLy8gbG9uZ2VyIGJlIHR5cGluZy5cbmNvbnN0IFRZUElOR19ERUxBWSA9IDEwMDA7XG5cbmltcG9ydCB7XG4gIGRlZmF1bHQgYXMgU2Nyb2xsR3V0dGVyLFxuICBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnRcbn0gZnJvbSAnLi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyJztcblxudHlwZSBTcGxpdERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIHwgJ25vbmUnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaW5kUmVmZXJlbmNlc01hbmFnZXIge1xuICBwdWJsaWMgZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCA9IG51bGw7XG4gIHB1YmxpYyBlZGl0b3JWaWV3OiBUZXh0RWRpdG9yRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgaXNUeXBpbmc6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwdWJsaWMgcHJvdmlkZXJSZWdpc3RyeTogUHJvdmlkZXJSZWdpc3RyeTxGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiA9IG5ldyBQcm92aWRlclJlZ2lzdHJ5KCk7XG5cbiAgcHJpdmF0ZSBlZGl0b3JTdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgd2F0Y2hlZEVkaXRvcnM6IFdlYWtTZXQ8VGV4dEVkaXRvcj4gPSBuZXcgV2Vha1NldCgpO1xuICBwcml2YXRlIG1hcmtlckxheWVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgRGlzcGxheU1hcmtlckxheWVyPiA9IG5ldyBXZWFrTWFwKCk7XG4gIHByaXZhdGUgc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgU2Nyb2xsR3V0dGVyPiA9IG5ldyBXZWFrTWFwKCk7XG5cbiAgcHJpdmF0ZSBzcGxpdERpcmVjdGlvbjogU3BsaXREaXJlY3Rpb24gPSAnbm9uZSc7XG5cbiAgcHJpdmF0ZSBlbmFibGVFZGl0b3JEZWNvcmF0aW9uOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBza2lwQ3VycmVudFJlZmVyZW5jZTogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgaWdub3JlVGhyZXNob2xkOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGN1cnNvck1vdmVEZWxheTogbnVtYmVyID0gNDAwO1xuXG4gIHByaXZhdGUgY3Vyc29yTW92ZVRpbWVyPzogTm9kZUpTLlRpbWVvdXQgfCBudW1iZXI7XG4gIHByaXZhdGUgdHlwaW5nVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9uQ3Vyc29yTW92ZSA9IHRoaXMub25DdXJzb3JNb3ZlLmJpbmQodGhpcyk7XG4gIH1cblxuICBpbml0aWFsaXplKHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSkge1xuICAgIHdoaWxlIChwZW5kaW5nUHJvdmlkZXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHByb3ZpZGVyID0gcGVuZGluZ1Byb3ZpZGVycy5zaGlmdCgpO1xuICAgICAgaWYgKCFwcm92aWRlcikgY29udGludWU7XG4gICAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICAgIH1cblxuICAgIGF0b20ud29ya3NwYWNlLmFkZE9wZW5lcihmaWxlUGF0aCA9PiB7XG4gICAgICBpZiAoZmlsZVBhdGguaW5kZXhPZihSZWZlcmVuY2VzVmlldy5VUkkpICE9PSAtMSlcbiAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzVmlldygpO1xuXG4gICAgICByZXR1cm47XG4gICAgfSk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKGVkaXRvciA9PiB7XG4gICAgICAgIGxldCBkaXNwb3NhYmxlID0gdGhpcy53YXRjaEVkaXRvcihlZGl0b3IpO1xuICAgICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IGRpc3Bvc2FibGU/LmRpc3Bvc2UoKSk7XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXRleHQtZWRpdG9yJywge1xuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlczpoaWdobGlnaHQnOiAoX2V2ZW50OiBDb21tYW5kRXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlczpzaG93LXBhbmVsJzogKF9ldmVudDogQ29tbWFuZEV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdFJlZmVyZW5jZXNGb3JQYW5lbCgpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnBhbmVsLnNwbGl0RGlyZWN0aW9uJyxcbiAgICAgICAgKHZhbHVlOiBTcGxpdERpcmVjdGlvbikgPT4ge1xuICAgICAgICAgIHRoaXMuc3BsaXREaXJlY3Rpb24gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmVkaXRvckRlY29yYXRpb24uZW5hYmxlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmRlbGF5JyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmN1cnNvck1vdmVEZWxheSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5pZ25vcmVUaHJlc2hvbGQnLFxuICAgICAgICAodmFsdWU6IG51bWJlcikgPT4ge1xuICAgICAgICAgIHRoaXMuaWdub3JlVGhyZXNob2xkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLnNraXBDdXJyZW50UmVmZXJlbmNlJyxcbiAgICAgICAgKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgdGhpcy5za2lwQ3VycmVudFJlZmVyZW5jZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICk7XG4gIH1cblxuICBhZGRQcm92aWRlcihwcm92aWRlcjogRmluZFJlZmVyZW5jZXNQcm92aWRlcikge1xuICAgIHRoaXMucHJvdmlkZXJSZWdpc3RyeS5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gIH1cblxuICBkaXNwb3NlKCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICB9XG5cbiAgLy8gRURJVE9SIE1BTkFHRU1FTlRcblxuICB3YXRjaEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBpZiAodGhpcy53YXRjaGVkRWRpdG9ycy5oYXMoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgaWYgKGVkaXRvclZpZXcuaGFzRm9jdXMoKSkgdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKGVkaXRvcik7XG5cbiAgICBsZXQgb25Gb2N1cyA9ICgpID0+IHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3IpO1xuICAgIGxldCBvbkJsdXIgPSAoKSA9PiB7fTtcbiAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cyk7XG4gICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgb25CbHVyKTtcblxuICAgIGxldCBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICAgIGxldCBkaXNwb3NhYmxlID0gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uRm9jdXMpO1xuICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdibHVyJywgb25CbHVyKTtcblxuICAgICAgaWYgKHRoaXMuZWRpdG9yID09PSBlZGl0b3IpIHtcbiAgICAgICAgdGhpcy51cGRhdGVDdXJyZW50RWRpdG9yKG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBkaXNwb3NhYmxlLFxuICAgICAgZWRpdG9yLmdldEJ1ZmZlcigpLm9uRGlkQ2hhbmdlKCgpID0+IHtcbiAgICAgICAgdGhpcy5pc1R5cGluZyA9IHRydWU7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnR5cGluZ1RpbWVyKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgICAgdGhpcy50eXBpbmdUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgKCkgPT4gdGhpcy5pc1R5cGluZyA9IGZhbHNlLFxuICAgICAgICAgIDEwMDBcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIHRoaXMud2F0Y2hlZEVkaXRvcnMuYWRkKGVkaXRvcik7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChkaXNwb3NhYmxlKTtcblxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5yZW1vdmUoZGlzcG9zYWJsZSk7XG4gICAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmRlbGV0ZShlZGl0b3IpO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsKSB7XG4gICAgaWYgKGVkaXRvciA9PT0gdGhpcy5lZGl0b3IpIHJldHVybjtcblxuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucyA9IG51bGw7XG5cbiAgICB0aGlzLmVkaXRvciA9IHRoaXMuZWRpdG9yVmlldyA9IG51bGw7XG5cbiAgICBpZiAoZWRpdG9yID09PSBudWxsIHx8ICFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmVkaXRvcik7XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgIHRoaXMuZWRpdG9yU3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKHRoaXMub25DdXJzb3JNb3ZlKVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5lZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpXG4gICAgICB0aGlzLm9uQ3Vyc29yTW92ZSgpO1xuICB9XG5cbiAgLy8gRVZFTlQgSEFORExFUlNcblxuICBvbkN1cnNvck1vdmUoX2V2ZW50PzogQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnQpIHtcbiAgICBpZiAodGhpcy5jdXJzb3JNb3ZlVGltZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY3Vyc29yTW92ZVRpbWVyKTtcbiAgICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID09PSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZWRpdG9yKSB7XG4gICAgICBsZXQgbGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IodGhpcy5lZGl0b3IpO1xuICAgICAgbGF5ZXIuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1R5cGluZykge1xuICAgICAgY29uc29sZS5sb2coJ1VzZXIgaXMgdHlwaW5nLCBzbyB3YWl0IGxvbmdlciB0aGFuIHVzdWFs4oCmJyk7XG4gICAgfVxuICAgIHRoaXMuY3Vyc29yTW92ZVRpbWVyID0gc2V0VGltZW91dChcbiAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZXF1ZXN0UmVmZXJlbmNlc1VuZGVyQ3Vyc29yKCk7XG4gICAgICB9LFxuICAgICAgLy8gV2hlbiB0aGUgdXNlciBpcyB0eXBpbmcsIHdhaXQgYXQgbGVhc3QgYXMgbG9uZyBhcyB0aGUgdHlwaW5nIGRlbGF5XG4gICAgICAvLyB3aW5kb3cuXG4gICAgICB0aGlzLmlzVHlwaW5nID8gVFlQSU5HX0RFTEFZIDogdGhpcy5jdXJzb3JNb3ZlRGVsYXlcbiAgICApO1xuICB9XG5cbiAgLy8gRklORCBSRUZFUkVOQ0VTXG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNGb3JQYW5lbCgpIHtcbiAgICBpZiAoIXRoaXMuZWRpdG9yKSByZXR1cm47XG5cbiAgICBsZXQgcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZmluZFJlZmVyZW5jZXNGb3JQcm9qZWN0KHRoaXMuZWRpdG9yKTtcbiAgICBpZiAoIXJlZmVyZW5jZXMpIHtcbiAgICAgIC8vIFdoZW4gd2UgaGF2ZSBubyBuZXcgcmVmZXJlbmNlcyB0byBzaG93LCB3ZSdsbCByZXR1cm4gZWFybHkgcmF0aGVyIHRoYW5cbiAgICAgIC8vIGNsZWFyIHRoZSBwYW5lbCBvZiByZXN1bHRzLiBObyBwb2ludCBpbiByZXBsYWNpbmcgdGhlIHByZXZpb3VzIHJlc3VsdHNcbiAgICAgIC8vIHdpdGggYW4gZW1wdHkgbGlzdC5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zaG93UmVmZXJlbmNlc1BhbmVsKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgc2hvd1JlZmVyZW5jZXNQYW5lbChyZXN1bHQ6IEZpbmRSZWZlcmVuY2VzUmV0dXJuKSB7XG4gICAgaWYgKHJlc3VsdC50eXBlICE9PSAnZGF0YScpIHJldHVybjtcblxuICAgIC8vIEhBQ0tcbiAgICBSZWZlcmVuY2VzVmlldy5zZXRSZWZlcmVuY2VzKHJlc3VsdC5yZWZlcmVuY2VzLCByZXN1bHQucmVmZXJlbmNlZFN5bWJvbE5hbWUpO1xuXG4gICAgbGV0IHNwbGl0RGlyZWN0aW9uID0gdGhpcy5zcGxpdERpcmVjdGlvbiA9PT0gJ25vbmUnID8gdW5kZWZpbmVkIDogdGhpcy5zcGxpdERpcmVjdGlvbjtcbiAgICBpZiAodGhpcy5zcGxpdERpcmVjdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzcGxpdERpcmVjdGlvbiA9ICdyaWdodCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF0b20ud29ya3NwYWNlLm9wZW4oXG4gICAgICAvLyBWYXJ5IHRoZSBVUkwgc28gdGhhdCBkaWZmZXJlbnQgcmVmZXJlbmNlIGxvb2t1cHMgdGVuZCB0byB1c2UgZGlmZmVyZW50XG4gICAgICAvLyB2aWV3cy4gV2UgZG9uJ3Qgd2FudCB0byBmb3JjZSBldmVyeXRoaW5nIHRvIHVzZSB0aGUgc2FtZSB2aWV3XG4gICAgICAvLyBpbnN0YW5jZS5cbiAgICAgIGAke1JlZmVyZW5jZXNWaWV3LlVSSX0vJHtyZXN1bHQucmVmZXJlbmNlZFN5bWJvbE5hbWV9YCxcbiAgICAgIHtcbiAgICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgICAgIHNwbGl0OiBzcGxpdERpcmVjdGlvblxuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvclByb2plY3QoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTxGaW5kUmVmZXJlbmNlc1JldHVybiB8IG51bGw+IHtcbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG5cbiAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnNvclBvc2l0aW9uRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFwb3NpdGlvbikgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMoZWRpdG9yLCBwb3NpdGlvbik7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBTb21lIHByb3ZpZGVycyByZXR1cm4gZXJyb3JzIHdoZW4gdGhleSBkb24ndCBzdHJpY3RseSBuZWVkIHRvLiBGb3JcbiAgICAgIC8vIGluc3RhbmNlLCBgZ29wbHNgIHdpbGwgcmV0dXJuIGFuIGVycm9yIGlmIHlvdSBhc2sgaXQgdG8gcmVzb2x2ZSBhXG4gICAgICAvLyByZWZlcmVuY2UgYXQgYSB3aGl0ZXNwYWNlIHBvc2l0aW9uLlxuICAgICAgLy9cbiAgICAgIC8vIEV2ZW4gdGhvdWdoIGFsbCB0aGlzIGRvZXMgaXMgbG9nIGFuIHVuY2F1Z2h0IGV4Y2VwdGlvbiB0byB0aGUgY29uc29sZSxcbiAgICAgIC8vIGl0J3MgYW5ub3lpbmfigKYgc28gaW5zdGVhZCB3ZSdsbCBjYXRjaCB0aGUgZXJyb3IgYW5kIGxvZyBpdCBvdXJzZWx2ZXNcbiAgICAgIC8vIHZpYSBvdXIgYGNvbnNvbGVgIGhlbHBlci4gVGhpcyBtZWFucyBpdCdsbCBiZSBoaWRkZW4gdW5sZXNzIHRoZSB1c2VyXG4gICAgICAvLyBvcHRzIGludG8gZGVidWcgbG9nZ2luZy5cbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdoaWxlIHJldHJpZXZpbmcgcmVmZXJlbmNlczpgKVxuICAgICAgY29uc29sZS5lcnJvcihlcnIpXG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzVW5kZXJDdXJzb3IoZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGlmICghdGhpcy5lZGl0b3IpIHJldHVybjtcbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKHRoaXMuZWRpdG9yLCBmb3JjZSk7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKG1haW5FZGl0b3I6IFRleHRFZGl0b3IsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBsZXQgdmlzaWJsZUVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG5cbiAgICBsZXQgZWRpdG9yTWFwID0gbmV3IE1hcCgpO1xuICAgIGxldCByZWZlcmVuY2VNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGxldCBlZGl0b3Igb2YgdmlzaWJsZUVkaXRvcnMpIHtcbiAgICAgIC8vIE1vcmUgdGhhbiBvbmUgdmlzaWJsZSBlZGl0b3IgY2FuIGJlIHBvaW50aW5nIHRvIHRoZSBzYW1lIHBhdGguXG4gICAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBpZiAoIWVkaXRvck1hcC5oYXMocGF0aCkpIHtcbiAgICAgICAgZWRpdG9yTWFwLnNldChwYXRoLCBbXSk7XG4gICAgICB9XG4gICAgICBlZGl0b3JNYXAuZ2V0KHBhdGgpLnB1c2goZWRpdG9yKTtcbiAgICB9XG5cbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihtYWluRWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm47XG5cbiAgICBsZXQgY3Vyc29ycyA9IG1haW5FZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybjtcbiAgICBsZXQgW2N1cnNvcl0gPSBjdXJzb3JzO1xuICAgIGxldCBwb3NpdGlvbiA9IGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhtYWluRWRpdG9yLCBwb3NpdGlvbik7XG4gICAgICBpZiAoIXJlc3VsdCkgcmV0dXJuO1xuICAgICAgaWYgKHJlc3VsdC50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVmZXJlbmNlczogJHtyZXN1bHQ/Lm1lc3NhZ2UgPz8gJ251bGwnfWApO1xuICAgICAgICB0aGlzLmNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zb2xlLmRlYnVnKCdSRUZFUkVOQ0VTOicsIHJlc3VsdC5yZWZlcmVuY2VzKTtcbiAgICAgIFJlZmVyZW5jZXNWaWV3LnNldFJlZmVyZW5jZXMocmVzdWx0LnJlZmVyZW5jZXMsIHJlc3VsdC5yZWZlcmVuY2VkU3ltYm9sTmFtZSk7XG5cbiAgICAgIGZvciAobGV0IHJlZmVyZW5jZSBvZiByZXN1bHQucmVmZXJlbmNlcykge1xuICAgICAgICBsZXQgeyB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgICAgaWYgKCFyZWZlcmVuY2VNYXAuaGFzKHVyaSkpIHtcbiAgICAgICAgICByZWZlcmVuY2VNYXAuc2V0KHVyaSwgW10pO1xuICAgICAgICB9XG4gICAgICAgIHJlZmVyZW5jZU1hcC5nZXQodXJpKS5wdXNoKHJlZmVyZW5jZSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IHBhdGggb2YgZWRpdG9yTWFwLmtleXMoKSkge1xuICAgICAgICBsZXQgZWRpdG9ycyA9IGVkaXRvck1hcC5nZXQocGF0aCk7XG4gICAgICAgIGxldCByZWZlcmVuY2VzID0gcmVmZXJlbmNlTWFwLmdldChwYXRoKTtcbiAgICAgICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgICAgICB0aGlzLmhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yLCByZWZlcmVuY2VzID8/IFtdLCBmb3JjZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHJldHJpZXZpbmcgcmVmZXJlbmNlczpgKVxuICAgICAgY29uc29sZS5lcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXMoZXZlbnQ6IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD4pIHtcbiAgICBsZXQgZWRpdG9yID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpO1xuICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBldmVudC5hYm9ydEtleUJpbmRpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXNGb3JWaXNpYmxlRWRpdG9ycyhlZGl0b3IpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCBlZGl0b3JNYXJrZXJMYXllciA9IHRoaXMuZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGxldCBsaW5lQ291bnQgPSBlZGl0b3IuZ2V0QnVmZmVyKCkuZ2V0TGluZUNvdW50KCk7XG4gICAgaWYgKGVkaXRvck1hcmtlckxheWVyLmlzRGVzdHJveWVkKCkpIHJldHVybjtcbiAgICBlZGl0b3JNYXJrZXJMYXllci5jbGVhcigpO1xuICAgIGxldCBjdXJzb3JQb3NpdGlvbiA9IGVkaXRvci5nZXRMYXN0Q3Vyc29yKCkuZ2V0QnVmZmVyUG9zaXRpb24oKTtcblxuICAgIGlmICh0aGlzLmVuYWJsZUVkaXRvckRlY29yYXRpb24gfHwgZm9yY2UpIHtcbiAgICAgIGxldCBmaWx0ZXJlZFJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgICBsZXQgcmFuZ2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGxldCBjdXJyZW50UGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgKHJlZmVyZW5jZXMgPz8gW10pKSB7XG4gICAgICAgIGxldCB7IHJhbmdlLCB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgICAgbGV0IGtleSA9IHJhbmdlLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmICh1cmkgIT09IGN1cnJlbnRQYXRoKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHJhbmdlU2V0LmhhcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHRoaXMuc2tpcEN1cnJlbnRSZWZlcmVuY2UgJiYgcmFuZ2UuY29udGFpbnNQb2ludChjdXJzb3JQb3NpdGlvbikpXG4gICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgcmFuZ2VTZXQuYWRkKGtleSk7XG4gICAgICAgIGZpbHRlcmVkUmVmZXJlbmNlcy5wdXNoKHJlZmVyZW5jZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbXBhcmUgaG93IG1hbnkgcmVmZXJlbmNlcyB3ZSBoYXZlIHRvIHRoZSBudW1iZXIgb2YgYnVmZmVyIGxpbmVzLiBJZlxuICAgICAgLy8gaXQncyBvdmVyIGEgY29uZmlndXJhYmxlIHF1b3RpZW50LCB0aGVuIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgbWF5IGJlXG4gICAgICAvLyBnaXZpbmcgdXMgcmVmZXJlbmNlcyBmb3Igc29tZXRoaW5nIHJlYWxseSBtdW5kYW5lLCBsaWtlIGB0cnVlYCBvclxuICAgICAgLy8gYGRpdmAuIFRoaXMgY2FuIGJlIGEgcGVyZm9ybWFuY2UgaXNzdWUgKFB1bHNhciBzZWVtcyBub3QgdG8gbGlrZSB0b1xuICAgICAgLy8gaGF2ZSBfbG90c18gb2YgbWFya2VyIGRlY29yYXRpb25zKSBhbmQgaXQncyBhbHNvIGEgc2lnbiB0aGF0IHRoZVxuICAgICAgLy8gcmVmZXJlbmNlcyB0aGVtc2VsdmVzIHdvbid0IGJlIHZlcnkgaGVscGZ1bC5cbiAgICAgIGlmICh0aGlzLmlnbm9yZVRocmVzaG9sZCA+IDAgJiYgKGZpbHRlcmVkUmVmZXJlbmNlcy5sZW5ndGggLyBsaW5lQ291bnQpID49IHRoaXMuaWdub3JlVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgW10pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IHsgcmFuZ2UgfSBvZiBmaWx0ZXJlZFJlZmVyZW5jZXMpIHtcbiAgICAgICAgZWRpdG9yTWFya2VyTGF5ZXIubWFya0J1ZmZlclJhbmdlKHJhbmdlKTtcbiAgICAgIH1cblxuICAgICAgZWRpdG9yLmRlY29yYXRlTWFya2VyTGF5ZXIoZWRpdG9yTWFya2VyTGF5ZXIsIHtcbiAgICAgICAgdHlwZTogJ2hpZ2hsaWdodCcsXG4gICAgICAgIGNsYXNzOiAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1yZWZlcmVuY2UnXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogUG9pbnQgfCBudWxsIHtcbiAgICBsZXQgY3Vyc29ycyA9IGVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuIG51bGw7XG4gICAgbGV0IFtjdXJzb3JdID0gY3Vyc29ycztcbiAgICBsZXQgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKTtcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICBnZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBsYXllciA9IHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGVkaXRvci5hZGRNYXJrZXJMYXllcigpO1xuICAgICAgdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGxheWVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxheWVyO1xuICB9XG5cbiAgLy8gU0NST0xMIEdVVFRFUlxuXG4gIGdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBuZXcgU2Nyb2xsR3V0dGVyKCk7XG4gICAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgICAgdGhpcy5zY3JvbGxHdXR0ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBlbGVtZW50KTtcblxuICAgICAgbGV0IG9uVmlzaWJpbGl0eUNoYW5nZSA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50IGFzIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBlZGl0b3JWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgICBlZGl0b3JWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHktY2hhbmdlZCcsIG9uVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBlbGVtZW50LmF0dGFjaFRvRWRpdG9yKGVkaXRvcik7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYW4gYXR0cmlidXRlIG9uIGBhdG9tLXRleHQtZWRpdG9yYCB3aGVuZXZlciBhIGBzY3JvbGwtZ3V0dGVyYCBlbGVtZW50XG4gICAqIGlzIHByZXNlbnQuIFRoaXMgYWxsb3dzIHVzIHRvIGRlZmluZSBjdXN0b20gc2Nyb2xsYmFyIG9wYWNpdHkgc3R5bGVzLlxuICAgKi9cbiAgb25TY3JvbGxHdXR0ZXJWaXNpYmlsaXR5Q2hhbmdlKGV2ZW50OiBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpIHtcbiAgICBsZXQgeyBkZXRhaWw6IHsgdmlzaWJsZSwgZWRpdG9yIH0gfSA9IGV2ZW50O1xuXG4gICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICBlZGl0b3JWaWV3LnNldEF0dHJpYnV0ZShcbiAgICAgICd3aXRoLXB1bHNhci1maW5kLXJlZmVyZW5jZXMtc2Nyb2xsLWd1dHRlcicsXG4gICAgICB2aXNpYmxlID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnXG4gICAgKTtcbiAgfVxuXG4gIGNsZWFyQWxsVmlzaWJsZVNjcm9sbEd1dHRlcnMoKSB7XG4gICAgbGV0IGVkaXRvcnMgPSB0aGlzLmdldFZpc2libGVFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG5cbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0T3JDcmVhdGVTY3JvbGxHdXR0ZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIWVsZW1lbnQpIHJldHVybjtcblxuICAgIC8vIFdlIGNhbGwgdGhpcyBtZXRob2QgZXZlbiBpZiBzY3JvbGxiYXIgZGVjb3JhdGlvbiBpcyBkaXNhYmxlZDsgdGhpcyBpc1xuICAgIC8vIHdoYXQgYWxsb3dzIHVzIHRvIGNsZWFyIGV4aXN0aW5nIHJlZmVyZW5jZXMgaWYgdGhlIHVzZXIganVzdCB1bmNoZWNrZWRcbiAgICAvLyB0aGUg4oCcRW5hYmxl4oCdIGNoZWNrYm94LlxuICAgIGVsZW1lbnQuaGlnaGxpZ2h0UmVmZXJlbmNlcyhyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIC8vIFVUSUxcblxuICBnZXRWaXNpYmxlRWRpdG9ycygpOiBUZXh0RWRpdG9yW10ge1xuICAgIGxldCBlZGl0b3JzOiBUZXh0RWRpdG9yW10gPSBbXTtcbiAgICBsZXQgcGFuZXMgPSBhdG9tLndvcmtzcGFjZS5nZXRQYW5lcygpO1xuICAgIHBhbmVzLmZvckVhY2gocGFuZSA9PiB7XG4gICAgICBsZXQgaXRlbSA9IHBhbmUuZ2V0QWN0aXZlSXRlbSgpO1xuICAgICAgaWYgKGF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcihpdGVtKSkge1xuICAgICAgICBlZGl0b3JzLnB1c2goaXRlbSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZWRpdG9ycztcbiAgfVxufVxuIl19