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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const element_resize_detector_1 = __importDefault(require("element-resize-detector"));
const console = __importStar(require("../console"));
const MINIMUM_GUTTER_WIDTH = 15;
const TAG_NAME = 'pulsar-find-references-scroll-gutter';
const RESIZE_DETECTOR = (0, element_resize_detector_1.default)({ strategy: 'scroll' });
function last(list) {
    return list[list.length - 1];
}
class ScrollGutter extends HTMLElement {
    constructor() {
        var _a;
        super();
        this.attached = false;
        this.editor = null;
        this.editorView = null;
        this.scrollbar = null;
        this.scrollView = null;
        this.lastEditorWidth = 0;
        this.lastEditorHeight = 0;
        this.screenRanges = null;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.height = 0;
        this.width = 0;
        this.frameRequested = false;
        // CANVAS STUFF
        this.canvas = null;
        this.canvasContext = null;
        this.visible = true;
        this.created = false;
        (_a = this.resizeObserver) !== null && _a !== void 0 ? _a : (this.resizeObserver = new ResizeObserver(_ => this.measureHeightAndWidth()));
        if (this.created)
            return;
        this.initializeCanvas();
        this.created = true;
    }
    attachToEditor(editor) {
        console.debug('Attaching to editor:', editor);
        if (this.attached && this.editor === editor)
            return;
        this.editor = editor;
        this.editorView = atom.views.getView(editor);
        this.getConfig(editor);
        this.attachToScrollbar();
        let parent = this.scrollbar.parentNode;
        if (!parent) {
            throw new Error(`No node to attach to!`);
        }
        let grammar = editor.getGrammar();
        this.subscriptions.add(
        // Redraw the gutters when the grammar changes — a new root scope might
        // mean new config values.
        editor.onDidChangeGrammar(() => {
            this.getConfig(editor);
            this.redrawAfterConfigChange();
        }), 
        // Redraw the gutters when the config changes.
        atom.config.observe('pulsar-find-references.scrollbarDecoration', { scope: [grammar.scopeName] }, _ => {
            this.getConfig(editor);
            this.redrawAfterConfigChange();
        }));
        parent.appendChild(this);
    }
    attachToScrollbar() {
        var _a;
        // @ts-expect-error Private API
        let component = this.editor.component;
        // @ts-expect-error Private API
        let scrollView = component.refs.scrollContainer;
        // @ts-expect-error Private API
        let scrollbar = (_a = component.refs.verticalScrollbar) === null || _a === void 0 ? void 0 : _a.element;
        // @ts-expect-error Private API
        if (!component.isVisible()) {
            console.debug(`Waiting until later to render because we're hidden`);
        }
        if (!scrollbar || !scrollView) {
            throw new Error(`No scrollbar or scrollView!`);
        }
        if (this.scrollbar !== scrollbar) {
            if (this.scrollbar !== null) {
                this.resizeObserver.unobserve(this.scrollbar);
            }
            this.scrollbar = scrollbar;
            this.resizeObserver.observe(this.scrollbar);
        }
        if (this.scrollView !== scrollView) {
            this.scrollView = scrollView;
        }
    }
    redrawAfterConfigChange() {
        if (this.isVisible()) {
            if (this.redrawTimeout) {
                clearTimeout(this.redrawTimeout);
                this.redrawTimeout = undefined;
            }
            this.redrawTimeout = setTimeout(() => {
                this.drawScreenRanges(true);
            }, 500);
        }
    }
    getConfig(editor) {
        this.config = this.getScopedSettingsForKey('pulsar-find-references.scrollbarDecoration', editor);
        return this.config;
    }
    connectedCallback() {
        this.intersectionObserver = new IntersectionObserver(entries => {
            let { intersectionRect } = last(entries);
            if (intersectionRect.width > 0 || intersectionRect.height > 0) {
                this.measureHeightAndWidth(true, true);
            }
        });
        this.intersectionObserver.observe(this);
        if (this.isVisible()) {
            this.measureHeightAndWidth(true, true);
        }
        let measureDimensions = () => this.measureHeightAndWidth(false, false);
        RESIZE_DETECTOR.listenTo(this, measureDimensions);
        window.addEventListener('resize', measureDimensions, { passive: true });
        this.subscriptions.add(new atom_1.Disposable(() => {
            RESIZE_DETECTOR.removeListener(this, measureDimensions);
        }), new atom_1.Disposable(() => {
            window.removeEventListener('resize', measureDimensions);
        }));
        this.measureHeightAndWidth();
        this.attached = true;
        this.subscriptions.add(this.subscribeToMediaQuery());
    }
    subscribeToMediaQuery() {
        let mediaQuery = window.matchMedia('screen and (-webkit-min-device-pixel-ratio: 1.5)');
        let mediaListener = () => this.requestForcedUpdate();
        mediaQuery.addEventListener('change', mediaListener);
        return new atom_1.Disposable(() => {
            mediaQuery.removeEventListener('change', mediaListener);
        });
    }
    initializeCanvas() {
        var _a;
        (_a = this.canvas) !== null && _a !== void 0 ? _a : (this.canvas = document.createElement('canvas'));
        this.canvasContext = this.canvas.getContext('2d', { desynchronized: false });
        this.appendChild(this.canvas);
    }
    measureHeightAndWidth(visibilityChanged = false, forceUpdate = true) {
        var _a, _b;
        let wasResized = this.width !== this.clientWidth || this.height !== this.clientHeight;
        if (!this.scrollbar || !this.scrollbar.parentNode) {
            console.log('Reattaching to scrollbar!');
            this.attachToScrollbar();
        }
        if (!this.scrollbar || !this.scrollView) {
            this.height = this.clientHeight;
            this.width = this.clientWidth;
        }
        else {
            let barRect = this.scrollbar.getBoundingClientRect();
            this.height = barRect.height;
            // In some scenarios, the scrollbar might have height but no width; it's
            // happened to me once in a while, but not in any sort of reproducible
            // way. We can still enforce a minimum width for the gutter view.
            //
            // TODO: Make this configurable?
            this.width = Math.max(barRect.width, MINIMUM_GUTTER_WIDTH);
            console.debug((_a = this.editor) === null || _a === void 0 ? void 0 : _a.id, 'actual scrollbar width:', barRect.width);
            console.debug((_b = this.editor) === null || _b === void 0 ? void 0 : _b.id, 'Measuring width and height as:', this.width, this.height);
        }
        if (wasResized || visibilityChanged || forceUpdate) {
            this.requestForcedUpdate();
        }
        if (!this.isVisible())
            return;
    }
    requestForcedUpdate() {
        this.requestUpdate();
    }
    requestUpdate() {
        if (this.frameRequested)
            return;
        this.frameRequested = true;
        requestAnimationFrame(() => {
            this.update();
            this.frameRequested = false;
        });
    }
    update() {
        console.debug('Element update!');
        if (!this.visible) {
            this.style.visibility = 'hidden';
            return;
        }
        else {
            this.style.visibility = 'visible';
        }
        this.style.width = this.width ? `${this.width}px` : '';
        this.style.height = this.height ? `${this.height}px` : '';
        let shouldRedraw = false;
        if (!this.editorView)
            return;
        if (this.editorView.offsetWidth !== this.lastEditorWidth) {
            shouldRedraw = true;
        }
        if (this.editorView.offsetHeight !== this.lastEditorHeight) {
            shouldRedraw = true;
        }
        this.lastEditorWidth = this.editorView.offsetWidth;
        this.lastEditorHeight = this.editorView.offsetHeight;
        if (this.canvas) {
            if (this.canvas.width !== this.width) {
                this.canvas.width = this.width;
                shouldRedraw = true;
            }
            if (this.canvas.height !== this.height) {
                this.canvas.height = this.height;
                shouldRedraw = true;
            }
        }
        if (shouldRedraw) {
            this.drawScreenRanges();
        }
    }
    clearReferences() {
        this.screenRanges = [];
        if (!this.canvas || !this.canvasContext)
            return;
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    highlightReferences(references) {
        if (this.getEditorHeight() <= this.getScrollbarHeight()) {
            return;
        }
        let { editor } = this;
        if (!editor)
            return;
        let { config } = this;
        this.clearReferences();
        if (!references || !config.enable) {
            this.setVisibility(false);
            return;
        }
        let path = editor.getPath();
        for (let reference of references) {
            let { uri, range } = reference;
            if (uri !== path)
                continue;
            let screenRange = editor.screenRangeForBufferRange(range);
            console.debug('Buffer range', range.toString(), 'maps to screen range', screenRange.toString());
            this.screenRanges.push(screenRange);
        }
        this.setVisibility(references.length !== 0);
        this.drawScreenRanges();
    }
    drawScreenRanges(clear = false) {
        if (!this.screenRanges || !this.editor || !this.canvas || !this.canvasContext) {
            return;
        }
        if (clear) {
            this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        let lineCount = this.editor.getScreenLineCount();
        for (let range of this.screenRanges) {
            let row = range.start.row;
            this.drawRectForEditorRow(row, lineCount);
        }
    }
    getEditorHeight() {
        if (!this.scrollView)
            return 0;
        let child = this.scrollView.firstChild;
        return child ? child.clientHeight : 0;
    }
    getScrollbarHeight() {
        if (!this.scrollbar)
            return 0;
        let rect = this.scrollbar.getBoundingClientRect();
        return rect.height;
    }
    drawRectForEditorRow(row, totalRows) {
        let { height, width } = this.canvas;
        let { markerColor, markerOpacity } = this.config;
        let ctx = this.canvasContext;
        ctx.fillStyle = markerColor.toHexString();
        ctx.globalAlpha = markerOpacity;
        let pixelHeightPerRow = height / totalRows;
        let rectHeight = Math.max(pixelHeightPerRow, devicePixelRatio);
        let startY = pixelHeightPerRow * row;
        if (rectHeight > devicePixelRatio) {
            startY += ((pixelHeightPerRow / 2) - (devicePixelRatio / 2));
        }
        ctx.fillRect(0, startY, width, devicePixelRatio);
    }
    setVisibility(shouldBeVisible) {
        console.log('setVisibility', shouldBeVisible);
        let shouldUpdate = shouldBeVisible === this.visible;
        if (shouldUpdate) {
            this.visible = shouldBeVisible;
            this.requestUpdate();
        }
        if (!this.isVisible()) {
            console.log('Failed sanity check! Recomputing dimensions…');
            this.measureHeightAndWidth();
        }
        let event = new CustomEvent('visibility-changed', {
            bubbles: true,
            detail: {
                visible: shouldBeVisible,
                editor: this.editor
            }
        });
        console.warn('firing event!');
        this.dispatchEvent(event);
    }
    isVisible() {
        return this.offsetWidth > 0 && this.offsetHeight > 0;
    }
    // UTIL
    queryParentSelector(selector) {
        let parent = this.parentNode;
        while (true) {
            if (!parent)
                return null;
            if (parent.matches(selector))
                return parent;
            parent = parent.parentNode;
        }
    }
    getScopedSettingsForKey(key, editor) {
        let schema = atom.config.getSchema(key);
        if (!schema) {
            throw new Error(`Unknown config key: ${schema}`);
        }
        let grammar = editor.getGrammar();
        let base = atom.config.get(key);
        let scoped = atom.config.get(key, { scope: [grammar.scopeName] });
        if ((schema === null || schema === void 0 ? void 0 : schema.type) === 'object') {
            return Object.assign(Object.assign({}, base), scoped);
        }
        else {
            return scoped !== null && scoped !== void 0 ? scoped : base;
        }
    }
}
exports.default = ScrollGutter;
customElements.define(TAG_NAME, ScrollGutter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsLWd1dHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFRYztBQUNkLHNGQUFtRTtBQUVuRSxvREFBc0M7QUFFdEMsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUM7QUFDaEMsTUFBTSxRQUFRLEdBQUcsc0NBQXNDLENBQUM7QUFFeEQsTUFBTSxlQUFlLEdBQUcsSUFBQSxpQ0FBNEIsRUFBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBRTdFLFNBQVMsSUFBSSxDQUFJLElBQWM7SUFDN0IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBVUQsTUFBcUIsWUFBYSxTQUFRLFdBQVc7SUFpQ25EOztRQUNFLEtBQUssRUFBRSxDQUFDO1FBakNILGFBQVEsR0FBWSxLQUFLLENBQUM7UUFFMUIsV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDaEMsZUFBVSxHQUE2QixJQUFJLENBQUM7UUFDNUMsY0FBUyxHQUF1QixJQUFJLENBQUM7UUFDckMsZUFBVSxHQUF1QixJQUFJLENBQUM7UUFFdEMsb0JBQWUsR0FBVyxDQUFDLENBQUM7UUFDNUIscUJBQWdCLEdBQVcsQ0FBQyxDQUFDO1FBRTdCLGlCQUFZLEdBQW1CLElBQUksQ0FBQztRQUVwQyxrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFHaEUsV0FBTSxHQUFXLENBQUMsQ0FBQztRQUNuQixVQUFLLEdBQVcsQ0FBQyxDQUFDO1FBR2pCLG1CQUFjLEdBQVksS0FBSyxDQUFDO1FBSXhDLGVBQWU7UUFFUCxXQUFNLEdBQTZCLElBQUksQ0FBQztRQUN4QyxrQkFBYSxHQUFvQyxJQUFJLENBQUM7UUFDdEQsWUFBTyxHQUFZLElBQUks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R0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxJQUFJLE1BQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsdUNBQVksSUFBSSxHQUFLLE1BQU0sRUFBRztRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sTUFBTSxhQUFOLE1BQU0sY0FBTixNQUFNLEdBQUksSUFBSSxDQUFDO1FBQ3hCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUExWkQsK0JBMFpDO0FBRUQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb2xvcixcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcG9zYWJsZSxcbiAgUmFuZ2UsXG4gIFRleHRFZGl0b3IsXG4gIFRleHRFZGl0b3JFbGVtZW50LFxuICBUZXh0RWRpdG9yQ29tcG9uZW50LFxufSBmcm9tICdhdG9tJztcbmltcG9ydCBlbGVtZW50UmVzaXplRGV0ZWN0b3JGYWN0b3J5IGZyb20gJ2VsZW1lbnQtcmVzaXplLWRldGVjdG9yJztcbmltcG9ydCB0eXBlIHsgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4uL2NvbnNvbGUnO1xuXG5jb25zdCBNSU5JTVVNX0dVVFRFUl9XSURUSCA9IDE1O1xuY29uc3QgVEFHX05BTUUgPSAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1zY3JvbGwtZ3V0dGVyJztcblxuY29uc3QgUkVTSVpFX0RFVEVDVE9SID0gZWxlbWVudFJlc2l6ZURldGVjdG9yRmFjdG9yeSh7IHN0cmF0ZWd5OiAnc2Nyb2xsJyB9KTtcblxuZnVuY3Rpb24gbGFzdDxUPihsaXN0OiBBcnJheTxUPikge1xuICByZXR1cm4gbGlzdFtsaXN0Lmxlbmd0aCAtIDFdO1xufVxuXG50eXBlIFNjcm9sbEd1dHRlckNvbmZpZyA9IHtcbiAgZW5hYmxlOiBib29sZWFuLFxuICBtYXJrZXJDb2xvcjogQ29sb3IsXG4gIG1hcmtlck9wYWNpdHk6IG51bWJlclxufTtcblxuZXhwb3J0IHR5cGUgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50ID0gQ3VzdG9tRXZlbnQ8eyB2aXNpYmxlOiBib29sZWFuLCBlZGl0b3I6IFRleHRFZGl0b3IgfT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcm9sbEd1dHRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcHVibGljIGF0dGFjaGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHVibGljIGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc2Nyb2xsYmFyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNjcm9sbFZpZXc6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBsYXN0RWRpdG9yV2lkdGg6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgbGFzdEVkaXRvckhlaWdodDogbnVtYmVyID0gMDtcblxuICBwcml2YXRlIHNjcmVlblJhbmdlczogUmFuZ2VbXSB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gIHByaXZhdGUgaW50ZXJzZWN0aW9uT2JzZXJ2ZXI/OiBJbnRlcnNlY3Rpb25PYnNlcnZlcjtcblxuICBwdWJsaWMgaGVpZ2h0OiBudW1iZXIgPSAwO1xuICBwdWJsaWMgd2lkdGg6IG51bWJlciA9IDA7XG5cbiAgcHJpdmF0ZSByZXNpemVPYnNlcnZlcjogUmVzaXplT2JzZXJ2ZXI7XG4gIHByaXZhdGUgZnJhbWVSZXF1ZXN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIGNvbmZpZyE6IFNjcm9sbEd1dHRlckNvbmZpZztcblxuICAvLyBDQU5WQVMgU1RVRkZcblxuICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjYW52YXNDb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB2aXNpYmxlOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBjcmVhdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSByZWRyYXdUaW1lb3V0PzogTm9kZUpTLlRpbWVvdXQ7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyID8/PSBuZXcgUmVzaXplT2JzZXJ2ZXIoXyA9PiB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aCgpKTtcbiAgICBpZiAodGhpcy5jcmVhdGVkKSByZXR1cm47XG4gICAgdGhpcy5pbml0aWFsaXplQ2FudmFzKCk7XG4gICAgdGhpcy5jcmVhdGVkID0gdHJ1ZTtcbiAgfVxuXG4gIGF0dGFjaFRvRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGNvbnNvbGUuZGVidWcoJ0F0dGFjaGluZyB0byBlZGl0b3I6JywgZWRpdG9yKTtcbiAgICBpZiAodGhpcy5hdHRhY2hlZCAmJiB0aGlzLmVkaXRvciA9PT0gZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmVkaXRvclZpZXcgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcblxuICAgIHRoaXMuZ2V0Q29uZmlnKGVkaXRvcik7XG5cbiAgICB0aGlzLmF0dGFjaFRvU2Nyb2xsYmFyKCk7XG5cbiAgICBsZXQgcGFyZW50ID0gdGhpcy5zY3JvbGxiYXIhLnBhcmVudE5vZGU7XG4gICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gbm9kZSB0byBhdHRhY2ggdG8hYCk7XG4gICAgfVxuXG4gICAgbGV0IGdyYW1tYXIgPSBlZGl0b3IuZ2V0R3JhbW1hcigpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIC8vIFJlZHJhdyB0aGUgZ3V0dGVycyB3aGVuIHRoZSBncmFtbWFyIGNoYW5nZXMg4oCUIGEgbmV3IHJvb3Qgc2NvcGUgbWlnaHRcbiAgICAgIC8vIG1lYW4gbmV3IGNvbmZpZyB2YWx1ZXMuXG4gICAgICBlZGl0b3Iub25EaWRDaGFuZ2VHcmFtbWFyKCgpID0+IHtcbiAgICAgICAgdGhpcy5nZXRDb25maWcoZWRpdG9yKTtcbiAgICAgICAgdGhpcy5yZWRyYXdBZnRlckNvbmZpZ0NoYW5nZSgpO1xuICAgICAgfSksXG4gICAgICAvLyBSZWRyYXcgdGhlIGd1dHRlcnMgd2hlbiB0aGUgY29uZmlnIGNoYW5nZXMuXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAgICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5zY3JvbGxiYXJEZWNvcmF0aW9uJyxcbiAgICAgICAgeyBzY29wZTogW2dyYW1tYXIuc2NvcGVOYW1lXSB9LFxuICAgICAgICBfID0+IHtcbiAgICAgICAgICB0aGlzLmdldENvbmZpZyhlZGl0b3IpO1xuICAgICAgICAgIHRoaXMucmVkcmF3QWZ0ZXJDb25maWdDaGFuZ2UoKTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICApO1xuXG4gICAgcGFyZW50LmFwcGVuZENoaWxkKHRoaXMpO1xuICB9XG5cbiAgYXR0YWNoVG9TY3JvbGxiYXIoKSB7XG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciBQcml2YXRlIEFQSVxuICAgIGxldCBjb21wb25lbnQ6IFRleHRFZGl0b3JDb21wb25lbnQgPSB0aGlzLmVkaXRvci5jb21wb25lbnQ7XG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciBQcml2YXRlIEFQSVxuICAgIGxldCBzY3JvbGxWaWV3ID0gY29tcG9uZW50LnJlZnMuc2Nyb2xsQ29udGFpbmVyO1xuICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgUHJpdmF0ZSBBUElcbiAgICBsZXQgc2Nyb2xsYmFyID0gY29tcG9uZW50LnJlZnMudmVydGljYWxTY3JvbGxiYXI/LmVsZW1lbnQ7XG5cbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yIFByaXZhdGUgQVBJXG4gICAgaWYgKCFjb21wb25lbnQuaXNWaXNpYmxlKCkpIHtcbiAgICAgIGNvbnNvbGUuZGVidWcoYFdhaXRpbmcgdW50aWwgbGF0ZXIgdG8gcmVuZGVyIGJlY2F1c2Ugd2UncmUgaGlkZGVuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFzY3JvbGxiYXIgfHwgIXNjcm9sbFZpZXcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2Nyb2xsYmFyIG9yIHNjcm9sbFZpZXchYCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2Nyb2xsYmFyICE9PSBzY3JvbGxiYXIpIHtcbiAgICAgIGlmICh0aGlzLnNjcm9sbGJhciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnJlc2l6ZU9ic2VydmVyLnVub2JzZXJ2ZSh0aGlzLnNjcm9sbGJhcik7XG4gICAgICB9XG4gICAgICB0aGlzLnNjcm9sbGJhciA9IHNjcm9sbGJhcjtcbiAgICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzLnNjcm9sbGJhciEpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zY3JvbGxWaWV3ICE9PSBzY3JvbGxWaWV3KSB7XG4gICAgICB0aGlzLnNjcm9sbFZpZXcgPSBzY3JvbGxWaWV3O1xuICAgIH1cbiAgfVxuXG4gIHJlZHJhd0FmdGVyQ29uZmlnQ2hhbmdlKCkge1xuICAgIGlmICh0aGlzLmlzVmlzaWJsZSgpKSB7XG4gICAgICBpZiAodGhpcy5yZWRyYXdUaW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZHJhd1RpbWVvdXQpO1xuICAgICAgICB0aGlzLnJlZHJhd1RpbWVvdXQgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB0aGlzLnJlZHJhd1RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5kcmF3U2NyZWVuUmFuZ2VzKHRydWUpO1xuICAgICAgfSwgNTAwKTtcbiAgICB9XG4gIH1cblxuICBnZXRDb25maWcoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFNjb3BlZFNldHRpbmdzRm9yS2V5PFNjcm9sbEd1dHRlckNvbmZpZz4oXG4gICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5zY3JvbGxiYXJEZWNvcmF0aW9uJyxcbiAgICAgIGVkaXRvclxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcy5jb25maWc7XG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKGVudHJpZXMgPT4ge1xuICAgICAgbGV0IHsgaW50ZXJzZWN0aW9uUmVjdCB9ID0gbGFzdChlbnRyaWVzKTtcbiAgICAgIGlmIChpbnRlcnNlY3Rpb25SZWN0LndpZHRoID4gMCB8fCBpbnRlcnNlY3Rpb25SZWN0LmhlaWdodCA+IDApIHtcbiAgICAgICAgdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgodHJ1ZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyLm9ic2VydmUodGhpcyk7XG4gICAgaWYgKHRoaXMuaXNWaXNpYmxlKCkpIHtcbiAgICAgIHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKHRydWUsIHRydWUpO1xuICAgIH1cblxuICAgIGxldCBtZWFzdXJlRGltZW5zaW9ucyA9ICgpID0+IHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKGZhbHNlLCBmYWxzZSk7XG4gICAgUkVTSVpFX0RFVEVDVE9SLmxpc3RlblRvKHRoaXMsIG1lYXN1cmVEaW1lbnNpb25zKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgbWVhc3VyZURpbWVuc2lvbnMsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgIFJFU0laRV9ERVRFQ1RPUi5yZW1vdmVMaXN0ZW5lcih0aGlzLCBtZWFzdXJlRGltZW5zaW9ucyk7XG4gICAgICB9KSxcbiAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG1lYXN1cmVEaW1lbnNpb25zKTtcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aCgpO1xuICAgIHRoaXMuYXR0YWNoZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZCh0aGlzLnN1YnNjcmliZVRvTWVkaWFRdWVyeSgpKTtcbiAgfVxuXG4gIHN1YnNjcmliZVRvTWVkaWFRdWVyeSgpIHtcbiAgICBsZXQgbWVkaWFRdWVyeSA9IHdpbmRvdy5tYXRjaE1lZGlhKCdzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDEuNSknKTtcbiAgICBsZXQgbWVkaWFMaXN0ZW5lciA9ICgpID0+IHRoaXMucmVxdWVzdEZvcmNlZFVwZGF0ZSgpO1xuXG4gICAgbWVkaWFRdWVyeS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBtZWRpYUxpc3RlbmVyKTtcbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgbWVkaWFRdWVyeS5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBtZWRpYUxpc3RlbmVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGluaXRpYWxpemVDYW52YXMoKSB7XG4gICAgdGhpcy5jYW52YXMgPz89IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuY2FudmFzQ29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXG4gICAgICAnMmQnLFxuICAgICAgeyBkZXN5bmNocm9uaXplZDogZmFsc2UgfVxuICAgICk7XG5cbiAgICB0aGlzLmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcbiAgfVxuXG4gIG1lYXN1cmVIZWlnaHRBbmRXaWR0aCh2aXNpYmlsaXR5Q2hhbmdlZDogYm9vbGVhbiA9IGZhbHNlLCBmb3JjZVVwZGF0ZTogYm9vbGVhbiA9IHRydWUpIHtcbiAgICBsZXQgd2FzUmVzaXplZCA9IHRoaXMud2lkdGggIT09IHRoaXMuY2xpZW50V2lkdGggfHwgdGhpcy5oZWlnaHQgIT09IHRoaXMuY2xpZW50SGVpZ2h0O1xuXG4gICAgaWYgKCF0aGlzLnNjcm9sbGJhciB8fCAhdGhpcy5zY3JvbGxiYXIucGFyZW50Tm9kZSkge1xuICAgICAgY29uc29sZS5sb2coJ1JlYXR0YWNoaW5nIHRvIHNjcm9sbGJhciEnKTtcbiAgICAgIHRoaXMuYXR0YWNoVG9TY3JvbGxiYXIoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuc2Nyb2xsYmFyIHx8ICF0aGlzLnNjcm9sbFZpZXcpIHtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5jbGllbnRIZWlnaHQ7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy5jbGllbnRXaWR0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGJhclJlY3QgPSB0aGlzLnNjcm9sbGJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gYmFyUmVjdC5oZWlnaHQ7XG4gICAgICAvLyBJbiBzb21lIHNjZW5hcmlvcywgdGhlIHNjcm9sbGJhciBtaWdodCBoYXZlIGhlaWdodCBidXQgbm8gd2lkdGg7IGl0J3NcbiAgICAgIC8vIGhhcHBlbmVkIHRvIG1lIG9uY2UgaW4gYSB3aGlsZSwgYnV0IG5vdCBpbiBhbnkgc29ydCBvZiByZXByb2R1Y2libGVcbiAgICAgIC8vIHdheS4gV2UgY2FuIHN0aWxsIGVuZm9yY2UgYSBtaW5pbXVtIHdpZHRoIGZvciB0aGUgZ3V0dGVyIHZpZXcuXG4gICAgICAvL1xuICAgICAgLy8gVE9ETzogTWFrZSB0aGlzIGNvbmZpZ3VyYWJsZT9cbiAgICAgIHRoaXMud2lkdGggPSAgTWF0aC5tYXgoYmFyUmVjdC53aWR0aCwgTUlOSU1VTV9HVVRURVJfV0lEVEgpO1xuICAgICAgY29uc29sZS5kZWJ1Zyh0aGlzLmVkaXRvcj8uaWQsICdhY3R1YWwgc2Nyb2xsYmFyIHdpZHRoOicsIGJhclJlY3Qud2lkdGgpO1xuICAgICAgY29uc29sZS5kZWJ1Zyh0aGlzLmVkaXRvcj8uaWQsICdNZWFzdXJpbmcgd2lkdGggYW5kIGhlaWdodCBhczonLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgaWYgKHdhc1Jlc2l6ZWQgfHwgdmlzaWJpbGl0eUNoYW5nZWQgfHwgZm9yY2VVcGRhdGUpIHtcbiAgICAgIHRoaXMucmVxdWVzdEZvcmNlZFVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5pc1Zpc2libGUoKSkgcmV0dXJuO1xuICB9XG5cbiAgcmVxdWVzdEZvcmNlZFVwZGF0ZSgpIHtcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcbiAgfVxuXG4gIHJlcXVlc3RVcGRhdGUoKSB7XG4gICAgaWYgKHRoaXMuZnJhbWVSZXF1ZXN0ZWQpIHJldHVybjtcblxuICAgIHRoaXMuZnJhbWVSZXF1ZXN0ZWQgPSB0cnVlO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgdGhpcy5mcmFtZVJlcXVlc3RlZCA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIGNvbnNvbGUuZGVidWcoJ0VsZW1lbnQgdXBkYXRlIScpO1xuICAgIGlmICghdGhpcy52aXNpYmxlKSB7XG4gICAgICB0aGlzLnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgIH1cblxuICAgIHRoaXMuc3R5bGUud2lkdGggPSB0aGlzLndpZHRoID8gYCR7dGhpcy53aWR0aH1weGAgOiAnJztcbiAgICB0aGlzLnN0eWxlLmhlaWdodCA9IHRoaXMuaGVpZ2h0ID8gYCR7dGhpcy5oZWlnaHR9cHhgIDogJyc7XG5cbiAgICBsZXQgc2hvdWxkUmVkcmF3ID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMuZWRpdG9yVmlldykgcmV0dXJuO1xuICAgIGlmICh0aGlzLmVkaXRvclZpZXcub2Zmc2V0V2lkdGggIT09IHRoaXMubGFzdEVkaXRvcldpZHRoKSB7XG4gICAgICBzaG91bGRSZWRyYXcgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5lZGl0b3JWaWV3Lm9mZnNldEhlaWdodCAhPT0gdGhpcy5sYXN0RWRpdG9ySGVpZ2h0KSB7XG4gICAgICBzaG91bGRSZWRyYXcgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMubGFzdEVkaXRvcldpZHRoID0gdGhpcy5lZGl0b3JWaWV3Lm9mZnNldFdpZHRoO1xuICAgIHRoaXMubGFzdEVkaXRvckhlaWdodCA9IHRoaXMuZWRpdG9yVmlldy5vZmZzZXRIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5jYW52YXMpIHtcbiAgICAgIGlmICh0aGlzLmNhbnZhcy53aWR0aCAhPT0gdGhpcy53aWR0aCkge1xuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgICAgIHNob3VsZFJlZHJhdyA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jYW52YXMuaGVpZ2h0ICE9PSB0aGlzLmhlaWdodCkge1xuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodDtcbiAgICAgICAgc2hvdWxkUmVkcmF3ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2hvdWxkUmVkcmF3KSB7XG4gICAgICB0aGlzLmRyYXdTY3JlZW5SYW5nZXMoKTtcbiAgICB9XG4gIH1cblxuICBjbGVhclJlZmVyZW5jZXMoKSB7XG4gICAgdGhpcy5zY3JlZW5SYW5nZXMgPSBbXTtcbiAgICBpZiAoIXRoaXMuY2FudmFzIHx8ICF0aGlzLmNhbnZhc0NvbnRleHQpIHJldHVybjtcbiAgICB0aGlzLmNhbnZhc0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICB9XG5cbiAgaGlnaGxpZ2h0UmVmZXJlbmNlcyhyZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSB8IG51bGwpIHtcbiAgICBpZiAodGhpcy5nZXRFZGl0b3JIZWlnaHQoKSA8PSB0aGlzLmdldFNjcm9sbGJhckhlaWdodCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCB7IGVkaXRvciB9ID0gdGhpcztcbiAgICBpZiAoIWVkaXRvcikgcmV0dXJuO1xuXG4gICAgbGV0IHsgY29uZmlnIH0gPSB0aGlzO1xuXG4gICAgdGhpcy5jbGVhclJlZmVyZW5jZXMoKTtcblxuICAgIGlmICghcmVmZXJlbmNlcyB8fCAhY29uZmlnLmVuYWJsZSkge1xuICAgICAgdGhpcy5zZXRWaXNpYmlsaXR5KGZhbHNlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSwgcmFuZ2UgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGlmICh1cmkgIT09IHBhdGgpIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgc2NyZWVuUmFuZ2UgPSBlZGl0b3Iuc2NyZWVuUmFuZ2VGb3JCdWZmZXJSYW5nZShyYW5nZSk7XG4gICAgICBjb25zb2xlLmRlYnVnKCdCdWZmZXIgcmFuZ2UnLCByYW5nZS50b1N0cmluZygpLCAnbWFwcyB0byBzY3JlZW4gcmFuZ2UnLCBzY3JlZW5SYW5nZS50b1N0cmluZygpKTtcbiAgICAgIHRoaXMuc2NyZWVuUmFuZ2VzIS5wdXNoKHNjcmVlblJhbmdlKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldFZpc2liaWxpdHkocmVmZXJlbmNlcy5sZW5ndGggIT09IDApO1xuICAgIHRoaXMuZHJhd1NjcmVlblJhbmdlcygpO1xuICB9XG5cbiAgZHJhd1NjcmVlblJhbmdlcyhjbGVhciA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLnNjcmVlblJhbmdlcyB8fCAhdGhpcy5lZGl0b3IgfHwgIXRoaXMuY2FudmFzIHx8ICF0aGlzLmNhbnZhc0NvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY2xlYXIpIHtcbiAgICAgIHRoaXMuY2FudmFzQ29udGV4dCEuY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgIH1cblxuICAgIGxldCBsaW5lQ291bnQgPSB0aGlzLmVkaXRvci5nZXRTY3JlZW5MaW5lQ291bnQoKTtcbiAgICBmb3IgKGxldCByYW5nZSBvZiB0aGlzLnNjcmVlblJhbmdlcykge1xuICAgICAgbGV0IHJvdyA9IHJhbmdlLnN0YXJ0LnJvdztcbiAgICAgIHRoaXMuZHJhd1JlY3RGb3JFZGl0b3JSb3cocm93LCBsaW5lQ291bnQpO1xuICAgIH1cbiAgfVxuXG4gIGdldEVkaXRvckhlaWdodCgpIHtcbiAgICBpZiAoIXRoaXMuc2Nyb2xsVmlldykgcmV0dXJuIDA7XG4gICAgbGV0IGNoaWxkID0gdGhpcy5zY3JvbGxWaWV3LmZpcnN0Q2hpbGQgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLmNsaWVudEhlaWdodCA6IDA7XG4gIH1cblxuICBnZXRTY3JvbGxiYXJIZWlnaHQoKSB7XG4gICAgaWYgKCF0aGlzLnNjcm9sbGJhcikgcmV0dXJuIDA7XG4gICAgbGV0IHJlY3QgPSB0aGlzLnNjcm9sbGJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gcmVjdC5oZWlnaHQ7XG4gIH1cblxuICBkcmF3UmVjdEZvckVkaXRvclJvdyhyb3c6IG51bWJlciwgdG90YWxSb3dzOiBudW1iZXIpIHtcbiAgICBsZXQgeyBoZWlnaHQsIHdpZHRoIH0gPSB0aGlzLmNhbnZhcyE7XG4gICAgbGV0IHsgbWFya2VyQ29sb3IsIG1hcmtlck9wYWNpdHkgfSA9IHRoaXMuY29uZmlnITtcblxuICAgIGxldCBjdHggPSB0aGlzLmNhbnZhc0NvbnRleHQhO1xuICAgIGN0eC5maWxsU3R5bGUgPSBtYXJrZXJDb2xvci50b0hleFN0cmluZygpO1xuICAgIGN0eC5nbG9iYWxBbHBoYSA9IG1hcmtlck9wYWNpdHk7XG5cbiAgICBsZXQgcGl4ZWxIZWlnaHRQZXJSb3cgPSBoZWlnaHQgLyB0b3RhbFJvd3M7XG5cbiAgICBsZXQgcmVjdEhlaWdodCA9IE1hdGgubWF4KHBpeGVsSGVpZ2h0UGVyUm93LCBkZXZpY2VQaXhlbFJhdGlvKTtcbiAgICBsZXQgc3RhcnRZID0gcGl4ZWxIZWlnaHRQZXJSb3cgKiByb3c7XG4gICAgaWYgKHJlY3RIZWlnaHQgPiBkZXZpY2VQaXhlbFJhdGlvKSB7XG4gICAgICBzdGFydFkgKz0gKChwaXhlbEhlaWdodFBlclJvdyAvIDIpIC0gKGRldmljZVBpeGVsUmF0aW8gLyAyKSk7XG4gICAgfVxuXG4gICAgY3R4LmZpbGxSZWN0KDAsIHN0YXJ0WSwgd2lkdGgsIGRldmljZVBpeGVsUmF0aW8pO1xuICB9XG5cbiAgc2V0VmlzaWJpbGl0eShzaG91bGRCZVZpc2libGU6IGJvb2xlYW4pIHtcbiAgICBjb25zb2xlLmxvZygnc2V0VmlzaWJpbGl0eScsIHNob3VsZEJlVmlzaWJsZSk7XG4gICAgbGV0IHNob3VsZFVwZGF0ZSA9IHNob3VsZEJlVmlzaWJsZSA9PT0gdGhpcy52aXNpYmxlO1xuICAgIGlmIChzaG91bGRVcGRhdGUpIHtcbiAgICAgIHRoaXMudmlzaWJsZSA9IHNob3VsZEJlVmlzaWJsZTtcbiAgICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5pc1Zpc2libGUoKSkge1xuICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCBzYW5pdHkgY2hlY2shIFJlY29tcHV0aW5nIGRpbWVuc2lvbnPigKYnKTtcbiAgICAgIHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKCk7XG4gICAgfVxuXG4gICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFxuICAgICAgJ3Zpc2liaWxpdHktY2hhbmdlZCcsXG4gICAgICB7XG4gICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIHZpc2libGU6IHNob3VsZEJlVmlzaWJsZSxcbiAgICAgICAgICBlZGl0b3I6IHRoaXMuZWRpdG9yXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICAgIGNvbnNvbGUud2FybignZmlyaW5nIGV2ZW50IScpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cblxuICBpc1Zpc2libGUoKSB7XG4gICAgcmV0dXJuIHRoaXMub2Zmc2V0V2lkdGggPiAwICYmIHRoaXMub2Zmc2V0SGVpZ2h0ID4gMDtcbiAgfVxuXG4gIC8vIFVUSUxcblxuICBxdWVyeVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIGxldCBwYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmICghcGFyZW50KSByZXR1cm4gbnVsbDtcbiAgICAgIGlmICgocGFyZW50IGFzIEhUTUxFbGVtZW50KS5tYXRjaGVzKHNlbGVjdG9yKSlcbiAgICAgICAgcmV0dXJuIChwYXJlbnQgYXMgSFRNTEVsZW1lbnQpO1xuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudE5vZGU7XG4gICAgfVxuICB9XG5cbiAgZ2V0U2NvcGVkU2V0dGluZ3NGb3JLZXk8VD4oa2V5OiBzdHJpbmcsIGVkaXRvcjogVGV4dEVkaXRvcik6IFQge1xuICAgIGxldCBzY2hlbWEgPSBhdG9tLmNvbmZpZy5nZXRTY2hlbWEoa2V5KSBhcyB7IHR5cGU6IHN0cmluZyB9O1xuICAgIGlmICghc2NoZW1hKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gY29uZmlnIGtleTogJHtzY2hlbWF9YCk7XG4gICAgfVxuXG4gICAgbGV0IGdyYW1tYXIgPSBlZGl0b3IuZ2V0R3JhbW1hcigpO1xuICAgIGxldCBiYXNlID0gYXRvbS5jb25maWcuZ2V0KGtleSk7XG4gICAgbGV0IHNjb3BlZCA9IGF0b20uY29uZmlnLmdldChrZXksIHsgc2NvcGU6IFtncmFtbWFyLnNjb3BlTmFtZV0gfSk7XG5cbiAgICBpZiAoc2NoZW1hPy50eXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHsgLi4uYmFzZSwgLi4uc2NvcGVkIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY29wZWQgPz8gYmFzZTtcbiAgICB9XG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFRBR19OQU1FLCBTY3JvbGxHdXR0ZXIpO1xuIl19