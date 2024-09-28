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
    showReferencesForEditorAtPoint(editor, pointOrRange) {
        return __awaiter(this, void 0, void 0, function* () {
            let references = yield this.findReferencesForEditorAtPoint(editor, pointOrRange);
            if (references === null)
                return;
            this.showReferencesPanel(references);
        });
    }
    findReferencesForEditorAtPoint(editor, pointOrRange) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider = this.providerRegistry.getFirstProviderForEditor(editor);
            if (!provider)
                return Promise.resolve(null);
            let point = pointOrRange instanceof atom_1.Range ? pointOrRange.start : pointOrRange;
            try {
                return provider.findReferences(editor, point);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVVjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFFMUIsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQXdCeEM7UUF2Qk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsbUJBQWMsR0FBbUIsTUFBTSxDQUFDO1FBRXhDLDJCQUFzQixHQUFZLElBQUksQ0FBQztRQUN2Qyx5QkFBb0IsR0FBWSxJQUFJLENBQUM7UUFDckMsb0JBQWUsR0FBVyxDQUFDLENBQUM7UUFDNUIsb0JBQWUsR0FBVyxHQUFHLENBQUM7UUFNcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsVUFBVSxDQUFDLGdCQUEwQztRQUNuRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxD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QUMsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUE1ZUQsd0NBNGVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlckxheWVyLFxuICBEaXNwb3NhYmxlLFxuICBQb2ludCxcbiAgUmFuZ2UsXG4gIFRleHRFZGl0b3IsXG4gIFRleHRFZGl0b3JFbGVtZW50LFxuICBDb21tYW5kRXZlbnQsXG4gIEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50XG59IGZyb20gJ2F0b20nO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyIH0gZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMuZCc7XG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUmV0dXJuLCBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCBQcm92aWRlclJlZ2lzdHJ5IGZyb20gJy4vcHJvdmlkZXItcmVnaXN0cnknO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuaW1wb3J0IFJlZmVyZW5jZXNWaWV3IGZyb20gJy4vcmVmZXJlbmNlLXBhbmVsL3JlZmVyZW5jZXMtdmlldyc7XG5cbi8vIEhvdyBsb25nIGFmdGVyIHRoZSB1c2VyIGxhc3QgdHlwZWQgYSBjaGFyYWN0ZXIgYmVmb3JlIHdlIGNvbnNpZGVyIHRoZW0gdG8gbm9cbi8vIGxvbmdlciBiZSB0eXBpbmcuXG5jb25zdCBUWVBJTkdfREVMQVkgPSAxMDAwO1xuXG5pbXBvcnQge1xuICBkZWZhdWx0IGFzIFNjcm9sbEd1dHRlcixcbiAgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50XG59IGZyb20gJy4vZWxlbWVudHMvc2Nyb2xsLWd1dHRlcic7XG5cbnR5cGUgU3BsaXREaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyB8ICdub25lJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmluZFJlZmVyZW5jZXNNYW5hZ2VyIHtcbiAgcHVibGljIGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwdWJsaWMgZWRpdG9yVmlldzogVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGlzVHlwaW5nOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHVibGljIHByb3ZpZGVyUmVnaXN0cnk6IFByb3ZpZGVyUmVnaXN0cnk8RmluZFJlZmVyZW5jZXNQcm92aWRlcj4gPSBuZXcgUHJvdmlkZXJSZWdpc3RyeSgpO1xuXG4gIHByaXZhdGUgZWRpdG9yU3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHdhdGNoZWRFZGl0b3JzOiBXZWFrU2V0PFRleHRFZGl0b3I+ID0gbmV3IFdlYWtTZXQoKTtcbiAgcHJpdmF0ZSBtYXJrZXJMYXllcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIERpc3BsYXlNYXJrZXJMYXllcj4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIHNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIFNjcm9sbEd1dHRlcj4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIHByaXZhdGUgc3BsaXREaXJlY3Rpb246IFNwbGl0RGlyZWN0aW9uID0gJ25vbmUnO1xuXG4gIHByaXZhdGUgZW5hYmxlRWRpdG9yRGVjb3JhdGlvbjogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgc2tpcEN1cnJlbnRSZWZlcmVuY2U6IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIGlnbm9yZVRocmVzaG9sZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlRGVsYXk6IG51bWJlciA9IDQwMDtcblxuICBwcml2YXRlIGN1cnNvck1vdmVUaW1lcj86IE5vZGVKUy5UaW1lb3V0IHwgbnVtYmVyO1xuICBwcml2YXRlIHR5cGluZ1RpbWVyPzogTm9kZUpTLlRpbWVvdXQgfCBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5vbkN1cnNvck1vdmUgPSB0aGlzLm9uQ3Vyc29yTW92ZS5iaW5kKHRoaXMpO1xuICB9XG5cbiAgaW5pdGlhbGl6ZShwZW5kaW5nUHJvdmlkZXJzOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyW10pIHtcbiAgICB3aGlsZSAocGVuZGluZ1Byb3ZpZGVycy5sZW5ndGgpIHtcbiAgICAgIGxldCBwcm92aWRlciA9IHBlbmRpbmdQcm92aWRlcnMuc2hpZnQoKTtcbiAgICAgIGlmICghcHJvdmlkZXIpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgICB9XG5cbiAgICBhdG9tLndvcmtzcGFjZS5hZGRPcGVuZXIoZmlsZVBhdGggPT4ge1xuICAgICAgaWYgKGZpbGVQYXRoLmluZGV4T2YoUmVmZXJlbmNlc1ZpZXcuVVJJKSAhPT0gLTEpXG4gICAgICAgIHJldHVybiBuZXcgUmVmZXJlbmNlc1ZpZXcoKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH0pO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGF0b20ud29ya3NwYWNlLm9ic2VydmVUZXh0RWRpdG9ycyhlZGl0b3IgPT4ge1xuICAgICAgICBsZXQgZGlzcG9zYWJsZSA9IHRoaXMud2F0Y2hFZGl0b3IoZWRpdG9yKTtcbiAgICAgICAgZWRpdG9yLm9uRGlkRGVzdHJveSgoKSA9PiBkaXNwb3NhYmxlPy5kaXNwb3NlKCkpO1xuICAgICAgfSksXG4gICAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS10ZXh0LWVkaXRvcicsIHtcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXM6aGlnaGxpZ2h0JzogKF9ldmVudDogQ29tbWFuZEV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcih0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXM6c2hvdy1wYW5lbCc6IChfZXZlbnQ6IENvbW1hbmRFdmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzRm9yUGFuZWwoKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5wYW5lbC5zcGxpdERpcmVjdGlvbicsXG4gICAgICAgICh2YWx1ZTogU3BsaXREaXJlY3Rpb24pID0+IHtcbiAgICAgICAgICB0aGlzLnNwbGl0RGlyZWN0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmVuYWJsZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5kZWxheScsXG4gICAgICAgICh2YWx1ZTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgdGhpcy5jdXJzb3JNb3ZlRGVsYXkgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmVkaXRvckRlY29yYXRpb24uaWdub3JlVGhyZXNob2xkJyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmlnbm9yZVRocmVzaG9sZCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5za2lwQ3VycmVudFJlZmVyZW5jZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuc2tpcEN1cnJlbnRSZWZlcmVuY2UgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgYWRkUHJvdmlkZXIocHJvdmlkZXI6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIpIHtcbiAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICB9XG5cbiAgZGlzcG9zZSgpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8vIEVESVRPUiBNQU5BR0VNRU5UXG5cbiAgd2F0Y2hFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgaWYgKHRoaXMud2F0Y2hlZEVkaXRvcnMuaGFzKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgIGlmIChlZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpIHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3IpO1xuXG4gICAgbGV0IG9uRm9jdXMgPSAoKSA9PiB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcbiAgICBsZXQgb25CbHVyID0gKCkgPT4ge307XG4gICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uRm9jdXMpO1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1cik7XG5cbiAgICBsZXQgc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG5cbiAgICBsZXQgZGlzcG9zYWJsZSA9IG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1cik7XG5cbiAgICAgIGlmICh0aGlzLmVkaXRvciA9PT0gZWRpdG9yKSB7XG4gICAgICAgIHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihudWxsKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgZGlzcG9zYWJsZSxcbiAgICAgIGVkaXRvci5nZXRCdWZmZXIoKS5vbkRpZENoYW5nZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuaXNUeXBpbmcgPSB0cnVlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50eXBpbmdUaW1lcik7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmN1cnNvck1vdmVUaW1lcik7XG4gICAgICAgIHRoaXMudHlwaW5nVGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgICAgICgpID0+IHRoaXMuaXNUeXBpbmcgPSBmYWxzZSxcbiAgICAgICAgICAxMDAwXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICk7XG5cbiAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmFkZChlZGl0b3IpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoZGlzcG9zYWJsZSk7XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKGRpc3Bvc2FibGUpO1xuICAgICAgdGhpcy53YXRjaGVkRWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCkge1xuICAgIGlmIChlZGl0b3IgPT09IHRoaXMuZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBudWxsO1xuXG4gICAgdGhpcy5lZGl0b3IgPSB0aGlzLmVkaXRvclZpZXcgPSBudWxsO1xuXG4gICAgaWYgKGVkaXRvciA9PT0gbnVsbCB8fCAhYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcodGhpcy5lZGl0b3IpO1xuXG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbih0aGlzLm9uQ3Vyc29yTW92ZSlcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5oYXNGb2N1cygpKVxuICAgICAgdGhpcy5vbkN1cnNvck1vdmUoKTtcbiAgfVxuXG4gIC8vIEVWRU5UIEhBTkRMRVJTXG5cbiAgb25DdXJzb3JNb3ZlKF9ldmVudD86IEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50KSB7XG4gICAgaWYgKHRoaXMuY3Vyc29yTW92ZVRpbWVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmN1cnNvck1vdmVUaW1lcik7XG4gICAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9PT0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmVkaXRvcikge1xuICAgICAgbGV0IGxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKHRoaXMuZWRpdG9yKTtcbiAgICAgIGxheWVyLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXNUeXBpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdVc2VyIGlzIHR5cGluZywgc28gd2FpdCBsb25nZXIgdGhhbiB1c3VhbOKApicpO1xuICAgIH1cbiAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcigpO1xuICAgICAgfSxcbiAgICAgIC8vIFdoZW4gdGhlIHVzZXIgaXMgdHlwaW5nLCB3YWl0IGF0IGxlYXN0IGFzIGxvbmcgYXMgdGhlIHR5cGluZyBkZWxheVxuICAgICAgLy8gd2luZG93LlxuICAgICAgdGhpcy5pc1R5cGluZyA/IFRZUElOR19ERUxBWSA6IHRoaXMuY3Vyc29yTW92ZURlbGF5XG4gICAgKTtcbiAgfVxuXG4gIC8vIEZJTkQgUkVGRVJFTkNFU1xuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzRm9yUGFuZWwoKSB7XG4gICAgaWYgKCF0aGlzLmVkaXRvcikgcmV0dXJuO1xuXG4gICAgbGV0IHJlZmVyZW5jZXMgPSBhd2FpdCB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yUHJvamVjdCh0aGlzLmVkaXRvcik7XG4gICAgaWYgKCFyZWZlcmVuY2VzKSB7XG4gICAgICAvLyBXaGVuIHdlIGhhdmUgbm8gbmV3IHJlZmVyZW5jZXMgdG8gc2hvdywgd2UnbGwgcmV0dXJuIGVhcmx5IHJhdGhlciB0aGFuXG4gICAgICAvLyBjbGVhciB0aGUgcGFuZWwgb2YgcmVzdWx0cy4gTm8gcG9pbnQgaW4gcmVwbGFjaW5nIHRoZSBwcmV2aW91cyByZXN1bHRzXG4gICAgICAvLyB3aXRoIGFuIGVtcHR5IGxpc3QuXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2hvd1JlZmVyZW5jZXNQYW5lbChyZWZlcmVuY2VzKTtcbiAgfVxuXG4gIHNob3dSZWZlcmVuY2VzUGFuZWwocmVzdWx0OiBGaW5kUmVmZXJlbmNlc1JldHVybikge1xuICAgIGlmIChyZXN1bHQudHlwZSAhPT0gJ2RhdGEnKSByZXR1cm47XG5cbiAgICAvLyBIQUNLXG4gICAgUmVmZXJlbmNlc1ZpZXcuc2V0UmVmZXJlbmNlcyhyZXN1bHQucmVmZXJlbmNlcywgcmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lKTtcblxuICAgIGxldCBzcGxpdERpcmVjdGlvbiA9IHRoaXMuc3BsaXREaXJlY3Rpb24gPT09ICdub25lJyA/IHVuZGVmaW5lZCA6IHRoaXMuc3BsaXREaXJlY3Rpb247XG4gICAgaWYgKHRoaXMuc3BsaXREaXJlY3Rpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3BsaXREaXJlY3Rpb24gPSAncmlnaHQnO1xuICAgIH1cblxuICAgIHJldHVybiBhdG9tLndvcmtzcGFjZS5vcGVuKFxuICAgICAgLy8gVmFyeSB0aGUgVVJMIHNvIHRoYXQgZGlmZmVyZW50IHJlZmVyZW5jZSBsb29rdXBzIHRlbmQgdG8gdXNlIGRpZmZlcmVudFxuICAgICAgLy8gdmlld3MuIFdlIGRvbid0IHdhbnQgdG8gZm9yY2UgZXZlcnl0aGluZyB0byB1c2UgdGhlIHNhbWUgdmlld1xuICAgICAgLy8gaW5zdGFuY2UuXG4gICAgICBgJHtSZWZlcmVuY2VzVmlldy5VUkl9LyR7cmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lfWAsXG4gICAgICB7XG4gICAgICAgIHNlYXJjaEFsbFBhbmVzOiB0cnVlLFxuICAgICAgICBzcGxpdDogc3BsaXREaXJlY3Rpb25cbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgYXN5bmMgc2hvd1JlZmVyZW5jZXNGb3JFZGl0b3JBdFBvaW50IChlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50T3JSYW5nZTogUG9pbnQgfCBSYW5nZSkge1xuICAgIGxldCByZWZlcmVuY2VzID0gYXdhaXQgdGhpcy5maW5kUmVmZXJlbmNlc0ZvckVkaXRvckF0UG9pbnQoZWRpdG9yLCBwb2ludE9yUmFuZ2UpO1xuICAgIGlmIChyZWZlcmVuY2VzID09PSBudWxsKSByZXR1cm47XG5cbiAgICB0aGlzLnNob3dSZWZlcmVuY2VzUGFuZWwocmVmZXJlbmNlcyk7XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlc0ZvckVkaXRvckF0UG9pbnQoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludE9yUmFuZ2U6IFBvaW50IHwgUmFuZ2UpIHtcbiAgICBsZXQgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG5cbiAgICBsZXQgcG9pbnQgPSBwb2ludE9yUmFuZ2UgaW5zdGFuY2VvZiBSYW5nZSA/IHBvaW50T3JSYW5nZS5zdGFydCA6IHBvaW50T3JSYW5nZTtcblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gcHJvdmlkZXIuZmluZFJlZmVyZW5jZXMoZWRpdG9yLCBwb2ludCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBTb21lIHByb3ZpZGVycyByZXR1cm4gZXJyb3JzIHdoZW4gdGhleSBkb24ndCBzdHJpY3RseSBuZWVkIHRvLiBGb3JcbiAgICAgIC8vIGluc3RhbmNlLCBgZ29wbHNgIHdpbGwgcmV0dXJuIGFuIGVycm9yIGlmIHlvdSBhc2sgaXQgdG8gcmVzb2x2ZSBhXG4gICAgICAvLyByZWZlcmVuY2UgYXQgYSB3aGl0ZXNwYWNlIHBvc2l0aW9uLlxuICAgICAgLy9cbiAgICAgIC8vIEV2ZW4gdGhvdWdoIGFsbCB0aGlzIGRvZXMgaXMgbG9nIGFuIHVuY2F1Z2h0IGV4Y2VwdGlvbiB0byB0aGUgY29uc29sZSxcbiAgICAgIC8vIGl0J3MgYW5ub3lpbmfigKYgc28gaW5zdGVhZCB3ZSdsbCBjYXRjaCB0aGUgZXJyb3IgYW5kIGxvZyBpdCBvdXJzZWx2ZXNcbiAgICAgIC8vIHZpYSBvdXIgYGNvbnNvbGVgIGhlbHBlci4gVGhpcyBtZWFucyBpdCdsbCBiZSBoaWRkZW4gdW5sZXNzIHRoZSB1c2VyXG4gICAgICAvLyBvcHRzIGludG8gZGVidWcgbG9nZ2luZy5cbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdoaWxlIHJldHJpZXZpbmcgcmVmZXJlbmNlczpgKVxuICAgICAgY29uc29sZS5lcnJvcihlcnIpXG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yUHJvamVjdChlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPEZpbmRSZWZlcmVuY2VzUmV0dXJuIHwgbnVsbD4ge1xuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblxuICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3Vyc29yUG9zaXRpb25Gb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIXBvc2l0aW9uKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhlZGl0b3IsIHBvc2l0aW9uKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIFNvbWUgcHJvdmlkZXJzIHJldHVybiBlcnJvcnMgd2hlbiB0aGV5IGRvbid0IHN0cmljdGx5IG5lZWQgdG8uIEZvclxuICAgICAgLy8gaW5zdGFuY2UsIGBnb3Bsc2Agd2lsbCByZXR1cm4gYW4gZXJyb3IgaWYgeW91IGFzayBpdCB0byByZXNvbHZlIGFcbiAgICAgIC8vIHJlZmVyZW5jZSBhdCBhIHdoaXRlc3BhY2UgcG9zaXRpb24uXG4gICAgICAvL1xuICAgICAgLy8gRXZlbiB0aG91Z2ggYWxsIHRoaXMgZG9lcyBpcyBsb2cgYW4gdW5jYXVnaHQgZXhjZXB0aW9uIHRvIHRoZSBjb25zb2xlLFxuICAgICAgLy8gaXQncyBhbm5veWluZ+KApiBzbyBpbnN0ZWFkIHdlJ2xsIGNhdGNoIHRoZSBlcnJvciBhbmQgbG9nIGl0IG91cnNlbHZlc1xuICAgICAgLy8gdmlhIG91ciBgY29uc29sZWAgaGVscGVyLiBUaGlzIG1lYW5zIGl0J2xsIGJlIGhpZGRlbiB1bmxlc3MgdGhlIHVzZXJcbiAgICAgIC8vIG9wdHMgaW50byBkZWJ1ZyBsb2dnaW5nLlxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd2hpbGUgcmV0cmlldmluZyByZWZlcmVuY2VzOmApXG4gICAgICBjb25zb2xlLmVycm9yKGVycilcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcihmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLmVkaXRvcikgcmV0dXJuO1xuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnModGhpcy5lZGl0b3IsIGZvcmNlKTtcbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMobWFpbkVkaXRvcjogVGV4dEVkaXRvciwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCB2aXNpYmxlRWRpdG9ycyA9IHRoaXMuZ2V0VmlzaWJsZUVkaXRvcnMoKTtcblxuICAgIGxldCBlZGl0b3JNYXAgPSBuZXcgTWFwKCk7XG4gICAgbGV0IHJlZmVyZW5jZU1hcCA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAobGV0IGVkaXRvciBvZiB2aXNpYmxlRWRpdG9ycykge1xuICAgICAgLy8gTW9yZSB0aGFuIG9uZSB2aXNpYmxlIGVkaXRvciBjYW4gYmUgcG9pbnRpbmcgdG8gdGhlIHNhbWUgcGF0aC5cbiAgICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGlmICghZWRpdG9yTWFwLmhhcyhwYXRoKSkge1xuICAgICAgICBlZGl0b3JNYXAuc2V0KHBhdGgsIFtdKTtcbiAgICAgIH1cbiAgICAgIGVkaXRvck1hcC5nZXQocGF0aCkucHVzaChlZGl0b3IpO1xuICAgIH1cblxuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKG1haW5FZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybjtcblxuICAgIGxldCBjdXJzb3JzID0gbWFpbkVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICB0cnkge1xuICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKG1haW5FZGl0b3IsIHBvc2l0aW9uKTtcbiAgICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgICBpZiAocmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyByZWZlcmVuY2VzOiAke3Jlc3VsdD8ubWVzc2FnZSA/PyAnbnVsbCd9YCk7XG4gICAgICAgIHRoaXMuY2xlYXJBbGxWaXNpYmxlU2Nyb2xsR3V0dGVycygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUuZGVidWcoJ1JFRkVSRU5DRVM6JywgcmVzdWx0LnJlZmVyZW5jZXMpO1xuICAgICAgUmVmZXJlbmNlc1ZpZXcuc2V0UmVmZXJlbmNlcyhyZXN1bHQucmVmZXJlbmNlcywgcmVzdWx0LnJlZmVyZW5jZWRTeW1ib2xOYW1lKTtcblxuICAgICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlc3VsdC5yZWZlcmVuY2VzKSB7XG4gICAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgICBpZiAoIXJlZmVyZW5jZU1hcC5oYXModXJpKSkge1xuICAgICAgICAgIHJlZmVyZW5jZU1hcC5zZXQodXJpLCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVmZXJlbmNlTWFwLmdldCh1cmkpLnB1c2gocmVmZXJlbmNlKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgcGF0aCBvZiBlZGl0b3JNYXAua2V5cygpKSB7XG4gICAgICAgIGxldCBlZGl0b3JzID0gZWRpdG9yTWFwLmdldChwYXRoKTtcbiAgICAgICAgbGV0IHJlZmVyZW5jZXMgPSByZWZlcmVuY2VNYXAuZ2V0KHBhdGgpO1xuICAgICAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0UmVmZXJlbmNlcyhlZGl0b3IsIHJlZmVyZW5jZXMgPz8gW10sIGZvcmNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcmV0cmlldmluZyByZWZlcmVuY2VzOmApXG4gICAgICBjb25zb2xlLmVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICBhc3luYyBmaW5kUmVmZXJlbmNlcyhldmVudDogQ29tbWFuZEV2ZW50PFRleHRFZGl0b3JFbGVtZW50Pikge1xuICAgIGxldCBlZGl0b3IgPSBldmVudC5jdXJyZW50VGFyZ2V0LmdldE1vZGVsKCk7XG4gICAgaWYgKCFhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuIGV2ZW50LmFib3J0S2V5QmluZGluZygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclZpc2libGVFZGl0b3JzKGVkaXRvcik7XG4gIH1cblxuICBoaWdobGlnaHRSZWZlcmVuY2VzKGVkaXRvcjogVGV4dEVkaXRvciwgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsLCBmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgbGV0IGVkaXRvck1hcmtlckxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgbGV0IGxpbmVDb3VudCA9IGVkaXRvci5nZXRCdWZmZXIoKS5nZXRMaW5lQ291bnQoKTtcbiAgICBpZiAoZWRpdG9yTWFya2VyTGF5ZXIuaXNEZXN0cm95ZWQoKSkgcmV0dXJuO1xuICAgIGVkaXRvck1hcmtlckxheWVyLmNsZWFyKCk7XG4gICAgbGV0IGN1cnNvclBvc2l0aW9uID0gZWRpdG9yLmdldExhc3RDdXJzb3IoKS5nZXRCdWZmZXJQb3NpdGlvbigpO1xuXG4gICAgaWYgKHRoaXMuZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiB8fCBmb3JjZSkge1xuICAgICAgbGV0IGZpbHRlcmVkUmVmZXJlbmNlczogUmVmZXJlbmNlW10gPSBbXTtcbiAgICAgIGxldCByYW5nZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgbGV0IGN1cnJlbnRQYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGZvciAobGV0IHJlZmVyZW5jZSBvZiAocmVmZXJlbmNlcyA/PyBbXSkpIHtcbiAgICAgICAgbGV0IHsgcmFuZ2UsIHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgICBsZXQga2V5ID0gcmFuZ2UudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKHVyaSAhPT0gY3VycmVudFBhdGgpIGNvbnRpbnVlO1xuICAgICAgICBpZiAocmFuZ2VTZXQuaGFzKGtleSkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodGhpcy5za2lwQ3VycmVudFJlZmVyZW5jZSAmJiByYW5nZS5jb250YWluc1BvaW50KGN1cnNvclBvc2l0aW9uKSlcbiAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICByYW5nZVNldC5hZGQoa2V5KTtcbiAgICAgICAgZmlsdGVyZWRSZWZlcmVuY2VzLnB1c2gocmVmZXJlbmNlKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ29tcGFyZSBob3cgbWFueSByZWZlcmVuY2VzIHdlIGhhdmUgdG8gdGhlIG51bWJlciBvZiBidWZmZXIgbGluZXMuIElmXG4gICAgICAvLyBpdCdzIG92ZXIgYSBjb25maWd1cmFibGUgcXVvdGllbnQsIHRoZW4gdGhlIGxhbmd1YWdlIHNlcnZlciBtYXkgYmVcbiAgICAgIC8vIGdpdmluZyB1cyByZWZlcmVuY2VzIGZvciBzb21ldGhpbmcgcmVhbGx5IG11bmRhbmUsIGxpa2UgYHRydWVgIG9yXG4gICAgICAvLyBgZGl2YC4gVGhpcyBjYW4gYmUgYSBwZXJmb3JtYW5jZSBpc3N1ZSAoUHVsc2FyIHNlZW1zIG5vdCB0byBsaWtlIHRvXG4gICAgICAvLyBoYXZlIF9sb3RzXyBvZiBtYXJrZXIgZGVjb3JhdGlvbnMpIGFuZCBpdCdzIGFsc28gYSBzaWduIHRoYXQgdGhlXG4gICAgICAvLyByZWZlcmVuY2VzIHRoZW1zZWx2ZXMgd29uJ3QgYmUgdmVyeSBoZWxwZnVsLlxuICAgICAgaWYgKHRoaXMuaWdub3JlVGhyZXNob2xkID4gMCAmJiAoZmlsdGVyZWRSZWZlcmVuY2VzLmxlbmd0aCAvIGxpbmVDb3VudCkgPj0gdGhpcy5pZ25vcmVUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yLCBbXSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgeyByYW5nZSB9IG9mIGZpbHRlcmVkUmVmZXJlbmNlcykge1xuICAgICAgICBlZGl0b3JNYXJrZXJMYXllci5tYXJrQnVmZmVyUmFuZ2UocmFuZ2UpO1xuICAgICAgfVxuXG4gICAgICBlZGl0b3IuZGVjb3JhdGVNYXJrZXJMYXllcihlZGl0b3JNYXJrZXJMYXllciwge1xuICAgICAgICB0eXBlOiAnaGlnaGxpZ2h0JyxcbiAgICAgICAgY2xhc3M6ICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLXJlZmVyZW5jZSdcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlU2Nyb2xsR3V0dGVyKGVkaXRvciwgcmVmZXJlbmNlcyk7XG4gIH1cblxuICBnZXRDdXJzb3JQb3NpdGlvbkZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBQb2ludCB8IG51bGwge1xuICAgIGxldCBjdXJzb3JzID0gZWRpdG9yLmdldEN1cnNvcnMoKTtcbiAgICBpZiAoY3Vyc29ycy5sZW5ndGggPiAxKSByZXR1cm4gbnVsbDtcbiAgICBsZXQgW2N1cnNvcl0gPSBjdXJzb3JzO1xuICAgIGxldCBwb3NpdGlvbiA9IGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfVxuXG4gIGdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgbGV0IGxheWVyID0gdGhpcy5tYXJrZXJMYXllcnNGb3JFZGl0b3JzLmdldChlZGl0b3IpO1xuICAgIGlmICghbGF5ZXIpIHtcbiAgICAgIGxheWVyID0gZWRpdG9yLmFkZE1hcmtlckxheWVyKCk7XG4gICAgICB0aGlzLm1hcmtlckxheWVyc0ZvckVkaXRvcnMuc2V0KGVkaXRvciwgbGF5ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbGF5ZXI7XG4gIH1cblxuICAvLyBTQ1JPTEwgR1VUVEVSXG5cbiAgZ2V0T3JDcmVhdGVTY3JvbGxHdXR0ZXJGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLnNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzLmdldChlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkge1xuICAgICAgZWxlbWVudCA9IG5ldyBTY3JvbGxHdXR0ZXIoKTtcbiAgICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgICB0aGlzLnNjcm9sbEd1dHRlcnNGb3JFZGl0b3JzLnNldChlZGl0b3IsIGVsZW1lbnQpO1xuXG4gICAgICBsZXQgb25WaXNpYmlsaXR5Q2hhbmdlID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5vblNjcm9sbEd1dHRlclZpc2liaWxpdHlDaGFuZ2UoZXZlbnQgYXMgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50KTtcbiAgICAgIH07XG5cbiAgICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eS1jaGFuZ2VkJywgb25WaXNpYmlsaXR5Q2hhbmdlKTtcblxuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgICAgbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eS1jaGFuZ2VkJywgb25WaXNpYmlsaXR5Q2hhbmdlKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAgIGVsZW1lbnQuYXR0YWNoVG9FZGl0b3IoZWRpdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhbiBhdHRyaWJ1dGUgb24gYGF0b20tdGV4dC1lZGl0b3JgIHdoZW5ldmVyIGEgYHNjcm9sbC1ndXR0ZXJgIGVsZW1lbnRcbiAgICogaXMgcHJlc2VudC4gVGhpcyBhbGxvd3MgdXMgdG8gZGVmaW5lIGN1c3RvbSBzY3JvbGxiYXIgb3BhY2l0eSBzdHlsZXMuXG4gICAqL1xuICBvblNjcm9sbEd1dHRlclZpc2liaWxpdHlDaGFuZ2UoZXZlbnQ6IFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudCkge1xuICAgIGxldCB7IGRldGFpbDogeyB2aXNpYmxlLCBlZGl0b3IgfSB9ID0gZXZlbnQ7XG5cbiAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgIGVkaXRvclZpZXcuc2V0QXR0cmlidXRlKFxuICAgICAgJ3dpdGgtcHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1zY3JvbGwtZ3V0dGVyJyxcbiAgICAgIHZpc2libGUgPyAnYWN0aXZlJyA6ICdpbmFjdGl2ZSdcbiAgICApO1xuICB9XG5cbiAgY2xlYXJBbGxWaXNpYmxlU2Nyb2xsR3V0dGVycygpIHtcbiAgICBsZXQgZWRpdG9ycyA9IHRoaXMuZ2V0VmlzaWJsZUVkaXRvcnMoKTtcbiAgICBmb3IgKGxldCBlZGl0b3Igb2YgZWRpdG9ycykge1xuICAgICAgdGhpcy51cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yLCBudWxsKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yOiBUZXh0RWRpdG9yLCByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSB8IG51bGwpIHtcblxuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgLy8gV2UgY2FsbCB0aGlzIG1ldGhvZCBldmVuIGlmIHNjcm9sbGJhciBkZWNvcmF0aW9uIGlzIGRpc2FibGVkOyB0aGlzIGlzXG4gICAgLy8gd2hhdCBhbGxvd3MgdXMgdG8gY2xlYXIgZXhpc3RpbmcgcmVmZXJlbmNlcyBpZiB0aGUgdXNlciBqdXN0IHVuY2hlY2tlZFxuICAgIC8vIHRoZSDigJxFbmFibGXigJ0gY2hlY2tib3guXG4gICAgZWxlbWVudC5oaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXMpO1xuICB9XG5cbiAgLy8gVVRJTFxuXG4gIGdldFZpc2libGVFZGl0b3JzKCk6IFRleHRFZGl0b3JbXSB7XG4gICAgbGV0IGVkaXRvcnM6IFRleHRFZGl0b3JbXSA9IFtdO1xuICAgIGxldCBwYW5lcyA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVzKCk7XG4gICAgcGFuZXMuZm9yRWFjaChwYW5lID0+IHtcbiAgICAgIGxldCBpdGVtID0gcGFuZS5nZXRBY3RpdmVJdGVtKCk7XG4gICAgICBpZiAoYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGl0ZW0pKSB7XG4gICAgICAgIGVkaXRvcnMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlZGl0b3JzO1xuICB9XG59XG4iXX0=