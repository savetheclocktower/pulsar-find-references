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
const minimatch_1 = require("minimatch");
const etch_1 = __importDefault(require("etch"));
const path_1 = __importDefault(require("path"));
const classnames_1 = __importDefault(require("classnames"));
const reference_group_view_1 = __importDefault(require("./reference-group-view"));
const console = __importStar(require("../console"));
function isEtchComponent(el) {
    if (!el)
        return false;
    if (typeof el !== 'object')
        return false;
    return ('refs' in el) && ('element' in el);
}
function pluralize(count, singular, plural = `${singular}s`) {
    let noun = count === 1 ? singular : plural;
    return `${count} ${noun}`;
}
function describeReferences(referenceCount, fileCount, symbolName) {
    return (etch_1.default.dom("span", { ref: "previewCount", className: "preview-count inline-block" },
        pluralize(referenceCount, 'result'),
        " found in ",
        ' ',
        pluralize(fileCount, 'file'),
        " for ",
        ' ',
        etch_1.default.dom("span", { className: "highlight-info" }, symbolName)));
}
function descendsFrom(filePath, projectPath) {
    if (typeof filePath !== 'string')
        return false;
    return filePath.startsWith(projectPath.endsWith(path_1.default.sep) ? projectPath : `${projectPath}${path_1.default.sep}`);
}
function descendsFromAny(filePath, projectPaths) {
    for (let projectPath of projectPaths) {
        if (descendsFrom(filePath, projectPath))
            return projectPath;
    }
    return false;
}
function matchesIgnoredNames(filePath, ignoredNames) {
    let repositories = atom.project.getRepositories();
    if (repositories.some(r => r.isPathIgnored(filePath)))
        return true;
    return ignoredNames.some(ig => {
        let result = ig.match(filePath);
        return result;
    });
}
function getOppositeSplit(split) {
    return {
        left: 'right',
        right: 'left',
        down: 'up',
        up: 'down',
        none: undefined
    }[split];
}
let panelId = 1;
class ReferencesView {
    static nextUri() {
        return `${ReferencesView.URI}/${panelId++}`;
    }
    static setReferences(uri, context) {
        if (ReferencesView.instances.has(uri)) {
            // This instance already exists, so we can update it directly.
            ReferencesView.instances.get(uri).update(context);
        }
        else {
            // This instance will soon exist, so we'll store this data for future
            // lookup.
            ReferencesView.CONTEXTS.set(uri, context);
        }
    }
    constructor(uri, props) {
        // Whether this panel can be reused the next time the “Show Panel” command is
        // invoked.
        this.overridable = true;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.ignoredNameMatchers = null;
        this.splitDirection = 'none';
        this.emitter = new atom_1.Emitter();
        // URIs of buffers in the current result set.
        this.uris = new Set();
        // Keeps track of which result has keyboard focus.
        this.activeNavigationIndex = -1;
        this.lastNavigationIndex = -1;
        this.bufferCache = new Map();
        this.indexToReferenceMap = new Map();
        // Keeps track of which result groups are collapsed.
        this.collapsedIndices = new Set();
        this.previewStyle = { fontFamily: '' };
        ReferencesView.instances.set(uri, this);
        this.uri = uri;
        let context;
        if (props) {
            context = props;
        }
        else if (ReferencesView.CONTEXTS.has(uri)) {
            context = ReferencesView.CONTEXTS.get(uri);
        }
        else {
            throw new Error(`Expected context data for URI: ${uri}`);
        }
        let { references, symbolName, editor, marker, manager } = context;
        this.references = references;
        this.symbolName = symbolName;
        this.editor = editor;
        this.marker = marker;
        this.manager = manager;
        ReferencesView.CONTEXTS.delete(uri);
        console.debug('ReferencesView constructor:', this.uri, this.props);
        if (!this.references) {
            throw new Error(`No references!`);
        }
        this.filterAndGroupReferences();
        etch_1.default.initialize(this);
        this.subscriptions.add(atom.config.observe('editor.fontFamily', this.fontFamilyChanged.bind(this)), atom.config.observe('core.ignoredNames', this.ignoredNamesChanged.bind(this)), atom.config.observe('pulsar-find-references.panel.splitDirection', this.splitDirectionChanged.bind(this)), atom.workspace.observeTextEditors((editor) => {
            // Since this panel updates in real time, we should arguably fetch new
            // references whenever _any_ editor changes. For now, we'll refetch
            // whenever one of the files in the result set is edited, even though
            // this could end up missing new references as they are created.
            editor.onDidStopChanging((_event) => {
                if (this.referencesIncludeBuffer(editor.getBuffer())) {
                    this.refreshPanel();
                }
            });
        }), 
        // If the marker is destroyed or made invalid, it means a buffer change
        // has caused us not to be able to track the logical position of the
        // point that initially trigged this panel. This makes it impossible for
        // us to continue to update the results, so the panel must close.
        this.marker.onDidChange(() => {
            var _a;
            if ((_a = this.marker) === null || _a === void 0 ? void 0 : _a.isValid())
                return;
            this.close();
        }), this.marker.onDidDestroy(() => this.close()));
        atom.commands.add(this.element, {
            'core:move-up': this.moveUp.bind(this),
            'core:move-down': this.moveDown.bind(this),
            'core:move-left': this.collapseActive.bind(this),
            'core:move-right': this.expandActive.bind(this),
            'core:page-up': this.pageUp.bind(this),
            'core:page-down': this.pageDown.bind(this),
            'core:move-to-top': this.moveToTop.bind(this),
            'core:move-to-bottom': this.moveToBottom.bind(this),
            'core:confirm': this.confirmResult.bind(this),
            'core:copy': this.copyResult.bind(this),
            // Piggyback on the user's keybindings for these functions, since the
            // UI is practically identical to that of `find-and-replace`.
            'find-and-replace:copy-path': this.copyPath.bind(this),
            'find-and-replace:open-in-new-tab': this.openInNewTab.bind(this),
        });
        this.element.addEventListener('mousedown', this.handleClick.bind(this));
        this.refs.pinReferences.addEventListener('click', this.handlePinReferencesClicked.bind(this));
        this.focus();
        this.buildBufferCache()
            .then((cache) => {
            this.bufferCache = cache;
            return etch_1.default.update(this);
        });
    }
    // Pane items that provide `onDidChangeTitle` can trigger updates to their
    // tab and window titles.
    onDidChangeTitle(callback) {
        return this.emitter.on('did-change-title', callback);
    }
    // Move keyboard focus to the previous visible result.
    moveUp() {
        if (this.activeNavigationIndex === 0)
            return;
        let index = this.findVisibleNavigationIndex(-1);
        if (index === null)
            return;
        this.activeNavigationIndex = index;
        etch_1.default.update(this).then(() => this.ensureSelectedItemInView());
    }
    // Move keyboard focus to the next visible result.
    moveDown() {
        if (this.activeNavigationIndex === this.lastNavigationIndex)
            return;
        let index = this.findVisibleNavigationIndex(1);
        if (index === null)
            return;
        this.activeNavigationIndex = index;
        etch_1.default.update(this).then(() => this.ensureSelectedItemInView());
    }
    // Move the navigation index some number of increments, skipping any results
    // that are collapsed.
    findVisibleNavigationIndex(delta) {
        let current = this.activeNavigationIndex;
        while (true) {
            current += delta;
            if (current < 0 || current > this.lastNavigationIndex)
                return null;
            let element = this.getElementAtIndex(current);
            if (element && element.clientHeight > 0)
                return current;
        }
    }
    isValidElementIndex(index) {
        if (index < 0)
            return false;
        if (index > this.lastNavigationIndex)
            return false;
        return true;
    }
    scrollOffsetOfElementAtIndex(index) {
        if (!this.isValidElementIndex(index))
            return -1;
        let { scrollContainer } = this.refs;
        let scrollRect = scrollContainer.getBoundingClientRect();
        let element = this.getElementAtIndex(index);
        if (!element || !element.clientHeight)
            return null;
        let elementRect = element.getBoundingClientRect();
        return elementRect.top - scrollRect.top;
    }
    findElementIndexNearHeight(top) {
        let closestEl = null, closestDiff = null;
        for (let i = 0; i <= this.lastNavigationIndex; i++) {
            let offset = this.scrollOffsetOfElementAtIndex(i);
            if (offset === null)
                continue;
            let diff = Math.abs(top - offset);
            if (offset === null)
                continue;
            if (closestEl === null || closestDiff !== null && closestDiff > diff) {
                closestDiff = diff;
                closestEl = i;
            }
        }
        return closestEl !== null && closestEl !== void 0 ? closestEl : -1;
    }
    collapseActive() {
        this.collapseResult(this.activeNavigationIndex);
    }
    expandActive() {
        this.expandResult(this.activeNavigationIndex);
    }
    collapseResult(index) {
        if (this.collapsedIndices.has(index))
            return;
        this.collapsedIndices.add(index);
        etch_1.default.update(this);
    }
    expandResult(index) {
        if (!this.collapsedIndices.has(index))
            return;
        this.collapsedIndices.delete(index);
        etch_1.default.update(this);
    }
    toggleResult(index) {
        let isCollapsed = this.collapsedIndices.has(index);
        if (isCollapsed) {
            this.expandResult(index);
        }
        else {
            this.collapseResult(index);
        }
    }
    pageUp() {
        let currentOffset = this.scrollOffsetOfElementAtIndex(this.activeNavigationIndex);
        if (currentOffset === null)
            return;
        let index = this.findElementIndexNearHeight(currentOffset - this.refs.scrollContainer.offsetHeight);
        this.activeNavigationIndex = index;
        etch_1.default.update(this).then(() => this.ensureSelectedItemInView());
    }
    pageDown() {
        let currentOffset = this.scrollOffsetOfElementAtIndex(this.activeNavigationIndex);
        if (currentOffset === null)
            return;
        let index = this.findElementIndexNearHeight(currentOffset + this.refs.scrollContainer.offsetHeight);
        this.activeNavigationIndex = index;
        etch_1.default.update(this).then(() => this.ensureSelectedItemInView());
    }
    moveToTop() {
        this.activeNavigationIndex = 0;
        etch_1.default.update(this).then(() => this.ensureSelectedItemInView());
    }
    moveToBottom() {
        this.activeNavigationIndex = this.lastNavigationIndex;
        etch_1.default.update(this).then(() => this.ensureSelectedItemInView());
    }
    ensureSelectedItemInView() {
        if (!this.activeElement)
            return;
        let containerRect = this.refs.scrollContainer.getBoundingClientRect();
        let itemRect = this.activeElement.getBoundingClientRect();
        let delta;
        if (itemRect.top < containerRect.top) {
            delta = itemRect.top - containerRect.top;
        }
        else if (itemRect.bottom > containerRect.bottom) {
            delta = itemRect.bottom - containerRect.bottom;
        }
        else {
            return;
        }
        this.refs.scrollContainer.scrollTop += delta;
    }
    confirmResult() {
        if (!this.activeElement)
            return;
        let metadata = this.getMetadataForTarget(this.activeElement);
        if (!metadata)
            return;
        let { filePath, lineNumber, rangeSpec } = metadata;
        this.openResult(filePath, lineNumber, rangeSpec);
    }
    // Copy the line of text from the reference. (Of limited utility, but
    // implemented for feature equivalence with the `find-and-replace` panel.)
    copyResult() {
        if (!this.activeElement)
            return;
        let reference = this.indexToReferenceMap.get(this.activeNavigationIndex);
        if (!reference)
            return;
        if (!this.bufferCache.has(reference.uri))
            return;
        // All the buffers for results should be present in this cache because we
        // preloaded them during render.
        let buffer = this.bufferCache.get(reference.uri);
        if (!buffer)
            return;
        let text = buffer.lineForRow(reference.range.start.row);
        if (!text)
            return;
        atom.clipboard.write(text);
    }
    // Copy the relative file path of the keyboard-focused reference.
    // (Implemented for feature equivalence with the `find-and-replace` panel.)
    copyPath() {
        if (!this.activeElement)
            return;
        const { filePath = null } = this.activeElement.dataset;
        if (!filePath)
            return;
        let [projectPath, relativePath] = atom.project.relativizePath(filePath);
        if (projectPath && atom.project.getDirectories().length > 1) {
            relativePath = path_1.default.join(path_1.default.basename(projectPath), relativePath);
        }
        atom.clipboard.write(relativePath);
    }
    // Open the result in a new tab whether or not it already exists in the
    // workspace.
    openInNewTab() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.activeElement)
                return;
            let metadata = this.getMetadataForTarget(this.activeElement);
            if (!metadata)
                return;
            let { filePath, lineNumber: row, rangeSpec } = metadata;
            if (!filePath)
                return;
            let editor;
            let exists = atom.workspace.getTextEditors().filter(e => e.getPath() === filePath);
            if (!exists) {
                editor = (yield atom.workspace.open(filePath, { activatePane: false, activateItem: false }));
            }
            else {
                editor = (yield atom.workspace.open(filePath));
            }
            this.revealReferenceInEditor(filePath, row, rangeSpec, editor);
        });
    }
    getElementAtIndex(index) {
        let element = this.element.querySelector(`[data-navigation-index="${index}"]`);
        return element ? element : null;
    }
    // The element that has keyboard focus.
    get activeElement() {
        if (this.activeNavigationIndex < 0)
            return null;
        return this.getElementAtIndex(this.activeNavigationIndex);
    }
    update({ references, symbolName, editor, marker, manager }) {
        return __awaiter(this, void 0, void 0, function* () {
            let changed = false;
            if (references && this.references !== references) {
                this.references = references;
                this.filterAndGroupReferences();
                this.indexToReferenceMap.clear();
                this.bufferCache = yield this.buildBufferCache();
                changed = true;
            }
            if (symbolName && this.symbolName !== symbolName) {
                this.symbolName = symbolName;
                // Triggers an update of the tab title.
                this.emitter.emit('did-change-title');
                changed = true;
            }
            // These properties don't trigger re-renders, but they must still be
            // updated if changed.
            if (editor) {
                this.editor = editor;
            }
            if (marker) {
                this.marker = marker;
            }
            if (manager) {
                this.manager = manager;
            }
            return changed ? etch_1.default.update(this) : Promise.resolve();
        });
    }
    destroy() {
        ReferencesView.instances.delete(this.uri);
        this.subscriptions.dispose();
    }
    // Close this window.
    close() {
        this.destroy();
        const pane = atom.workspace.paneForItem(this);
        if (!pane)
            return;
        pane.destroyItem(this);
    }
    // Given a buffer, returns whether the buffer's file path matches any of the
    // current references.
    referencesIncludeBuffer(buffer) {
        let bufferPath = buffer.getPath();
        if (!bufferPath)
            return false;
        return this.uris.has(bufferPath);
    }
    fontFamilyChanged(fontFamily) {
        this.previewStyle = { fontFamily };
        etch_1.default.update(this);
    }
    ignoredNamesChanged(ignoredNames) {
        this.ignoredNameMatchers = ignoredNames.map(ig => new minimatch_1.Minimatch(ig));
    }
    splitDirectionChanged(splitDirection) {
        this.splitDirection = splitDirection;
    }
    getMetadataForTarget(target) {
        if (!target.matches('[data-line-number][data-file-path]'))
            return null;
        let { filePath = '', lineNumber: lineNumberString = '-1', rangeSpec = '' } = target.dataset;
        let lineNumber = Number(lineNumberString);
        return { filePath, lineNumber, rangeSpec };
    }
    handleClick(event) {
        var _a;
        if (!event.target)
            return;
        let target = (_a = event.target) === null || _a === void 0 ? void 0 : _a.closest('[data-navigation-index]');
        if (target) {
            let navigationIndex = Number(target.dataset.navigationIndex);
            let viewportXOffset = event.clientX;
            let targetRect = target.getBoundingClientRect();
            // A bit of a hack, but copies the approach of the equivalent
            // `find-and-replace` result handler. Distinguishes between a click on
            // the result and a click on the disclosure triangle that
            // collapses/expands results.
            if (target.matches('.list-item') && viewportXOffset - targetRect.left <= 16) {
                this.toggleResult(navigationIndex);
                return;
            }
            let metadata = this.getMetadataForTarget(target);
            if (metadata) {
                let { filePath, lineNumber, rangeSpec } = metadata;
                this.openResult(filePath, lineNumber, rangeSpec);
            }
            this.activeNavigationIndex = navigationIndex;
        }
        else {
            this.activeNavigationIndex = -1;
        }
        etch_1.default.update(this);
        event.preventDefault();
    }
    activate() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                this.element.focus();
                resolve();
            });
        });
    }
    handlePinReferencesClicked() {
        this.overridable = !this.overridable;
        etch_1.default.update(this);
    }
    // Brings the user to the given reference on click.
    openResult(filePath, row, rangeSpec, { pending = true } = { pending: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find an existing editor in the workspace for this file or else create
            // one if needed.
            let editor = yield atom.workspace.open(filePath, {
                pending,
                searchAllPanes: true,
                split: getOppositeSplit(this.splitDirection)
            });
            this.revealReferenceInEditor(filePath, row, rangeSpec, editor);
        });
    }
    revealReferenceInEditor(filePath, row, rangeSpec, editor) {
        let referencesForFilePath = this.filteredAndGroupedReferences.get(filePath);
        if (!referencesForFilePath)
            return;
        let referencesForLineNumber = referencesForFilePath.filter(({ range }) => {
            return range.start.row == row;
        });
        let ranges = referencesForLineNumber.map(r => r.range);
        let targetRange = rangeSpec === '' ? ranges[0] : ranges.find(r => {
            return r.toString() === rangeSpec;
        });
        // Reveal the row the result is on if it happens to be folded.
        editor.unfoldBufferRow(row);
        if (ranges.length > 0) {
            // @ts-expect-error undocumented option
            editor.getLastSelection().setBufferRange(targetRange !== null && targetRange !== void 0 ? targetRange : ranges[0], { flash: true });
        }
        editor.scrollToCursorPosition();
    }
    // Groups the references according to the files they belong to.
    filterAndGroupReferences() {
        var _a;
        let paths = atom.project.getPaths();
        let results = new Map();
        let uris = new Set();
        if (!this.references)
            return results;
        // Group references by file.
        for (let reference of this.references) {
            let { uri } = reference;
            uris.add(uri);
            let projectPath = descendsFromAny(uri, paths);
            // Ignore any results that aren't within this project.
            if (projectPath === false)
                continue;
            // Ignore any results within ignored files.
            if (matchesIgnoredNames(uri, (_a = this.ignoredNameMatchers) !== null && _a !== void 0 ? _a : []))
                continue;
            let [_, relativePath] = atom.project.relativizePath(uri);
            let resultsForPath = results.get(relativePath);
            if (!resultsForPath) {
                resultsForPath = [];
                results.set(relativePath, resultsForPath);
            }
            resultsForPath.push(reference);
        }
        this.filteredAndGroupedReferences = results;
        this.uris = uris;
        return results;
    }
    get props() {
        var _a, _b;
        return {
            references: (_a = this.references) !== null && _a !== void 0 ? _a : [],
            symbolName: (_b = this.symbolName) !== null && _b !== void 0 ? _b : '',
            editor: this.editor,
            marker: this.marker,
            manager: this.manager
        };
    }
    writeAfterUpdate() {
        let selected = this.element.querySelector('[data-navigation-index].selected, .list-nested-item.selected');
        if (!selected)
            return;
        // @ts-expect-error proprietary method
        selected.scrollIntoViewIfNeeded();
    }
    copy() {
        let newUri = ReferencesView.nextUri();
        return new ReferencesView(newUri, this.props);
    }
    getTitle() {
        let { symbolName } = this;
        return `“${symbolName}”: Find References Results`;
    }
    getIconName() {
        return 'search';
    }
    getURI() {
        return ReferencesView.URI;
    }
    focus() {
        let referencesView = this.refs.referencesView;
        if (!isEtchComponent(referencesView))
            return;
        referencesView.element.focus();
    }
    // Assembles a map between reference URIs and `TextBuffer`s for child views
    // to consult.
    buildBufferCache() {
        return __awaiter(this, void 0, void 0, function* () {
            let map = new Map();
            let editors = atom.workspace.getTextEditors();
            for (let editor of editors) {
                let path = editor.getPath();
                let buffer = editor.getBuffer();
                if (path === undefined)
                    continue;
                if (map.has(path))
                    continue;
                map.set(path, buffer);
            }
            // Any buffers that aren't present already in the work space can be created
            // from files on disk.
            for (let uri of this.uris) {
                if (map.has(uri))
                    continue;
                map.set(uri, yield atom_1.TextBuffer.load(uri));
            }
            return map;
        });
    }
    // How do we keep refreshing the references panel as we make changes in the
    // project?
    //
    // * Remember the cursor position that triggered the panel. Create a marker
    //   to track the logical buffer position through edits.
    // * Open the panel and show the results.
    // * When you open the panel, add an `onDidStopChanging` observer to every
    //   `TextEditor` in the project. The callback should return early if the
    //   editor isn't changing a buffer that is in the result set; otherwise it
    //   should re-request the list of references.
    // * When references are re-requested, they should use the current buffer
    //   position of the marker we created in step 1.
    //
    // This works for as long as the cursor position can be logically tracked. If
    // the marker is invalidated, that means a change has completely surrounded
    // it, and we can no longer affirm it refers to the same symbol. At this
    // point, we close the panel.
    refreshPanel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.manager || !this.editor || !this.marker)
                return;
            let bundle = yield this.manager.findReferencesForProjectAtPosition(this.editor, this.marker.getBufferRange().start);
            if (!bundle || bundle.type === 'error')
                return;
            yield this.update({
                references: bundle.references,
                symbolName: bundle.referencedSymbolName
            });
        });
    }
    render() {
        let listStyle = {
            position: 'absolute',
            overflow: 'hidden',
            left: '0',
            top: '0',
            right: '0'
        };
        let children = [];
        let navigationIndex = 0;
        for (let [relativePath, references] of this.filteredAndGroupedReferences) {
            let view = (etch_1.default.dom(reference_group_view_1.default, { relativePath: relativePath, references: references, navigationIndex: navigationIndex, indexToReferenceMap: this.indexToReferenceMap, activeNavigationIndex: this.activeNavigationIndex, bufferCache: this.bufferCache, isCollapsed: this.collapsedIndices.has(navigationIndex) }));
            children.push(view);
            navigationIndex += references.length + 1;
        }
        this.lastNavigationIndex = navigationIndex - 1;
        let containerStyle = {
            position: 'relative',
            height: '100%',
            overflow: 'auto',
        };
        let matchCount = this.references.length;
        let classNames = (0, classnames_1.default)('find-references-pane', 'preview-pane', 'pane-item', { 'no-results': matchCount === 0 });
        let pinButtonClassNames = (0, classnames_1.default)('btn', 'icon', 'icon-pin', {
            'selected': !this.overridable
        });
        return (etch_1.default.dom("div", { className: classNames, tabIndex: -1 },
            etch_1.default.dom("div", { className: "preview-header" },
                describeReferences(this.references.length, this.filteredAndGroupedReferences.size, this.symbolName),
                etch_1.default.dom("div", { ref: "pinReferences", className: pinButtonClassNames }, "Don\u2019t override")),
            etch_1.default.dom("div", { ref: "referencesView", className: "results-view focusable-panel", tabIndex: -1, style: this.previewStyle },
                etch_1.default.dom("div", { ref: "scrollContainer", className: "results-view-container", style: containerStyle },
                    etch_1.default.dom("ol", { className: "list-tree has-collapsable-children", style: listStyle }, children)))));
    }
}
// Base URI. We add `/1`, `/2`, etc., so that different instances of the
// panel can be distinguished.
ReferencesView.URI = "atom://pulsar-find-references/results";
// Initialization data for panels that have not yet been instantiated.
ReferencesView.CONTEXTS = new Map();
// Instances of `ReferencesView`.
ReferencesView.instances = new Map();
exports.default = ReferencesView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFNYztBQUNkLHlDQUFzQztBQUN0QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDREQUE0QjtBQUU1QixrRkFBd0Q7QUFDeEQsb0RBQXNDO0FBTXRDLFNBQVMsZUFBZSxDQUFDLEVBQVc7SUFDbEMsSUFBSSxDQUFDLEVBQUU7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN0QixJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN6QyxPQUFPLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFHRCxTQUFTLFNBQVMsQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxTQUFpQixHQUFHLFFBQVEsR0FBRztJQUNqRixJQUFJLElBQUksR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMzQyxPQUFPLEdBQUcsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLGNBQXNCLEVBQUUsU0FBaUIsRUFBRSxVQUFrQjtJQUN2RixPQUFPLENBQ0wsNkJBQU0sR0FBRyxFQUFDLGNBQWMsRUFBQyxTQUFTLEVBQUMsNEJBQTRCO1FBQzVELFNBQVMsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDOztRQUFZLEdBQUc7UUFDbEQsU0FBUyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUM7O1FBQU8sR0FBRztRQUN2Qyw2QkFBTSxTQUFTLEVBQUMsZ0JBQWdCLElBQUUsVUFB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R0FBdUMsSUFBSSxHQUFHLEVBQUUsQUFBaEQsQ0FBaUQ7QUFFaEUsaUNBQWlDO0FBQzFCLHdCQUFTLEdBQWdDLElBQUksR0FBRyxFQUFFLEFBQXpDLENBQTBDO2tCQVR2QyxjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlcixcbiAgRW1pdHRlcixcbiAgVGV4dEJ1ZmZlcixcbiAgVGV4dEVkaXRvclxufSBmcm9tICdhdG9tJztcbmltcG9ydCB7IE1pbmltYXRjaCB9IGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgZXRjaCBmcm9tICdldGNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGN4IGZyb20gJ2NsYXNzbmFtZXMnO1xuXG5pbXBvcnQgUmVmZXJlbmNlR3JvdXBWaWV3IGZyb20gJy4vcmVmZXJlbmNlLWdyb3VwLXZpZXcnO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuLi9jb25zb2xlJztcblxuaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCB0eXBlIHsgRXRjaENvbXBvbmVudCB9IGZyb20gJ2V0Y2gnO1xuaW1wb3J0IEZpbmRSZWZlcmVuY2VzTWFuYWdlciBmcm9tICcuLi9maW5kLXJlZmVyZW5jZXMtbWFuYWdlcic7XG5cbmZ1bmN0aW9uIGlzRXRjaENvbXBvbmVudChlbDogdW5rbm93bik6IGVsIGlzIEV0Y2hDb21wb25lbnQge1xuICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgZWwgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ3JlZnMnIGluIGVsKSAmJiAoJ2VsZW1lbnQnIGluIGVsKTtcbn1cblxuXG5mdW5jdGlvbiBwbHVyYWxpemUoY291bnQ6IG51bWJlciwgc2luZ3VsYXI6IHN0cmluZywgcGx1cmFsOiBzdHJpbmcgPSBgJHtzaW5ndWxhcn1zYCkge1xuICBsZXQgbm91biA9IGNvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWw7XG4gIHJldHVybiBgJHtjb3VudH0gJHtub3VufWA7XG59XG5cbmZ1bmN0aW9uIGRlc2NyaWJlUmVmZXJlbmNlcyhyZWZlcmVuY2VDb3VudDogbnVtYmVyLCBmaWxlQ291bnQ6IG51bWJlciwgc3ltYm9sTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiAoXG4gICAgPHNwYW4gcmVmPVwicHJldmlld0NvdW50XCIgY2xhc3NOYW1lPVwicHJldmlldy1jb3VudCBpbmxpbmUtYmxvY2tcIj5cbiAgICAgIHtwbHVyYWxpemUocmVmZXJlbmNlQ291bnQsICdyZXN1bHQnKX0gZm91bmQgaW4geycgJ31cbiAgICAgIHtwbHVyYWxpemUoZmlsZUNvdW50LCAnZmlsZScpfSBmb3IgeycgJ31cbiAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImhpZ2hsaWdodC1pbmZvXCI+e3N5bWJvbE5hbWV9PC9zcGFuPlxuICAgIDwvc3Bhbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gZGVzY2VuZHNGcm9tKGZpbGVQYXRoOiBzdHJpbmcsIHByb2plY3RQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBmaWxlUGF0aCAhPT0gJ3N0cmluZycpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIGZpbGVQYXRoLnN0YXJ0c1dpdGgoXG4gICAgcHJvamVjdFBhdGguZW5kc1dpdGgoUGF0aC5zZXApID8gcHJvamVjdFBhdGggOiBgJHtwcm9qZWN0UGF0aH0ke1BhdGguc2VwfWBcbiAgKTtcbn1cblxuZnVuY3Rpb24gZGVzY2VuZHNGcm9tQW55KGZpbGVQYXRoOiBzdHJpbmcsIHByb2plY3RQYXRoczogc3RyaW5nW10pOiBzdHJpbmcgfCBmYWxzZSB7XG4gIGZvciAobGV0IHByb2plY3RQYXRoIG9mIHByb2plY3RQYXRocykge1xuICAgIGlmIChkZXNjZW5kc0Zyb20oZmlsZVBhdGgsIHByb2plY3RQYXRoKSkgcmV0dXJuIHByb2plY3RQYXRoO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlc0lnbm9yZWROYW1lcyhmaWxlUGF0aDogc3RyaW5nLCBpZ25vcmVkTmFtZXM6IE1pbmltYXRjaFtdKSB7XG4gIGxldCByZXBvc2l0b3JpZXMgPSBhdG9tLnByb2plY3QuZ2V0UmVwb3NpdG9yaWVzKCk7XG4gIGlmIChyZXBvc2l0b3JpZXMuc29tZShyID0+IHIuaXNQYXRoSWdub3JlZChmaWxlUGF0aCkpKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGlnbm9yZWROYW1lcy5zb21lKGlnID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gaWcubWF0Y2goZmlsZVBhdGgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufVxuXG50eXBlIFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCAnbm9uZSc7XG50eXBlIEZvcm1hbFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCB1bmRlZmluZWQ7XG5cbnR5cGUgUmVmZXJlbmNlc1ZpZXdDb250ZXh0ID0ge1xuICBtYW5hZ2VyOiBGaW5kUmVmZXJlbmNlc01hbmFnZXIsXG4gIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgbWFya2VyOiBEaXNwbGF5TWFya2VyLFxuICByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSxcbiAgc3ltYm9sTmFtZTogc3RyaW5nXG59XG5cbnR5cGUgUmVmZXJlbmNlc1ZpZXdQcm9wZXJ0aWVzID0geyByZWY/OiBzdHJpbmcgfSAmIFJlZmVyZW5jZXNWaWV3Q29udGV4dDtcblxuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVTcGxpdChzcGxpdDogU3BsaXREaXJlY3Rpb24pOiBGb3JtYWxTcGxpdERpcmVjdGlvbiB7XG4gIHJldHVybiB7XG4gICAgbGVmdDogJ3JpZ2h0JyxcbiAgICByaWdodDogJ2xlZnQnLFxuICAgIGRvd246ICd1cCcsXG4gICAgdXA6ICdkb3duJyxcbiAgICBub25lOiB1bmRlZmluZWRcbiAgfVtzcGxpdF0gYXMgRm9ybWFsU3BsaXREaXJlY3Rpb247XG59XG5cbmxldCBwYW5lbElkID0gMTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVmZXJlbmNlc1ZpZXcge1xuICAvLyBCYXNlIFVSSS4gV2UgYWRkIGAvMWAsIGAvMmAsIGV0Yy4sIHNvIHRoYXQgZGlmZmVyZW50IGluc3RhbmNlcyBvZiB0aGVcbiAgLy8gcGFuZWwgY2FuIGJlIGRpc3Rpbmd1aXNoZWQuXG4gIHN0YXRpYyBVUkkgPSBcImF0b206Ly9wdWxzYXItZmluZC1yZWZlcmVuY2VzL3Jlc3VsdHNcIjtcblxuICAvLyBJbml0aWFsaXphdGlvbiBkYXRhIGZvciBwYW5lbHMgdGhhdCBoYXZlIG5vdCB5ZXQgYmVlbiBpbnN0YW50aWF0ZWQuXG4gIHN0YXRpYyBDT05URVhUUzogTWFwPHN0cmluZywgUmVmZXJlbmNlc1ZpZXdDb250ZXh0PiA9IG5ldyBNYXAoKTtcblxuICAvLyBJbnN0YW5jZXMgb2YgYFJlZmVyZW5jZXNWaWV3YC5cbiAgc3RhdGljIGluc3RhbmNlczogTWFwPHN0cmluZywgUmVmZXJlbmNlc1ZpZXc+ID0gbmV3IE1hcCgpO1xuXG4gIHN0YXRpYyBuZXh0VXJpICgpIHtcbiAgICByZXR1cm4gYCR7UmVmZXJlbmNlc1ZpZXcuVVJJfS8ke3BhbmVsSWQrK31gO1xuICB9XG5cbiAgc3RhdGljIHNldFJlZmVyZW5jZXMoXG4gICAgdXJpOiBzdHJpbmcsXG4gICAgY29udGV4dDogUmVmZXJlbmNlc1ZpZXdDb250ZXh0XG4gICkge1xuICAgIGlmIChSZWZlcmVuY2VzVmlldy5pbnN0YW5jZXMuaGFzKHVyaSkpIHtcbiAgICAgIC8vIFRoaXMgaW5zdGFuY2UgYWxyZWFkeSBleGlzdHMsIHNvIHdlIGNhbiB1cGRhdGUgaXQgZGlyZWN0bHkuXG4gICAgICBSZWZlcmVuY2VzVmlldy5pbnN0YW5jZXMuZ2V0KHVyaSkhLnVwZGF0ZShjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpbnN0YW5jZSB3aWxsIHNvb24gZXhpc3QsIHNvIHdlJ2xsIHN0b3JlIHRoaXMgZGF0YSBmb3IgZnV0dXJlXG4gICAgICAvLyBsb29rdXAuXG4gICAgICBSZWZlcmVuY2VzVmlldy5DT05URVhUUy5zZXQodXJpLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgdXJpOiBzdHJpbmc7XG5cbiAgLy8gV2hldGhlciB0aGlzIHBhbmVsIGNhbiBiZSByZXVzZWQgdGhlIG5leHQgdGltZSB0aGUg4oCcU2hvdyBQYW5lbOKAnSBjb21tYW5kIGlzXG4gIC8vIGludm9rZWQuXG4gIHB1YmxpYyBvdmVycmlkYWJsZTogYm9vbGVhbiA9IHRydWU7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICAvLyBDb21wb25lbnQgcHJvcGVydGllcy5cbiAgcHJpdmF0ZSByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXTtcbiAgcHJpdmF0ZSBzeW1ib2xOYW1lOiBzdHJpbmc7XG4gIHByaXZhdGUgZWRpdG9yOiBUZXh0RWRpdG9yO1xuICBwcml2YXRlIG1hcmtlcjogRGlzcGxheU1hcmtlcjtcbiAgcHJpdmF0ZSBtYW5hZ2VyOiBGaW5kUmVmZXJlbmNlc01hbmFnZXI7XG5cbiAgcHJpdmF0ZSBpZ25vcmVkTmFtZU1hdGNoZXJzOiBNaW5pbWF0Y2hbXSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbiA9ICdub25lJztcblxuICBwcml2YXRlIGVtaXR0ZXI6IEVtaXR0ZXIgPSBuZXcgRW1pdHRlcigpO1xuXG4gIHByaXZhdGUgZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcyE6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZVtdPjtcblxuICAvLyBVUklzIG9mIGJ1ZmZlcnMgaW4gdGhlIGN1cnJlbnQgcmVzdWx0IHNldC5cbiAgcHJpdmF0ZSB1cmlzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcblxuICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCByZXN1bHQgaGFzIGtleWJvYXJkIGZvY3VzLlxuICBwcml2YXRlIGFjdGl2ZU5hdmlnYXRpb25JbmRleDogbnVtYmVyID0gLTE7XG4gIHByaXZhdGUgbGFzdE5hdmlnYXRpb25JbmRleDogbnVtYmVyID0gLTE7XG5cbiAgcHJpdmF0ZSBidWZmZXJDYWNoZTogTWFwPHN0cmluZywgVGV4dEJ1ZmZlcj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgaW5kZXhUb1JlZmVyZW5jZU1hcDogTWFwPG51bWJlciwgUmVmZXJlbmNlPiA9IG5ldyBNYXAoKTtcblxuICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCByZXN1bHQgZ3JvdXBzIGFyZSBjb2xsYXBzZWQuXG4gIHByaXZhdGUgY29sbGFwc2VkSW5kaWNlczogU2V0PG51bWJlcj4gPSBuZXcgU2V0KCk7XG5cbiAgcHJpdmF0ZSBwcmV2aWV3U3R5bGU6IHsgZm9udEZhbWlseTogc3RyaW5nIH0gPSB7IGZvbnRGYW1pbHk6ICcnIH07XG5cbiAgcHVibGljIGVsZW1lbnQhOiBIVE1MRWxlbWVudDtcbiAgcHVibGljIHJlZnMhOiB7IFtrZXk6IHN0cmluZ106IEhUTUxFbGVtZW50IH07XG5cbiAgY29uc3RydWN0b3IodXJpOiBzdHJpbmcsIHByb3BzPzogUmVmZXJlbmNlc1ZpZXdDb250ZXh0KSB7XG4gICAgUmVmZXJlbmNlc1ZpZXcuaW5zdGFuY2VzLnNldCh1cmksIHRoaXMpO1xuICAgIHRoaXMudXJpID0gdXJpO1xuICAgIGxldCBjb250ZXh0OiBSZWZlcmVuY2VzVmlld0NvbnRleHRcbiAgICBpZiAocHJvcHMpIHtcbiAgICAgIGNvbnRleHQgPSBwcm9wcztcbiAgICB9IGVsc2UgaWYgKFJlZmVyZW5jZXNWaWV3LkNPTlRFWFRTLmhhcyh1cmkpKSB7XG4gICAgICBjb250ZXh0ID0gUmVmZXJlbmNlc1ZpZXcuQ09OVEVYVFMuZ2V0KHVyaSkhXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgY29udGV4dCBkYXRhIGZvciBVUkk6ICR7dXJpfWApXG4gICAgfVxuXG4gICAgbGV0IHsgcmVmZXJlbmNlcywgc3ltYm9sTmFtZSwgZWRpdG9yLCBtYXJrZXIsIG1hbmFnZXIgfSA9IGNvbnRleHQ7XG4gICAgdGhpcy5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcztcbiAgICB0aGlzLnN5bWJvbE5hbWUgPSBzeW1ib2xOYW1lO1xuICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgIHRoaXMubWFya2VyID0gbWFya2VyO1xuICAgIHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XG5cbiAgICBSZWZlcmVuY2VzVmlldy5DT05URVhUUy5kZWxldGUodXJpKTtcblxuICAgIGNvbnNvbGUuZGVidWcoJ1JlZmVyZW5jZXNWaWV3IGNvbnN0cnVjdG9yOicsIHRoaXMudXJpLCB0aGlzLnByb3BzKTtcblxuICAgIGlmICghdGhpcy5yZWZlcmVuY2VzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHJlZmVyZW5jZXMhYCk7XG4gICAgfVxuXG4gICAgdGhpcy5maWx0ZXJBbmRHcm91cFJlZmVyZW5jZXMoKTtcblxuICAgIGV0Y2guaW5pdGlhbGl6ZSh0aGlzKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKCdlZGl0b3IuZm9udEZhbWlseScsIHRoaXMuZm9udEZhbWlseUNoYW5nZWQuYmluZCh0aGlzKSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKCdjb3JlLmlnbm9yZWROYW1lcycsIHRoaXMuaWdub3JlZE5hbWVzQ2hhbmdlZC5iaW5kKHRoaXMpKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMucGFuZWwuc3BsaXREaXJlY3Rpb24nLCB0aGlzLnNwbGl0RGlyZWN0aW9uQ2hhbmdlZC5iaW5kKHRoaXMpKSxcblxuICAgICAgYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKChlZGl0b3IpID0+IHtcbiAgICAgICAgLy8gU2luY2UgdGhpcyBwYW5lbCB1cGRhdGVzIGluIHJlYWwgdGltZSwgd2Ugc2hvdWxkIGFyZ3VhYmx5IGZldGNoIG5ld1xuICAgICAgICAvLyByZWZlcmVuY2VzIHdoZW5ldmVyIF9hbnlfIGVkaXRvciBjaGFuZ2VzLiBGb3Igbm93LCB3ZSdsbCByZWZldGNoXG4gICAgICAgIC8vIHdoZW5ldmVyIG9uZSBvZiB0aGUgZmlsZXMgaW4gdGhlIHJlc3VsdCBzZXQgaXMgZWRpdGVkLCBldmVuIHRob3VnaFxuICAgICAgICAvLyB0aGlzIGNvdWxkIGVuZCB1cCBtaXNzaW5nIG5ldyByZWZlcmVuY2VzIGFzIHRoZXkgYXJlIGNyZWF0ZWQuXG4gICAgICAgIGVkaXRvci5vbkRpZFN0b3BDaGFuZ2luZygoX2V2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMucmVmZXJlbmNlc0luY2x1ZGVCdWZmZXIoZWRpdG9yLmdldEJ1ZmZlcigpKSkge1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoUGFuZWwoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9KSxcblxuICAgICAgLy8gSWYgdGhlIG1hcmtlciBpcyBkZXN0cm95ZWQgb3IgbWFkZSBpbnZhbGlkLCBpdCBtZWFucyBhIGJ1ZmZlciBjaGFuZ2VcbiAgICAgIC8vIGhhcyBjYXVzZWQgdXMgbm90IHRvIGJlIGFibGUgdG8gdHJhY2sgdGhlIGxvZ2ljYWwgcG9zaXRpb24gb2YgdGhlXG4gICAgICAvLyBwb2ludCB0aGF0IGluaXRpYWxseSB0cmlnZ2VkIHRoaXMgcGFuZWwuIFRoaXMgbWFrZXMgaXQgaW1wb3NzaWJsZSBmb3JcbiAgICAgIC8vIHVzIHRvIGNvbnRpbnVlIHRvIHVwZGF0ZSB0aGUgcmVzdWx0cywgc28gdGhlIHBhbmVsIG11c3QgY2xvc2UuXG4gICAgICB0aGlzLm1hcmtlci5vbkRpZENoYW5nZSgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLm1hcmtlcj8uaXNWYWxpZCgpKSByZXR1cm47XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pLFxuICAgICAgdGhpcy5tYXJrZXIub25EaWREZXN0cm95KCgpID0+IHRoaXMuY2xvc2UoKSlcbiAgICApO1xuXG4gICAgYXRvbS5jb21tYW5kcy5hZGQ8Tm9kZT4oXG4gICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICB7XG4gICAgICAgICdjb3JlOm1vdmUtdXAnOiB0aGlzLm1vdmVVcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLWRvd24nOiB0aGlzLm1vdmVEb3duLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtbGVmdCc6IHRoaXMuY29sbGFwc2VBY3RpdmUuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS1yaWdodCc6IHRoaXMuZXhwYW5kQWN0aXZlLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOnBhZ2UtdXAnOiB0aGlzLnBhZ2VVcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpwYWdlLWRvd24nOiB0aGlzLnBhZ2VEb3duLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtdG8tdG9wJzogdGhpcy5tb3ZlVG9Ub3AuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS10by1ib3R0b20nOiB0aGlzLm1vdmVUb0JvdHRvbS5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpjb25maXJtJzogdGhpcy5jb25maXJtUmVzdWx0LmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOmNvcHknOiB0aGlzLmNvcHlSZXN1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgLy8gUGlnZ3liYWNrIG9uIHRoZSB1c2VyJ3Mga2V5YmluZGluZ3MgZm9yIHRoZXNlIGZ1bmN0aW9ucywgc2luY2UgdGhlXG4gICAgICAgIC8vIFVJIGlzIHByYWN0aWNhbGx5IGlkZW50aWNhbCB0byB0aGF0IG9mIGBmaW5kLWFuZC1yZXBsYWNlYC5cbiAgICAgICAgJ2ZpbmQtYW5kLXJlcGxhY2U6Y29weS1wYXRoJzogdGhpcy5jb3B5UGF0aC5iaW5kKHRoaXMpLFxuICAgICAgICAnZmluZC1hbmQtcmVwbGFjZTpvcGVuLWluLW5ldy10YWInOiB0aGlzLm9wZW5Jbk5ld1RhYi5iaW5kKHRoaXMpLFxuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMucmVmcy5waW5SZWZlcmVuY2VzLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnY2xpY2snLFxuICAgICAgdGhpcy5oYW5kbGVQaW5SZWZlcmVuY2VzQ2xpY2tlZC5iaW5kKHRoaXMpXG4gICAgKTtcblxuICAgIHRoaXMuZm9jdXMoKTtcblxuICAgIHRoaXMuYnVpbGRCdWZmZXJDYWNoZSgpXG4gICAgICAudGhlbigoY2FjaGUpID0+IHtcbiAgICAgICAgdGhpcy5idWZmZXJDYWNoZSA9IGNhY2hlXG4gICAgICAgIHJldHVybiBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLy8gUGFuZSBpdGVtcyB0aGF0IHByb3ZpZGUgYG9uRGlkQ2hhbmdlVGl0bGVgIGNhbiB0cmlnZ2VyIHVwZGF0ZXMgdG8gdGhlaXJcbiAgLy8gdGFiIGFuZCB3aW5kb3cgdGl0bGVzLlxuICBvbkRpZENoYW5nZVRpdGxlIChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgIHJldHVybiB0aGlzLmVtaXR0ZXIub24oJ2RpZC1jaGFuZ2UtdGl0bGUnLCBjYWxsYmFjayk7XG4gIH1cblxuICAvLyBNb3ZlIGtleWJvYXJkIGZvY3VzIHRvIHRoZSBwcmV2aW91cyB2aXNpYmxlIHJlc3VsdC5cbiAgbW92ZVVwKCkge1xuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9PT0gMCkgcmV0dXJuO1xuICAgIGxldCBpbmRleCA9IHRoaXMuZmluZFZpc2libGVOYXZpZ2F0aW9uSW5kZXgoLTEpO1xuICAgIGlmIChpbmRleCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcykudGhlbigoKSA9PiB0aGlzLmVuc3VyZVNlbGVjdGVkSXRlbUluVmlldygpKTtcbiAgfVxuXG4gIC8vIE1vdmUga2V5Ym9hcmQgZm9jdXMgdG8gdGhlIG5leHQgdmlzaWJsZSByZXN1bHQuXG4gIG1vdmVEb3duKCkge1xuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9PT0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4KSByZXR1cm47XG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kVmlzaWJsZU5hdmlnYXRpb25JbmRleCgxKTtcbiAgICBpZiAoaW5kZXggPT09IG51bGwpIHJldHVybjtcbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpLnRoZW4oKCkgPT4gdGhpcy5lbnN1cmVTZWxlY3RlZEl0ZW1JblZpZXcoKSk7XG4gIH1cblxuICAvLyBNb3ZlIHRoZSBuYXZpZ2F0aW9uIGluZGV4IHNvbWUgbnVtYmVyIG9mIGluY3JlbWVudHMsIHNraXBwaW5nIGFueSByZXN1bHRzXG4gIC8vIHRoYXQgYXJlIGNvbGxhcHNlZC5cbiAgZmluZFZpc2libGVOYXZpZ2F0aW9uSW5kZXgoZGVsdGE6IG51bWJlcikge1xuICAgIGxldCBjdXJyZW50ID0gdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGN1cnJlbnQgKz0gZGVsdGE7XG4gICAgICBpZiAoY3VycmVudCA8IDAgfHwgY3VycmVudCA+IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCkgcmV0dXJuIG51bGw7XG4gICAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0RWxlbWVudEF0SW5kZXgoY3VycmVudCk7XG4gICAgICBpZiAoZWxlbWVudCAmJiBlbGVtZW50LmNsaWVudEhlaWdodCA+IDApIHJldHVybiBjdXJyZW50O1xuICAgIH1cbiAgfVxuXG4gIGlzVmFsaWRFbGVtZW50SW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgIGlmIChpbmRleCA8IDApIHJldHVybiBmYWxzZTtcbiAgICBpZiAoaW5kZXggPiB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXgpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgoaW5kZXg6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xuICAgIGlmICghdGhpcy5pc1ZhbGlkRWxlbWVudEluZGV4KGluZGV4KSkgcmV0dXJuIC0xO1xuICAgIGxldCB7IHNjcm9sbENvbnRhaW5lciB9ID0gdGhpcy5yZWZzO1xuICAgIGxldCBzY3JvbGxSZWN0ID0gc2Nyb2xsQ29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRFbGVtZW50QXRJbmRleChpbmRleCk7XG4gICAgaWYgKCFlbGVtZW50IHx8ICFlbGVtZW50LmNsaWVudEhlaWdodCkgcmV0dXJuIG51bGw7XG4gICAgbGV0IGVsZW1lbnRSZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gZWxlbWVudFJlY3QudG9wIC0gc2Nyb2xsUmVjdC50b3A7XG4gIH1cblxuICBmaW5kRWxlbWVudEluZGV4TmVhckhlaWdodCh0b3A6IG51bWJlcikge1xuICAgIGxldCBjbG9zZXN0RWwgPSBudWxsLCBjbG9zZXN0RGlmZiA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4OyBpKyspIHtcbiAgICAgIGxldCBvZmZzZXQgPSB0aGlzLnNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgoaSk7XG4gICAgICBpZiAob2Zmc2V0ID09PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGxldCBkaWZmID0gTWF0aC5hYnModG9wIC0gb2Zmc2V0KTtcbiAgICAgIGlmIChvZmZzZXQgPT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgaWYgKGNsb3Nlc3RFbCA9PT0gbnVsbCB8fCBjbG9zZXN0RGlmZiAhPT0gbnVsbCAmJiBjbG9zZXN0RGlmZiA+IGRpZmYpIHtcbiAgICAgICAgY2xvc2VzdERpZmYgPSBkaWZmO1xuICAgICAgICBjbG9zZXN0RWwgPSBpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbG9zZXN0RWwgPz8gLTE7XG4gIH1cblxuICBjb2xsYXBzZUFjdGl2ZSgpIHtcbiAgICB0aGlzLmNvbGxhcHNlUmVzdWx0KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgfVxuXG4gIGV4cGFuZEFjdGl2ZSgpIHtcbiAgICB0aGlzLmV4cGFuZFJlc3VsdCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gIH1cblxuICBjb2xsYXBzZVJlc3VsdChpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY29sbGFwc2VkSW5kaWNlcy5oYXMoaW5kZXgpKSByZXR1cm47XG4gICAgdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmFkZChpbmRleCk7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBleHBhbmRSZXN1bHQoaW5kZXg6IG51bWJlcikge1xuICAgIGlmICghdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhpbmRleCkpIHJldHVybjtcbiAgICB0aGlzLmNvbGxhcHNlZEluZGljZXMuZGVsZXRlKGluZGV4KTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIHRvZ2dsZVJlc3VsdChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IGlzQ29sbGFwc2VkID0gdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhpbmRleCk7XG4gICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICB0aGlzLmV4cGFuZFJlc3VsdChpbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGFwc2VSZXN1bHQoaW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHBhZ2VVcCgpIHtcbiAgICBsZXQgY3VycmVudE9mZnNldCA9IHRoaXMuc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gICAgaWYgKGN1cnJlbnRPZmZzZXQgPT09IG51bGwpIHJldHVybjtcblxuICAgIGxldCBpbmRleCA9IHRoaXMuZmluZEVsZW1lbnRJbmRleE5lYXJIZWlnaHQoY3VycmVudE9mZnNldCAtIHRoaXMucmVmcy5zY3JvbGxDb250YWluZXIub2Zmc2V0SGVpZ2h0KTtcblxuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcykudGhlbigoKSA9PiB0aGlzLmVuc3VyZVNlbGVjdGVkSXRlbUluVmlldygpKTtcbiAgfVxuXG4gIHBhZ2VEb3duKCkge1xuICAgIGxldCBjdXJyZW50T2Zmc2V0ID0gdGhpcy5zY3JvbGxPZmZzZXRPZkVsZW1lbnRBdEluZGV4KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgICBpZiAoY3VycmVudE9mZnNldCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kRWxlbWVudEluZGV4TmVhckhlaWdodChjdXJyZW50T2Zmc2V0ICsgdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lci5vZmZzZXRIZWlnaHQpO1xuXG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKS50aGVuKCgpID0+IHRoaXMuZW5zdXJlU2VsZWN0ZWRJdGVtSW5WaWV3KCkpO1xuICB9XG5cbiAgbW92ZVRvVG9wKCkge1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gMDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKS50aGVuKCgpID0+IHRoaXMuZW5zdXJlU2VsZWN0ZWRJdGVtSW5WaWV3KCkpO1xuICB9XG5cbiAgbW92ZVRvQm90dG9tKCkge1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpLnRoZW4oKCkgPT4gdGhpcy5lbnN1cmVTZWxlY3RlZEl0ZW1JblZpZXcoKSk7XG4gIH1cblxuICBlbnN1cmVTZWxlY3RlZEl0ZW1JblZpZXcoKSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2ZUVsZW1lbnQpIHJldHVybjtcbiAgICBsZXQgY29udGFpbmVyUmVjdCA9IHRoaXMucmVmcy5zY3JvbGxDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgbGV0IGl0ZW1SZWN0ID0gdGhpcy5hY3RpdmVFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgbGV0IGRlbHRhOiBudW1iZXI7XG4gICAgaWYgKGl0ZW1SZWN0LnRvcCA8IGNvbnRhaW5lclJlY3QudG9wKSB7XG4gICAgICBkZWx0YSA9IGl0ZW1SZWN0LnRvcCAtIGNvbnRhaW5lclJlY3QudG9wO1xuICAgIH0gZWxzZSBpZiAoaXRlbVJlY3QuYm90dG9tID4gY29udGFpbmVyUmVjdC5ib3R0b20pIHtcbiAgICAgIGRlbHRhID0gaXRlbVJlY3QuYm90dG9tIC0gY29udGFpbmVyUmVjdC5ib3R0b207XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AgKz0gZGVsdGE7XG4gIH1cblxuICBjb25maXJtUmVzdWx0KCkge1xuICAgIGlmICghdGhpcy5hY3RpdmVFbGVtZW50KSByZXR1cm47XG4gICAgbGV0IG1ldGFkYXRhID0gdGhpcy5nZXRNZXRhZGF0YUZvclRhcmdldCh0aGlzLmFjdGl2ZUVsZW1lbnQpO1xuICAgIGlmICghbWV0YWRhdGEpIHJldHVybjtcblxuICAgIGxldCB7IGZpbGVQYXRoLCBsaW5lTnVtYmVyLCByYW5nZVNwZWMgfSA9IG1ldGFkYXRhO1xuICAgIHRoaXMub3BlblJlc3VsdChmaWxlUGF0aCwgbGluZU51bWJlciwgcmFuZ2VTcGVjKTtcbiAgfVxuXG4gIC8vIENvcHkgdGhlIGxpbmUgb2YgdGV4dCBmcm9tIHRoZSByZWZlcmVuY2UuIChPZiBsaW1pdGVkIHV0aWxpdHksIGJ1dFxuICAvLyBpbXBsZW1lbnRlZCBmb3IgZmVhdHVyZSBlcXVpdmFsZW5jZSB3aXRoIHRoZSBgZmluZC1hbmQtcmVwbGFjZWAgcGFuZWwuKVxuICBjb3B5UmVzdWx0KCkge1xuICAgIGlmICghdGhpcy5hY3RpdmVFbGVtZW50KSByZXR1cm47XG5cbiAgICBsZXQgcmVmZXJlbmNlID0gdGhpcy5pbmRleFRvUmVmZXJlbmNlTWFwLmdldCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gICAgaWYgKCFyZWZlcmVuY2UpIHJldHVybjtcblxuICAgIGlmICghdGhpcy5idWZmZXJDYWNoZS5oYXMocmVmZXJlbmNlLnVyaSkpIHJldHVybjtcblxuICAgIC8vIEFsbCB0aGUgYnVmZmVycyBmb3IgcmVzdWx0cyBzaG91bGQgYmUgcHJlc2VudCBpbiB0aGlzIGNhY2hlIGJlY2F1c2Ugd2VcbiAgICAvLyBwcmVsb2FkZWQgdGhlbSBkdXJpbmcgcmVuZGVyLlxuICAgIGxldCBidWZmZXIgPSB0aGlzLmJ1ZmZlckNhY2hlLmdldChyZWZlcmVuY2UudXJpKTtcbiAgICBpZiAoIWJ1ZmZlcikgcmV0dXJuO1xuXG4gICAgbGV0IHRleHQgPSBidWZmZXIubGluZUZvclJvdyhyZWZlcmVuY2UucmFuZ2Uuc3RhcnQucm93KTtcbiAgICBpZiAoIXRleHQpIHJldHVybjtcblxuICAgIGF0b20uY2xpcGJvYXJkLndyaXRlKHRleHQpO1xuICB9XG5cbiAgLy8gQ29weSB0aGUgcmVsYXRpdmUgZmlsZSBwYXRoIG9mIHRoZSBrZXlib2FyZC1mb2N1c2VkIHJlZmVyZW5jZS5cbiAgLy8gKEltcGxlbWVudGVkIGZvciBmZWF0dXJlIGVxdWl2YWxlbmNlIHdpdGggdGhlIGBmaW5kLWFuZC1yZXBsYWNlYCBwYW5lbC4pXG4gIGNvcHlQYXRoKCkge1xuICAgIGlmICghdGhpcy5hY3RpdmVFbGVtZW50KSByZXR1cm47XG4gICAgY29uc3QgeyBmaWxlUGF0aCA9IG51bGwgfSA9IHRoaXMuYWN0aXZlRWxlbWVudC5kYXRhc2V0O1xuICAgIGlmICghZmlsZVBhdGgpIHJldHVybjtcbiAgICBsZXQgW3Byb2plY3RQYXRoLCByZWxhdGl2ZVBhdGhdID0gYXRvbS5wcm9qZWN0LnJlbGF0aXZpemVQYXRoKGZpbGVQYXRoKTtcbiAgICBpZiAocHJvamVjdFBhdGggJiYgYXRvbS5wcm9qZWN0LmdldERpcmVjdG9yaWVzKCkubGVuZ3RoID4gMSkge1xuICAgICAgcmVsYXRpdmVQYXRoID0gUGF0aC5qb2luKFBhdGguYmFzZW5hbWUocHJvamVjdFBhdGgpLCByZWxhdGl2ZVBhdGgpO1xuICAgIH1cbiAgICBhdG9tLmNsaXBib2FyZC53cml0ZShyZWxhdGl2ZVBhdGgpO1xuICB9XG5cbiAgLy8gT3BlbiB0aGUgcmVzdWx0IGluIGEgbmV3IHRhYiB3aGV0aGVyIG9yIG5vdCBpdCBhbHJlYWR5IGV4aXN0cyBpbiB0aGVcbiAgLy8gd29ya3NwYWNlLlxuICBhc3luYyBvcGVuSW5OZXdUYWIoKSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2ZUVsZW1lbnQpIHJldHVybjtcblxuICAgIGxldCBtZXRhZGF0YSA9IHRoaXMuZ2V0TWV0YWRhdGFGb3JUYXJnZXQodGhpcy5hY3RpdmVFbGVtZW50KTtcbiAgICBpZiAoIW1ldGFkYXRhKSByZXR1cm47XG5cbiAgICBsZXQgeyBmaWxlUGF0aCwgbGluZU51bWJlcjogcm93LCByYW5nZVNwZWMgfSA9IG1ldGFkYXRhO1xuICAgIGlmICghZmlsZVBhdGgpIHJldHVybjtcblxuICAgIGxldCBlZGl0b3I7XG4gICAgbGV0IGV4aXN0cyA9IGF0b20ud29ya3NwYWNlLmdldFRleHRFZGl0b3JzKCkuZmlsdGVyKGUgPT4gZS5nZXRQYXRoKCkgPT09IGZpbGVQYXRoKTtcbiAgICBpZiAoIWV4aXN0cykge1xuICAgICAgZWRpdG9yID0gYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3BlbihcbiAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgIHsgYWN0aXZhdGVQYW5lOiBmYWxzZSwgYWN0aXZhdGVJdGVtOiBmYWxzZSB9XG4gICAgICApIGFzIFRleHRFZGl0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVkaXRvciA9IGF3YWl0IGF0b20ud29ya3NwYWNlLm9wZW4oZmlsZVBhdGgpIGFzIFRleHRFZGl0b3I7XG4gICAgfVxuXG4gICAgdGhpcy5yZXZlYWxSZWZlcmVuY2VJbkVkaXRvcihmaWxlUGF0aCwgcm93LCByYW5nZVNwZWMsIGVkaXRvcik7XG4gIH1cblxuICBnZXRFbGVtZW50QXRJbmRleChpbmRleDogbnVtYmVyKTogSFRNTEVsZW1lbnQgfCBudWxsICB7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtbmF2aWdhdGlvbi1pbmRleD1cIiR7aW5kZXh9XCJdYCk7XG4gICAgcmV0dXJuIGVsZW1lbnQgPyAoZWxlbWVudCBhcyBIVE1MRWxlbWVudCkgOiBudWxsO1xuICB9XG5cbiAgLy8gVGhlIGVsZW1lbnQgdGhhdCBoYXMga2V5Ym9hcmQgZm9jdXMuXG4gIGdldCBhY3RpdmVFbGVtZW50KCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4IDwgMCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RWxlbWVudEF0SW5kZXgodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlKHsgcmVmZXJlbmNlcywgc3ltYm9sTmFtZSwgZWRpdG9yLCBtYXJrZXIsIG1hbmFnZXIgfTogUGFydGlhbDxSZWZlcmVuY2VzVmlld1Byb3BlcnRpZXM+KSB7XG4gICAgbGV0IGNoYW5nZWQgPSBmYWxzZTtcblxuICAgIGlmIChyZWZlcmVuY2VzICYmIHRoaXMucmVmZXJlbmNlcyAhPT0gcmVmZXJlbmNlcykge1xuICAgICAgdGhpcy5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcztcbiAgICAgIHRoaXMuZmlsdGVyQW5kR3JvdXBSZWZlcmVuY2VzKCk7XG4gICAgICB0aGlzLmluZGV4VG9SZWZlcmVuY2VNYXAuY2xlYXIoKTtcbiAgICAgIHRoaXMuYnVmZmVyQ2FjaGUgPSBhd2FpdCB0aGlzLmJ1aWxkQnVmZmVyQ2FjaGUoKTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoc3ltYm9sTmFtZSAmJiB0aGlzLnN5bWJvbE5hbWUgIT09IHN5bWJvbE5hbWUpIHtcbiAgICAgIHRoaXMuc3ltYm9sTmFtZSA9IHN5bWJvbE5hbWU7XG4gICAgICAvLyBUcmlnZ2VycyBhbiB1cGRhdGUgb2YgdGhlIHRhYiB0aXRsZS5cbiAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCdkaWQtY2hhbmdlLXRpdGxlJyk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGVzZSBwcm9wZXJ0aWVzIGRvbid0IHRyaWdnZXIgcmUtcmVuZGVycywgYnV0IHRoZXkgbXVzdCBzdGlsbCBiZVxuICAgIC8vIHVwZGF0ZWQgaWYgY2hhbmdlZC5cbiAgICBpZiAoZWRpdG9yKSB7XG4gICAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB9XG4gICAgaWYgKG1hcmtlcikge1xuICAgICAgdGhpcy5tYXJrZXIgPSBtYXJrZXI7XG4gICAgfVxuICAgIGlmIChtYW5hZ2VyKSB7XG4gICAgICB0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFuZ2VkID8gZXRjaC51cGRhdGUodGhpcykgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgUmVmZXJlbmNlc1ZpZXcuaW5zdGFuY2VzLmRlbGV0ZSh0aGlzLnVyaSk7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8vIENsb3NlIHRoaXMgd2luZG93LlxuICBjbG9zZSgpIHtcbiAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICBjb25zdCBwYW5lID0gYXRvbS53b3Jrc3BhY2UucGFuZUZvckl0ZW0odGhpcyk7XG4gICAgaWYgKCFwYW5lKSByZXR1cm47XG4gICAgcGFuZS5kZXN0cm95SXRlbSh0aGlzKTtcbiAgfVxuXG4gIC8vIEdpdmVuIGEgYnVmZmVyLCByZXR1cm5zIHdoZXRoZXIgdGhlIGJ1ZmZlcidzIGZpbGUgcGF0aCBtYXRjaGVzIGFueSBvZiB0aGVcbiAgLy8gY3VycmVudCByZWZlcmVuY2VzLlxuICByZWZlcmVuY2VzSW5jbHVkZUJ1ZmZlciAoYnVmZmVyOiBUZXh0QnVmZmVyKSB7XG4gICAgbGV0IGJ1ZmZlclBhdGggPSBidWZmZXIuZ2V0UGF0aCgpXG4gICAgaWYgKCFidWZmZXJQYXRoKSByZXR1cm4gZmFsc2VcbiAgICByZXR1cm4gdGhpcy51cmlzLmhhcyhidWZmZXJQYXRoKVxuICB9XG5cbiAgZm9udEZhbWlseUNoYW5nZWQoZm9udEZhbWlseTogc3RyaW5nKSB7XG4gICAgdGhpcy5wcmV2aWV3U3R5bGUgPSB7IGZvbnRGYW1pbHkgfTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGlnbm9yZWROYW1lc0NoYW5nZWQoaWdub3JlZE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuaWdub3JlZE5hbWVNYXRjaGVycyA9IGlnbm9yZWROYW1lcy5tYXAoaWcgPT4gbmV3IE1pbmltYXRjaChpZykpO1xuICB9XG5cbiAgc3BsaXREaXJlY3Rpb25DaGFuZ2VkKHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbikge1xuICAgIHRoaXMuc3BsaXREaXJlY3Rpb24gPSBzcGxpdERpcmVjdGlvbjtcbiAgfVxuXG4gIGdldE1ldGFkYXRhRm9yVGFyZ2V0ICh0YXJnZXQ6IEhUTUxFbGVtZW50KSB7XG4gICAgaWYgKCF0YXJnZXQubWF0Y2hlcygnW2RhdGEtbGluZS1udW1iZXJdW2RhdGEtZmlsZS1wYXRoXScpKSByZXR1cm4gbnVsbDtcbiAgICBsZXQge1xuICAgICAgZmlsZVBhdGggPSAnJyxcbiAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXJTdHJpbmcgPSAnLTEnLFxuICAgICAgcmFuZ2VTcGVjID0gJydcbiAgICB9ID0gdGFyZ2V0LmRhdGFzZXQ7XG4gICAgbGV0IGxpbmVOdW1iZXIgPSBOdW1iZXIobGluZU51bWJlclN0cmluZyk7XG4gICAgcmV0dXJuIHsgZmlsZVBhdGgsIGxpbmVOdW1iZXIsIHJhbmdlU3BlYyB9O1xuICB9XG5cbiAgaGFuZGxlQ2xpY2soZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICBpZiAoIWV2ZW50LnRhcmdldCkgcmV0dXJuO1xuICAgIGxldCB0YXJnZXQgPSAoZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KT8uY2xvc2VzdCgnW2RhdGEtbmF2aWdhdGlvbi1pbmRleF0nKSBhcyBIVE1MRWxlbWVudDtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBsZXQgbmF2aWdhdGlvbkluZGV4ID0gTnVtYmVyKHRhcmdldC5kYXRhc2V0Lm5hdmlnYXRpb25JbmRleCk7XG4gICAgICBsZXQgdmlld3BvcnRYT2Zmc2V0ID0gZXZlbnQuY2xpZW50WDtcbiAgICAgIGxldCB0YXJnZXRSZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAvLyBBIGJpdCBvZiBhIGhhY2ssIGJ1dCBjb3BpZXMgdGhlIGFwcHJvYWNoIG9mIHRoZSBlcXVpdmFsZW50XG4gICAgICAvLyBgZmluZC1hbmQtcmVwbGFjZWAgcmVzdWx0IGhhbmRsZXIuIERpc3Rpbmd1aXNoZXMgYmV0d2VlbiBhIGNsaWNrIG9uXG4gICAgICAvLyB0aGUgcmVzdWx0IGFuZCBhIGNsaWNrIG9uIHRoZSBkaXNjbG9zdXJlIHRyaWFuZ2xlIHRoYXRcbiAgICAgIC8vIGNvbGxhcHNlcy9leHBhbmRzIHJlc3VsdHMuXG4gICAgICBpZiAodGFyZ2V0Lm1hdGNoZXMoJy5saXN0LWl0ZW0nKSAmJiB2aWV3cG9ydFhPZmZzZXQgLSB0YXJnZXRSZWN0LmxlZnQgPD0gMTYpIHtcbiAgICAgICAgdGhpcy50b2dnbGVSZXN1bHQobmF2aWdhdGlvbkluZGV4KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsZXQgbWV0YWRhdGEgPSB0aGlzLmdldE1ldGFkYXRhRm9yVGFyZ2V0KHRhcmdldCk7XG4gICAgICBpZiAobWV0YWRhdGEpIHtcbiAgICAgICAgbGV0IHsgZmlsZVBhdGgsIGxpbmVOdW1iZXIsIHJhbmdlU3BlYyB9ID0gbWV0YWRhdGE7XG4gICAgICAgIHRoaXMub3BlblJlc3VsdChmaWxlUGF0aCwgbGluZU51bWJlciwgcmFuZ2VTcGVjKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gLTE7XG4gICAgfVxuXG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfVxuXG4gIGFjdGl2YXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuZWxlbWVudC5mb2N1cygpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGhhbmRsZVBpblJlZmVyZW5jZXNDbGlja2VkKCkge1xuICAgIHRoaXMub3ZlcnJpZGFibGUgPSAhdGhpcy5vdmVycmlkYWJsZTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIC8vIEJyaW5ncyB0aGUgdXNlciB0byB0aGUgZ2l2ZW4gcmVmZXJlbmNlIG9uIGNsaWNrLlxuICBhc3luYyBvcGVuUmVzdWx0KFxuICAgIGZpbGVQYXRoOiBzdHJpbmcsXG4gICAgcm93OiBudW1iZXIsXG4gICAgcmFuZ2VTcGVjOiBzdHJpbmcsXG4gICAgeyBwZW5kaW5nID0gdHJ1ZSB9OiB7IHBlbmRpbmc6IGJvb2xlYW4gfSA9IHsgcGVuZGluZzogdHJ1ZSB9XG4gICkge1xuICAgIC8vIEZpbmQgYW4gZXhpc3RpbmcgZWRpdG9yIGluIHRoZSB3b3Jrc3BhY2UgZm9yIHRoaXMgZmlsZSBvciBlbHNlIGNyZWF0ZVxuICAgIC8vIG9uZSBpZiBuZWVkZWQuXG4gICAgbGV0IGVkaXRvciA9IGF3YWl0IGF0b20ud29ya3NwYWNlLm9wZW4oXG4gICAgICBmaWxlUGF0aCxcbiAgICAgIHtcbiAgICAgICAgcGVuZGluZyxcbiAgICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgICAgIHNwbGl0OiBnZXRPcHBvc2l0ZVNwbGl0KHRoaXMuc3BsaXREaXJlY3Rpb24pXG4gICAgICB9XG4gICAgKSBhcyBUZXh0RWRpdG9yO1xuXG4gICAgdGhpcy5yZXZlYWxSZWZlcmVuY2VJbkVkaXRvcihmaWxlUGF0aCwgcm93LCByYW5nZVNwZWMsIGVkaXRvcik7XG4gIH1cblxuICByZXZlYWxSZWZlcmVuY2VJbkVkaXRvcihmaWxlUGF0aDogc3RyaW5nLCByb3c6IG51bWJlciwgcmFuZ2VTcGVjOiBzdHJpbmcsIGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCByZWZlcmVuY2VzRm9yRmlsZVBhdGggPSB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoIXJlZmVyZW5jZXNGb3JGaWxlUGF0aCkgcmV0dXJuXG5cbiAgICBsZXQgcmVmZXJlbmNlc0ZvckxpbmVOdW1iZXIgPSByZWZlcmVuY2VzRm9yRmlsZVBhdGguZmlsdGVyKCh7IHJhbmdlIH0pID0+IHtcbiAgICAgIHJldHVybiByYW5nZS5zdGFydC5yb3cgPT0gcm93O1xuICAgIH0pO1xuXG4gICAgbGV0IHJhbmdlcyA9IHJlZmVyZW5jZXNGb3JMaW5lTnVtYmVyLm1hcChyID0+IHIucmFuZ2UpO1xuICAgIGxldCB0YXJnZXRSYW5nZSA9IHJhbmdlU3BlYyA9PT0gJycgPyByYW5nZXNbMF0gOiByYW5nZXMuZmluZChyID0+IHtcbiAgICAgIHJldHVybiByLnRvU3RyaW5nKCkgPT09IHJhbmdlU3BlYztcbiAgICB9KTtcblxuICAgIC8vIFJldmVhbCB0aGUgcm93IHRoZSByZXN1bHQgaXMgb24gaWYgaXQgaGFwcGVucyB0byBiZSBmb2xkZWQuXG4gICAgZWRpdG9yLnVuZm9sZEJ1ZmZlclJvdyhyb3cpO1xuXG4gICAgaWYgKHJhbmdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yIHVuZG9jdW1lbnRlZCBvcHRpb25cbiAgICAgIGVkaXRvci5nZXRMYXN0U2VsZWN0aW9uKCkuc2V0QnVmZmVyUmFuZ2UodGFyZ2V0UmFuZ2UgPz8gcmFuZ2VzWzBdLCB7IGZsYXNoOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIGVkaXRvci5zY3JvbGxUb0N1cnNvclBvc2l0aW9uKCk7XG4gIH1cblxuICAvLyBHcm91cHMgdGhlIHJlZmVyZW5jZXMgYWNjb3JkaW5nIHRvIHRoZSBmaWxlcyB0aGV5IGJlbG9uZyB0by5cbiAgZmlsdGVyQW5kR3JvdXBSZWZlcmVuY2VzKCk6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZVtdPiB7XG4gICAgbGV0IHBhdGhzID0gYXRvbS5wcm9qZWN0LmdldFBhdGhzKCk7XG4gICAgbGV0IHJlc3VsdHMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlW10+KCk7XG4gICAgbGV0IHVyaXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGlmICghdGhpcy5yZWZlcmVuY2VzKSByZXR1cm4gcmVzdWx0cztcblxuICAgIC8vIEdyb3VwIHJlZmVyZW5jZXMgYnkgZmlsZS5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgdGhpcy5yZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgeyB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgIHVyaXMuYWRkKHVyaSk7XG4gICAgICBsZXQgcHJvamVjdFBhdGggPSBkZXNjZW5kc0Zyb21BbnkodXJpLCBwYXRocyk7XG5cbiAgICAgIC8vIElnbm9yZSBhbnkgcmVzdWx0cyB0aGF0IGFyZW4ndCB3aXRoaW4gdGhpcyBwcm9qZWN0LlxuICAgICAgaWYgKHByb2plY3RQYXRoID09PSBmYWxzZSkgY29udGludWU7XG5cbiAgICAgIC8vIElnbm9yZSBhbnkgcmVzdWx0cyB3aXRoaW4gaWdub3JlZCBmaWxlcy5cbiAgICAgIGlmIChtYXRjaGVzSWdub3JlZE5hbWVzKHVyaSwgdGhpcy5pZ25vcmVkTmFtZU1hdGNoZXJzID8/IFtdKSkgY29udGludWU7XG5cbiAgICAgIGxldCBbXywgcmVsYXRpdmVQYXRoXSA9IGF0b20ucHJvamVjdC5yZWxhdGl2aXplUGF0aCh1cmkpO1xuICAgICAgbGV0IHJlc3VsdHNGb3JQYXRoID0gcmVzdWx0cy5nZXQocmVsYXRpdmVQYXRoKTtcbiAgICAgIGlmICghcmVzdWx0c0ZvclBhdGgpIHtcbiAgICAgICAgcmVzdWx0c0ZvclBhdGggPSBbXTtcbiAgICAgICAgcmVzdWx0cy5zZXQocmVsYXRpdmVQYXRoLCByZXN1bHRzRm9yUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdHNGb3JQYXRoLnB1c2gocmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMgPSByZXN1bHRzO1xuICAgIHRoaXMudXJpcyA9IHVyaXM7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXQgcHJvcHMoKTogUmVmZXJlbmNlc1ZpZXdQcm9wZXJ0aWVzIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVmZXJlbmNlczogdGhpcy5yZWZlcmVuY2VzID8/IFtdLFxuICAgICAgc3ltYm9sTmFtZTogdGhpcy5zeW1ib2xOYW1lID8/ICcnLFxuICAgICAgZWRpdG9yOiB0aGlzLmVkaXRvcixcbiAgICAgIG1hcmtlcjogdGhpcy5tYXJrZXIsXG4gICAgICBtYW5hZ2VyOiB0aGlzLm1hbmFnZXJcbiAgICB9O1xuICB9XG5cbiAgd3JpdGVBZnRlclVwZGF0ZSgpIHtcbiAgICBsZXQgc2VsZWN0ZWQgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihcbiAgICAgICdbZGF0YS1uYXZpZ2F0aW9uLWluZGV4XS5zZWxlY3RlZCwgLmxpc3QtbmVzdGVkLWl0ZW0uc2VsZWN0ZWQnXG4gICAgKTtcbiAgICBpZiAoIXNlbGVjdGVkKSByZXR1cm47XG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciBwcm9wcmlldGFyeSBtZXRob2RcbiAgICBzZWxlY3RlZC5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKCk7XG4gIH1cblxuICBjb3B5KCkge1xuICAgIGxldCBuZXdVcmkgPSBSZWZlcmVuY2VzVmlldy5uZXh0VXJpKCk7XG4gICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzVmlldyhuZXdVcmksIHRoaXMucHJvcHMpO1xuICB9XG5cbiAgZ2V0VGl0bGUoKSB7XG4gICAgbGV0IHsgc3ltYm9sTmFtZSB9ID0gdGhpcztcbiAgICByZXR1cm4gYOKAnCR7c3ltYm9sTmFtZX3igJ06IEZpbmQgUmVmZXJlbmNlcyBSZXN1bHRzYDtcbiAgfVxuXG4gIGdldEljb25OYW1lKCkge1xuICAgIHJldHVybiAnc2VhcmNoJztcbiAgfVxuXG4gIGdldFVSSSgpIHtcbiAgICByZXR1cm4gUmVmZXJlbmNlc1ZpZXcuVVJJO1xuICB9XG5cbiAgZm9jdXMoKSB7XG4gICAgbGV0IHJlZmVyZW5jZXNWaWV3ID0gdGhpcy5yZWZzLnJlZmVyZW5jZXNWaWV3O1xuICAgIGlmICghaXNFdGNoQ29tcG9uZW50KHJlZmVyZW5jZXNWaWV3KSkgcmV0dXJuO1xuICAgIHJlZmVyZW5jZXNWaWV3LmVsZW1lbnQuZm9jdXMoKTtcbiAgfVxuXG4gIC8vIEFzc2VtYmxlcyBhIG1hcCBiZXR3ZWVuIHJlZmVyZW5jZSBVUklzIGFuZCBgVGV4dEJ1ZmZlcmBzIGZvciBjaGlsZCB2aWV3c1xuICAvLyB0byBjb25zdWx0LlxuICBhc3luYyBidWlsZEJ1ZmZlckNhY2hlKCkge1xuICAgIGxldCBtYXAgPSBuZXcgTWFwPHN0cmluZywgVGV4dEJ1ZmZlcj4oKTtcbiAgICBsZXQgZWRpdG9ycyA9IGF0b20ud29ya3NwYWNlLmdldFRleHRFZGl0b3JzKCk7XG4gICAgZm9yIChsZXQgZWRpdG9yIG9mIGVkaXRvcnMpIHtcbiAgICAgIGxldCBwYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgIGxldCBidWZmZXIgPSBlZGl0b3IuZ2V0QnVmZmVyKCk7XG4gICAgICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcbiAgICAgIGlmIChtYXAuaGFzKHBhdGgpKSBjb250aW51ZTtcbiAgICAgIG1hcC5zZXQocGF0aCwgYnVmZmVyKTtcbiAgICB9XG4gICAgLy8gQW55IGJ1ZmZlcnMgdGhhdCBhcmVuJ3QgcHJlc2VudCBhbHJlYWR5IGluIHRoZSB3b3JrIHNwYWNlIGNhbiBiZSBjcmVhdGVkXG4gICAgLy8gZnJvbSBmaWxlcyBvbiBkaXNrLlxuICAgIGZvciAobGV0IHVyaSBvZiB0aGlzLnVyaXMpIHtcbiAgICAgIGlmIChtYXAuaGFzKHVyaSkpIGNvbnRpbnVlO1xuICAgICAgbWFwLnNldCh1cmksIGF3YWl0IFRleHRCdWZmZXIubG9hZCh1cmkpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIC8vIEhvdyBkbyB3ZSBrZWVwIHJlZnJlc2hpbmcgdGhlIHJlZmVyZW5jZXMgcGFuZWwgYXMgd2UgbWFrZSBjaGFuZ2VzIGluIHRoZVxuICAvLyBwcm9qZWN0P1xuICAvL1xuICAvLyAqIFJlbWVtYmVyIHRoZSBjdXJzb3IgcG9zaXRpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIHBhbmVsLiBDcmVhdGUgYSBtYXJrZXJcbiAgLy8gICB0byB0cmFjayB0aGUgbG9naWNhbCBidWZmZXIgcG9zaXRpb24gdGhyb3VnaCBlZGl0cy5cbiAgLy8gKiBPcGVuIHRoZSBwYW5lbCBhbmQgc2hvdyB0aGUgcmVzdWx0cy5cbiAgLy8gKiBXaGVuIHlvdSBvcGVuIHRoZSBwYW5lbCwgYWRkIGFuIGBvbkRpZFN0b3BDaGFuZ2luZ2Agb2JzZXJ2ZXIgdG8gZXZlcnlcbiAgLy8gICBgVGV4dEVkaXRvcmAgaW4gdGhlIHByb2plY3QuIFRoZSBjYWxsYmFjayBzaG91bGQgcmV0dXJuIGVhcmx5IGlmIHRoZVxuICAvLyAgIGVkaXRvciBpc24ndCBjaGFuZ2luZyBhIGJ1ZmZlciB0aGF0IGlzIGluIHRoZSByZXN1bHQgc2V0OyBvdGhlcndpc2UgaXRcbiAgLy8gICBzaG91bGQgcmUtcmVxdWVzdCB0aGUgbGlzdCBvZiByZWZlcmVuY2VzLlxuICAvLyAqIFdoZW4gcmVmZXJlbmNlcyBhcmUgcmUtcmVxdWVzdGVkLCB0aGV5IHNob3VsZCB1c2UgdGhlIGN1cnJlbnQgYnVmZmVyXG4gIC8vICAgcG9zaXRpb24gb2YgdGhlIG1hcmtlciB3ZSBjcmVhdGVkIGluIHN0ZXAgMS5cbiAgLy9cbiAgLy8gVGhpcyB3b3JrcyBmb3IgYXMgbG9uZyBhcyB0aGUgY3Vyc29yIHBvc2l0aW9uIGNhbiBiZSBsb2dpY2FsbHkgdHJhY2tlZC4gSWZcbiAgLy8gdGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCwgdGhhdCBtZWFucyBhIGNoYW5nZSBoYXMgY29tcGxldGVseSBzdXJyb3VuZGVkXG4gIC8vIGl0LCBhbmQgd2UgY2FuIG5vIGxvbmdlciBhZmZpcm0gaXQgcmVmZXJzIHRvIHRoZSBzYW1lIHN5bWJvbC4gQXQgdGhpc1xuICAvLyBwb2ludCwgd2UgY2xvc2UgdGhlIHBhbmVsLlxuICBhc3luYyByZWZyZXNoUGFuZWwoKSB7XG4gICAgaWYgKCF0aGlzLm1hbmFnZXIgfHwgIXRoaXMuZWRpdG9yIHx8ICF0aGlzLm1hcmtlcikgcmV0dXJuO1xuICAgIGxldCBidW5kbGUgPSBhd2FpdCB0aGlzLm1hbmFnZXIuZmluZFJlZmVyZW5jZXNGb3JQcm9qZWN0QXRQb3NpdGlvbihcbiAgICAgIHRoaXMuZWRpdG9yLFxuICAgICAgdGhpcy5tYXJrZXIuZ2V0QnVmZmVyUmFuZ2UoKS5zdGFydFxuICAgIClcbiAgICBpZiAoIWJ1bmRsZSB8fCBidW5kbGUudHlwZSA9PT0gJ2Vycm9yJykgcmV0dXJuO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGUoe1xuICAgICAgcmVmZXJlbmNlczogYnVuZGxlLnJlZmVyZW5jZXMsXG4gICAgICBzeW1ib2xOYW1lOiBidW5kbGUucmVmZXJlbmNlZFN5bWJvbE5hbWVcbiAgICB9KTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBsZXQgbGlzdFN0eWxlID0ge1xuICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICBsZWZ0OiAnMCcsXG4gICAgICB0b3A6ICcwJyxcbiAgICAgIHJpZ2h0OiAnMCdcbiAgICB9O1xuXG4gICAgbGV0IGNoaWxkcmVuID0gW107XG5cbiAgICBsZXQgbmF2aWdhdGlvbkluZGV4ID0gMDtcbiAgICBmb3IgKGxldCBbcmVsYXRpdmVQYXRoLCByZWZlcmVuY2VzXSBvZiB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB2aWV3ID0gKFxuICAgICAgICA8UmVmZXJlbmNlR3JvdXBWaWV3XG4gICAgICAgICAgcmVsYXRpdmVQYXRoPXtyZWxhdGl2ZVBhdGh9XG4gICAgICAgICAgcmVmZXJlbmNlcz17cmVmZXJlbmNlc31cbiAgICAgICAgICBuYXZpZ2F0aW9uSW5kZXg9e25hdmlnYXRpb25JbmRleH1cbiAgICAgICAgICBpbmRleFRvUmVmZXJlbmNlTWFwPXt0aGlzLmluZGV4VG9SZWZlcmVuY2VNYXB9XG4gICAgICAgICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4PXt0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleH1cbiAgICAgICAgICBidWZmZXJDYWNoZT17dGhpcy5idWZmZXJDYWNoZX1cbiAgICAgICAgICBpc0NvbGxhcHNlZD17dGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhuYXZpZ2F0aW9uSW5kZXgpfVxuICAgICAgICAvPlxuICAgICAgKTtcbiAgICAgIGNoaWxkcmVuLnB1c2godmlldyk7XG4gICAgICBuYXZpZ2F0aW9uSW5kZXggKz0gcmVmZXJlbmNlcy5sZW5ndGggKyAxO1xuICAgIH1cblxuICAgIHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCA9IG5hdmlnYXRpb25JbmRleCAtIDE7XG5cbiAgICBsZXQgY29udGFpbmVyU3R5bGUgPSAge1xuICAgICAgcG9zaXRpb246ICdyZWxhdGl2ZScsXG4gICAgICBoZWlnaHQ6ICcxMDAlJyxcbiAgICAgIG92ZXJmbG93OiAnYXV0bycsXG4gICAgfTtcblxuICAgIGxldCBtYXRjaENvdW50ID0gdGhpcy5yZWZlcmVuY2VzLmxlbmd0aDtcbiAgICBsZXQgY2xhc3NOYW1lcyA9IGN4KCdmaW5kLXJlZmVyZW5jZXMtcGFuZScsICdwcmV2aWV3LXBhbmUnLCAncGFuZS1pdGVtJywgeyAnbm8tcmVzdWx0cyc6IG1hdGNoQ291bnQgPT09IDAgfSk7XG5cbiAgICBsZXQgcGluQnV0dG9uQ2xhc3NOYW1lcyA9IGN4KCdidG4nLCAnaWNvbicsICdpY29uLXBpbicsIHtcbiAgICAgICdzZWxlY3RlZCc6ICF0aGlzLm92ZXJyaWRhYmxlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9e2NsYXNzTmFtZXN9IHRhYkluZGV4PXstMX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHJldmlldy1oZWFkZXJcIj5cbiAgICAgICAgICB7ZGVzY3JpYmVSZWZlcmVuY2VzKHRoaXMucmVmZXJlbmNlcy5sZW5ndGgsIHRoaXMuZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcy5zaXplLCB0aGlzLnN5bWJvbE5hbWUpfVxuXG4gICAgICAgICAgPGRpdiByZWY9XCJwaW5SZWZlcmVuY2VzXCIgY2xhc3NOYW1lPXtwaW5CdXR0b25DbGFzc05hbWVzfT5Eb27igJl0IG92ZXJyaWRlPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgcmVmPVwicmVmZXJlbmNlc1ZpZXdcIiBjbGFzc05hbWU9XCJyZXN1bHRzLXZpZXcgZm9jdXNhYmxlLXBhbmVsXCIgdGFiSW5kZXg9ey0xfSBzdHlsZT17dGhpcy5wcmV2aWV3U3R5bGV9PlxuICAgICAgICAgIDxkaXYgcmVmPVwic2Nyb2xsQ29udGFpbmVyXCIgY2xhc3NOYW1lPVwicmVzdWx0cy12aWV3LWNvbnRhaW5lclwiIHN0eWxlPXtjb250YWluZXJTdHlsZX0+XG4gICAgICAgICAgICA8b2xcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwibGlzdC10cmVlIGhhcy1jb2xsYXBzYWJsZS1jaGlsZHJlblwiXG4gICAgICAgICAgICAgIHN0eWxlPXtsaXN0U3R5bGV9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtjaGlsZHJlbn1cbiAgICAgICAgICAgIDwvb2w+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufVxuIl19