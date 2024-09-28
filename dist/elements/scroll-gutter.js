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
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const console = __importStar(require("../console"));
const MINIMUM_GUTTER_WIDTH = 15;
const TAG_NAME = 'pulsar-find-references-scroll-gutter';
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
        (_a = this.resizeObserver) !== null && _a !== void 0 ? _a : (this.resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target === this.scrollbar) {
                    this.measureHeightAndWidth(false, true);
                }
                else if (entry.target === this) {
                    this.measureHeightAndWidth(false, false);
                }
            }
        }));
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
        this.resizeObserver.observe(this);
        window.addEventListener('resize', measureDimensions, { passive: true });
        this.subscriptions.add(new atom_1.Disposable(() => {
            this.resizeObserver.unobserve(this);
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
            console.debug('Reattaching to scrollbar');
            try {
                this.attachToScrollbar();
            }
            catch (err) {
                console.debug('Error when attaching; bailing early');
                // Error thrown; the environment is probably reloading, so let's just
                // give up early.
                return;
            }
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
        console.debug('Scroll gutter update');
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
            console.debug('Failed sanity check; recomputing dimensions…');
            this.measureHeightAndWidth();
        }
        let event = new CustomEvent('visibility-changed', {
            bubbles: true,
            detail: {
                visible: shouldBeVisible,
                editor: this.editor
            }
        });
        console.debug('Firing visibility-changed event:', event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsLWd1dHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFRYztBQUVkLG9EQUFzQztBQUV0QyxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQztBQUNoQyxNQUFNLFFBQVEsR0FBRyxzQ0FBc0MsQ0FBQztBQUV4RCxTQUFTLElBQUksQ0FBSSxJQUFjO0lBQzdCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQVVELE1BQXFCLFlBQWEsU0FBUSxXQUFXO0lBaUNuRDs7UUFDRSxLQUFLLEVBQUUsQ0FBQztRQWpDSCxhQUFRLEdBQVksS0FBSyxDQUFDO1FBRTFCLFdBQU0sR0FBc0IsSUFBSSxDQUFDO1FBQ2hDLGVBQVUsR0FBNkIsSUFBSSxDQUFDO1FBQzVDLGNBQVMsR0FBdUIsSUFBSSxDQUFDO1FBQ3JDLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBRXRDLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBQzVCLHFCQUFnQixHQUFXLENBQUMsQ0FBQztRQUU3QixpQkFBWSxHQUFtQixJQUFJLENBQUM7UUFFcEMsa0JBQWEsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBR2hFLFdBQU0sR0FBVyxDQUFDLENBQUM7UUFDbkIsVUFBSyxHQUFXLENBQUMsQ0FBQztRQUdqQixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUl4QyxlQUFlO1FBRVAsV0FBTSxHQUE2QixJQUFJLENBQUM7UUFDeEMsa0JBQWEsR0FBb0MsSUFBSSxDQUFDO1FBQ3RELFlBQU8sR0FBWSxJQUFJLENBQUM7UUFDeEIsWUFBTyxHQUFZLEtBQUssQ0FBQztRQU0vQixNQUFBLElBQUksQ0FBQyxjQUFjLG9DQUFuQixJQUFJLENBQUMsY0FBYyxHQUFLLElBQUks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QixDQUFJLEdBQVcsRUFBRSxNQUFrQjtRQUN4RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQXFCLENBQUM7UUFDNUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBRUQsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxJQUFJLE1BQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsdUNBQVksSUFBSSxHQUFLLE1BQU0sRUFBRztRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sTUFBTSxhQUFOLE1BQU0sY0FBTixNQUFNLEdBQUksSUFBSSxDQUFDO1FBQ3hCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUExYUQsK0JBMGFDO0FBRUQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb2xvcixcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcG9zYWJsZSxcbiAgUmFuZ2UsXG4gIFRleHRFZGl0b3IsXG4gIFRleHRFZGl0b3JFbGVtZW50LFxuICBUZXh0RWRpdG9yQ29tcG9uZW50LFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4uL2NvbnNvbGUnO1xuXG5jb25zdCBNSU5JTVVNX0dVVFRFUl9XSURUSCA9IDE1O1xuY29uc3QgVEFHX05BTUUgPSAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1zY3JvbGwtZ3V0dGVyJztcblxuZnVuY3Rpb24gbGFzdDxUPihsaXN0OiBBcnJheTxUPikge1xuICByZXR1cm4gbGlzdFtsaXN0Lmxlbmd0aCAtIDFdO1xufVxuXG50eXBlIFNjcm9sbEd1dHRlckNvbmZpZyA9IHtcbiAgZW5hYmxlOiBib29sZWFuLFxuICBtYXJrZXJDb2xvcjogQ29sb3IsXG4gIG1hcmtlck9wYWNpdHk6IG51bWJlclxufTtcblxuZXhwb3J0IHR5cGUgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50ID0gQ3VzdG9tRXZlbnQ8eyB2aXNpYmxlOiBib29sZWFuLCBlZGl0b3I6IFRleHRFZGl0b3IgfT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcm9sbEd1dHRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcHVibGljIGF0dGFjaGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHVibGljIGVkaXRvcjogVGV4dEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGVkaXRvclZpZXc6IFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc2Nyb2xsYmFyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNjcm9sbFZpZXc6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBsYXN0RWRpdG9yV2lkdGg6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgbGFzdEVkaXRvckhlaWdodDogbnVtYmVyID0gMDtcblxuICBwcml2YXRlIHNjcmVlblJhbmdlczogUmFuZ2VbXSB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gIHByaXZhdGUgaW50ZXJzZWN0aW9uT2JzZXJ2ZXI/OiBJbnRlcnNlY3Rpb25PYnNlcnZlcjtcblxuICBwdWJsaWMgaGVpZ2h0OiBudW1iZXIgPSAwO1xuICBwdWJsaWMgd2lkdGg6IG51bWJlciA9IDA7XG5cbiAgcHJpdmF0ZSByZXNpemVPYnNlcnZlcjogUmVzaXplT2JzZXJ2ZXI7XG4gIHByaXZhdGUgZnJhbWVSZXF1ZXN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIGNvbmZpZyE6IFNjcm9sbEd1dHRlckNvbmZpZztcblxuICAvLyBDQU5WQVMgU1RVRkZcblxuICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjYW52YXNDb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB2aXNpYmxlOiBib29sZWFuID0gdHJ1ZTtcbiAgcHJpdmF0ZSBjcmVhdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSByZWRyYXdUaW1lb3V0PzogTm9kZUpTLlRpbWVvdXQ7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyID8/PSBuZXcgUmVzaXplT2JzZXJ2ZXIoKGVudHJpZXMpID0+IHtcbiAgICAgIGZvciAobGV0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgaWYgKGVudHJ5LnRhcmdldCA9PT0gdGhpcy5zY3JvbGxiYXIpIHtcbiAgICAgICAgICB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aChmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnkudGFyZ2V0ID09PSB0aGlzKSB7XG4gICAgICAgICAgdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgoZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0aGlzLmNyZWF0ZWQpIHJldHVybjtcbiAgICB0aGlzLmluaXRpYWxpemVDYW52YXMoKTtcbiAgICB0aGlzLmNyZWF0ZWQgPSB0cnVlO1xuICB9XG5cbiAgYXR0YWNoVG9FZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgY29uc29sZS5kZWJ1ZygnQXR0YWNoaW5nIHRvIGVkaXRvcjonLCBlZGl0b3IpO1xuICAgIGlmICh0aGlzLmF0dGFjaGVkICYmIHRoaXMuZWRpdG9yID09PSBlZGl0b3IpIHJldHVybjtcblxuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IGF0b20udmlld3MuZ2V0VmlldyhlZGl0b3IpO1xuXG4gICAgdGhpcy5nZXRDb25maWcoZWRpdG9yKTtcblxuICAgIHRoaXMuYXR0YWNoVG9TY3JvbGxiYXIoKTtcblxuICAgIGxldCBwYXJlbnQgPSB0aGlzLnNjcm9sbGJhciEucGFyZW50Tm9kZTtcbiAgICBpZiAoIXBhcmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBub2RlIHRvIGF0dGFjaCB0byFgKTtcbiAgICB9XG5cbiAgICBsZXQgZ3JhbW1hciA9IGVkaXRvci5nZXRHcmFtbWFyKCk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgLy8gUmVkcmF3IHRoZSBndXR0ZXJzIHdoZW4gdGhlIGdyYW1tYXIgY2hhbmdlcyDigJQgYSBuZXcgcm9vdCBzY29wZSBtaWdodFxuICAgICAgLy8gbWVhbiBuZXcgY29uZmlnIHZhbHVlcy5cbiAgICAgIGVkaXRvci5vbkRpZENoYW5nZUdyYW1tYXIoKCkgPT4ge1xuICAgICAgICB0aGlzLmdldENvbmZpZyhlZGl0b3IpO1xuICAgICAgICB0aGlzLnJlZHJhd0FmdGVyQ29uZmlnQ2hhbmdlKCk7XG4gICAgICB9KSxcbiAgICAgIC8vIFJlZHJhdyB0aGUgZ3V0dGVycyB3aGVuIHRoZSBjb25maWcgY2hhbmdlcy5cbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnNjcm9sbGJhckRlY29yYXRpb24nLFxuICAgICAgICB7IHNjb3BlOiBbZ3JhbW1hci5zY29wZU5hbWVdIH0sXG4gICAgICAgIF8gPT4ge1xuICAgICAgICAgIHRoaXMuZ2V0Q29uZmlnKGVkaXRvcik7XG4gICAgICAgICAgdGhpcy5yZWRyYXdBZnRlckNvbmZpZ0NoYW5nZSgpO1xuICAgICAgICB9XG4gICAgICApLFxuICAgICk7XG5cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQodGhpcyk7XG4gIH1cblxuICBhdHRhY2hUb1Njcm9sbGJhcigpIHtcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yIFByaXZhdGUgQVBJXG4gICAgbGV0IGNvbXBvbmVudDogVGV4dEVkaXRvckNvbXBvbmVudCA9IHRoaXMuZWRpdG9yLmNvbXBvbmVudDtcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yIFByaXZhdGUgQVBJXG4gICAgbGV0IHNjcm9sbFZpZXcgPSBjb21wb25lbnQucmVmcy5zY3JvbGxDb250YWluZXI7XG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciBQcml2YXRlIEFQSVxuICAgIGxldCBzY3JvbGxiYXIgPSBjb21wb25lbnQucmVmcy52ZXJ0aWNhbFNjcm9sbGJhcj8uZWxlbWVudDtcblxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgUHJpdmF0ZSBBUElcbiAgICBpZiAoIWNvbXBvbmVudC5pc1Zpc2libGUoKSkge1xuICAgICAgY29uc29sZS5kZWJ1ZyhgV2FpdGluZyB1bnRpbCBsYXRlciB0byByZW5kZXIgYmVjYXVzZSB3ZSdyZSBoaWRkZW5gKTtcbiAgICB9XG5cbiAgICBpZiAoIXNjcm9sbGJhciB8fCAhc2Nyb2xsVmlldykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzY3JvbGxiYXIgb3Igc2Nyb2xsVmlldyFgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JvbGxiYXIgIT09IHNjcm9sbGJhcikge1xuICAgICAgaWYgKHRoaXMuc2Nyb2xsYmFyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIudW5vYnNlcnZlKHRoaXMuc2Nyb2xsYmFyKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2Nyb2xsYmFyID0gc2Nyb2xsYmFyO1xuICAgICAgdGhpcy5yZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMuc2Nyb2xsYmFyISk7XG4gICAgfVxuICAgIGlmICh0aGlzLnNjcm9sbFZpZXcgIT09IHNjcm9sbFZpZXcpIHtcbiAgICAgIHRoaXMuc2Nyb2xsVmlldyA9IHNjcm9sbFZpZXc7XG4gICAgfVxuICB9XG5cbiAgcmVkcmF3QWZ0ZXJDb25maWdDaGFuZ2UoKSB7XG4gICAgaWYgKHRoaXMuaXNWaXNpYmxlKCkpIHtcbiAgICAgIGlmICh0aGlzLnJlZHJhd1RpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVkcmF3VGltZW91dCk7XG4gICAgICAgIHRoaXMucmVkcmF3VGltZW91dCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVkcmF3VGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmRyYXdTY3JlZW5SYW5nZXModHJ1ZSk7XG4gICAgICB9LCA1MDApO1xuICAgIH1cbiAgfVxuXG4gIGdldENvbmZpZyhlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICB0aGlzLmNvbmZpZyA9IHRoaXMuZ2V0U2NvcGVkU2V0dGluZ3NGb3JLZXk8U2Nyb2xsR3V0dGVyQ29uZmlnPihcbiAgICAgICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnNjcm9sbGJhckRlY29yYXRpb24nLFxuICAgICAgZWRpdG9yXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmNvbmZpZztcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMuaW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoZW50cmllcyA9PiB7XG4gICAgICBsZXQgeyBpbnRlcnNlY3Rpb25SZWN0IH0gPSBsYXN0KGVudHJpZXMpO1xuICAgICAgaWYgKGludGVyc2VjdGlvblJlY3Qud2lkdGggPiAwIHx8IGludGVyc2VjdGlvblJlY3QuaGVpZ2h0ID4gMCkge1xuICAgICAgICB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aCh0cnVlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuaW50ZXJzZWN0aW9uT2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzKTtcbiAgICBpZiAodGhpcy5pc1Zpc2libGUoKSkge1xuICAgICAgdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgodHJ1ZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgbGV0IG1lYXN1cmVEaW1lbnNpb25zID0gKCkgPT4gdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgoZmFsc2UsIGZhbHNlKTtcblxuICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgbWVhc3VyZURpbWVuc2lvbnMsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIudW5vYnNlcnZlKHRoaXMpO1xuICAgICAgfSksXG4gICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBtZWFzdXJlRGltZW5zaW9ucyk7XG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgoKTtcbiAgICB0aGlzLmF0dGFjaGVkID0gdHJ1ZTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQodGhpcy5zdWJzY3JpYmVUb01lZGlhUXVlcnkoKSk7XG4gIH1cblxuICBzdWJzY3JpYmVUb01lZGlhUXVlcnkoKSB7XG4gICAgbGV0IG1lZGlhUXVlcnkgPSB3aW5kb3cubWF0Y2hNZWRpYSgnc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAxLjUpJyk7XG4gICAgbGV0IG1lZGlhTGlzdGVuZXIgPSAoKSA9PiB0aGlzLnJlcXVlc3RGb3JjZWRVcGRhdGUoKTtcblxuICAgIG1lZGlhUXVlcnkuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgbWVkaWFMaXN0ZW5lcik7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIG1lZGlhUXVlcnkucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgbWVkaWFMaXN0ZW5lcik7XG4gICAgfSk7XG4gIH1cblxuICBpbml0aWFsaXplQ2FudmFzKCkge1xuICAgIHRoaXMuY2FudmFzID8/PSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLmNhbnZhc0NvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFxuICAgICAgJzJkJyxcbiAgICAgIHsgZGVzeW5jaHJvbml6ZWQ6IGZhbHNlIH1cbiAgICApO1xuXG4gICAgdGhpcy5hcHBlbmRDaGlsZCh0aGlzLmNhbnZhcyk7XG4gIH1cblxuICBtZWFzdXJlSGVpZ2h0QW5kV2lkdGgodmlzaWJpbGl0eUNoYW5nZWQ6IGJvb2xlYW4gPSBmYWxzZSwgZm9yY2VVcGRhdGU6IGJvb2xlYW4gPSB0cnVlKSB7XG4gICAgbGV0IHdhc1Jlc2l6ZWQgPSB0aGlzLndpZHRoICE9PSB0aGlzLmNsaWVudFdpZHRoIHx8IHRoaXMuaGVpZ2h0ICE9PSB0aGlzLmNsaWVudEhlaWdodDtcblxuICAgIGlmICghdGhpcy5zY3JvbGxiYXIgfHwgIXRoaXMuc2Nyb2xsYmFyLnBhcmVudE5vZGUpIHtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ1JlYXR0YWNoaW5nIHRvIHNjcm9sbGJhcicpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5hdHRhY2hUb1Njcm9sbGJhcigpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ0Vycm9yIHdoZW4gYXR0YWNoaW5nOyBiYWlsaW5nIGVhcmx5Jyk7XG4gICAgICAgIC8vIEVycm9yIHRocm93bjsgdGhlIGVudmlyb25tZW50IGlzIHByb2JhYmx5IHJlbG9hZGluZywgc28gbGV0J3MganVzdFxuICAgICAgICAvLyBnaXZlIHVwIGVhcmx5LlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNjcm9sbGJhciB8fCAhdGhpcy5zY3JvbGxWaWV3KSB7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMuY2xpZW50SGVpZ2h0O1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMuY2xpZW50V2lkdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBiYXJSZWN0ID0gdGhpcy5zY3JvbGxiYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB0aGlzLmhlaWdodCA9IGJhclJlY3QuaGVpZ2h0O1xuICAgICAgLy8gSW4gc29tZSBzY2VuYXJpb3MsIHRoZSBzY3JvbGxiYXIgbWlnaHQgaGF2ZSBoZWlnaHQgYnV0IG5vIHdpZHRoOyBpdCdzXG4gICAgICAvLyBoYXBwZW5lZCB0byBtZSBvbmNlIGluIGEgd2hpbGUsIGJ1dCBub3QgaW4gYW55IHNvcnQgb2YgcmVwcm9kdWNpYmxlXG4gICAgICAvLyB3YXkuIFdlIGNhbiBzdGlsbCBlbmZvcmNlIGEgbWluaW11bSB3aWR0aCBmb3IgdGhlIGd1dHRlciB2aWV3LlxuICAgICAgLy9cbiAgICAgIC8vIFRPRE86IE1ha2UgdGhpcyBjb25maWd1cmFibGU/XG4gICAgICB0aGlzLndpZHRoID0gTWF0aC5tYXgoYmFyUmVjdC53aWR0aCwgTUlOSU1VTV9HVVRURVJfV0lEVEgpO1xuICAgICAgY29uc29sZS5kZWJ1Zyh0aGlzLmVkaXRvcj8uaWQsICdhY3R1YWwgc2Nyb2xsYmFyIHdpZHRoOicsIGJhclJlY3Qud2lkdGgpO1xuICAgICAgY29uc29sZS5kZWJ1Zyh0aGlzLmVkaXRvcj8uaWQsICdNZWFzdXJpbmcgd2lkdGggYW5kIGhlaWdodCBhczonLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgaWYgKHdhc1Jlc2l6ZWQgfHwgdmlzaWJpbGl0eUNoYW5nZWQgfHwgZm9yY2VVcGRhdGUpIHtcbiAgICAgIHRoaXMucmVxdWVzdEZvcmNlZFVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5pc1Zpc2libGUoKSkgcmV0dXJuO1xuICB9XG5cbiAgcmVxdWVzdEZvcmNlZFVwZGF0ZSgpIHtcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcbiAgfVxuXG4gIHJlcXVlc3RVcGRhdGUoKSB7XG4gICAgaWYgKHRoaXMuZnJhbWVSZXF1ZXN0ZWQpIHJldHVybjtcblxuICAgIHRoaXMuZnJhbWVSZXF1ZXN0ZWQgPSB0cnVlO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgdGhpcy5mcmFtZVJlcXVlc3RlZCA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIGNvbnNvbGUuZGVidWcoJ1Njcm9sbCBndXR0ZXIgdXBkYXRlJyk7XG4gICAgaWYgKCF0aGlzLnZpc2libGUpIHtcbiAgICAgIHRoaXMuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfVxuXG4gICAgdGhpcy5zdHlsZS53aWR0aCA9IHRoaXMud2lkdGggPyBgJHt0aGlzLndpZHRofXB4YCA6ICcnO1xuICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPyBgJHt0aGlzLmhlaWdodH1weGAgOiAnJztcblxuICAgIGxldCBzaG91bGRSZWRyYXcgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5lZGl0b3JWaWV3KSByZXR1cm47XG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5vZmZzZXRXaWR0aCAhPT0gdGhpcy5sYXN0RWRpdG9yV2lkdGgpIHtcbiAgICAgIHNob3VsZFJlZHJhdyA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmVkaXRvclZpZXcub2Zmc2V0SGVpZ2h0ICE9PSB0aGlzLmxhc3RFZGl0b3JIZWlnaHQpIHtcbiAgICAgIHNob3VsZFJlZHJhdyA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5sYXN0RWRpdG9yV2lkdGggPSB0aGlzLmVkaXRvclZpZXcub2Zmc2V0V2lkdGg7XG4gICAgdGhpcy5sYXN0RWRpdG9ySGVpZ2h0ID0gdGhpcy5lZGl0b3JWaWV3Lm9mZnNldEhlaWdodDtcblxuICAgIGlmICh0aGlzLmNhbnZhcykge1xuICAgICAgaWYgKHRoaXMuY2FudmFzLndpZHRoICE9PSB0aGlzLndpZHRoKSB7XG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aDtcbiAgICAgICAgc2hvdWxkUmVkcmF3ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmNhbnZhcy5oZWlnaHQgIT09IHRoaXMuaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICBzaG91bGRSZWRyYXcgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaG91bGRSZWRyYXcpIHtcbiAgICAgIHRoaXMuZHJhd1NjcmVlblJhbmdlcygpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyUmVmZXJlbmNlcygpIHtcbiAgICB0aGlzLnNjcmVlblJhbmdlcyA9IFtdO1xuICAgIGlmICghdGhpcy5jYW52YXMgfHwgIXRoaXMuY2FudmFzQ29udGV4dCkgcmV0dXJuO1xuICAgIHRoaXMuY2FudmFzQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gIH1cblxuICBoaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCkge1xuICAgIGlmICh0aGlzLmdldEVkaXRvckhlaWdodCgpIDw9IHRoaXMuZ2V0U2Nyb2xsYmFySGVpZ2h0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IHsgZWRpdG9yIH0gPSB0aGlzO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICBsZXQgeyBjb25maWcgfSA9IHRoaXM7XG5cbiAgICB0aGlzLmNsZWFyUmVmZXJlbmNlcygpO1xuXG4gICAgaWYgKCFyZWZlcmVuY2VzIHx8ICFjb25maWcuZW5hYmxlKSB7XG4gICAgICB0aGlzLnNldFZpc2liaWxpdHkoZmFsc2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHsgdXJpLCByYW5nZSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKHVyaSAhPT0gcGF0aCkgY29udGludWU7XG5cbiAgICAgIGxldCBzY3JlZW5SYW5nZSA9IGVkaXRvci5zY3JlZW5SYW5nZUZvckJ1ZmZlclJhbmdlKHJhbmdlKTtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ0J1ZmZlciByYW5nZScsIHJhbmdlLnRvU3RyaW5nKCksICdtYXBzIHRvIHNjcmVlbiByYW5nZScsIHNjcmVlblJhbmdlLnRvU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zY3JlZW5SYW5nZXMhLnB1c2goc2NyZWVuUmFuZ2UpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VmlzaWJpbGl0eShyZWZlcmVuY2VzLmxlbmd0aCAhPT0gMCk7XG4gICAgdGhpcy5kcmF3U2NyZWVuUmFuZ2VzKCk7XG4gIH1cblxuICBkcmF3U2NyZWVuUmFuZ2VzKGNsZWFyID0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMuc2NyZWVuUmFuZ2VzIHx8ICF0aGlzLmVkaXRvciB8fCAhdGhpcy5jYW52YXMgfHwgIXRoaXMuY2FudmFzQ29udGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChjbGVhcikge1xuICAgICAgdGhpcy5jYW52YXNDb250ZXh0IS5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgbGV0IGxpbmVDb3VudCA9IHRoaXMuZWRpdG9yLmdldFNjcmVlbkxpbmVDb3VudCgpO1xuICAgIGZvciAobGV0IHJhbmdlIG9mIHRoaXMuc2NyZWVuUmFuZ2VzKSB7XG4gICAgICBsZXQgcm93ID0gcmFuZ2Uuc3RhcnQucm93O1xuICAgICAgdGhpcy5kcmF3UmVjdEZvckVkaXRvclJvdyhyb3csIGxpbmVDb3VudCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RWRpdG9ySGVpZ2h0KCkge1xuICAgIGlmICghdGhpcy5zY3JvbGxWaWV3KSByZXR1cm4gMDtcbiAgICBsZXQgY2hpbGQgPSB0aGlzLnNjcm9sbFZpZXcuZmlyc3RDaGlsZCBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuY2xpZW50SGVpZ2h0IDogMDtcbiAgfVxuXG4gIGdldFNjcm9sbGJhckhlaWdodCgpIHtcbiAgICBpZiAoIXRoaXMuc2Nyb2xsYmFyKSByZXR1cm4gMDtcbiAgICBsZXQgcmVjdCA9IHRoaXMuc2Nyb2xsYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiByZWN0LmhlaWdodDtcbiAgfVxuXG4gIGRyYXdSZWN0Rm9yRWRpdG9yUm93KHJvdzogbnVtYmVyLCB0b3RhbFJvd3M6IG51bWJlcikge1xuICAgIGxldCB7IGhlaWdodCwgd2lkdGggfSA9IHRoaXMuY2FudmFzITtcbiAgICBsZXQgeyBtYXJrZXJDb2xvciwgbWFya2VyT3BhY2l0eSB9ID0gdGhpcy5jb25maWchO1xuXG4gICAgbGV0IGN0eCA9IHRoaXMuY2FudmFzQ29udGV4dCE7XG4gICAgY3R4LmZpbGxTdHlsZSA9IG1hcmtlckNvbG9yLnRvSGV4U3RyaW5nKCk7XG4gICAgY3R4Lmdsb2JhbEFscGhhID0gbWFya2VyT3BhY2l0eTtcblxuICAgIGxldCBwaXhlbEhlaWdodFBlclJvdyA9IGhlaWdodCAvIHRvdGFsUm93cztcblxuICAgIGxldCByZWN0SGVpZ2h0ID0gTWF0aC5tYXgocGl4ZWxIZWlnaHRQZXJSb3csIGRldmljZVBpeGVsUmF0aW8pO1xuICAgIGxldCBzdGFydFkgPSBwaXhlbEhlaWdodFBlclJvdyAqIHJvdztcbiAgICBpZiAocmVjdEhlaWdodCA+IGRldmljZVBpeGVsUmF0aW8pIHtcbiAgICAgIHN0YXJ0WSArPSAoKHBpeGVsSGVpZ2h0UGVyUm93IC8gMikgLSAoZGV2aWNlUGl4ZWxSYXRpbyAvIDIpKTtcbiAgICB9XG5cbiAgICBjdHguZmlsbFJlY3QoMCwgc3RhcnRZLCB3aWR0aCwgZGV2aWNlUGl4ZWxSYXRpbyk7XG4gIH1cblxuICBzZXRWaXNpYmlsaXR5KHNob3VsZEJlVmlzaWJsZTogYm9vbGVhbikge1xuICAgIGNvbnNvbGUubG9nKCdzZXRWaXNpYmlsaXR5Jywgc2hvdWxkQmVWaXNpYmxlKTtcbiAgICBsZXQgc2hvdWxkVXBkYXRlID0gc2hvdWxkQmVWaXNpYmxlID09PSB0aGlzLnZpc2libGU7XG4gICAgaWYgKHNob3VsZFVwZGF0ZSkge1xuICAgICAgdGhpcy52aXNpYmxlID0gc2hvdWxkQmVWaXNpYmxlO1xuICAgICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmlzVmlzaWJsZSgpKSB7XG4gICAgICBjb25zb2xlLmRlYnVnKCdGYWlsZWQgc2FuaXR5IGNoZWNrOyByZWNvbXB1dGluZyBkaW1lbnNpb25z4oCmJyk7XG4gICAgICB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aCgpO1xuICAgIH1cblxuICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudChcbiAgICAgICd2aXNpYmlsaXR5LWNoYW5nZWQnLFxuICAgICAge1xuICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICB2aXNpYmxlOiBzaG91bGRCZVZpc2libGUsXG4gICAgICAgICAgZWRpdG9yOiB0aGlzLmVkaXRvclxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcbiAgICBjb25zb2xlLmRlYnVnKCdGaXJpbmcgdmlzaWJpbGl0eS1jaGFuZ2VkIGV2ZW50OicsIGV2ZW50KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgaXNWaXNpYmxlKCkge1xuICAgIHJldHVybiB0aGlzLm9mZnNldFdpZHRoID4gMCAmJiB0aGlzLm9mZnNldEhlaWdodCA+IDA7XG4gIH1cblxuICAvLyBVVElMXG5cbiAgcXVlcnlQYXJlbnRTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgICBsZXQgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoIXBhcmVudCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAoKHBhcmVudCBhcyBIVE1MRWxlbWVudCkubWF0Y2hlcyhzZWxlY3RvcikpXG4gICAgICAgIHJldHVybiAocGFyZW50IGFzIEhUTUxFbGVtZW50KTtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuICAgIH1cbiAgfVxuXG4gIGdldFNjb3BlZFNldHRpbmdzRm9yS2V5PFQ+KGtleTogc3RyaW5nLCBlZGl0b3I6IFRleHRFZGl0b3IpOiBUIHtcbiAgICBsZXQgc2NoZW1hID0gYXRvbS5jb25maWcuZ2V0U2NoZW1hKGtleSkgYXMgeyB0eXBlOiBzdHJpbmcgfTtcbiAgICBpZiAoIXNjaGVtYSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGNvbmZpZyBrZXk6ICR7c2NoZW1hfWApO1xuICAgIH1cblxuICAgIGxldCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcbiAgICBsZXQgYmFzZSA9IGF0b20uY29uZmlnLmdldChrZXkpO1xuICAgIGxldCBzY29wZWQgPSBhdG9tLmNvbmZpZy5nZXQoa2V5LCB7IHNjb3BlOiBbZ3JhbW1hci5zY29wZU5hbWVdIH0pO1xuXG4gICAgaWYgKHNjaGVtYT8udHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiB7IC4uLmJhc2UsIC4uLnNjb3BlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NvcGVkID8/IGJhc2U7XG4gICAgfVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShUQUdfTkFNRSwgU2Nyb2xsR3V0dGVyKTtcbiJdfQ==