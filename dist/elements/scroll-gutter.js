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
exports.createScrollGutterElement = void 0;
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
        super();
        // public enabled: boolean = true;
        this.attached = false;
        this.editor = null;
        this.editorView = null;
        this.scrollbar = null;
        this.scrollView = null;
        this.attachedToTextEditor = false;
        this.screenRanges = null;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.height = 0;
        this.width = 0;
        this.offscreenFirstRow = null;
        this.offscreenLastRow = null;
        this.frameRequested = false;
        // CANVAS STUFF
        this.canvas = null;
        this.canvasContext = null;
        this.visible = true;
        this.created = false;
        if (this.created)
            return;
        this.initializeContent();
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
        let parent = scrollbar.parentNode;
        if (!parent) {
            throw new Error(`No node to attach to!`);
        }
        let grammar = editor.getGrammar();
        this.subscriptions.add(editor.onDidChangeGrammar(() => {
            this.getConfig(editor);
        }), atom.config.observe('pulsar-find-references.scrollbarDecoration', { scope: [grammar.scopeName] }, _ => {
            this.getConfig(editor);
            if (this.isVisible()) {
                if (this.redrawTimeout) {
                    clearTimeout(this.redrawTimeout);
                    this.redrawTimeout = undefined;
                }
                this.redrawTimeout = setTimeout(() => {
                    this.drawScreenRanges(true);
                }, 500);
            }
        }));
        parent.appendChild(this);
    }
    getConfig(editor) {
        let config = this.getScopedSettingsForKey('pulsar-find-references.scrollbarDecoration', editor);
        this.config = config;
        return config;
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
        this.attachedToTextEditor = !!this.editorView;
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
    initializeContent() {
    }
    initializeCanvas() {
        var _a;
        (_a = this.canvas) !== null && _a !== void 0 ? _a : (this.canvas = document.createElement('canvas'));
        this.canvasContext = this.canvas.getContext('2d', { desynchronized: false });
        this.appendChild(this.canvas);
    }
    measureHeightAndWidth(visibilityChanged = false, forceUpdate = true) {
        console.log('measureHeightAndWidth');
        let wasResized = this.width !== this.clientWidth || this.height !== this.clientHeight;
        if (!this.scrollbar || !this.scrollView) {
            console.log('no scrollbar!');
            this.height = this.clientHeight;
            this.width = this.clientWidth;
        }
        else {
            console.log('scrollbar!', this.scrollbar);
            let barRect = this.scrollbar.getBoundingClientRect();
            // let viewRect = this.scrollView.getBoundingClientRect();
            this.height = barRect.height;
            this.width = barRect.width;
            console.log('measuring width and height as:', this.width, this.height);
        }
        console.log('wasResized:', wasResized, 'visibilityChanged:', visibilityChanged, 'forceUpdate:', forceUpdate);
        if (wasResized || visibilityChanged || forceUpdate) {
            this.requestForcedUpdate();
        }
        if (!this.isVisible())
            return;
        if (wasResized || forceUpdate) {
        }
    }
    requestForcedUpdate() {
        this.offscreenFirstRow = null;
        this.offscreenLastRow = null;
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
        console.log('Element update!');
        // if (!(this.attached && this.isVisible())) return;
        if (!this.visible) {
            this.style.visibility = 'hidden';
            return;
        }
        else {
            this.style.visibility = 'visible';
        }
        // let pixelRatio = window.devicePixelRatio;
        // let width = Math.min(this.canvas.width / devicePixelRatio, this.width);
        this.style.width = this.width ? `${this.width}px` : '';
        this.style.height = this.height ? `${this.height}px` : '';
        let canvasDimensionsChanged = false;
        if (this.canvas) {
            if (this.canvas.width !== this.width) {
                this.canvas.width = this.width;
                canvasDimensionsChanged = true;
            }
            if (this.canvas.height !== this.height) {
                this.canvas.height = this.height;
                canvasDimensionsChanged = true;
            }
        }
        if (canvasDimensionsChanged) {
            this.drawScreenRanges();
        }
    }
    clearReferences() {
        this.screenRanges = [];
        if (!this.canvas || !this.canvasContext)
            return;
        console.warn('clearing ranges!');
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    highlightReferences(references) {
        console.log('ELEMENT highlightReferences');
        if (this.getEditorHeight() <= this.getScrollbarHeight()) {
            return;
        }
        let { editor } = this;
        if (!editor) {
            console.warn('WTF? no editor!');
            return;
        }
        let path = editor.getPath();
        let { config } = this;
        if (!config) {
            throw new Error(`No config defined!`);
        }
        this.clearReferences();
        if (!references || !config.enable) {
            this.setVisibility(false);
            return;
        }
        for (let reference of references) {
            let { uri, range } = reference;
            if (uri !== path) {
                console.log('skipping:', reference, uri, path);
                continue;
            }
            let screenRange = editor.screenRangeForBufferRange(range);
            console.log('buffer range', range.toString(), 'maps to screen range:', screenRange.toString());
            this.screenRanges.push(screenRange);
        }
        this.setVisibility(references.length !== 0);
        this.drawScreenRanges();
    }
    drawScreenRanges(clear = false) {
        console.log('drawScreenRanges on canvas:', this.canvas, clear, this.screenRanges);
        if (!this.screenRanges || !this.editor || !this.canvas) {
            console.warn('oops!');
            return;
        }
        if (clear) {
            console.log('CLEARING!');
            this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        for (let range of this.screenRanges) {
            let row = range.start.row;
            let lineCount = this.editor.getScreenLineCount();
            this.drawRectForEditorRow(row, lineCount);
        }
    }
    getEditorHeight() {
        if (!this.scrollView)
            return 0;
        let child = this.scrollView.firstChild;
        if (!child)
            return 0;
        return child.clientHeight;
    }
    getScrollbarHeight() {
        if (!this.scrollbar)
            return 0;
        let rect = this.scrollbar.getBoundingClientRect();
        return rect.height;
    }
    drawRectForEditorRow(row, totalRows) {
        // if (!this.canvas) return;
        let { height, width } = this.canvas;
        let { markerColor, markerOpacity } = this.config;
        let editorHeight = this.getEditorHeight();
        let scrollbarHeight = this.getScrollbarHeight();
        // let scaledHeight = editorHeight - height;
        let pillHeight = (height / editorHeight) * height;
        let scrollbarHeightWithoutPillHeight = height - pillHeight;
        let finalScaleFactor = height / scrollbarHeightWithoutPillHeight;
        console.log('editor height is', editorHeight);
        console.log('scrollbar height is', this.scrollbar.clientHeight);
        console.log('canvas height is', height);
        console.log('pillHeight should be about', pillHeight);
        console.log('scrollbarHeightWithoutPillHeight is', scrollbarHeightWithoutPillHeight);
        let ctx = this.canvasContext;
        ctx.fillStyle = markerColor.toHexString();
        ctx.globalAlpha = markerOpacity;
        if (!ctx) {
            console.warn('no context!');
            return;
        }
        console.log('FILL IS', ctx.fillStyle);
        console.log('ALPHA IS', ctx.globalAlpha);
        let rowPercentage = row / totalRows;
        console.log('rowPercentage for', row, 'is', rowPercentage);
        // console.log('thus the ');
        let pixelHeightPerRow = height / totalRows;
        // let pixelHeightPerRow = scrollbarHeightWithoutPillHeight / totalRows;
        let rectHeight = Math.max(pixelHeightPerRow, devicePixelRatio);
        let startY = pixelHeightPerRow * row;
        console.log('drawing rect for row', row, 'at:', 0, startY, width, rectHeight, ctx.fillStyle);
        ctx.fillRect(0, startY, width, rectHeight);
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
function createScrollGutterElement() {
    let element = document.createElement(TAG_NAME);
    // element.createdCallback();
    return element;
}
exports.createScrollGutterElement = createScrollGutterElement;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsLWd1dHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9lbGVtZW50cy9zY3JvbGwtZ3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBT2M7QUFDZCxzRkFBbUU7QUFFbkUsb0RBQXNDO0FBRXRDLE1BQU0sUUFBUSxHQUFHLHNDQUFzQyxDQUFDO0FBRXhELE1BQU0sZUFBZSxHQUFHLElBQUEsaUNBQTRCLEVBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUU3RSxTQUFTLElBQUksQ0FBSSxJQUFjO0lBQzdCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQVVELE1BQXFCLFlBQWEsU0FBUSxXQUFXO0lBc0NuRDtRQUNFLEtBQUssRUFBRSxDQUFDO1FBdENWLGtDQUFrQztRQUMzQixhQUFRLEdBQVksS0FBSyxDQUFDO1FBRTFCLFdBQU0sR0FBc0IsSUFBSSxDQUFDO1FBQ2hDLGVBQVUsR0FBNkIsSUFBSSxDQUFDO1FBQzVDLGNBQVMsR0FBdUIsSUFBSSxDQUFDO1FBQ3JDLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBQ3RDLHlCQUFvQixHQUFZLEtBQUssQ0FBQztRQUV0QyxpQkFBWSxHQUFtQixJQUFJLENBQUM7UUFFcEMsa0JBQWEsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBR2hFLFdBQU0sR0FBVyxDQUFDLENBQUM7UUFDbkIsVUFBSyxHQUFXLENBQUMsQ0FBQztRQUVqQixzQkFBaUIsR0FBa0IsSUFBSSxDQUFDO1FBQ3hDLHFCQUFnQixHQUFrQixJQUFJLENBQUM7UUFFdkMsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFFeEMsZUFBZTtRQUVQLFdBQU0sR0FBNkIsSUFBSSxDQUFDO1FBQ3hDLGtCQUFhLEdBQW9DLElBQUksQ0FBQztRQUN0RCxZQUFP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LEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFxQixDQUFDO1FBQzVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNsQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsSUFBSSxNQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLHVDQUFZLElBQUksR0FBSyxNQUFNLEVBQUc7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLElBQUksQ0FBQztRQUN4QixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBM1pELCtCQTJaQztBQUVELGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBRTlDLFNBQWdCLHlCQUF5QjtJQUN2QyxJQUFJLE9BQU8sR0FBaUIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQWlCLENBQUM7SUFDN0UsNkJBQTZCO0lBQzdCLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFKRCw4REFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbG9yLFxuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBEaXNwb3NhYmxlLFxuICBSYW5nZSxcbiAgVGV4dEVkaXRvcixcbiAgVGV4dEVkaXRvckVsZW1lbnRcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgZWxlbWVudFJlc2l6ZURldGVjdG9yRmFjdG9yeSBmcm9tICdlbGVtZW50LXJlc2l6ZS1kZXRlY3Rvcic7XG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuLi9jb25zb2xlJztcblxuY29uc3QgVEFHX05BTUUgPSAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy1zY3JvbGwtZ3V0dGVyJztcblxuY29uc3QgUkVTSVpFX0RFVEVDVE9SID0gZWxlbWVudFJlc2l6ZURldGVjdG9yRmFjdG9yeSh7IHN0cmF0ZWd5OiAnc2Nyb2xsJyB9KTtcblxuZnVuY3Rpb24gbGFzdDxUPihsaXN0OiBBcnJheTxUPikge1xuICByZXR1cm4gbGlzdFtsaXN0Lmxlbmd0aCAtIDFdO1xufVxuXG50eXBlIFNjcm9sbEd1dHRlckNvbmZpZyA9IHtcbiAgZW5hYmxlOiBib29sZWFuLFxuICBtYXJrZXJDb2xvcjogQ29sb3IsXG4gIG1hcmtlck9wYWNpdHk6IG51bWJlclxufTtcblxuZXhwb3J0IHR5cGUgU2Nyb2xsR3V0dGVyVmlzaWJpbGl0eUV2ZW50ID0gQ3VzdG9tRXZlbnQ8eyB2aXNpYmxlOiBib29sZWFuLCBlZGl0b3I6IFRleHRFZGl0b3IgfT47XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcm9sbEd1dHRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLy8gcHVibGljIGVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xuICBwdWJsaWMgYXR0YWNoZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwdWJsaWMgZWRpdG9yOiBUZXh0RWRpdG9yIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZWRpdG9yVmlldzogVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzY3JvbGxiYXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc2Nyb2xsVmlldzogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBhdHRhY2hlZFRvVGV4dEVkaXRvcjogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc2NyZWVuUmFuZ2VzOiBSYW5nZVtdIHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHJpdmF0ZSBpbnRlcnNlY3Rpb25PYnNlcnZlcj86IEludGVyc2VjdGlvbk9ic2VydmVyO1xuXG4gIHB1YmxpYyBoZWlnaHQ6IG51bWJlciA9IDA7XG4gIHB1YmxpYyB3aWR0aDogbnVtYmVyID0gMDtcblxuICBwcml2YXRlIG9mZnNjcmVlbkZpcnN0Um93OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvZmZzY3JlZW5MYXN0Um93OiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGZyYW1lUmVxdWVzdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLy8gQ0FOVkFTIFNUVUZGXG5cbiAgcHJpdmF0ZSBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY2FudmFzQ29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgdmlzaWJsZTogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgY3JlYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc2Nyb2xsYmFyRGVjb3JhdGlvbkVuYWJsZWQ/OiBib29sZWFuO1xuICBwcml2YXRlIG1hcmtlckNvbG9yPzogQ29sb3I7XG4gIHByaXZhdGUgbWFya2VyT3BhY2l0eT86IG51bWJlcjtcblxuICBwcml2YXRlIGNvbmZpZz86IFNjcm9sbEd1dHRlckNvbmZpZztcblxuICBwcml2YXRlIHJlZHJhd1RpbWVvdXQ/OiBOb2RlSlMuVGltZW91dDtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIGlmICh0aGlzLmNyZWF0ZWQpIHJldHVybjtcbiAgICB0aGlzLmluaXRpYWxpemVDb250ZW50KCk7XG4gICAgdGhpcy5pbml0aWFsaXplQ2FudmFzKCk7XG4gICAgdGhpcy5jcmVhdGVkID0gdHJ1ZTtcbiAgfVxuXG4gIGF0dGFjaFRvRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGNvbnNvbGUubG9nKCdhdHRhY2hpbmcgdG8gZWRpdG9yOicsIGVkaXRvcik7XG4gICAgaWYgKHRoaXMuYXR0YWNoZWQgJiYgdGhpcy5lZGl0b3IgPT09IGVkaXRvcikgcmV0dXJuO1xuXG4gICAgdGhpcy5lZGl0b3IgPSBlZGl0b3I7XG4gICAgdGhpcy5nZXRDb25maWcoZWRpdG9yKTtcbiAgICBsZXQgY29udGFpbmVyID0gYXRvbS52aWV3cy5nZXRWaWV3KGVkaXRvcik7XG5cbiAgICBsZXQgc2Nyb2xsVmlldyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuc2Nyb2xsLXZpZXcnKTtcbiAgICBsZXQgc2Nyb2xsYmFyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGwtdmlldyAudmVydGljYWwtc2Nyb2xsYmFyJyk7XG4gICAgaWYgKCFzY3JvbGxiYXIgfHwgIXNjcm9sbFZpZXcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2Nyb2xsYmFyIG9yIHNjcm9sbC12aWV3IWApO1xuICAgIH1cbiAgICB0aGlzLnNjcm9sbFZpZXcgPSBzY3JvbGxWaWV3IGFzIEhUTUxFbGVtZW50O1xuICAgIHRoaXMuc2Nyb2xsYmFyID0gc2Nyb2xsYmFyIGFzIEhUTUxFbGVtZW50O1xuXG4gICAgbGV0IHBhcmVudCA9IHNjcm9sbGJhci5wYXJlbnROb2RlO1xuICAgIGlmICghcGFyZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIG5vZGUgdG8gYXR0YWNoIHRvIWApO1xuICAgIH1cblxuICAgIGxldCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBlZGl0b3Iub25EaWRDaGFuZ2VHcmFtbWFyKCgpID0+IHtcbiAgICAgICAgdGhpcy5nZXRDb25maWcoZWRpdG9yKTtcbiAgICAgIH0pLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuc2Nyb2xsYmFyRGVjb3JhdGlvbicsXG4gICAgICAgIHsgc2NvcGU6IFtncmFtbWFyLnNjb3BlTmFtZV0gfSxcbiAgICAgICAgXyA9PiB7XG4gICAgICAgICAgdGhpcy5nZXRDb25maWcoZWRpdG9yKTtcbiAgICAgICAgICBpZiAodGhpcy5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVkcmF3VGltZW91dCkge1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWRyYXdUaW1lb3V0KTtcbiAgICAgICAgICAgICAgdGhpcy5yZWRyYXdUaW1lb3V0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZWRyYXdUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMuZHJhd1NjcmVlblJhbmdlcyh0cnVlKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICApLFxuICAgICk7XG5cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQodGhpcyk7XG4gIH1cblxuICBnZXRDb25maWcoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgbGV0IGNvbmZpZzogU2Nyb2xsR3V0dGVyQ29uZmlnID0gdGhpcy5nZXRTY29wZWRTZXR0aW5nc0ZvcktleTxTY3JvbGxHdXR0ZXJDb25maWc+KFxuICAgICAgJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMuc2Nyb2xsYmFyRGVjb3JhdGlvbicsXG4gICAgICBlZGl0b3JcbiAgICApO1xuXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMuaW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoZW50cmllcyA9PiB7XG4gICAgICBsZXQgeyBpbnRlcnNlY3Rpb25SZWN0IH0gPSBsYXN0KGVudHJpZXMpO1xuICAgICAgaWYgKGludGVyc2VjdGlvblJlY3Qud2lkdGggPiAwIHx8IGludGVyc2VjdGlvblJlY3QuaGVpZ2h0ID4gMCkge1xuICAgICAgICB0aGlzLm1lYXN1cmVIZWlnaHRBbmRXaWR0aCh0cnVlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuaW50ZXJzZWN0aW9uT2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzKTtcbiAgICBpZiAodGhpcy5pc1Zpc2libGUoKSkge1xuICAgICAgdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgodHJ1ZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgbGV0IG1lYXN1cmVEaW1lbnNpb25zID0gKCkgPT4gdGhpcy5tZWFzdXJlSGVpZ2h0QW5kV2lkdGgoZmFsc2UsIGZhbHNlKTtcbiAgICBSRVNJWkVfREVURUNUT1IubGlzdGVuVG8odGhpcywgbWVhc3VyZURpbWVuc2lvbnMpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBtZWFzdXJlRGltZW5zaW9ucywgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgICAgUkVTSVpFX0RFVEVDVE9SLnJlbW92ZUxpc3RlbmVyKHRoaXMsIG1lYXN1cmVEaW1lbnNpb25zKTtcbiAgICAgIH0pLFxuICAgICAgbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgbWVhc3VyZURpbWVuc2lvbnMpO1xuICAgICAgfSksXG4gICAgKTtcblxuICAgIHRoaXMubWVhc3VyZUhlaWdodEFuZFdpZHRoKCk7XG4gICAgdGhpcy5hdHRhY2hlZCA9IHRydWU7XG4gICAgdGhpcy5lZGl0b3JWaWV3ID0gdGhpcy5xdWVyeVBhcmVudFNlbGVjdG9yKCdhdG9tLXRleHQtZWRpdG9yJykgYXMgVGV4dEVkaXRvckVsZW1lbnQgfCBudWxsO1xuICAgIHRoaXMuYXR0YWNoZWRUb1RleHRFZGl0b3IgPSAhIXRoaXMuZWRpdG9yVmlldztcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQodGhpcy5zdWJzY3JpYmVUb01lZGlhUXVlcnkoKSk7XG4gIH1cblxuICBzdWJzY3JpYmVUb01lZGlhUXVlcnkoKSB7XG4gICAgbGV0IG1lZGlhUXVlcnkgPSB3aW5kb3cubWF0Y2hNZWRpYSgnc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAxLjUpJyk7XG4gICAgbGV0IG1lZGlhTGlzdGVuZXIgPSAoKSA9PiB0aGlzLnJlcXVlc3RGb3JjZWRVcGRhdGUoKTtcblxuICAgIG1lZGlhUXVlcnkuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgbWVkaWFMaXN0ZW5lcik7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIG1lZGlhUXVlcnkucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgbWVkaWFMaXN0ZW5lcik7XG4gICAgfSk7XG4gIH1cblxuICBpbml0aWFsaXplQ29udGVudCgpIHtcbiAgfVxuXG4gIGluaXRpYWxpemVDYW52YXMoKSB7XG4gICAgdGhpcy5jYW52YXMgPz89IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuY2FudmFzQ29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXG4gICAgICAnMmQnLFxuICAgICAgeyBkZXN5bmNocm9uaXplZDogZmFsc2UgfVxuICAgICk7XG5cbiAgICB0aGlzLmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcbiAgfVxuXG4gIG1lYXN1cmVIZWlnaHRBbmRXaWR0aCh2aXNpYmlsaXR5Q2hhbmdlZDogYm9vbGVhbiA9IGZhbHNlLCBmb3JjZVVwZGF0ZTogYm9vbGVhbiA9IHRydWUpIHtcbiAgICBjb25zb2xlLmxvZygnbWVhc3VyZUhlaWdodEFuZFdpZHRoJyk7XG4gICAgbGV0IHdhc1Jlc2l6ZWQgPSB0aGlzLndpZHRoICE9PSB0aGlzLmNsaWVudFdpZHRoIHx8IHRoaXMuaGVpZ2h0ICE9PSB0aGlzLmNsaWVudEhlaWdodDtcblxuICAgIGlmICghdGhpcy5zY3JvbGxiYXIgfHwgIXRoaXMuc2Nyb2xsVmlldykge1xuICAgICAgY29uc29sZS5sb2coJ25vIHNjcm9sbGJhciEnKTtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5jbGllbnRIZWlnaHQ7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy5jbGllbnRXaWR0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coJ3Njcm9sbGJhciEnLCB0aGlzLnNjcm9sbGJhcik7XG4gICAgICBsZXQgYmFyUmVjdCA9IHRoaXMuc2Nyb2xsYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgLy8gbGV0IHZpZXdSZWN0ID0gdGhpcy5zY3JvbGxWaWV3LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdGhpcy5oZWlnaHQgPSBiYXJSZWN0LmhlaWdodDtcbiAgICAgIHRoaXMud2lkdGggPSAgYmFyUmVjdC53aWR0aDtcbiAgICAgIGNvbnNvbGUubG9nKCdtZWFzdXJpbmcgd2lkdGggYW5kIGhlaWdodCBhczonLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ3dhc1Jlc2l6ZWQ6Jywgd2FzUmVzaXplZCwgJ3Zpc2liaWxpdHlDaGFuZ2VkOicsIHZpc2liaWxpdHlDaGFuZ2VkLCAnZm9yY2VVcGRhdGU6JywgZm9yY2VVcGRhdGUpO1xuXG4gICAgaWYgKHdhc1Jlc2l6ZWQgfHwgdmlzaWJpbGl0eUNoYW5nZWQgfHwgZm9yY2VVcGRhdGUpIHtcbiAgICAgIHRoaXMucmVxdWVzdEZvcmNlZFVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5pc1Zpc2libGUoKSkgcmV0dXJuO1xuXG4gICAgaWYgKHdhc1Jlc2l6ZWQgfHwgZm9yY2VVcGRhdGUpIHtcblxuICAgIH1cbiAgfVxuXG4gIHJlcXVlc3RGb3JjZWRVcGRhdGUoKSB7XG4gICAgdGhpcy5vZmZzY3JlZW5GaXJzdFJvdyA9IG51bGw7XG4gICAgdGhpcy5vZmZzY3JlZW5MYXN0Um93ID0gbnVsbDtcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcbiAgfVxuXG4gIHJlcXVlc3RVcGRhdGUoKSB7XG4gICAgaWYgKHRoaXMuZnJhbWVSZXF1ZXN0ZWQpIHJldHVybjtcblxuICAgIHRoaXMuZnJhbWVSZXF1ZXN0ZWQgPSB0cnVlO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgdGhpcy5mcmFtZVJlcXVlc3RlZCA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIGNvbnNvbGUubG9nKCdFbGVtZW50IHVwZGF0ZSEnKTtcbiAgICAvLyBpZiAoISh0aGlzLmF0dGFjaGVkICYmIHRoaXMuaXNWaXNpYmxlKCkpKSByZXR1cm47XG4gICAgaWYgKCF0aGlzLnZpc2libGUpIHtcbiAgICAgIHRoaXMuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgfVxuXG4gICAgLy8gbGV0IHBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAvLyBsZXQgd2lkdGggPSBNYXRoLm1pbih0aGlzLmNhbnZhcy53aWR0aCAvIGRldmljZVBpeGVsUmF0aW8sIHRoaXMud2lkdGgpO1xuXG4gICAgdGhpcy5zdHlsZS53aWR0aCA9IHRoaXMud2lkdGggPyBgJHt0aGlzLndpZHRofXB4YCA6ICcnO1xuICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPyBgJHt0aGlzLmhlaWdodH1weGAgOiAnJztcblxuICAgIGxldCBjYW52YXNEaW1lbnNpb25zQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuY2FudmFzKSB7XG4gICAgICBpZiAodGhpcy5jYW52YXMud2lkdGggIT09IHRoaXMud2lkdGgpIHtcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoO1xuICAgICAgICBjYW52YXNEaW1lbnNpb25zQ2hhbmdlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jYW52YXMuaGVpZ2h0ICE9PSB0aGlzLmhlaWdodCkge1xuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodDtcbiAgICAgICAgY2FudmFzRGltZW5zaW9uc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjYW52YXNEaW1lbnNpb25zQ2hhbmdlZCkge1xuICAgICAgdGhpcy5kcmF3U2NyZWVuUmFuZ2VzKCk7XG4gICAgfVxuICB9XG5cbiAgY2xlYXJSZWZlcmVuY2VzKCkge1xuICAgIHRoaXMuc2NyZWVuUmFuZ2VzID0gW107XG4gICAgaWYgKCF0aGlzLmNhbnZhcyB8fCAhdGhpcy5jYW52YXNDb250ZXh0KSByZXR1cm47XG4gICAgY29uc29sZS53YXJuKCdjbGVhcmluZyByYW5nZXMhJyk7XG4gICAgdGhpcy5jYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgfVxuXG4gIGhpZ2hsaWdodFJlZmVyZW5jZXMocmVmZXJlbmNlczogUmVmZXJlbmNlW10gfCBudWxsKSB7XG4gICAgY29uc29sZS5sb2coJ0VMRU1FTlQgaGlnaGxpZ2h0UmVmZXJlbmNlcycpO1xuICAgIGlmICh0aGlzLmdldEVkaXRvckhlaWdodCgpIDw9IHRoaXMuZ2V0U2Nyb2xsYmFySGVpZ2h0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IHsgZWRpdG9yIH0gPSB0aGlzO1xuICAgIGlmICghZWRpdG9yKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1dURj8gbm8gZWRpdG9yIScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG5cbiAgICBsZXQgeyBjb25maWcgfSA9IHRoaXM7XG4gICAgaWYgKCFjb25maWcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gY29uZmlnIGRlZmluZWQhYCk7XG4gICAgfVxuXG4gICAgdGhpcy5jbGVhclJlZmVyZW5jZXMoKTtcbiAgICBpZiAoIXJlZmVyZW5jZXMgfHwgIWNvbmZpZy5lbmFibGUpIHtcbiAgICAgIHRoaXMuc2V0VmlzaWJpbGl0eShmYWxzZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSwgcmFuZ2UgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGlmICh1cmkgIT09IHBhdGgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NraXBwaW5nOicsIHJlZmVyZW5jZSwgdXJpLCBwYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBsZXQgc2NyZWVuUmFuZ2UgPSBlZGl0b3Iuc2NyZWVuUmFuZ2VGb3JCdWZmZXJSYW5nZShyYW5nZSk7XG4gICAgICBjb25zb2xlLmxvZygnYnVmZmVyIHJhbmdlJywgcmFuZ2UudG9TdHJpbmcoKSwgJ21hcHMgdG8gc2NyZWVuIHJhbmdlOicsIHNjcmVlblJhbmdlLnRvU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zY3JlZW5SYW5nZXMhLnB1c2goc2NyZWVuUmFuZ2UpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VmlzaWJpbGl0eShyZWZlcmVuY2VzLmxlbmd0aCAhPT0gMCk7XG4gICAgdGhpcy5kcmF3U2NyZWVuUmFuZ2VzKCk7XG4gIH1cblxuICBkcmF3U2NyZWVuUmFuZ2VzKGNsZWFyID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZygnZHJhd1NjcmVlblJhbmdlcyBvbiBjYW52YXM6JywgdGhpcy5jYW52YXMsIGNsZWFyLCB0aGlzLnNjcmVlblJhbmdlcyk7XG4gICAgaWYgKCF0aGlzLnNjcmVlblJhbmdlcyB8fCAhdGhpcy5lZGl0b3IgfHwgIXRoaXMuY2FudmFzKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ29vcHMhJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjbGVhcikge1xuICAgICAgY29uc29sZS5sb2coJ0NMRUFSSU5HIScpO1xuICAgICAgdGhpcy5jYW52YXNDb250ZXh0IS5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgfVxuICAgIGZvciAobGV0IHJhbmdlIG9mIHRoaXMuc2NyZWVuUmFuZ2VzKSB7XG4gICAgICBsZXQgcm93ID0gcmFuZ2Uuc3RhcnQucm93O1xuICAgICAgbGV0IGxpbmVDb3VudCA9IHRoaXMuZWRpdG9yLmdldFNjcmVlbkxpbmVDb3VudCgpO1xuICAgICAgdGhpcy5kcmF3UmVjdEZvckVkaXRvclJvdyhyb3csIGxpbmVDb3VudCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RWRpdG9ySGVpZ2h0KCkge1xuICAgIGlmICghdGhpcy5zY3JvbGxWaWV3KSByZXR1cm4gMDtcbiAgICBsZXQgY2hpbGQgPSB0aGlzLnNjcm9sbFZpZXcuZmlyc3RDaGlsZCBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgaWYgKCFjaGlsZCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIGNoaWxkLmNsaWVudEhlaWdodDtcbiAgfVxuXG4gIGdldFNjcm9sbGJhckhlaWdodCgpIHtcbiAgICBpZiAoIXRoaXMuc2Nyb2xsYmFyKSByZXR1cm4gMDtcbiAgICBsZXQgcmVjdCA9IHRoaXMuc2Nyb2xsYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiByZWN0LmhlaWdodDtcbiAgfVxuXG4gIGRyYXdSZWN0Rm9yRWRpdG9yUm93KHJvdzogbnVtYmVyLCB0b3RhbFJvd3M6IG51bWJlcikge1xuICAgIC8vIGlmICghdGhpcy5jYW52YXMpIHJldHVybjtcbiAgICBsZXQgeyBoZWlnaHQsIHdpZHRoIH0gPSB0aGlzLmNhbnZhcyE7XG4gICAgbGV0IHsgbWFya2VyQ29sb3IsIG1hcmtlck9wYWNpdHkgfSA9IHRoaXMuY29uZmlnITtcblxuXG4gICAgbGV0IGVkaXRvckhlaWdodCA9IHRoaXMuZ2V0RWRpdG9ySGVpZ2h0KCk7XG4gICAgbGV0IHNjcm9sbGJhckhlaWdodCA9IHRoaXMuZ2V0U2Nyb2xsYmFySGVpZ2h0KCk7XG4gICAgLy8gbGV0IHNjYWxlZEhlaWdodCA9IGVkaXRvckhlaWdodCAtIGhlaWdodDtcbiAgICBsZXQgcGlsbEhlaWdodCA9IChoZWlnaHQgLyBlZGl0b3JIZWlnaHQpICogaGVpZ2h0O1xuXG4gICAgbGV0IHNjcm9sbGJhckhlaWdodFdpdGhvdXRQaWxsSGVpZ2h0ID0gaGVpZ2h0IC0gcGlsbEhlaWdodDtcbiAgICBsZXQgZmluYWxTY2FsZUZhY3RvciA9ICBoZWlnaHQgLyBzY3JvbGxiYXJIZWlnaHRXaXRob3V0UGlsbEhlaWdodDtcblxuICAgIGNvbnNvbGUubG9nKCdlZGl0b3IgaGVpZ2h0IGlzJywgZWRpdG9ySGVpZ2h0KTtcbiAgICBjb25zb2xlLmxvZygnc2Nyb2xsYmFyIGhlaWdodCBpcycsIHRoaXMuc2Nyb2xsYmFyIS5jbGllbnRIZWlnaHQpO1xuICAgIGNvbnNvbGUubG9nKCdjYW52YXMgaGVpZ2h0IGlzJywgaGVpZ2h0KTtcblxuICAgIGNvbnNvbGUubG9nKCdwaWxsSGVpZ2h0IHNob3VsZCBiZSBhYm91dCcsIHBpbGxIZWlnaHQpO1xuICAgIGNvbnNvbGUubG9nKCdzY3JvbGxiYXJIZWlnaHRXaXRob3V0UGlsbEhlaWdodCBpcycsIHNjcm9sbGJhckhlaWdodFdpdGhvdXRQaWxsSGVpZ2h0KTtcblxuICAgIGxldCBjdHggPSB0aGlzLmNhbnZhc0NvbnRleHQhO1xuICAgIGN0eC5maWxsU3R5bGUgPSBtYXJrZXJDb2xvci50b0hleFN0cmluZygpO1xuICAgIGN0eC5nbG9iYWxBbHBoYSA9IG1hcmtlck9wYWNpdHk7XG5cbiAgICBpZiAoIWN0eCkge1xuICAgICAgY29uc29sZS53YXJuKCdubyBjb250ZXh0IScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnRklMTCBJUycsIGN0eC5maWxsU3R5bGUpO1xuICAgIGNvbnNvbGUubG9nKCdBTFBIQSBJUycsIGN0eC5nbG9iYWxBbHBoYSk7XG4gICAgbGV0IHJvd1BlcmNlbnRhZ2UgPSByb3cgLyB0b3RhbFJvd3M7XG4gICAgY29uc29sZS5sb2coJ3Jvd1BlcmNlbnRhZ2UgZm9yJywgcm93LCAnaXMnLCByb3dQZXJjZW50YWdlKTtcbiAgICAvLyBjb25zb2xlLmxvZygndGh1cyB0aGUgJyk7XG4gICAgbGV0IHBpeGVsSGVpZ2h0UGVyUm93ID0gaGVpZ2h0IC8gdG90YWxSb3dzO1xuICAgIC8vIGxldCBwaXhlbEhlaWdodFBlclJvdyA9IHNjcm9sbGJhckhlaWdodFdpdGhvdXRQaWxsSGVpZ2h0IC8gdG90YWxSb3dzO1xuICAgIGxldCByZWN0SGVpZ2h0ID0gTWF0aC5tYXgocGl4ZWxIZWlnaHRQZXJSb3csIGRldmljZVBpeGVsUmF0aW8pO1xuICAgIGxldCBzdGFydFkgPSBwaXhlbEhlaWdodFBlclJvdyAqIHJvdztcbiAgICBjb25zb2xlLmxvZygnZHJhd2luZyByZWN0IGZvciByb3cnLCByb3csICdhdDonLCAwLCBzdGFydFksIHdpZHRoLCByZWN0SGVpZ2h0LCBjdHguZmlsbFN0eWxlKTtcbiAgICBjdHguZmlsbFJlY3QoMCwgc3RhcnRZLCB3aWR0aCwgcmVjdEhlaWdodCk7XG4gIH1cblxuICBzZXRWaXNpYmlsaXR5KHNob3VsZEJlVmlzaWJsZTogYm9vbGVhbikge1xuICAgIGNvbnNvbGUubG9nKCdzZXRWaXNpYmlsaXR5Jywgc2hvdWxkQmVWaXNpYmxlKTtcbiAgICBsZXQgc2hvdWxkVXBkYXRlID0gc2hvdWxkQmVWaXNpYmxlID09PSB0aGlzLnZpc2libGU7XG4gICAgaWYgKHNob3VsZFVwZGF0ZSkge1xuICAgICAgdGhpcy52aXNpYmxlID0gc2hvdWxkQmVWaXNpYmxlO1xuICAgICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XG4gICAgfVxuICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudChcbiAgICAgICd2aXNpYmlsaXR5LWNoYW5nZWQnLFxuICAgICAge1xuICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICB2aXNpYmxlOiBzaG91bGRCZVZpc2libGUsXG4gICAgICAgICAgZWRpdG9yOiB0aGlzLmVkaXRvclxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcbiAgICBjb25zb2xlLndhcm4oJ2ZpcmluZyBldmVudCEnKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgaXNWaXNpYmxlKCkge1xuICAgIHJldHVybiB0aGlzLm9mZnNldFdpZHRoID4gMCB8fCB0aGlzLm9mZnNldEhlaWdodCA+IDA7XG4gIH1cblxuICAvLyBVVElMXG5cbiAgcXVlcnlQYXJlbnRTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgICBsZXQgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoIXBhcmVudCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAoKHBhcmVudCBhcyBIVE1MRWxlbWVudCkubWF0Y2hlcyhzZWxlY3RvcikpXG4gICAgICAgIHJldHVybiAocGFyZW50IGFzIEhUTUxFbGVtZW50KTtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuICAgIH1cbiAgfVxuXG4gIGdldFNjb3BlZFNldHRpbmdzRm9yS2V5PFQ+KGtleTogc3RyaW5nLCBlZGl0b3I6IFRleHRFZGl0b3IpOiBUIHtcbiAgICBsZXQgc2NoZW1hID0gYXRvbS5jb25maWcuZ2V0U2NoZW1hKGtleSkgYXMgeyB0eXBlOiBzdHJpbmcgfTtcbiAgICBpZiAoIXNjaGVtYSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGNvbmZpZyBrZXk6ICR7c2NoZW1hfWApO1xuICAgIH1cblxuICAgIGxldCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcbiAgICBsZXQgYmFzZSA9IGF0b20uY29uZmlnLmdldChrZXkpO1xuICAgIGxldCBzY29wZWQgPSBhdG9tLmNvbmZpZy5nZXQoa2V5LCB7IHNjb3BlOiBbZ3JhbW1hci5zY29wZU5hbWVdIH0pO1xuXG4gICAgaWYgKHNjaGVtYT8udHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiB7IC4uLmJhc2UsIC4uLnNjb3BlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NvcGVkID8/IGJhc2U7XG4gICAgfVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShUQUdfTkFNRSwgU2Nyb2xsR3V0dGVyKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNjcm9sbEd1dHRlckVsZW1lbnQoKTogU2Nyb2xsR3V0dGVyIHtcbiAgbGV0IGVsZW1lbnQ6IFNjcm9sbEd1dHRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoVEFHX05BTUUpIGFzIFNjcm9sbEd1dHRlcjtcbiAgLy8gZWxlbWVudC5jcmVhdGVkQ2FsbGJhY2soKTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG4iXX0=