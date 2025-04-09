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
        atom.workspace.addOpener(uri => {
            if (uri.indexOf(references_view_1.default.URI) !== -1) {
                return new references_view_1.default(uri);
            }
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
            let position = this.getCursorPositionForEditor(this.editor);
            if (!position)
                return;
            let positionMarker = this.trackPosition(position);
            if (!positionMarker) {
                console.error(`Could not create marker for position: ${position}`);
                return;
            }
            let result = yield this.findReferencesForProject(this.editor);
            if (!result) {
                // When we have no new references to show, we'll return early rather than
                // clear the panel of results. No point in replacing the previous results
                // with an empty list.
                return;
            }
            this.showReferencesPanel({
                result,
                editor: this.editor,
                marker: positionMarker
            });
        });
    }
    trackPosition(position) {
        if (!this.editor)
            return;
        let range = new atom_1.Range(position, position);
        return this.editor.markBufferRange(range, { invalidate: 'surround' });
    }
    findReferencesPanelToReuse() {
        let paneItem = atom.workspace.getPaneItems().find((pe) => {
            return pe instanceof references_view_1.default && pe.overridable;
        });
        return paneItem ? paneItem : undefined;
    }
    showReferencesPanel({ result, editor, marker }) {
        if (result.type !== 'data')
            return;
        let panelToReuse = this.findReferencesPanelToReuse();
        let uri = panelToReuse ? panelToReuse.uri : references_view_1.default.nextUri();
        // The view doesn't exist yet, so store some context values that it can use
        // later when it instantiates.
        references_view_1.default.setReferences(uri, {
            manager: this,
            editor,
            marker,
            references: result.references,
            symbolName: result.referencedSymbolName
        });
        // If we're reusing an existing panel, we're done; it'll pick up on our
        // changes and re-render.
        if (panelToReuse) {
            // Ensure it's brought to the front.
            let pane = atom.workspace.paneForItem(panelToReuse);
            if (!pane) {
                throw new Error(`No pane for panel with URI: ${uri}`);
            }
            pane.activateItem(panelToReuse);
            return;
        }
        // Otherwise we'll have to create a new panel ourselves.
        let splitDirection = this.splitDirection === 'none' ? undefined : this.splitDirection;
        if (this.splitDirection === undefined) {
            splitDirection = 'right';
        }
        return atom.workspace.open(
        // Vary the URL so that different reference lookups tend to use different
        // views. We don't want to force everything to use the same view
        // instance.
        uri, {
            searchAllPanes: true,
            split: splitDirection
        });
    }
    showReferencesForEditorAtPoint(editor, pointOrRange) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.findReferencesForEditorAtPoint(editor, pointOrRange);
            if (result === null)
                return;
            if (result.type === 'error')
                return;
            let marker = editor.markBufferRange(pointOrRange instanceof atom_1.Range ? pointOrRange : new atom_1.Range(pointOrRange, pointOrRange));
            this.showReferencesPanel({
                editor,
                marker,
                result
            });
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
            let position = this.getCursorPositionForEditor(editor);
            if (!position)
                return Promise.resolve(null);
            return this.findReferencesForProjectAtPosition(editor, position);
        });
    }
    findReferencesForProjectAtPosition(editor, position) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider = this.providerRegistry.getFirstProviderForEditor(editor);
            if (!provider)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZmluZC1yZWZlcmVuY2VzLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQVdjO0FBR2QsNEVBQW1EO0FBQ25ELG1EQUFxQztBQUNyQyx3RkFBK0Q7QUFFL0QsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFFMUIsNkVBR2tDO0FBSWxDLE1BQXFCLHFCQUFxQjtJQXdCeEM7UUF2Qk8sV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFFM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDaEUscUJBQWdCLEdBQTZDLElBQUksMkJBQWdCLEVBQUUsQ0FBQztRQUVuRix3QkFBbUIsR0FBK0IsSUFBSSxDQUFDO1FBQ3ZELG1CQUFjLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDcEQsMkJBQXNCLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDaEYsNEJBQXVCLEdBQXNDLElBQUksT0FBTyxFQUFFLENBQUM7UUFFM0UsbUJBQWMsR0FBbUIsTUFBTSxDQUFDO1FBRXhDLDJCQUFzQixHQUFZLElBQUksQ0FBQztRQUN2Qyx5QkFBb0IsR0FBWSxJQUFJLENBQUM7UUFDckMsb0JBQWUsR0FBVyxDQUFDLENBQUM7UUFDNUIsb0JBQWUsR0FBVyxHQUFHLENBQUM7UUFNcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsVUFBVSxDQUFDLGdCQUEwQztRQUNuRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxD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aUIsRUFBRSxDQUFDO1FBQ3ZDLEtBQUssSUFBSSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUVELGtCQUFrQixDQUFDLE1BQWtCLEVBQUUsVUFBOEI7UUFFbkUsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTztRQUVyQix3RUFBd0U7UUFDeEUseUVBQXlFO1FBQ3pFLHlCQUF5QjtRQUN6QixPQUFPLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELE9BQU87SUFFUCxpQkFBaUI7UUFDZixJQUFJLE9BQU8sR0FBaUIsRUFBRSxDQUFDO1FBQy9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FDRjtBQTlpQkQsd0NBOGlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIERpc3BsYXlNYXJrZXJMYXllcixcbiAgRGlzcG9zYWJsZSxcbiAgUG9pbnQsXG4gIFJhbmdlLFxuICBUZXh0RWRpdG9yLFxuICBUZXh0RWRpdG9yRWxlbWVudCxcbiAgQ29tbWFuZEV2ZW50LFxuICBDdXJzb3JQb3NpdGlvbkNoYW5nZWRFdmVudCxcbiAgRGlzcGxheU1hcmtlclxufSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNQcm92aWRlciB9IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1JldHVybiwgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgUHJvdmlkZXJSZWdpc3RyeSBmcm9tICcuL3Byb3ZpZGVyLXJlZ2lzdHJ5JztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcbmltcG9ydCBSZWZlcmVuY2VzVmlldyBmcm9tICcuL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcnO1xuXG4vLyBIb3cgbG9uZyBhZnRlciB0aGUgdXNlciBsYXN0IHR5cGVkIGEgY2hhcmFjdGVyIGJlZm9yZSB3ZSBjb25zaWRlciB0aGVtIHRvIG5vXG4vLyBsb25nZXIgYmUgdHlwaW5nLlxuY29uc3QgVFlQSU5HX0RFTEFZID0gMTAwMDtcblxuaW1wb3J0IHtcbiAgZGVmYXVsdCBhcyBTY3JvbGxHdXR0ZXIsXG4gIFNjcm9sbEd1dHRlclZpc2liaWxpdHlFdmVudFxufSBmcm9tICcuL2VsZW1lbnRzL3Njcm9sbC1ndXR0ZXInO1xuXG50eXBlIFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCAnbm9uZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbmRSZWZlcmVuY2VzTWFuYWdlciB7XG4gIHB1YmxpYyBlZGl0b3I6IFRleHRFZGl0b3IgfCBudWxsID0gbnVsbDtcbiAgcHVibGljIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBpc1R5cGluZzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gIHB1YmxpYyBwcm92aWRlclJlZ2lzdHJ5OiBQcm92aWRlclJlZ2lzdHJ5PEZpbmRSZWZlcmVuY2VzUHJvdmlkZXI+ID0gbmV3IFByb3ZpZGVyUmVnaXN0cnkoKTtcblxuICBwcml2YXRlIGVkaXRvclN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB3YXRjaGVkRWRpdG9yczogV2Vha1NldDxUZXh0RWRpdG9yPiA9IG5ldyBXZWFrU2V0KCk7XG4gIHByaXZhdGUgbWFya2VyTGF5ZXJzRm9yRWRpdG9yczogV2Vha01hcDxUZXh0RWRpdG9yLCBEaXNwbGF5TWFya2VyTGF5ZXI+ID0gbmV3IFdlYWtNYXAoKTtcbiAgcHJpdmF0ZSBzY3JvbGxHdXR0ZXJzRm9yRWRpdG9yczogV2Vha01hcDxUZXh0RWRpdG9yLCBTY3JvbGxHdXR0ZXI+ID0gbmV3IFdlYWtNYXAoKTtcblxuICBwcml2YXRlIHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbiA9ICdub25lJztcblxuICBwcml2YXRlIGVuYWJsZUVkaXRvckRlY29yYXRpb246IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIHNraXBDdXJyZW50UmVmZXJlbmNlOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBpZ25vcmVUaHJlc2hvbGQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgY3Vyc29yTW92ZURlbGF5OiBudW1iZXIgPSA0MDA7XG5cbiAgcHJpdmF0ZSBjdXJzb3JNb3ZlVGltZXI/OiBOb2RlSlMuVGltZW91dCB8IG51bWJlcjtcbiAgcHJpdmF0ZSB0eXBpbmdUaW1lcj86IE5vZGVKUy5UaW1lb3V0IHwgbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMub25DdXJzb3JNb3ZlID0gdGhpcy5vbkN1cnNvck1vdmUuYmluZCh0aGlzKTtcbiAgfVxuXG4gIGluaXRpYWxpemUocGVuZGluZ1Byb3ZpZGVyczogRmluZFJlZmVyZW5jZXNQcm92aWRlcltdKSB7XG4gICAgd2hpbGUgKHBlbmRpbmdQcm92aWRlcnMubGVuZ3RoKSB7XG4gICAgICBsZXQgcHJvdmlkZXIgPSBwZW5kaW5nUHJvdmlkZXJzLnNoaWZ0KCk7XG4gICAgICBpZiAoIXByb3ZpZGVyKSBjb250aW51ZTtcbiAgICAgIHRoaXMucHJvdmlkZXJSZWdpc3RyeS5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gICAgfVxuXG4gICAgYXRvbS53b3Jrc3BhY2UuYWRkT3BlbmVyKHVyaSA9PiB7XG4gICAgICBpZiAodXJpLmluZGV4T2YoUmVmZXJlbmNlc1ZpZXcuVVJJKSAhPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzVmlldyh1cmkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH0pO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGF0b20ud29ya3NwYWNlLm9ic2VydmVUZXh0RWRpdG9ycyhlZGl0b3IgPT4ge1xuICAgICAgICBsZXQgZGlzcG9zYWJsZSA9IHRoaXMud2F0Y2hFZGl0b3IoZWRpdG9yKTtcbiAgICAgICAgZWRpdG9yLm9uRGlkRGVzdHJveSgoKSA9PiBkaXNwb3NhYmxlPy5kaXNwb3NlKCkpO1xuICAgICAgfSksXG4gICAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS10ZXh0LWVkaXRvcicsIHtcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXM6aGlnaGxpZ2h0JzogKF9ldmVudDogQ29tbWFuZEV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcih0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXM6c2hvdy1wYW5lbCc6IChfZXZlbnQ6IENvbW1hbmRFdmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3RSZWZlcmVuY2VzRm9yUGFuZWwoKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5wYW5lbC5zcGxpdERpcmVjdGlvbicsXG4gICAgICAgICh2YWx1ZTogU3BsaXREaXJlY3Rpb24pID0+IHtcbiAgICAgICAgICB0aGlzLnNwbGl0RGlyZWN0aW9uID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5lZGl0b3JEZWNvcmF0aW9uLmVuYWJsZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuZW5hYmxlRWRpdG9yRGVjb3JhdGlvbiA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5kZWxheScsXG4gICAgICAgICh2YWx1ZTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgdGhpcy5jdXJzb3JNb3ZlRGVsYXkgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmVkaXRvckRlY29yYXRpb24uaWdub3JlVGhyZXNob2xkJyxcbiAgICAgICAgKHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICB0aGlzLmlnbm9yZVRocmVzaG9sZCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuZWRpdG9yRGVjb3JhdGlvbi5za2lwQ3VycmVudFJlZmVyZW5jZScsXG4gICAgICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIHRoaXMuc2tpcEN1cnJlbnRSZWZlcmVuY2UgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgYWRkUHJvdmlkZXIocHJvdmlkZXI6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIpIHtcbiAgICB0aGlzLnByb3ZpZGVyUmVnaXN0cnkuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICB9XG5cbiAgZGlzcG9zZSgpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8vIEVESVRPUiBNQU5BR0VNRU5UXG5cbiAgd2F0Y2hFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgaWYgKHRoaXMud2F0Y2hlZEVkaXRvcnMuaGFzKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuICAgIGlmIChlZGl0b3JWaWV3Lmhhc0ZvY3VzKCkpIHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihlZGl0b3IpO1xuXG4gICAgbGV0IG9uRm9jdXMgPSAoKSA9PiB0aGlzLnVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yKTtcbiAgICBsZXQgb25CbHVyID0gKCkgPT4ge307XG4gICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uRm9jdXMpO1xuICAgIGVkaXRvclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1cik7XG5cbiAgICBsZXQgc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG5cbiAgICBsZXQgZGlzcG9zYWJsZSA9IG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbkZvY3VzKTtcbiAgICAgIGVkaXRvclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1cik7XG5cbiAgICAgIGlmICh0aGlzLmVkaXRvciA9PT0gZWRpdG9yKSB7XG4gICAgICAgIHRoaXMudXBkYXRlQ3VycmVudEVkaXRvcihudWxsKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgZGlzcG9zYWJsZSxcbiAgICAgIGVkaXRvci5nZXRCdWZmZXIoKS5vbkRpZENoYW5nZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuaXNUeXBpbmcgPSB0cnVlO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50eXBpbmdUaW1lcik7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmN1cnNvck1vdmVUaW1lcik7XG4gICAgICAgIHRoaXMudHlwaW5nVGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgICAgICgpID0+IHRoaXMuaXNUeXBpbmcgPSBmYWxzZSxcbiAgICAgICAgICAxMDAwXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICk7XG5cbiAgICB0aGlzLndhdGNoZWRFZGl0b3JzLmFkZChlZGl0b3IpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoZGlzcG9zYWJsZSk7XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKGRpc3Bvc2FibGUpO1xuICAgICAgdGhpcy53YXRjaGVkRWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUN1cnJlbnRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCkge1xuICAgIGlmIChlZGl0b3IgPT09IHRoaXMuZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnM/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMgPSBudWxsO1xuXG4gICAgdGhpcy5lZGl0b3IgPSB0aGlzLmVkaXRvclZpZXcgPSBudWxsO1xuXG4gICAgaWYgKGVkaXRvciA9PT0gbnVsbCB8fCAhYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcodGhpcy5lZGl0b3IpO1xuXG4gICAgdGhpcy5lZGl0b3JTdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLmVkaXRvclN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbih0aGlzLm9uQ3Vyc29yTW92ZSlcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5oYXNGb2N1cygpKVxuICAgICAgdGhpcy5vbkN1cnNvck1vdmUoKTtcbiAgfVxuXG4gIC8vIEVWRU5UIEhBTkRMRVJTXG5cbiAgb25DdXJzb3JNb3ZlKF9ldmVudD86IEN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50KSB7XG4gICAgaWYgKHRoaXMuY3Vyc29yTW92ZVRpbWVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmN1cnNvck1vdmVUaW1lcik7XG4gICAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9PT0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmVkaXRvcikge1xuICAgICAgbGV0IGxheWVyID0gdGhpcy5nZXRPckNyZWF0ZU1hcmtlckxheWVyRm9yRWRpdG9yKHRoaXMuZWRpdG9yKTtcbiAgICAgIGxheWVyLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXNUeXBpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdVc2VyIGlzIHR5cGluZywgc28gd2FpdCBsb25nZXIgdGhhbiB1c3VhbOKApicpO1xuICAgIH1cbiAgICB0aGlzLmN1cnNvck1vdmVUaW1lciA9IHNldFRpbWVvdXQoXG4gICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcigpO1xuICAgICAgfSxcbiAgICAgIC8vIFdoZW4gdGhlIHVzZXIgaXMgdHlwaW5nLCB3YWl0IGF0IGxlYXN0IGFzIGxvbmcgYXMgdGhlIHR5cGluZyBkZWxheVxuICAgICAgLy8gd2luZG93LlxuICAgICAgdGhpcy5pc1R5cGluZyA/IFRZUElOR19ERUxBWSA6IHRoaXMuY3Vyc29yTW92ZURlbGF5XG4gICAgKTtcbiAgfVxuXG4gIC8vIEZJTkQgUkVGRVJFTkNFU1xuXG4gIGFzeW5jIHJlcXVlc3RSZWZlcmVuY2VzRm9yUGFuZWwoKSB7XG4gICAgaWYgKCF0aGlzLmVkaXRvcikgcmV0dXJuO1xuXG4gICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJzb3JQb3NpdGlvbkZvckVkaXRvcih0aGlzLmVkaXRvcik7XG4gICAgaWYgKCFwb3NpdGlvbikgcmV0dXJuO1xuXG4gICAgbGV0IHBvc2l0aW9uTWFya2VyID0gdGhpcy50cmFja1Bvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICBpZiAoIXBvc2l0aW9uTWFya2VyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBDb3VsZCBub3QgY3JlYXRlIG1hcmtlciBmb3IgcG9zaXRpb246ICR7cG9zaXRpb259YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZmluZFJlZmVyZW5jZXNGb3JQcm9qZWN0KHRoaXMuZWRpdG9yKTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgLy8gV2hlbiB3ZSBoYXZlIG5vIG5ldyByZWZlcmVuY2VzIHRvIHNob3csIHdlJ2xsIHJldHVybiBlYXJseSByYXRoZXIgdGhhblxuICAgICAgLy8gY2xlYXIgdGhlIHBhbmVsIG9mIHJlc3VsdHMuIE5vIHBvaW50IGluIHJlcGxhY2luZyB0aGUgcHJldmlvdXMgcmVzdWx0c1xuICAgICAgLy8gd2l0aCBhbiBlbXB0eSBsaXN0LlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNob3dSZWZlcmVuY2VzUGFuZWwoe1xuICAgICAgcmVzdWx0LFxuICAgICAgZWRpdG9yOiB0aGlzLmVkaXRvcixcbiAgICAgIG1hcmtlcjogcG9zaXRpb25NYXJrZXJcbiAgICB9KTtcbiAgfVxuXG4gIHRyYWNrUG9zaXRpb24ocG9zaXRpb246IFBvaW50KSB7XG4gICAgaWYgKCF0aGlzLmVkaXRvcikgcmV0dXJuO1xuICAgIGxldCByYW5nZSA9IG5ldyBSYW5nZShwb3NpdGlvbiwgcG9zaXRpb24pO1xuICAgIHJldHVybiB0aGlzLmVkaXRvci5tYXJrQnVmZmVyUmFuZ2UocmFuZ2UsIHsgaW52YWxpZGF0ZTogJ3N1cnJvdW5kJyB9KTtcbiAgfVxuXG4gIGZpbmRSZWZlcmVuY2VzUGFuZWxUb1JldXNlKCkge1xuICAgIGxldCBwYW5lSXRlbSA9IGF0b20ud29ya3NwYWNlLmdldFBhbmVJdGVtcygpLmZpbmQoKHBlKSA9PiB7XG4gICAgICByZXR1cm4gcGUgaW5zdGFuY2VvZiBSZWZlcmVuY2VzVmlldyAmJiBwZS5vdmVycmlkYWJsZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcGFuZUl0ZW0gPyBwYW5lSXRlbSBhcyBSZWZlcmVuY2VzVmlldyA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHNob3dSZWZlcmVuY2VzUGFuZWwoe1xuICAgIHJlc3VsdCxcbiAgICBlZGl0b3IsXG4gICAgbWFya2VyXG4gIH06IHsgcmVzdWx0OiBGaW5kUmVmZXJlbmNlc1JldHVybiwgZWRpdG9yOiBUZXh0RWRpdG9yLCBtYXJrZXI6IERpc3BsYXlNYXJrZXIgfSkge1xuICAgIGlmIChyZXN1bHQudHlwZSAhPT0gJ2RhdGEnKSByZXR1cm47XG5cbiAgICBsZXQgcGFuZWxUb1JldXNlID0gdGhpcy5maW5kUmVmZXJlbmNlc1BhbmVsVG9SZXVzZSgpO1xuXG4gICAgbGV0IHVyaSA9IHBhbmVsVG9SZXVzZSA/IHBhbmVsVG9SZXVzZS51cmkgOiBSZWZlcmVuY2VzVmlldy5uZXh0VXJpKCk7XG5cbiAgICAvLyBUaGUgdmlldyBkb2Vzbid0IGV4aXN0IHlldCwgc28gc3RvcmUgc29tZSBjb250ZXh0IHZhbHVlcyB0aGF0IGl0IGNhbiB1c2VcbiAgICAvLyBsYXRlciB3aGVuIGl0IGluc3RhbnRpYXRlcy5cbiAgICBSZWZlcmVuY2VzVmlldy5zZXRSZWZlcmVuY2VzKFxuICAgICAgdXJpLFxuICAgICAge1xuICAgICAgICBtYW5hZ2VyOiB0aGlzLFxuICAgICAgICBlZGl0b3IsXG4gICAgICAgIG1hcmtlcixcbiAgICAgICAgcmVmZXJlbmNlczogcmVzdWx0LnJlZmVyZW5jZXMsXG4gICAgICAgIHN5bWJvbE5hbWU6IHJlc3VsdC5yZWZlcmVuY2VkU3ltYm9sTmFtZVxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBJZiB3ZSdyZSByZXVzaW5nIGFuIGV4aXN0aW5nIHBhbmVsLCB3ZSdyZSBkb25lOyBpdCdsbCBwaWNrIHVwIG9uIG91clxuICAgIC8vIGNoYW5nZXMgYW5kIHJlLXJlbmRlci5cbiAgICBpZiAocGFuZWxUb1JldXNlKSB7XG4gICAgICAvLyBFbnN1cmUgaXQncyBicm91Z2h0IHRvIHRoZSBmcm9udC5cbiAgICAgIGxldCBwYW5lID0gYXRvbS53b3Jrc3BhY2UucGFuZUZvckl0ZW0ocGFuZWxUb1JldXNlKTtcbiAgICAgIGlmICghcGFuZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHBhbmUgZm9yIHBhbmVsIHdpdGggVVJJOiAke3VyaX1gKTtcbiAgICAgIH1cbiAgICAgIHBhbmUuYWN0aXZhdGVJdGVtKHBhbmVsVG9SZXVzZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIHdlJ2xsIGhhdmUgdG8gY3JlYXRlIGEgbmV3IHBhbmVsIG91cnNlbHZlcy5cbiAgICBsZXQgc3BsaXREaXJlY3Rpb24gPSB0aGlzLnNwbGl0RGlyZWN0aW9uID09PSAnbm9uZScgPyB1bmRlZmluZWQgOiB0aGlzLnNwbGl0RGlyZWN0aW9uO1xuICAgIGlmICh0aGlzLnNwbGl0RGlyZWN0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNwbGl0RGlyZWN0aW9uID0gJ3JpZ2h0JztcbiAgICB9XG5cbiAgICByZXR1cm4gYXRvbS53b3Jrc3BhY2Uub3BlbihcbiAgICAgIC8vIFZhcnkgdGhlIFVSTCBzbyB0aGF0IGRpZmZlcmVudCByZWZlcmVuY2UgbG9va3VwcyB0ZW5kIHRvIHVzZSBkaWZmZXJlbnRcbiAgICAgIC8vIHZpZXdzLiBXZSBkb24ndCB3YW50IHRvIGZvcmNlIGV2ZXJ5dGhpbmcgdG8gdXNlIHRoZSBzYW1lIHZpZXdcbiAgICAgIC8vIGluc3RhbmNlLlxuICAgICAgdXJpLFxuICAgICAge1xuICAgICAgICBzZWFyY2hBbGxQYW5lczogdHJ1ZSxcbiAgICAgICAgc3BsaXQ6IHNwbGl0RGlyZWN0aW9uXG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIHNob3dSZWZlcmVuY2VzRm9yRWRpdG9yQXRQb2ludCAoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludE9yUmFuZ2U6IFBvaW50IHwgUmFuZ2UpIHtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy5maW5kUmVmZXJlbmNlc0ZvckVkaXRvckF0UG9pbnQoZWRpdG9yLCBwb2ludE9yUmFuZ2UpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHJldHVybjtcbiAgICBpZiAocmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHJldHVybjtcbiAgICBsZXQgbWFya2VyID0gZWRpdG9yLm1hcmtCdWZmZXJSYW5nZShcbiAgICAgIHBvaW50T3JSYW5nZSBpbnN0YW5jZW9mIFJhbmdlID8gcG9pbnRPclJhbmdlIDogbmV3IFJhbmdlKHBvaW50T3JSYW5nZSwgcG9pbnRPclJhbmdlKVxuICAgIClcblxuICAgIHRoaXMuc2hvd1JlZmVyZW5jZXNQYW5lbCh7XG4gICAgICBlZGl0b3IsXG4gICAgICBtYXJrZXIsXG4gICAgICByZXN1bHRcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yRWRpdG9yQXRQb2ludChlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50T3JSYW5nZTogUG9pbnQgfCBSYW5nZSkge1xuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFwcm92aWRlcikgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblxuICAgIGxldCBwb2ludCA9IHBvaW50T3JSYW5nZSBpbnN0YW5jZW9mIFJhbmdlID8gcG9pbnRPclJhbmdlLnN0YXJ0IDogcG9pbnRPclJhbmdlO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhlZGl0b3IsIHBvaW50KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIFNvbWUgcHJvdmlkZXJzIHJldHVybiBlcnJvcnMgd2hlbiB0aGV5IGRvbid0IHN0cmljdGx5IG5lZWQgdG8uIEZvclxuICAgICAgLy8gaW5zdGFuY2UsIGBnb3Bsc2Agd2lsbCByZXR1cm4gYW4gZXJyb3IgaWYgeW91IGFzayBpdCB0byByZXNvbHZlIGFcbiAgICAgIC8vIHJlZmVyZW5jZSBhdCBhIHdoaXRlc3BhY2UgcG9zaXRpb24uXG4gICAgICAvL1xuICAgICAgLy8gRXZlbiB0aG91Z2ggYWxsIHRoaXMgZG9lcyBpcyBsb2cgYW4gdW5jYXVnaHQgZXhjZXB0aW9uIHRvIHRoZSBjb25zb2xlLFxuICAgICAgLy8gaXQncyBhbm5veWluZ+KApiBzbyBpbnN0ZWFkIHdlJ2xsIGNhdGNoIHRoZSBlcnJvciBhbmQgbG9nIGl0IG91cnNlbHZlc1xuICAgICAgLy8gdmlhIG91ciBgY29uc29sZWAgaGVscGVyLiBUaGlzIG1lYW5zIGl0J2xsIGJlIGhpZGRlbiB1bmxlc3MgdGhlIHVzZXJcbiAgICAgIC8vIG9wdHMgaW50byBkZWJ1ZyBsb2dnaW5nLlxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd2hpbGUgcmV0cmlldmluZyByZWZlcmVuY2VzOmApXG4gICAgICBjb25zb2xlLmVycm9yKGVycilcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXNGb3JQcm9qZWN0KGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8RmluZFJlZmVyZW5jZXNSZXR1cm4gfCBudWxsPiB7XG4gICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJzb3JQb3NpdGlvbkZvckVkaXRvcihlZGl0b3IpO1xuICAgIGlmICghcG9zaXRpb24pIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG5cbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlc0ZvclByb2plY3RBdFBvc2l0aW9uKGVkaXRvciwgcG9zaXRpb24pO1xuICB9XG5cbiAgYXN5bmMgZmluZFJlZmVyZW5jZXNGb3JQcm9qZWN0QXRQb3NpdGlvbihlZGl0b3I6IFRleHRFZGl0b3IsIHBvc2l0aW9uOiBQb2ludCk6IFByb21pc2U8RmluZFJlZmVyZW5jZXNSZXR1cm4gfCBudWxsPiB7XG4gICAgbGV0IHByb3ZpZGVyID0gdGhpcy5wcm92aWRlclJlZ2lzdHJ5LmdldEZpcnN0UHJvdmlkZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBpZiAoIXByb3ZpZGVyKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwcm92aWRlci5maW5kUmVmZXJlbmNlcyhlZGl0b3IsIHBvc2l0aW9uKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIFNvbWUgcHJvdmlkZXJzIHJldHVybiBlcnJvcnMgd2hlbiB0aGV5IGRvbid0IHN0cmljdGx5IG5lZWQgdG8uIEZvclxuICAgICAgLy8gaW5zdGFuY2UsIGBnb3Bsc2Agd2lsbCByZXR1cm4gYW4gZXJyb3IgaWYgeW91IGFzayBpdCB0byByZXNvbHZlIGFcbiAgICAgIC8vIHJlZmVyZW5jZSBhdCBhIHdoaXRlc3BhY2UgcG9zaXRpb24uXG4gICAgICAvL1xuICAgICAgLy8gRXZlbiB0aG91Z2ggYWxsIHRoaXMgZG9lcyBpcyBsb2cgYW4gdW5jYXVnaHQgZXhjZXB0aW9uIHRvIHRoZSBjb25zb2xlLFxuICAgICAgLy8gaXQncyBhbm5veWluZ+KApiBzbyBpbnN0ZWFkIHdlJ2xsIGNhdGNoIHRoZSBlcnJvciBhbmQgbG9nIGl0IG91cnNlbHZlc1xuICAgICAgLy8gdmlhIG91ciBgY29uc29sZWAgaGVscGVyLiBUaGlzIG1lYW5zIGl0J2xsIGJlIGhpZGRlbiB1bmxlc3MgdGhlIHVzZXJcbiAgICAgIC8vIG9wdHMgaW50byBkZWJ1ZyBsb2dnaW5nLlxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd2hpbGUgcmV0cmlldmluZyByZWZlcmVuY2VzOmApXG4gICAgICBjb25zb2xlLmVycm9yKGVycilcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJlZmVyZW5jZXNVbmRlckN1cnNvcihmb3JjZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLmVkaXRvcikgcmV0dXJuO1xuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnModGhpcy5lZGl0b3IsIGZvcmNlKTtcbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMobWFpbkVkaXRvcjogVGV4dEVkaXRvciwgZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGxldCB2aXNpYmxlRWRpdG9ycyA9IHRoaXMuZ2V0VmlzaWJsZUVkaXRvcnMoKTtcblxuICAgIGxldCBlZGl0b3JNYXAgPSBuZXcgTWFwKCk7XG4gICAgbGV0IHJlZmVyZW5jZU1hcCA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAobGV0IGVkaXRvciBvZiB2aXNpYmxlRWRpdG9ycykge1xuICAgICAgLy8gTW9yZSB0aGFuIG9uZSB2aXNpYmxlIGVkaXRvciBjYW4gYmUgcG9pbnRpbmcgdG8gdGhlIHNhbWUgcGF0aC5cbiAgICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGlmICghZWRpdG9yTWFwLmhhcyhwYXRoKSkge1xuICAgICAgICBlZGl0b3JNYXAuc2V0KHBhdGgsIFtdKTtcbiAgICAgIH1cbiAgICAgIGVkaXRvck1hcC5nZXQocGF0aCkucHVzaChlZGl0b3IpO1xuICAgIH1cblxuICAgIGxldCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJSZWdpc3RyeS5nZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKG1haW5FZGl0b3IpO1xuICAgIGlmICghcHJvdmlkZXIpIHJldHVybjtcblxuICAgIGxldCBjdXJzb3JzID0gbWFpbkVkaXRvci5nZXRDdXJzb3JzKCk7XG4gICAgaWYgKGN1cnNvcnMubGVuZ3RoID4gMSkgcmV0dXJuO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICB0cnkge1xuICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyLmZpbmRSZWZlcmVuY2VzKG1haW5FZGl0b3IsIHBvc2l0aW9uKTtcbiAgICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgICBpZiAocmVzdWx0LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyByZWZlcmVuY2VzOiAke3Jlc3VsdD8ubWVzc2FnZSA/PyAnbnVsbCd9YCk7XG4gICAgICAgIHRoaXMuY2xlYXJBbGxWaXNpYmxlU2Nyb2xsR3V0dGVycygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVzdWx0LnJlZmVyZW5jZXMpIHtcbiAgICAgICAgbGV0IHsgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICAgIGlmICghcmVmZXJlbmNlTWFwLmhhcyh1cmkpKSB7XG4gICAgICAgICAgcmVmZXJlbmNlTWFwLnNldCh1cmksIFtdKTtcbiAgICAgICAgfVxuICAgICAgICByZWZlcmVuY2VNYXAuZ2V0KHVyaSkucHVzaChyZWZlcmVuY2UpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBwYXRoIG9mIGVkaXRvck1hcC5rZXlzKCkpIHtcbiAgICAgICAgbGV0IGVkaXRvcnMgPSBlZGl0b3JNYXAuZ2V0KHBhdGgpO1xuICAgICAgICBsZXQgcmVmZXJlbmNlcyA9IHJlZmVyZW5jZU1hcC5nZXQocGF0aCk7XG4gICAgICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7XG4gICAgICAgICAgdGhpcy5oaWdobGlnaHRSZWZlcmVuY2VzKGVkaXRvciwgcmVmZXJlbmNlcyA/PyBbXSwgZm9yY2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBFcnJvciByZXRyaWV2aW5nIHJlZmVyZW5jZXM6YClcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGZpbmRSZWZlcmVuY2VzKGV2ZW50OiBDb21tYW5kRXZlbnQ8VGV4dEVkaXRvckVsZW1lbnQ+KSB7XG4gICAgbGV0IGVkaXRvciA9IGV2ZW50LmN1cnJlbnRUYXJnZXQuZ2V0TW9kZWwoKTtcbiAgICBpZiAoIWF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcihlZGl0b3IpKSB7XG4gICAgICByZXR1cm4gZXZlbnQuYWJvcnRLZXlCaW5kaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzRm9yVmlzaWJsZUVkaXRvcnMoZWRpdG9yKTtcbiAgfVxuXG4gIGhpZ2hsaWdodFJlZmVyZW5jZXMoZWRpdG9yOiBUZXh0RWRpdG9yLCByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSB8IG51bGwsIGZvcmNlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBsZXQgZWRpdG9yTWFya2VyTGF5ZXIgPSB0aGlzLmdldE9yQ3JlYXRlTWFya2VyTGF5ZXJGb3JFZGl0b3IoZWRpdG9yKTtcbiAgICBsZXQgbGluZUNvdW50ID0gZWRpdG9yLmdldEJ1ZmZlcigpLmdldExpbmVDb3VudCgpO1xuICAgIGlmIChlZGl0b3JNYXJrZXJMYXllci5pc0Rlc3Ryb3llZCgpKSByZXR1cm47XG4gICAgZWRpdG9yTWFya2VyTGF5ZXIuY2xlYXIoKTtcbiAgICBsZXQgY3Vyc29yUG9zaXRpb24gPSBlZGl0b3IuZ2V0TGFzdEN1cnNvcigpLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG5cbiAgICBpZiAodGhpcy5lbmFibGVFZGl0b3JEZWNvcmF0aW9uIHx8IGZvcmNlKSB7XG4gICAgICBsZXQgZmlsdGVyZWRSZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgICAgbGV0IHJhbmdlU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBsZXQgY3VycmVudFBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIChyZWZlcmVuY2VzID8/IFtdKSkge1xuICAgICAgICBsZXQgeyByYW5nZSwgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICAgIGxldCBrZXkgPSByYW5nZS50b1N0cmluZygpO1xuICAgICAgICBpZiAodXJpICE9PSBjdXJyZW50UGF0aCkgY29udGludWU7XG4gICAgICAgIGlmIChyYW5nZVNldC5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgIGlmICh0aGlzLnNraXBDdXJyZW50UmVmZXJlbmNlICYmIHJhbmdlLmNvbnRhaW5zUG9pbnQoY3Vyc29yUG9zaXRpb24pKVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHJhbmdlU2V0LmFkZChrZXkpO1xuICAgICAgICBmaWx0ZXJlZFJlZmVyZW5jZXMucHVzaChyZWZlcmVuY2UpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb21wYXJlIGhvdyBtYW55IHJlZmVyZW5jZXMgd2UgaGF2ZSB0byB0aGUgbnVtYmVyIG9mIGJ1ZmZlciBsaW5lcy4gSWZcbiAgICAgIC8vIGl0J3Mgb3ZlciBhIGNvbmZpZ3VyYWJsZSBxdW90aWVudCwgdGhlbiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIG1heSBiZVxuICAgICAgLy8gZ2l2aW5nIHVzIHJlZmVyZW5jZXMgZm9yIHNvbWV0aGluZyByZWFsbHkgbXVuZGFuZSwgbGlrZSBgdHJ1ZWAgb3JcbiAgICAgIC8vIGBkaXZgLiBUaGlzIGNhbiBiZSBhIHBlcmZvcm1hbmNlIGlzc3VlIChQdWxzYXIgc2VlbXMgbm90IHRvIGxpa2UgdG9cbiAgICAgIC8vIGhhdmUgX2xvdHNfIG9mIG1hcmtlciBkZWNvcmF0aW9ucykgYW5kIGl0J3MgYWxzbyBhIHNpZ24gdGhhdCB0aGVcbiAgICAgIC8vIHJlZmVyZW5jZXMgdGhlbXNlbHZlcyB3b24ndCBiZSB2ZXJ5IGhlbHBmdWwuXG4gICAgICBpZiAodGhpcy5pZ25vcmVUaHJlc2hvbGQgPiAwICYmIChmaWx0ZXJlZFJlZmVyZW5jZXMubGVuZ3RoIC8gbGluZUNvdW50KSA+PSB0aGlzLmlnbm9yZVRocmVzaG9sZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIFtdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCB7IHJhbmdlIH0gb2YgZmlsdGVyZWRSZWZlcmVuY2VzKSB7XG4gICAgICAgIGVkaXRvck1hcmtlckxheWVyLm1hcmtCdWZmZXJSYW5nZShyYW5nZSk7XG4gICAgICB9XG5cbiAgICAgIGVkaXRvci5kZWNvcmF0ZU1hcmtlckxheWVyKGVkaXRvck1hcmtlckxheWVyLCB7XG4gICAgICAgIHR5cGU6ICdoaWdobGlnaHQnLFxuICAgICAgICBjbGFzczogJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMtcmVmZXJlbmNlJ1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVTY3JvbGxHdXR0ZXIoZWRpdG9yLCByZWZlcmVuY2VzKTtcbiAgfVxuXG4gIGdldEN1cnNvclBvc2l0aW9uRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcik6IFBvaW50IHwgbnVsbCB7XG4gICAgbGV0IGN1cnNvcnMgPSBlZGl0b3IuZ2V0Q3Vyc29ycygpO1xuICAgIGlmIChjdXJzb3JzLmxlbmd0aCA+IDEpIHJldHVybiBudWxsO1xuICAgIGxldCBbY3Vyc29yXSA9IGN1cnNvcnM7XG4gICAgbGV0IHBvc2l0aW9uID0gY3Vyc29yLmdldEJ1ZmZlclBvc2l0aW9uKCk7XG4gICAgcmV0dXJuIHBvc2l0aW9uO1xuICB9XG5cbiAgZ2V0T3JDcmVhdGVNYXJrZXJMYXllckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgbGF5ZXIgPSB0aGlzLm1hcmtlckxheWVyc0ZvckVkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgaWYgKCFsYXllcikge1xuICAgICAgbGF5ZXIgPSBlZGl0b3IuYWRkTWFya2VyTGF5ZXIoKTtcbiAgICAgIHRoaXMubWFya2VyTGF5ZXJzRm9yRWRpdG9ycy5zZXQoZWRpdG9yLCBsYXllcik7XG4gICAgfVxuICAgIHJldHVybiBsYXllcjtcbiAgfVxuXG4gIC8vIFNDUk9MTCBHVVRURVJcblxuICBnZXRPckNyZWF0ZVNjcm9sbEd1dHRlckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICBlbGVtZW50ID0gbmV3IFNjcm9sbEd1dHRlcigpO1xuICAgICAgbGV0IGVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcbiAgICAgIHRoaXMuc2Nyb2xsR3V0dGVyc0ZvckVkaXRvcnMuc2V0KGVkaXRvciwgZWxlbWVudCk7XG5cbiAgICAgIGxldCBvblZpc2liaWxpdHlDaGFuZ2UgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudCBhcyBTY3JvbGxHdXR0ZXJWaXNpYmlsaXR5RXZlbnQpO1xuICAgICAgfTtcblxuICAgICAgZWRpdG9yVmlldy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuXG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgICAgZWRpdG9yVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5LWNoYW5nZWQnLCBvblZpc2liaWxpdHlDaGFuZ2UpO1xuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgZWxlbWVudC5hdHRhY2hUb0VkaXRvcihlZGl0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGFuIGF0dHJpYnV0ZSBvbiBgYXRvbS10ZXh0LWVkaXRvcmAgd2hlbmV2ZXIgYSBgc2Nyb2xsLWd1dHRlcmAgZWxlbWVudFxuICAgKiBpcyBwcmVzZW50LiBUaGlzIGFsbG93cyB1cyB0byBkZWZpbmUgY3VzdG9tIHNjcm9sbGJhciBvcGFjaXR5IHN0eWxlcy5cbiAgICovXG4gIG9uU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUNoYW5nZShldmVudDogU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50KSB7XG4gICAgbGV0IHsgZGV0YWlsOiB7IHZpc2libGUsIGVkaXRvciB9IH0gPSBldmVudDtcblxuICAgIGxldCBlZGl0b3JWaWV3ID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG4gICAgZWRpdG9yVmlldy5zZXRBdHRyaWJ1dGUoXG4gICAgICAnd2l0aC1wdWxzYXItZmluZC1yZWZlcmVuY2VzLXNjcm9sbC1ndXR0ZXInLFxuICAgICAgdmlzaWJsZSA/ICdhY3RpdmUnIDogJ2luYWN0aXZlJ1xuICAgICk7XG4gIH1cblxuICBjbGVhckFsbFZpc2libGVTY3JvbGxHdXR0ZXJzKCkge1xuICAgIGxldCBlZGl0b3JzID0gdGhpcy5nZXRWaXNpYmxlRWRpdG9ycygpO1xuICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3IsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVNjcm9sbEd1dHRlcihlZGl0b3I6IFRleHRFZGl0b3IsIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCkge1xuXG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmdldE9yQ3JlYXRlU2Nyb2xsR3V0dGVyRm9yRWRpdG9yKGVkaXRvcik7XG4gICAgaWYgKCFlbGVtZW50KSByZXR1cm47XG5cbiAgICAvLyBXZSBjYWxsIHRoaXMgbWV0aG9kIGV2ZW4gaWYgc2Nyb2xsYmFyIGRlY29yYXRpb24gaXMgZGlzYWJsZWQ7IHRoaXMgaXNcbiAgICAvLyB3aGF0IGFsbG93cyB1cyB0byBjbGVhciBleGlzdGluZyByZWZlcmVuY2VzIGlmIHRoZSB1c2VyIGp1c3QgdW5jaGVja2VkXG4gICAgLy8gdGhlIOKAnEVuYWJsZeKAnSBjaGVja2JveC5cbiAgICBlbGVtZW50LmhpZ2hsaWdodFJlZmVyZW5jZXMocmVmZXJlbmNlcyk7XG4gIH1cblxuICAvLyBVVElMXG5cbiAgZ2V0VmlzaWJsZUVkaXRvcnMoKTogVGV4dEVkaXRvcltdIHtcbiAgICBsZXQgZWRpdG9yczogVGV4dEVkaXRvcltdID0gW107XG4gICAgbGV0IHBhbmVzID0gYXRvbS53b3Jrc3BhY2UuZ2V0UGFuZXMoKTtcbiAgICBwYW5lcy5mb3JFYWNoKHBhbmUgPT4ge1xuICAgICAgbGV0IGl0ZW0gPSBwYW5lLmdldEFjdGl2ZUl0ZW0oKTtcbiAgICAgIGlmIChhdG9tLndvcmtzcGFjZS5pc1RleHRFZGl0b3IoaXRlbSkpIHtcbiAgICAgICAgZWRpdG9ycy5wdXNoKGl0ZW0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVkaXRvcnM7XG4gIH1cbn1cbiJdfQ==