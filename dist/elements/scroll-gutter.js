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
const TAG_NAME = 'pulsar-find-references-scroll-gutter';
const RESIZE_DETECTOR = (0, element_resize_detector_1.default)({ strategy: 'scroll' });
function last(list) {
    return list[list.length - 1];
}
class ScrollGutter extends HTMLElement {
    constructor() {
        var _a;
        super();
        // public enabled: boolean = true;
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
        console.log('attaching to editor:', editor);
        if (this.attached && this.editor === editor)
            return;
        this.editor = editor;
        this.getConfig(editor);
        let container = atom.views.getView(editor);
        let scrollView = container.querySelector('.scroll-view');
        let scrollbar = container.querySelector('.scroll-view .vertical-scrollbar');
        if (!scrollbar || !scrollView) {
            throw new Error(`No scrollbar or scroll-view!`);
        }
        this.scrollView = scrollView;
        this.scrollbar = scrollbar;
        this.resizeObserver.observe(this.scrollbar);
        let parent = scrollbar.parentNode;
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
        this.editorView = this.queryParentSelector('atom-text-editor');
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
        let wasResized = this.width !== this.clientWidth || this.height !== this.clientHeight;
        if (!this.scrollbar || !this.scrollView) {
            this.height = this.clientHeight;
            this.width = this.clientWidth;
        }
        else {
            let barRect = this.scrollbar.getBoundingClientRect();
            this.height = barRect.height;
            this.width = barRect.width;
            console.debug('Measuring width and height as:', this.width, this.height);
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
        return this.offsetWidth > 0 || this.offsetHeight > 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsLWd1dHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFPYztBQUNkLHNGQUFtRTtBQUVuRSxvREFBc0M7QUFFdEMsTUFBTSxRQUFRLEdBQUcsc0NBQXNDLENBQUM7QUFFeEQsTUFBTSxlQUFlLEdBQUcsSUFBQSxpQ0FBNEIsRUFBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBRTdFLFNBQVMsSUFBSSxDQUFJLElBQWM7SUFDN0IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBVUQsTUFBcUIsWUFBYSxTQUFRLFdBQVc7SUFrQ25EOztRQUNFLEtBQUssRUFBRSxDQUFDO1FBbENWLGtDQUFrQztRQUMzQixhQUFRLEdBQVksS0FBSyxDQUFDO1FBRTFCLFdBQU0sR0FBc0IsSUFBSSxDQUFDO1FBQ2hDLGVBQVUsR0FBNkIsSUFBSSxDQUFDO1FBQzVDLGNBQVMsR0FBdUIsSUFBSSxDQUFDO1FBQ3JDLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBRXRDLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBQzVCLHFCQUFnQixHQUFXLENBQUMsQ0FBQztRQUU3QixpQkFBWSxHQUFtQixJQUFJLENBQUM7UUFFcEMsa0JBQWEsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBR2hFLFdBQU0sR0FBVyxDQUFDLENBQUM7UUFDbkIsVUFBSyxHQUFXLENBQUMsQ0FBQztRQUdqQixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUl4QyxlQUFlO1FBRVAsV0FBTSxHQUE2QixJQUFJLENBQUM7UUFDeEMsa0JBQWEsR0FBb0MsSUFBSSxDQUFDO1FBQ3RELFlBQU8sR0FBWSxJQUFJLENBQUM7UUFDeEIsWUFBTyxHQUFZ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TUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLElBQUksTUFBSyxRQUFRLEVBQUUsQ0FBQztZQUM5Qix1Q0FBWSxJQUFJLEdBQUssTUFBTSxFQUFHO1FBQ2hDLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxNQUFNLGFBQU4sTUFBTSxjQUFOLE1BQU0sR0FBSSxJQUFJLENBQUM7UUFDeEIsQ0FBQztJQUNILENBQUM7Q0FDRjtBQXJYRCwrQkFxWEM7QUFFRCxjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbG9yLFxuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBEaXNwb3NhYmxlLFxuICBSYW5nZSxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnRcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgZWxlbWVudFJlc2l6ZURldGVjdG9yRmFjdG9yeSBmcm9tICdlbGVtZW50LXJlc2l6ZS1kZXRlY3Rvcic7XG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuLi9jb25zb2xlJztcblxuY29uc3QgVEFHX05BTUUgPSAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1zY3JvbGwtZ3V0dGVyJztcblxuY29uc3QgUkVTSVpFX0RFVEVDVE9SID0gZWxlbWVudFJlc2l6ZURldGVjdG9yRmFjdG9yeSh7IHN0cmF0ZWd5OiAnc2Nyb2xsJyB9KTtcblxuZnVuY3Rpb24gbGFzdDxUPihsaXN0OiBBcnJheTxUPikge1xuICByZXR1cm4gbGlzdFtsaXN0Lmxlbmd0aCAtIDFdO1xufVxuXG50eXBlIFNjcm9sbEd1dHRlckNvbmZpZyA9IHtcbiAgZW5hYmxlOiBib29sZWFuLFxuICBtYXJrZXJDb2xvcjogQ29sb3IsXG4gIG1hcmtlck9wYWNpdHk6IG51bWJlclxufTtcblxuZXhwb3J0IHR5cGUgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50ID0gQ3VzdG9tRXZlbnQ8eyB2aXNpYmxlOiBib29sZWFuLCBlZGl0b3I6IFRleHRFZGl0b3IgfT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcm9sbEd1dHRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLy8gcHVibGljIGVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xuICBwdWJsaWMgYXR0YWNoZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwdWJsaWMgZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZWRpdG9yVmlldzogVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzY3JvbGxiYXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc2Nyb2xsVmlldzogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGxhc3RFZGl0b3JXaWR0aDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBsYXN0RWRpdG9ySGVpZ2h0OiBudW1iZXIgPSAwO1xuXG4gIHByaXZhdGUgc2NyZWVuUmFuZ2VzOiBSYW5nZVtdIHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHJpdmF0ZSBpbnRlcnNlY3Rpb25PYnNlcnZlcj86IEludGVyc2VjdGlvbk9ic2VydmVyO1xuXG4gIHB1YmxpYyBoZWlnaHQ6IG51bWJlciA9IDA7XG4gIHB1YmxpYyB3aWR0aDogbnVtYmVyID0gMDtcblxuICBwcml2YXRlIHJlc2l6ZU9ic2VydmVyOiBSZXNpemVPYnNlcnZlcjtcbiAgcHJpdmF0ZSBmcmFtZVJlcXVlc3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHByaXZhdGUgY29uZmlnITogU2Nyb2xsR3V0dGVyQ29uZmlnO1xuXG4gIC8vIENBTlZBUyBTVFVGRlxuXG4gIHByaXZhdGUgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNhbnZhc0NvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHZpc2libGU6IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIGNyZWF0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIHJlZHJhd1RpbWVvdXQ/OiBOb2RlSlMuVGltZW91dDtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIgPz89IG5ldyBSZXNpemVPYnNlcnZlcihfID0+IHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKCkpO1xuICAgIGlmICh0aGlzLmNyZWF0ZWQpIHJldHVybjtcbiAgICB0aGlzLmluaXRpYWxpemVDYW52YXMoKTtcbiAgICB0aGlzLmNyZWF0ZWQgPSB0cnVlO1xuICB9XG5cbiAgYXR0YWNoVG9FZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgY29uc29sZS5sb2coJ2F0dGFjaGluZyB0byBlZGl0b3I6JywgZWRpdG9yKTtcbiAgICBpZiAodGhpcy5hdHRhY2hlZCAmJiB0aGlzLmVkaXRvciA9PT0gZWRpdG9yKSByZXR1cm47XG5cbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLmdldENvbmZpZyhlZGl0b3IpO1xuICAgIGxldCBjb250YWluZXIgPSBhdG9tLnZpZXdzLmdldFZpZXcoZWRpdG9yKTtcblxuICAgIGxldCBzY3JvbGxWaWV3ID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGwtdmlldycpO1xuICAgIGxldCBzY3JvbGxiYXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnNjcm9sbC12aWV3IC52ZXJ0aWNhbC1zY3JvbGxiYXInKTtcbiAgICBpZiAoIXNjcm9sbGJhciB8fCAhc2Nyb2xsVmlldykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzY3JvbGxiYXIgb3Igc2Nyb2xsLXZpZXchYCk7XG4gICAgfVxuICAgIHRoaXMuc2Nyb2xsVmlldyA9IHNjcm9sbFZpZXcgYXMgSFRNTEVsZW1lbnQ7XG4gICAgdGhpcy5zY3JvbGxiYXIgPSBzY3JvbGxiYXIgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyLm9ic2VydmUodGhpcy5zY3JvbGxiYXIpO1xuXG4gICAgbGV0IHBhcmVudCA9IHNjcm9sbGJhci5wYXJlbnROb2RlO1xuICAgIGlmICghcGFyZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIG5vZGUgdG8gYXR0YWNoIHRvIWApO1xuICAgIH1cblxuICAgIGxldCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAvLyBSZWRyYXcgdGhlIGd1dHRlcnMgd2hlbiB0aGUgZ3JhbW1hciBjaGFuZ2VzIOKAlCBhIG5ldyByb290IHNjb3BlIG1pZ2h0XG4gICAgICAvLyBtZWFuIG5ldyBjb25maWcgdmFsdWVzLlxuICAgICAgZWRpdG9yLm9uRGlkQ2hhbmdlR3JhbW1hcigoKSA9PiB7XG4gICAgICAgIHRoaXMuZ2V0Q29uZmlnKGVkaXRvcik7XG4gICAgICAgIHRoaXMucmVkcmF3QWZ0ZXJDb25maWdDaGFuZ2UoKTtcbiAgICAgIH0pLFxuICAgICAgLy8gUmVkcmF3IHRoZSBndXR0ZXJzIHdoZW4gdGhlIGNvbmZpZyBjaGFuZ2VzLlxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuc2Nyb2xsYmFyRGVjb3JhdGlvbicsXG4gICAgICAgIHsgc2NvcGU6IFtncmFtbWFyLnNjb3BlTmFtZV0gfSxcbiAgICAgICAgXyA9PiB7XG4gICAgICAgICAgdGhpcy5nZXRDb25maWcoZWRpdG9yKTtcbiAgICAgICAgICB0aGlzLnJlZHJhd0FmdGVyQ29uZmlnQ2hhbmdlKCk7XG4gICAgICAgIH1cbiAgICAgICksXG4gICAgKTtcblxuICAgIHBhcmVudC5hcHBlbmRDaGlsZCh0aGlzKTtcbiAgfVxuXG4gIHJlZHJhd0FmdGVyQ29uZmlnQ2hhbmdlKCkge1xuICAgIGlmICh0aGlzLmlzVmlzaWJsZSgpKSB7XG4gICAgICBpZiAodGhpcy5yZWRyYXdUaW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZHJhd1RpbWVvdXQpO1xuICAgICAgICB0aGlzLnJlZHJhd1RpbWVvdXQgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB0aGlzLnJlZHJhd1RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5kcmF3U2NyZWVuUmFuZ2VzKHRydWUpO1xuICAgICAgfSwgNTAwKTtcbiAgICB9XG4gIH1cblxuICBnZXRDb25maWcoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFNjb3BlZFNldHRpbmdzRm9yS2V5PFNjcm9sbEd1dHRlckNvbmZpZz4oXG4gICAgICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5zY3JvbGxiYXJEZWNvcmF0aW9uJyxcbiAgICAgIGVkaXRvclxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcy5jb25maWc7XG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKGVudHJpZXMgPT4ge1xuICAgICAgbGV0IHsgaW50ZXJzZWN0aW9uUmVjdCB9ID0gbGFzdChlbnRyaWVzKTtcbiAgICAgIGlmIChpbnRlcnNlY3Rpb25SZWN0LndpZHRoID4gMCB8fCBpbnRlcnNlY3Rpb25SZWN0LmhlaWdodCA+IDApIHtcbiAgICAgICAgdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgodHJ1ZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyLm9ic2VydmUodGhpcyk7XG4gICAgaWYgKHRoaXMuaXNWaXNpYmxlKCkpIHtcbiAgICAgIHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKHRydWUsIHRydWUpO1xuICAgIH1cblxuICAgIGxldCBtZWFzdXJlRGltZW5zaW9ucyA9ICgpID0+IHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKGZhbHNlLCBmYWxzZSk7XG4gICAgUkVTSVpFX0RFVEVDVE9SLmxpc3RlblRvKHRoaXMsIG1lYXN1cmVEaW1lbnNpb25zKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgbWVhc3VyZURpbWVuc2lvbnMsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgIFJFU0laRV9ERVRFQ1RPUi5yZW1vdmVMaXN0ZW5lcih0aGlzLCBtZWFzdXJlRGltZW5zaW9ucyk7XG4gICAgICB9KSxcbiAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG1lYXN1cmVEaW1lbnNpb25zKTtcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aCgpO1xuICAgIHRoaXMuYXR0YWNoZWQgPSB0cnVlO1xuICAgIHRoaXMuZWRpdG9yVmlldyA9IHRoaXMucXVlcnlQYXJlbnRTZWxlY3RvcignYXRvbS10ZXh0LWVkaXRvcicpIGFzIFRleHRFZGl0b3JFbGVtZW50IHwgbnVsbDtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQodGhpcy5zdWJzY3JpYmVUb01lZGlhUXVlcnkoKSk7XG4gIH1cblxuICBzdWJzY3JpYmVUb01lZGlhUXVlcnkoKSB7XG4gICAgbGV0IG1lZGlhUXVlcnkgPSB3aW5kb3cubWF0Y2hNZWRpYSgnc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAxLjUpJyk7XG4gICAgbGV0IG1lZGlhTGlzdGVuZXIgPSAoKSA9PiB0aGlzLnJlcXVlc3RGb3JjZWRVcGRhdGUoKTtcblxuICAgIG1lZGlhUXVlcnkuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgbWVkaWFMaXN0ZW5lcik7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIG1lZGlhUXVlcnkucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgbWVkaWFMaXN0ZW5lcik7XG4gICAgfSk7XG4gIH1cblxuICBpbml0aWFsaXplQ2FudmFzKCkge1xuICAgIHRoaXMuY2FudmFzID8/PSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLmNhbnZhc0NvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFxuICAgICAgJzJkJyxcbiAgICAgIHsgZGVzeW5jaHJvbml6ZWQ6IGZhbHNlIH1cbiAgICApO1xuXG4gICAgdGhpcy5hcHBlbmRDaGlsZCh0aGlzLmNhbnZhcyk7XG4gIH1cblxuICBtZWFzdXJlSGVpZ2h0QW5kV2lkdGgodmlzaWJpbGl0eUNoYW5nZWQ6IGJvb2xlYW4gPSBmYWxzZSwgZm9yY2VVcGRhdGU6IGJvb2xlYW4gPSB0cnVlKSB7XG4gICAgbGV0IHdhc1Jlc2l6ZWQgPSB0aGlzLndpZHRoICE9PSB0aGlzLmNsaWVudFdpZHRoIHx8IHRoaXMuaGVpZ2h0ICE9PSB0aGlzLmNsaWVudEhlaWdodDtcblxuICAgIGlmICghdGhpcy5zY3JvbGxiYXIgfHwgIXRoaXMuc2Nyb2xsVmlldykge1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLmNsaWVudEhlaWdodDtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLmNsaWVudFdpZHRoO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgYmFyUmVjdCA9IHRoaXMuc2Nyb2xsYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdGhpcy5oZWlnaHQgPSBiYXJSZWN0LmhlaWdodDtcbiAgICAgIHRoaXMud2lkdGggPSAgYmFyUmVjdC53aWR0aDtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ01lYXN1cmluZyB3aWR0aCBhbmQgaGVpZ2h0IGFzOicsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICB9XG5cbiAgICBpZiAod2FzUmVzaXplZCB8fCB2aXNpYmlsaXR5Q2hhbmdlZCB8fCBmb3JjZVVwZGF0ZSkge1xuICAgICAgdGhpcy5yZXF1ZXN0Rm9yY2VkVXBkYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmlzVmlzaWJsZSgpKSByZXR1cm47XG4gIH1cblxuICByZXF1ZXN0Rm9yY2VkVXBkYXRlKCkge1xuICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xuICB9XG5cbiAgcmVxdWVzdFVwZGF0ZSgpIHtcbiAgICBpZiAodGhpcy5mcmFtZVJlcXVlc3RlZCkgcmV0dXJuO1xuXG4gICAgdGhpcy5mcmFtZVJlcXVlc3RlZCA9IHRydWU7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB0aGlzLmZyYW1lUmVxdWVzdGVkID0gZmFsc2U7XG4gICAgfSk7XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgY29uc29sZS5kZWJ1ZygnRWxlbWVudCB1cGRhdGUhJyk7XG4gICAgaWYgKCF0aGlzLnZpc2libGUpIHtcbiAgICAgIHRoaXMuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfVxuXG4gICAgdGhpcy5zdHlsZS53aWR0aCA9IHRoaXMud2lkdGggPyBgJHt0aGlzLndpZHRofXB4YCA6ICcnO1xuICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPyBgJHt0aGlzLmhlaWdodH1weGAgOiAnJztcblxuICAgIGxldCBzaG91bGRSZWRyYXcgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5lZGl0b3JWaWV3KSByZXR1cm47XG4gICAgaWYgKHRoaXMuZWRpdG9yVmlldy5vZmZzZXRXaWR0aCAhPT0gdGhpcy5sYXN0RWRpdG9yV2lkdGgpIHtcbiAgICAgIHNob3VsZFJlZHJhdyA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmVkaXRvclZpZXcub2Zmc2V0SGVpZ2h0ICE9PSB0aGlzLmxhc3RFZGl0b3JIZWlnaHQpIHtcbiAgICAgIHNob3VsZFJlZHJhdyA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5sYXN0RWRpdG9yV2lkdGggPSB0aGlzLmVkaXRvclZpZXcub2Zmc2V0V2lkdGg7XG4gICAgdGhpcy5sYXN0RWRpdG9ySGVpZ2h0ID0gdGhpcy5lZGl0b3JWaWV3Lm9mZnNldEhlaWdodDtcblxuICAgIGlmICh0aGlzLmNhbnZhcykge1xuICAgICAgaWYgKHRoaXMuY2FudmFzLndpZHRoICE9PSB0aGlzLndpZHRoKSB7XG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aDtcbiAgICAgICAgc2hvdWxkUmVkcmF3ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmNhbnZhcy5oZWlnaHQgIT09IHRoaXMuaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICBzaG91bGRSZWRyYXcgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaG91bGRSZWRyYXcpIHtcbiAgICAgIHRoaXMuZHJhd1NjcmVlblJhbmdlcygpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyUmVmZXJlbmNlcygpIHtcbiAgICB0aGlzLnNjcmVlblJhbmdlcyA9IFtdO1xuICAgIGlmICghdGhpcy5jYW52YXMgfHwgIXRoaXMuY2FudmFzQ29udGV4dCkgcmV0dXJuO1xuICAgIHRoaXMuY2FudmFzQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gIH1cblxuICBoaWdobGlnaHRSZWZlcmVuY2VzKHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdIHwgbnVsbCkge1xuICAgIGlmICh0aGlzLmdldEVkaXRvckhlaWdodCgpIDw9IHRoaXMuZ2V0U2Nyb2xsYmFySGVpZ2h0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IHsgZWRpdG9yIH0gPSB0aGlzO1xuICAgIGlmICghZWRpdG9yKSByZXR1cm47XG5cbiAgICBsZXQgeyBjb25maWcgfSA9IHRoaXM7XG5cbiAgICB0aGlzLmNsZWFyUmVmZXJlbmNlcygpO1xuXG4gICAgaWYgKCFyZWZlcmVuY2VzIHx8ICFjb25maWcuZW5hYmxlKSB7XG4gICAgICB0aGlzLnNldFZpc2liaWxpdHkoZmFsc2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHsgdXJpLCByYW5nZSB9ID0gcmVmZXJlbmNlO1xuICAgICAgaWYgKHVyaSAhPT0gcGF0aCkgY29udGludWU7XG5cbiAgICAgIGxldCBzY3JlZW5SYW5nZSA9IGVkaXRvci5zY3JlZW5SYW5nZUZvckJ1ZmZlclJhbmdlKHJhbmdlKTtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ0J1ZmZlciByYW5nZScsIHJhbmdlLnRvU3RyaW5nKCksICdtYXBzIHRvIHNjcmVlbiByYW5nZScsIHNjcmVlblJhbmdlLnRvU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zY3JlZW5SYW5nZXMhLnB1c2goc2NyZWVuUmFuZ2UpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VmlzaWJpbGl0eShyZWZlcmVuY2VzLmxlbmd0aCAhPT0gMCk7XG4gICAgdGhpcy5kcmF3U2NyZWVuUmFuZ2VzKCk7XG4gIH1cblxuICBkcmF3U2NyZWVuUmFuZ2VzKGNsZWFyID0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMuc2NyZWVuUmFuZ2VzIHx8ICF0aGlzLmVkaXRvciB8fCAhdGhpcy5jYW52YXMgfHwgIXRoaXMuY2FudmFzQ29udGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChjbGVhcikge1xuICAgICAgdGhpcy5jYW52YXNDb250ZXh0IS5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgbGV0IGxpbmVDb3VudCA9IHRoaXMuZWRpdG9yLmdldFNjcmVlbkxpbmVDb3VudCgpO1xuICAgIGZvciAobGV0IHJhbmdlIG9mIHRoaXMuc2NyZWVuUmFuZ2VzKSB7XG4gICAgICBsZXQgcm93ID0gcmFuZ2Uuc3RhcnQucm93O1xuICAgICAgdGhpcy5kcmF3UmVjdEZvckVkaXRvclJvdyhyb3csIGxpbmVDb3VudCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RWRpdG9ySGVpZ2h0KCkge1xuICAgIGlmICghdGhpcy5zY3JvbGxWaWV3KSByZXR1cm4gMDtcbiAgICBsZXQgY2hpbGQgPSB0aGlzLnNjcm9sbFZpZXcuZmlyc3RDaGlsZCBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuY2xpZW50SGVpZ2h0IDogMDtcbiAgfVxuXG4gIGdldFNjcm9sbGJhckhlaWdodCgpIHtcbiAgICBpZiAoIXRoaXMuc2Nyb2xsYmFyKSByZXR1cm4gMDtcbiAgICBsZXQgcmVjdCA9IHRoaXMuc2Nyb2xsYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiByZWN0LmhlaWdodDtcbiAgfVxuXG4gIGRyYXdSZWN0Rm9yRWRpdG9yUm93KHJvdzogbnVtYmVyLCB0b3RhbFJvd3M6IG51bWJlcikge1xuICAgIGxldCB7IGhlaWdodCwgd2lkdGggfSA9IHRoaXMuY2FudmFzITtcbiAgICBsZXQgeyBtYXJrZXJDb2xvciwgbWFya2VyT3BhY2l0eSB9ID0gdGhpcy5jb25maWchO1xuXG4gICAgbGV0IGN0eCA9IHRoaXMuY2FudmFzQ29udGV4dCE7XG4gICAgY3R4LmZpbGxTdHlsZSA9IG1hcmtlckNvbG9yLnRvSGV4U3RyaW5nKCk7XG4gICAgY3R4Lmdsb2JhbEFscGhhID0gbWFya2VyT3BhY2l0eTtcblxuICAgIGxldCBwaXhlbEhlaWdodFBlclJvdyA9IGhlaWdodCAvIHRvdGFsUm93cztcblxuICAgIGxldCByZWN0SGVpZ2h0ID0gTWF0aC5tYXgocGl4ZWxIZWlnaHRQZXJSb3csIGRldmljZVBpeGVsUmF0aW8pO1xuICAgIGxldCBzdGFydFkgPSBwaXhlbEhlaWdodFBlclJvdyAqIHJvdztcbiAgICBpZiAocmVjdEhlaWdodCA+IGRldmljZVBpeGVsUmF0aW8pIHtcbiAgICAgIHN0YXJ0WSArPSAoKHBpeGVsSGVpZ2h0UGVyUm93IC8gMikgLSAoZGV2aWNlUGl4ZWxSYXRpbyAvIDIpKTtcbiAgICB9XG5cbiAgICBjdHguZmlsbFJlY3QoMCwgc3RhcnRZLCB3aWR0aCwgZGV2aWNlUGl4ZWxSYXRpbyk7XG4gIH1cblxuICBzZXRWaXNpYmlsaXR5KHNob3VsZEJlVmlzaWJsZTogYm9vbGVhbikge1xuICAgIGNvbnNvbGUubG9nKCdzZXRWaXNpYmlsaXR5Jywgc2hvdWxkQmVWaXNpYmxlKTtcbiAgICBsZXQgc2hvdWxkVXBkYXRlID0gc2hvdWxkQmVWaXNpYmxlID09PSB0aGlzLnZpc2libGU7XG4gICAgaWYgKHNob3VsZFVwZGF0ZSkge1xuICAgICAgdGhpcy52aXNpYmxlID0gc2hvdWxkQmVWaXNpYmxlO1xuICAgICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XG4gICAgfVxuICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudChcbiAgICAgICd2aXNpYmlsaXR5LWNoYW5nZWQnLFxuICAgICAge1xuICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICB2aXNpYmxlOiBzaG91bGRCZVZpc2libGUsXG4gICAgICAgICAgZWRpdG9yOiB0aGlzLmVkaXRvclxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcbiAgICBjb25zb2xlLndhcm4oJ2ZpcmluZyBldmVudCEnKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgaXNWaXNpYmxlKCkge1xuICAgIHJldHVybiB0aGlzLm9mZnNldFdpZHRoID4gMCB8fCB0aGlzLm9mZnNldEhlaWdodCA+IDA7XG4gIH1cblxuICAvLyBVVElMXG5cbiAgcXVlcnlQYXJlbnRTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgICBsZXQgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoIXBhcmVudCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAoKHBhcmVudCBhcyBIVE1MRWxlbWVudCkubWF0Y2hlcyhzZWxlY3RvcikpXG4gICAgICAgIHJldHVybiAocGFyZW50IGFzIEhUTUxFbGVtZW50KTtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuICAgIH1cbiAgfVxuXG4gIGdldFNjb3BlZFNldHRpbmdzRm9yS2V5PFQ+KGtleTogc3RyaW5nLCBlZGl0b3I6IFRleHRFZGl0b3IpOiBUIHtcbiAgICBsZXQgc2NoZW1hID0gYXRvbS5jb25maWcuZ2V0U2NoZW1hKGtleSkgYXMgeyB0eXBlOiBzdHJpbmcgfTtcbiAgICBpZiAoIXNjaGVtYSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGNvbmZpZyBrZXk6ICR7c2NoZW1hfWApO1xuICAgIH1cblxuICAgIGxldCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcbiAgICBsZXQgYmFzZSA9IGF0b20uY29uZmlnLmdldChrZXkpO1xuICAgIGxldCBzY29wZWQgPSBhdG9tLmNvbmZpZy5nZXQoa2V5LCB7IHNjb3BlOiBbZ3JhbW1hci5zY29wZU5hbWVdIH0pO1xuXG4gICAgaWYgKHNjaGVtYT8udHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiB7IC4uLmJhc2UsIC4uLnNjb3BlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NvcGVkID8/IGJhc2U7XG4gICAgfVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShUQUdfTkFNRSwgU2Nyb2xsR3V0dGVyKTtcbiJdfQ==