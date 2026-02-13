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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFNYztBQUNkLHlDQUFzQztBQUN0QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDREQUE0QjtBQUU1QixrRkFBd0Q7QUFDeEQsb0RBQXNDO0FBTXRDLFNBQVMsZUFBZSxDQUFDLEVBQVc7SUFDbEMsSUFBSSxDQUFDLEVBQUU7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN0QixJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN6QyxPQUFPLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFHRCxTQUFTLFNBQVMsQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxTQUFpQixHQUFHLFFBQVEsR0FBRztJQUNqRixJQUFJLElBQUksR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMzQyxPQUFPLEdBQUcsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLGNBQXNCLEVBQUUsU0FBaUIsRUFBRSxVQUFrQjtJQUN2RixPQUFPLENBQ0wsNkJBQU0sR0FBRyxFQUFDLGNBQWMsRUFBQyxTQUFTLEVBQUMsNEJBQTRCO1FBQzVELFNBQVMsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDOztRQUFZLEdBQUc7UUFDbEQsU0FBUyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUM7O1FBQU8sR0FBRztRQUN2Qyw2QkFBTSxTQUFTLEVBQUMsZ0JBQWdCLElBQUUsVUFB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R0FBdUMsSUFBSSxHQUFHLEVBQUUsQUFBaEQsQ0FBaUQ7QUFFaEUsaUNBQWlDO0FBQzFCLHdCQUFTLEdBQWdDLElBQUksR0FBRyxFQUFFLEFBQXpDLENBQTBDO2tCQVR2QyxjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcGxheU1hcmtlcixcbiAgRW1pdHRlcixcbiAgVGV4dEJ1ZmZlcixcbiAgVGV4dEVkaXRvclxufSBmcm9tICdhdG9tJztcbmltcG9ydCB7IE1pbmltYXRjaCB9IGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgZXRjaCBmcm9tICdldGNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGN4IGZyb20gJ2NsYXNzbmFtZXMnO1xuXG5pbXBvcnQgUmVmZXJlbmNlR3JvdXBWaWV3IGZyb20gJy4vcmVmZXJlbmNlLWdyb3VwLXZpZXcnO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuLi9jb25zb2xlJztcblxuaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCB0eXBlIHsgRXRjaENvbXBvbmVudCB9IGZyb20gJ2V0Y2gnO1xuaW1wb3J0IEZpbmRSZWZlcmVuY2VzTWFuYWdlciBmcm9tICcuLi9maW5kLXJlZmVyZW5jZXMtbWFuYWdlcic7XG5cbmZ1bmN0aW9uIGlzRXRjaENvbXBvbmVudChlbDogdW5rbm93bik6IGVsIGlzIEV0Y2hDb21wb25lbnQge1xuICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgZWwgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ3JlZnMnIGluIGVsKSAmJiAoJ2VsZW1lbnQnIGluIGVsKTtcbn1cblxuXG5mdW5jdGlvbiBwbHVyYWxpemUoY291bnQ6IG51bWJlciwgc2luZ3VsYXI6IHN0cmluZywgcGx1cmFsOiBzdHJpbmcgPSBgJHtzaW5ndWxhcn1zYCkge1xuICBsZXQgbm91biA9IGNvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWw7XG4gIHJldHVybiBgJHtjb3VudH0gJHtub3VufWA7XG59XG5cbmZ1bmN0aW9uIGRlc2NyaWJlUmVmZXJlbmNlcyhyZWZlcmVuY2VDb3VudDogbnVtYmVyLCBmaWxlQ291bnQ6IG51bWJlciwgc3ltYm9sTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiAoXG4gICAgPHNwYW4gcmVmPVwicHJldmlld0NvdW50XCIgY2xhc3NOYW1lPVwicHJldmlldy1jb3VudCBpbmxpbmUtYmxvY2tcIj5cbiAgICAgIHtwbHVyYWxpemUocmVmZXJlbmNlQ291bnQsICdyZXN1bHQnKX0gZm91bmQgaW4geycgJ31cbiAgICAgIHtwbHVyYWxpemUoZmlsZUNvdW50LCAnZmlsZScpfSBmb3IgeycgJ31cbiAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImhpZ2hsaWdodC1pbmZvXCI+e3N5bWJvbE5hbWV9PC9zcGFuPlxuICAgIDwvc3Bhbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gZGVzY2VuZHNGcm9tKGZpbGVQYXRoOiBzdHJpbmcsIHByb2plY3RQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBmaWxlUGF0aCAhPT0gJ3N0cmluZycpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIGZpbGVQYXRoLnN0YXJ0c1dpdGgoXG4gICAgcHJvamVjdFBhdGguZW5kc1dpdGgoUGF0aC5zZXApID8gcHJvamVjdFBhdGggOiBgJHtwcm9qZWN0UGF0aH0ke1BhdGguc2VwfWBcbiAgKTtcbn1cblxuZnVuY3Rpb24gZGVzY2VuZHNGcm9tQW55KGZpbGVQYXRoOiBzdHJpbmcsIHByb2plY3RQYXRoczogc3RyaW5nW10pOiBzdHJpbmcgfCBmYWxzZSB7XG4gIGZvciAobGV0IHByb2plY3RQYXRoIG9mIHByb2plY3RQYXRocykge1xuICAgIGlmIChkZXNjZW5kc0Zyb20oZmlsZVBhdGgsIHByb2plY3RQYXRoKSkgcmV0dXJuIHByb2plY3RQYXRoO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlc0lnbm9yZWROYW1lcyhmaWxlUGF0aDogc3RyaW5nLCBpZ25vcmVkTmFtZXM6IE1pbmltYXRjaFtdKSB7XG4gIGxldCByZXBvc2l0b3JpZXMgPSBhdG9tLnByb2plY3QuZ2V0UmVwb3NpdG9yaWVzKCk7XG4gIGlmIChyZXBvc2l0b3JpZXMuc29tZShyID0+IHIuaXNQYXRoSWdub3JlZChmaWxlUGF0aCkpKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGlnbm9yZWROYW1lcy5zb21lKGlnID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gaWcubWF0Y2goZmlsZVBhdGgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufVxuXG50eXBlIFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCAnbm9uZSc7XG50eXBlIEZvcm1hbFNwbGl0RGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgfCB1bmRlZmluZWQ7XG5cbnR5cGUgUmVmZXJlbmNlc1ZpZXdDb250ZXh0ID0ge1xuICBtYW5hZ2VyOiBGaW5kUmVmZXJlbmNlc01hbmFnZXIsXG4gIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgbWFya2VyOiBEaXNwbGF5TWFya2VyLFxuICByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSxcbiAgc3ltYm9sTmFtZTogc3RyaW5nO1xufTtcblxudHlwZSBSZWZlcmVuY2VzVmlld1Byb3BlcnRpZXMgPSB7IHJlZj86IHN0cmluZzsgfSAmIFJlZmVyZW5jZXNWaWV3Q29udGV4dDtcblxuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVTcGxpdChzcGxpdDogU3BsaXREaXJlY3Rpb24pOiBGb3JtYWxTcGxpdERpcmVjdGlvbiB7XG4gIHJldHVybiB7XG4gICAgbGVmdDogJ3JpZ2h0JyxcbiAgICByaWdodDogJ2xlZnQnLFxuICAgIGRvd246ICd1cCcsXG4gICAgdXA6ICdkb3duJyxcbiAgICBub25lOiB1bmRlZmluZWRcbiAgfVtzcGxpdF0gYXMgRm9ybWFsU3BsaXREaXJlY3Rpb247XG59XG5cbmxldCBwYW5lbElkID0gMTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVmZXJlbmNlc1ZpZXcge1xuICAvLyBCYXNlIFVSSS4gV2UgYWRkIGAvMWAsIGAvMmAsIGV0Yy4sIHNvIHRoYXQgZGlmZmVyZW50IGluc3RhbmNlcyBvZiB0aGVcbiAgLy8gcGFuZWwgY2FuIGJlIGRpc3Rpbmd1aXNoZWQuXG4gIHN0YXRpYyBVUkkgPSBcImF0b206Ly9wdWxzYXItZmluZC1yZWZlcmVuY2VzL3Jlc3VsdHNcIjtcblxuICAvLyBJbml0aWFsaXphdGlvbiBkYXRhIGZvciBwYW5lbHMgdGhhdCBoYXZlIG5vdCB5ZXQgYmVlbiBpbnN0YW50aWF0ZWQuXG4gIHN0YXRpYyBDT05URVhUUzogTWFwPHN0cmluZywgUmVmZXJlbmNlc1ZpZXdDb250ZXh0PiA9IG5ldyBNYXAoKTtcblxuICAvLyBJbnN0YW5jZXMgb2YgYFJlZmVyZW5jZXNWaWV3YC5cbiAgc3RhdGljIGluc3RhbmNlczogTWFwPHN0cmluZywgUmVmZXJlbmNlc1ZpZXc+ID0gbmV3IE1hcCgpO1xuXG4gIHN0YXRpYyBuZXh0VXJpKCkge1xuICAgIHJldHVybiBgJHtSZWZlcmVuY2VzVmlldy5VUkl9LyR7cGFuZWxJZCsrfWA7XG4gIH1cblxuICBzdGF0aWMgc2V0UmVmZXJlbmNlcyhcbiAgICB1cmk6IHN0cmluZyxcbiAgICBjb250ZXh0OiBSZWZlcmVuY2VzVmlld0NvbnRleHRcbiAgKSB7XG4gICAgaWYgKFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcy5oYXModXJpKSkge1xuICAgICAgLy8gVGhpcyBpbnN0YW5jZSBhbHJlYWR5IGV4aXN0cywgc28gd2UgY2FuIHVwZGF0ZSBpdCBkaXJlY3RseS5cbiAgICAgIFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcy5nZXQodXJpKSEudXBkYXRlKGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGluc3RhbmNlIHdpbGwgc29vbiBleGlzdCwgc28gd2UnbGwgc3RvcmUgdGhpcyBkYXRhIGZvciBmdXR1cmVcbiAgICAgIC8vIGxvb2t1cC5cbiAgICAgIFJlZmVyZW5jZXNWaWV3LkNPTlRFWFRTLnNldCh1cmksIGNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB1cmk6IHN0cmluZztcblxuICAvLyBXaGV0aGVyIHRoaXMgcGFuZWwgY2FuIGJlIHJldXNlZCB0aGUgbmV4dCB0aW1lIHRoZSDigJxTaG93IFBhbmVs4oCdIGNvbW1hbmQgaXNcbiAgLy8gaW52b2tlZC5cbiAgcHVibGljIG92ZXJyaWRhYmxlOiBib29sZWFuID0gdHJ1ZTtcblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuXG4gIC8vIENvbXBvbmVudCBwcm9wZXJ0aWVzLlxuICBwcml2YXRlIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdO1xuICBwcml2YXRlIHN5bWJvbE5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBlZGl0b3I6IFRleHRFZGl0b3I7XG4gIHByaXZhdGUgbWFya2VyOiBEaXNwbGF5TWFya2VyO1xuICBwcml2YXRlIG1hbmFnZXI6IEZpbmRSZWZlcmVuY2VzTWFuYWdlcjtcblxuICBwcml2YXRlIGlnbm9yZWROYW1lTWF0Y2hlcnM6IE1pbmltYXRjaFtdIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc3BsaXREaXJlY3Rpb246IFNwbGl0RGlyZWN0aW9uID0gJ25vbmUnO1xuXG4gIHByaXZhdGUgZW1pdHRlcjogRW1pdHRlciA9IG5ldyBFbWl0dGVyKCk7XG5cbiAgcHJpdmF0ZSBmaWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzITogTWFwPHN0cmluZywgUmVmZXJlbmNlW10+O1xuXG4gIC8vIFVSSXMgb2YgYnVmZmVycyBpbiB0aGUgY3VycmVudCByZXN1bHQgc2V0LlxuICBwcml2YXRlIHVyaXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuXG4gIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIHJlc3VsdCBoYXMga2V5Ym9hcmQgZm9jdXMuXG4gIHByaXZhdGUgYWN0aXZlTmF2aWdhdGlvbkluZGV4OiBudW1iZXIgPSAtMTtcbiAgcHJpdmF0ZSBsYXN0TmF2aWdhdGlvbkluZGV4OiBudW1iZXIgPSAtMTtcblxuICBwcml2YXRlIGJ1ZmZlckNhY2hlOiBNYXA8c3RyaW5nLCBUZXh0QnVmZmVyPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBpbmRleFRvUmVmZXJlbmNlTWFwOiBNYXA8bnVtYmVyLCBSZWZlcmVuY2U+ID0gbmV3IE1hcCgpO1xuXG4gIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIHJlc3VsdCBncm91cHMgYXJlIGNvbGxhcHNlZC5cbiAgcHJpdmF0ZSBjb2xsYXBzZWRJbmRpY2VzOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKTtcblxuICBwcml2YXRlIHByZXZpZXdTdHlsZTogeyBmb250RmFtaWx5OiBzdHJpbmc7IH0gPSB7IGZvbnRGYW1pbHk6ICcnIH07XG5cbiAgcHVibGljIGVsZW1lbnQhOiBIVE1MRWxlbWVudDtcbiAgcHVibGljIHJlZnMhOiB7IFtrZXk6IHN0cmluZ106IEhUTUxFbGVtZW50OyB9O1xuXG4gIGNvbnN0cnVjdG9yKHVyaTogc3RyaW5nLCBwcm9wcz86IFJlZmVyZW5jZXNWaWV3Q29udGV4dCkge1xuICAgIFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcy5zZXQodXJpLCB0aGlzKTtcbiAgICB0aGlzLnVyaSA9IHVyaTtcbiAgICBsZXQgY29udGV4dDogUmVmZXJlbmNlc1ZpZXdDb250ZXh0O1xuICAgIGlmIChwcm9wcykge1xuICAgICAgY29udGV4dCA9IHByb3BzO1xuICAgIH0gZWxzZSBpZiAoUmVmZXJlbmNlc1ZpZXcuQ09OVEVYVFMuaGFzKHVyaSkpIHtcbiAgICAgIGNvbnRleHQgPSBSZWZlcmVuY2VzVmlldy5DT05URVhUUy5nZXQodXJpKSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgY29udGV4dCBkYXRhIGZvciBVUkk6ICR7dXJpfWApO1xuICAgIH1cblxuICAgIGxldCB7IHJlZmVyZW5jZXMsIHN5bWJvbE5hbWUsIGVkaXRvciwgbWFya2VyLCBtYW5hZ2VyIH0gPSBjb250ZXh0O1xuICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgdGhpcy5zeW1ib2xOYW1lID0gc3ltYm9sTmFtZTtcbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLm1hcmtlciA9IG1hcmtlcjtcbiAgICB0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xuXG4gICAgUmVmZXJlbmNlc1ZpZXcuQ09OVEVYVFMuZGVsZXRlKHVyaSk7XG5cbiAgICBjb25zb2xlLmRlYnVnKCdSZWZlcmVuY2VzVmlldyBjb25zdHJ1Y3RvcjonLCB0aGlzLnVyaSwgdGhpcy5wcm9wcyk7XG5cbiAgICBpZiAoIXRoaXMucmVmZXJlbmNlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyByZWZlcmVuY2VzIWApO1xuICAgIH1cblxuICAgIHRoaXMuZmlsdGVyQW5kR3JvdXBSZWZlcmVuY2VzKCk7XG5cbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnZWRpdG9yLmZvbnRGYW1pbHknLCB0aGlzLmZvbnRGYW1pbHlDaGFuZ2VkLmJpbmQodGhpcykpLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnY29yZS5pZ25vcmVkTmFtZXMnLCB0aGlzLmlnbm9yZWROYW1lc0NoYW5nZWQuYmluZCh0aGlzKSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKCdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnBhbmVsLnNwbGl0RGlyZWN0aW9uJywgdGhpcy5zcGxpdERpcmVjdGlvbkNoYW5nZWQuYmluZCh0aGlzKSksXG5cbiAgICAgIGF0b20ud29ya3NwYWNlLm9ic2VydmVUZXh0RWRpdG9ycygoZWRpdG9yKSA9PiB7XG4gICAgICAgIC8vIFNpbmNlIHRoaXMgcGFuZWwgdXBkYXRlcyBpbiByZWFsIHRpbWUsIHdlIHNob3VsZCBhcmd1YWJseSBmZXRjaCBuZXdcbiAgICAgICAgLy8gcmVmZXJlbmNlcyB3aGVuZXZlciBfYW55XyBlZGl0b3IgY2hhbmdlcy4gRm9yIG5vdywgd2UnbGwgcmVmZXRjaFxuICAgICAgICAvLyB3aGVuZXZlciBvbmUgb2YgdGhlIGZpbGVzIGluIHRoZSByZXN1bHQgc2V0IGlzIGVkaXRlZCwgZXZlbiB0aG91Z2hcbiAgICAgICAgLy8gdGhpcyBjb3VsZCBlbmQgdXAgbWlzc2luZyBuZXcgcmVmZXJlbmNlcyBhcyB0aGV5IGFyZSBjcmVhdGVkLlxuICAgICAgICBlZGl0b3Iub25EaWRTdG9wQ2hhbmdpbmcoKF9ldmVudCkgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLnJlZmVyZW5jZXNJbmNsdWRlQnVmZmVyKGVkaXRvci5nZXRCdWZmZXIoKSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaFBhbmVsKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pLFxuXG4gICAgICAvLyBJZiB0aGUgbWFya2VyIGlzIGRlc3Ryb3llZCBvciBtYWRlIGludmFsaWQsIGl0IG1lYW5zIGEgYnVmZmVyIGNoYW5nZVxuICAgICAgLy8gaGFzIGNhdXNlZCB1cyBub3QgdG8gYmUgYWJsZSB0byB0cmFjayB0aGUgbG9naWNhbCBwb3NpdGlvbiBvZiB0aGVcbiAgICAgIC8vIHBvaW50IHRoYXQgaW5pdGlhbGx5IHRyaWdnZWQgdGhpcyBwYW5lbC4gVGhpcyBtYWtlcyBpdCBpbXBvc3NpYmxlIGZvclxuICAgICAgLy8gdXMgdG8gY29udGludWUgdG8gdXBkYXRlIHRoZSByZXN1bHRzLCBzbyB0aGUgcGFuZWwgbXVzdCBjbG9zZS5cbiAgICAgIHRoaXMubWFya2VyLm9uRGlkQ2hhbmdlKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMubWFya2VyPy5pc1ZhbGlkKCkpIHJldHVybjtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSksXG4gICAgICB0aGlzLm1hcmtlci5vbkRpZERlc3Ryb3koKCkgPT4gdGhpcy5jbG9zZSgpKVxuICAgICk7XG5cbiAgICBhdG9tLmNvbW1hbmRzLmFkZDxOb2RlPihcbiAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgIHtcbiAgICAgICAgJ2NvcmU6bW92ZS11cCc6IHRoaXMubW92ZVVwLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtZG93bic6IHRoaXMubW92ZURvd24uYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS1sZWZ0JzogdGhpcy5jb2xsYXBzZUFjdGl2ZS5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLXJpZ2h0JzogdGhpcy5leHBhbmRBY3RpdmUuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6cGFnZS11cCc6IHRoaXMucGFnZVVwLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOnBhZ2UtZG93bic6IHRoaXMucGFnZURvd24uYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS10by10b3AnOiB0aGlzLm1vdmVUb1RvcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLXRvLWJvdHRvbSc6IHRoaXMubW92ZVRvQm90dG9tLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOmNvbmZpcm0nOiB0aGlzLmNvbmZpcm1SZXN1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6Y29weSc6IHRoaXMuY29weVJlc3VsdC5iaW5kKHRoaXMpLFxuICAgICAgICAvLyBQaWdneWJhY2sgb24gdGhlIHVzZXIncyBrZXliaW5kaW5ncyBmb3IgdGhlc2UgZnVuY3Rpb25zLCBzaW5jZSB0aGVcbiAgICAgICAgLy8gVUkgaXMgcHJhY3RpY2FsbHkgaWRlbnRpY2FsIHRvIHRoYXQgb2YgYGZpbmQtYW5kLXJlcGxhY2VgLlxuICAgICAgICAnZmluZC1hbmQtcmVwbGFjZTpjb3B5LXBhdGgnOiB0aGlzLmNvcHlQYXRoLmJpbmQodGhpcyksXG4gICAgICAgICdmaW5kLWFuZC1yZXBsYWNlOm9wZW4taW4tbmV3LXRhYic6IHRoaXMub3BlbkluTmV3VGFiLmJpbmQodGhpcyksXG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5yZWZzLnBpblJlZmVyZW5jZXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdjbGljaycsXG4gICAgICB0aGlzLmhhbmRsZVBpblJlZmVyZW5jZXNDbGlja2VkLmJpbmQodGhpcylcbiAgICApO1xuXG4gICAgdGhpcy5mb2N1cygpO1xuXG4gICAgdGhpcy5idWlsZEJ1ZmZlckNhY2hlKClcbiAgICAgIC50aGVuKChjYWNoZSkgPT4ge1xuICAgICAgICB0aGlzLmJ1ZmZlckNhY2hlID0gY2FjaGU7XG4gICAgICAgIHJldHVybiBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLy8gUGFuZSBpdGVtcyB0aGF0IHByb3ZpZGUgYG9uRGlkQ2hhbmdlVGl0bGVgIGNhbiB0cmlnZ2VyIHVwZGF0ZXMgdG8gdGhlaXJcbiAgLy8gdGFiIGFuZCB3aW5kb3cgdGl0bGVzLlxuICBvbkRpZENoYW5nZVRpdGxlKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNoYW5nZS10aXRsZScsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIE1vdmUga2V5Ym9hcmQgZm9jdXMgdG8gdGhlIHByZXZpb3VzIHZpc2libGUgcmVzdWx0LlxuICBtb3ZlVXAoKSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID09PSAwKSByZXR1cm47XG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kVmlzaWJsZU5hdmlnYXRpb25JbmRleCgtMSk7XG4gICAgaWYgKGluZGV4ID09PSBudWxsKSByZXR1cm47XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKS50aGVuKCgpID0+IHRoaXMuZW5zdXJlU2VsZWN0ZWRJdGVtSW5WaWV3KCkpO1xuICB9XG5cbiAgLy8gTW92ZSBrZXlib2FyZCBmb2N1cyB0byB0aGUgbmV4dCB2aXNpYmxlIHJlc3VsdC5cbiAgbW92ZURvd24oKSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID09PSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXgpIHJldHVybjtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbmRWaXNpYmxlTmF2aWdhdGlvbkluZGV4KDEpO1xuICAgIGlmIChpbmRleCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcykudGhlbigoKSA9PiB0aGlzLmVuc3VyZVNlbGVjdGVkSXRlbUluVmlldygpKTtcbiAgfVxuXG4gIC8vIE1vdmUgdGhlIG5hdmlnYXRpb24gaW5kZXggc29tZSBudW1iZXIgb2YgaW5jcmVtZW50cywgc2tpcHBpbmcgYW55IHJlc3VsdHNcbiAgLy8gdGhhdCBhcmUgY29sbGFwc2VkLlxuICBmaW5kVmlzaWJsZU5hdmlnYXRpb25JbmRleChkZWx0YTogbnVtYmVyKSB7XG4gICAgbGV0IGN1cnJlbnQgPSB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY3VycmVudCArPSBkZWx0YTtcbiAgICAgIGlmIChjdXJyZW50IDwgMCB8fCBjdXJyZW50ID4gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4KSByZXR1cm4gbnVsbDtcbiAgICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRFbGVtZW50QXRJbmRleChjdXJyZW50KTtcbiAgICAgIGlmIChlbGVtZW50ICYmIGVsZW1lbnQuY2xpZW50SGVpZ2h0ID4gMCkgcmV0dXJuIGN1cnJlbnQ7XG4gICAgfVxuICB9XG5cbiAgaXNWYWxpZEVsZW1lbnRJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChpbmRleCA+IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleChpbmRleDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWRFbGVtZW50SW5kZXgoaW5kZXgpKSByZXR1cm4gLTE7XG4gICAgbGV0IHsgc2Nyb2xsQ29udGFpbmVyIH0gPSB0aGlzLnJlZnM7XG4gICAgbGV0IHNjcm9sbFJlY3QgPSBzY3JvbGxDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmdldEVsZW1lbnRBdEluZGV4KGluZGV4KTtcbiAgICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQuY2xpZW50SGVpZ2h0KSByZXR1cm4gbnVsbDtcbiAgICBsZXQgZWxlbWVudFJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiBlbGVtZW50UmVjdC50b3AgLSBzY3JvbGxSZWN0LnRvcDtcbiAgfVxuXG4gIGZpbmRFbGVtZW50SW5kZXhOZWFySGVpZ2h0KHRvcDogbnVtYmVyKSB7XG4gICAgbGV0IGNsb3Nlc3RFbCA9IG51bGwsIGNsb3Nlc3REaWZmID0gbnVsbDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXg7IGkrKykge1xuICAgICAgbGV0IG9mZnNldCA9IHRoaXMuc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleChpKTtcbiAgICAgIGlmIChvZmZzZXQgPT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgbGV0IGRpZmYgPSBNYXRoLmFicyh0b3AgLSBvZmZzZXQpO1xuICAgICAgaWYgKG9mZnNldCA9PT0gbnVsbCkgY29udGludWU7XG4gICAgICBpZiAoY2xvc2VzdEVsID09PSBudWxsIHx8IGNsb3Nlc3REaWZmICE9PSBudWxsICYmIGNsb3Nlc3REaWZmID4gZGlmZikge1xuICAgICAgICBjbG9zZXN0RGlmZiA9IGRpZmY7XG4gICAgICAgIGNsb3Nlc3RFbCA9IGk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb3Nlc3RFbCA/PyAtMTtcbiAgfVxuXG4gIGNvbGxhcHNlQWN0aXZlKCkge1xuICAgIHRoaXMuY29sbGFwc2VSZXN1bHQodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICB9XG5cbiAgZXhwYW5kQWN0aXZlKCkge1xuICAgIHRoaXMuZXhwYW5kUmVzdWx0KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgfVxuXG4gIGNvbGxhcHNlUmVzdWx0KGluZGV4OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhpbmRleCkpIHJldHVybjtcbiAgICB0aGlzLmNvbGxhcHNlZEluZGljZXMuYWRkKGluZGV4KTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGV4cGFuZFJlc3VsdChpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKCF0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKGluZGV4KSkgcmV0dXJuO1xuICAgIHRoaXMuY29sbGFwc2VkSW5kaWNlcy5kZWxldGUoaW5kZXgpO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgdG9nZ2xlUmVzdWx0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgaXNDb2xsYXBzZWQgPSB0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKGluZGV4KTtcbiAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgIHRoaXMuZXhwYW5kUmVzdWx0KGluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb2xsYXBzZVJlc3VsdChpbmRleCk7XG4gICAgfVxuICB9XG5cbiAgcGFnZVVwKCkge1xuICAgIGxldCBjdXJyZW50T2Zmc2V0ID0gdGhpcy5zY3JvbGxPZmZzZXRPZkVsZW1lbnRBdEluZGV4KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgICBpZiAoY3VycmVudE9mZnNldCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kRWxlbWVudEluZGV4TmVhckhlaWdodChjdXJyZW50T2Zmc2V0IC0gdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lci5vZmZzZXRIZWlnaHQpO1xuXG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKS50aGVuKCgpID0+IHRoaXMuZW5zdXJlU2VsZWN0ZWRJdGVtSW5WaWV3KCkpO1xuICB9XG5cbiAgcGFnZURvd24oKSB7XG4gICAgbGV0IGN1cnJlbnRPZmZzZXQgPSB0aGlzLnNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICAgIGlmIChjdXJyZW50T2Zmc2V0ID09PSBudWxsKSByZXR1cm47XG5cbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbmRFbGVtZW50SW5kZXhOZWFySGVpZ2h0KGN1cnJlbnRPZmZzZXQgKyB0aGlzLnJlZnMuc2Nyb2xsQ29udGFpbmVyLm9mZnNldEhlaWdodCk7XG5cbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpLnRoZW4oKCkgPT4gdGhpcy5lbnN1cmVTZWxlY3RlZEl0ZW1JblZpZXcoKSk7XG4gIH1cblxuICBtb3ZlVG9Ub3AoKSB7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAwO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpLnRoZW4oKCkgPT4gdGhpcy5lbnN1cmVTZWxlY3RlZEl0ZW1JblZpZXcoKSk7XG4gIH1cblxuICBtb3ZlVG9Cb3R0b20oKSB7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcykudGhlbigoKSA9PiB0aGlzLmVuc3VyZVNlbGVjdGVkSXRlbUluVmlldygpKTtcbiAgfVxuXG4gIGVuc3VyZVNlbGVjdGVkSXRlbUluVmlldygpIHtcbiAgICBpZiAoIXRoaXMuYWN0aXZlRWxlbWVudCkgcmV0dXJuO1xuICAgIGxldCBjb250YWluZXJSZWN0ID0gdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBsZXQgaXRlbVJlY3QgPSB0aGlzLmFjdGl2ZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBsZXQgZGVsdGE6IG51bWJlcjtcbiAgICBpZiAoaXRlbVJlY3QudG9wIDwgY29udGFpbmVyUmVjdC50b3ApIHtcbiAgICAgIGRlbHRhID0gaXRlbVJlY3QudG9wIC0gY29udGFpbmVyUmVjdC50b3A7XG4gICAgfSBlbHNlIGlmIChpdGVtUmVjdC5ib3R0b20gPiBjb250YWluZXJSZWN0LmJvdHRvbSkge1xuICAgICAgZGVsdGEgPSBpdGVtUmVjdC5ib3R0b20gLSBjb250YWluZXJSZWN0LmJvdHRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlZnMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCArPSBkZWx0YTtcbiAgfVxuXG4gIGNvbmZpcm1SZXN1bHQoKSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2ZUVsZW1lbnQpIHJldHVybjtcbiAgICBsZXQgbWV0YWRhdGEgPSB0aGlzLmdldE1ldGFkYXRhRm9yVGFyZ2V0KHRoaXMuYWN0aXZlRWxlbWVudCk7XG4gICAgaWYgKCFtZXRhZGF0YSkgcmV0dXJuO1xuXG4gICAgbGV0IHsgZmlsZVBhdGgsIGxpbmVOdW1iZXIsIHJhbmdlU3BlYyB9ID0gbWV0YWRhdGE7XG4gICAgdGhpcy5vcGVuUmVzdWx0KGZpbGVQYXRoLCBsaW5lTnVtYmVyLCByYW5nZVNwZWMpO1xuICB9XG5cbiAgLy8gQ29weSB0aGUgbGluZSBvZiB0ZXh0IGZyb20gdGhlIHJlZmVyZW5jZS4gKE9mIGxpbWl0ZWQgdXRpbGl0eSwgYnV0XG4gIC8vIGltcGxlbWVudGVkIGZvciBmZWF0dXJlIGVxdWl2YWxlbmNlIHdpdGggdGhlIGBmaW5kLWFuZC1yZXBsYWNlYCBwYW5lbC4pXG4gIGNvcHlSZXN1bHQoKSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2ZUVsZW1lbnQpIHJldHVybjtcblxuICAgIGxldCByZWZlcmVuY2UgPSB0aGlzLmluZGV4VG9SZWZlcmVuY2VNYXAuZ2V0KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgICBpZiAoIXJlZmVyZW5jZSkgcmV0dXJuO1xuXG4gICAgaWYgKCF0aGlzLmJ1ZmZlckNhY2hlLmhhcyhyZWZlcmVuY2UudXJpKSkgcmV0dXJuO1xuXG4gICAgLy8gQWxsIHRoZSBidWZmZXJzIGZvciByZXN1bHRzIHNob3VsZCBiZSBwcmVzZW50IGluIHRoaXMgY2FjaGUgYmVjYXVzZSB3ZVxuICAgIC8vIHByZWxvYWRlZCB0aGVtIGR1cmluZyByZW5kZXIuXG4gICAgbGV0IGJ1ZmZlciA9IHRoaXMuYnVmZmVyQ2FjaGUuZ2V0KHJlZmVyZW5jZS51cmkpO1xuICAgIGlmICghYnVmZmVyKSByZXR1cm47XG5cbiAgICBsZXQgdGV4dCA9IGJ1ZmZlci5saW5lRm9yUm93KHJlZmVyZW5jZS5yYW5nZS5zdGFydC5yb3cpO1xuICAgIGlmICghdGV4dCkgcmV0dXJuO1xuXG4gICAgYXRvbS5jbGlwYm9hcmQud3JpdGUodGV4dCk7XG4gIH1cblxuICAvLyBDb3B5IHRoZSByZWxhdGl2ZSBmaWxlIHBhdGggb2YgdGhlIGtleWJvYXJkLWZvY3VzZWQgcmVmZXJlbmNlLlxuICAvLyAoSW1wbGVtZW50ZWQgZm9yIGZlYXR1cmUgZXF1aXZhbGVuY2Ugd2l0aCB0aGUgYGZpbmQtYW5kLXJlcGxhY2VgIHBhbmVsLilcbiAgY29weVBhdGgoKSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2ZUVsZW1lbnQpIHJldHVybjtcbiAgICBjb25zdCB7IGZpbGVQYXRoID0gbnVsbCB9ID0gdGhpcy5hY3RpdmVFbGVtZW50LmRhdGFzZXQ7XG4gICAgaWYgKCFmaWxlUGF0aCkgcmV0dXJuO1xuICAgIGxldCBbcHJvamVjdFBhdGgsIHJlbGF0aXZlUGF0aF0gPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZVBhdGgoZmlsZVBhdGgpO1xuICAgIGlmIChwcm9qZWN0UGF0aCAmJiBhdG9tLnByb2plY3QuZ2V0RGlyZWN0b3JpZXMoKS5sZW5ndGggPiAxKSB7XG4gICAgICByZWxhdGl2ZVBhdGggPSBQYXRoLmpvaW4oUGF0aC5iYXNlbmFtZShwcm9qZWN0UGF0aCksIHJlbGF0aXZlUGF0aCk7XG4gICAgfVxuICAgIGF0b20uY2xpcGJvYXJkLndyaXRlKHJlbGF0aXZlUGF0aCk7XG4gIH1cblxuICAvLyBPcGVuIHRoZSByZXN1bHQgaW4gYSBuZXcgdGFiIHdoZXRoZXIgb3Igbm90IGl0IGFscmVhZHkgZXhpc3RzIGluIHRoZVxuICAvLyB3b3Jrc3BhY2UuXG4gIGFzeW5jIG9wZW5Jbk5ld1RhYigpIHtcbiAgICBpZiAoIXRoaXMuYWN0aXZlRWxlbWVudCkgcmV0dXJuO1xuXG4gICAgbGV0IG1ldGFkYXRhID0gdGhpcy5nZXRNZXRhZGF0YUZvclRhcmdldCh0aGlzLmFjdGl2ZUVsZW1lbnQpO1xuICAgIGlmICghbWV0YWRhdGEpIHJldHVybjtcblxuICAgIGxldCB7IGZpbGVQYXRoLCBsaW5lTnVtYmVyOiByb3csIHJhbmdlU3BlYyB9ID0gbWV0YWRhdGE7XG4gICAgaWYgKCFmaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgbGV0IGVkaXRvcjtcbiAgICBsZXQgZXhpc3RzID0gYXRvbS53b3Jrc3BhY2UuZ2V0VGV4dEVkaXRvcnMoKS5maWx0ZXIoZSA9PiBlLmdldFBhdGgoKSA9PT0gZmlsZVBhdGgpO1xuICAgIGlmICghZXhpc3RzKSB7XG4gICAgICBlZGl0b3IgPSBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKFxuICAgICAgICBmaWxlUGF0aCxcbiAgICAgICAgeyBhY3RpdmF0ZVBhbmU6IGZhbHNlLCBhY3RpdmF0ZUl0ZW06IGZhbHNlIH1cbiAgICAgICkgYXMgVGV4dEVkaXRvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgZWRpdG9yID0gYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3BlbihmaWxlUGF0aCkgYXMgVGV4dEVkaXRvcjtcbiAgICB9XG5cbiAgICB0aGlzLnJldmVhbFJlZmVyZW5jZUluRWRpdG9yKGZpbGVQYXRoLCByb3csIHJhbmdlU3BlYywgZWRpdG9yKTtcbiAgfVxuXG4gIGdldEVsZW1lbnRBdEluZGV4KGluZGV4OiBudW1iZXIpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hdmlnYXRpb24taW5kZXg9XCIke2luZGV4fVwiXWApO1xuICAgIHJldHVybiBlbGVtZW50ID8gKGVsZW1lbnQgYXMgSFRNTEVsZW1lbnQpIDogbnVsbDtcbiAgfVxuXG4gIC8vIFRoZSBlbGVtZW50IHRoYXQgaGFzIGtleWJvYXJkIGZvY3VzLlxuICBnZXQgYWN0aXZlRWxlbWVudCgpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA8IDApIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdEluZGV4KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZSh7IHJlZmVyZW5jZXMsIHN5bWJvbE5hbWUsIGVkaXRvciwgbWFya2VyLCBtYW5hZ2VyIH06IFBhcnRpYWw8UmVmZXJlbmNlc1ZpZXdQcm9wZXJ0aWVzPikge1xuICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XG5cbiAgICBpZiAocmVmZXJlbmNlcyAmJiB0aGlzLnJlZmVyZW5jZXMgIT09IHJlZmVyZW5jZXMpIHtcbiAgICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB0aGlzLmZpbHRlckFuZEdyb3VwUmVmZXJlbmNlcygpO1xuICAgICAgdGhpcy5pbmRleFRvUmVmZXJlbmNlTWFwLmNsZWFyKCk7XG4gICAgICB0aGlzLmJ1ZmZlckNhY2hlID0gYXdhaXQgdGhpcy5idWlsZEJ1ZmZlckNhY2hlKCk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHN5bWJvbE5hbWUgJiYgdGhpcy5zeW1ib2xOYW1lICE9PSBzeW1ib2xOYW1lKSB7XG4gICAgICB0aGlzLnN5bWJvbE5hbWUgPSBzeW1ib2xOYW1lO1xuICAgICAgLy8gVHJpZ2dlcnMgYW4gdXBkYXRlIG9mIHRoZSB0YWIgdGl0bGUuXG4gICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZS10aXRsZScpO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gVGhlc2UgcHJvcGVydGllcyBkb24ndCB0cmlnZ2VyIHJlLXJlbmRlcnMsIGJ1dCB0aGV5IG11c3Qgc3RpbGwgYmVcbiAgICAvLyB1cGRhdGVkIGlmIGNoYW5nZWQuXG4gICAgaWYgKGVkaXRvcikge1xuICAgICAgdGhpcy5lZGl0b3IgPSBlZGl0b3I7XG4gICAgfVxuICAgIGlmIChtYXJrZXIpIHtcbiAgICAgIHRoaXMubWFya2VyID0gbWFya2VyO1xuICAgIH1cbiAgICBpZiAobWFuYWdlcikge1xuICAgICAgdGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlZCA/IGV0Y2gudXBkYXRlKHRoaXMpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcy5kZWxldGUodGhpcy51cmkpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gIH1cblxuICAvLyBDbG9zZSB0aGlzIHdpbmRvdy5cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy5kZXN0cm95KCk7XG4gICAgY29uc3QgcGFuZSA9IGF0b20ud29ya3NwYWNlLnBhbmVGb3JJdGVtKHRoaXMpO1xuICAgIGlmICghcGFuZSkgcmV0dXJuO1xuICAgIHBhbmUuZGVzdHJveUl0ZW0odGhpcyk7XG4gIH1cblxuICAvLyBHaXZlbiBhIGJ1ZmZlciwgcmV0dXJucyB3aGV0aGVyIHRoZSBidWZmZXIncyBmaWxlIHBhdGggbWF0Y2hlcyBhbnkgb2YgdGhlXG4gIC8vIGN1cnJlbnQgcmVmZXJlbmNlcy5cbiAgcmVmZXJlbmNlc0luY2x1ZGVCdWZmZXIoYnVmZmVyOiBUZXh0QnVmZmVyKSB7XG4gICAgbGV0IGJ1ZmZlclBhdGggPSBidWZmZXIuZ2V0UGF0aCgpO1xuICAgIGlmICghYnVmZmVyUGF0aCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0aGlzLnVyaXMuaGFzKGJ1ZmZlclBhdGgpO1xuICB9XG5cbiAgZm9udEZhbWlseUNoYW5nZWQoZm9udEZhbWlseTogc3RyaW5nKSB7XG4gICAgdGhpcy5wcmV2aWV3U3R5bGUgPSB7IGZvbnRGYW1pbHkgfTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGlnbm9yZWROYW1lc0NoYW5nZWQoaWdub3JlZE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuaWdub3JlZE5hbWVNYXRjaGVycyA9IGlnbm9yZWROYW1lcy5tYXAoaWcgPT4gbmV3IE1pbmltYXRjaChpZykpO1xuICB9XG5cbiAgc3BsaXREaXJlY3Rpb25DaGFuZ2VkKHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbikge1xuICAgIHRoaXMuc3BsaXREaXJlY3Rpb24gPSBzcGxpdERpcmVjdGlvbjtcbiAgfVxuXG4gIGdldE1ldGFkYXRhRm9yVGFyZ2V0KHRhcmdldDogSFRNTEVsZW1lbnQpIHtcbiAgICBpZiAoIXRhcmdldC5tYXRjaGVzKCdbZGF0YS1saW5lLW51bWJlcl1bZGF0YS1maWxlLXBhdGhdJykpIHJldHVybiBudWxsO1xuICAgIGxldCB7XG4gICAgICBmaWxlUGF0aCA9ICcnLFxuICAgICAgbGluZU51bWJlcjogbGluZU51bWJlclN0cmluZyA9ICctMScsXG4gICAgICByYW5nZVNwZWMgPSAnJ1xuICAgIH0gPSB0YXJnZXQuZGF0YXNldDtcbiAgICBsZXQgbGluZU51bWJlciA9IE51bWJlcihsaW5lTnVtYmVyU3RyaW5nKTtcbiAgICByZXR1cm4geyBmaWxlUGF0aCwgbGluZU51bWJlciwgcmFuZ2VTcGVjIH07XG4gIH1cblxuICBoYW5kbGVDbGljayhldmVudDogTW91c2VFdmVudCkge1xuICAgIGlmICghZXZlbnQudGFyZ2V0KSByZXR1cm47XG4gICAgbGV0IHRhcmdldCA9IChldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpPy5jbG9zZXN0KCdbZGF0YS1uYXZpZ2F0aW9uLWluZGV4XScpIGFzIEhUTUxFbGVtZW50O1xuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIGxldCBuYXZpZ2F0aW9uSW5kZXggPSBOdW1iZXIodGFyZ2V0LmRhdGFzZXQubmF2aWdhdGlvbkluZGV4KTtcbiAgICAgIGxldCB2aWV3cG9ydFhPZmZzZXQgPSBldmVudC5jbGllbnRYO1xuICAgICAgbGV0IHRhcmdldFJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIC8vIEEgYml0IG9mIGEgaGFjaywgYnV0IGNvcGllcyB0aGUgYXBwcm9hY2ggb2YgdGhlIGVxdWl2YWxlbnRcbiAgICAgIC8vIGBmaW5kLWFuZC1yZXBsYWNlYCByZXN1bHQgaGFuZGxlci4gRGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGEgY2xpY2sgb25cbiAgICAgIC8vIHRoZSByZXN1bHQgYW5kIGEgY2xpY2sgb24gdGhlIGRpc2Nsb3N1cmUgdHJpYW5nbGUgdGhhdFxuICAgICAgLy8gY29sbGFwc2VzL2V4cGFuZHMgcmVzdWx0cy5cbiAgICAgIGlmICh0YXJnZXQubWF0Y2hlcygnLmxpc3QtaXRlbScpICYmIHZpZXdwb3J0WE9mZnNldCAtIHRhcmdldFJlY3QubGVmdCA8PSAxNikge1xuICAgICAgICB0aGlzLnRvZ2dsZVJlc3VsdChuYXZpZ2F0aW9uSW5kZXgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxldCBtZXRhZGF0YSA9IHRoaXMuZ2V0TWV0YWRhdGFGb3JUYXJnZXQodGFyZ2V0KTtcbiAgICAgIGlmIChtZXRhZGF0YSkge1xuICAgICAgICBsZXQgeyBmaWxlUGF0aCwgbGluZU51bWJlciwgcmFuZ2VTcGVjIH0gPSBtZXRhZGF0YTtcbiAgICAgICAgdGhpcy5vcGVuUmVzdWx0KGZpbGVQYXRoLCBsaW5lTnVtYmVyLCByYW5nZVNwZWMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IG5hdmlnYXRpb25JbmRleDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAtMTtcbiAgICB9XG5cbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICB9XG5cbiAgYWN0aXZhdGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgaGFuZGxlUGluUmVmZXJlbmNlc0NsaWNrZWQoKSB7XG4gICAgdGhpcy5vdmVycmlkYWJsZSA9ICF0aGlzLm92ZXJyaWRhYmxlO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgLy8gQnJpbmdzIHRoZSB1c2VyIHRvIHRoZSBnaXZlbiByZWZlcmVuY2Ugb24gY2xpY2suXG4gIGFzeW5jIG9wZW5SZXN1bHQoXG4gICAgZmlsZVBhdGg6IHN0cmluZyxcbiAgICByb3c6IG51bWJlcixcbiAgICByYW5nZVNwZWM6IHN0cmluZyxcbiAgICB7IHBlbmRpbmcgPSB0cnVlIH06IHsgcGVuZGluZzogYm9vbGVhbjsgfSA9IHsgcGVuZGluZzogdHJ1ZSB9XG4gICkge1xuICAgIC8vIEZpbmQgYW4gZXhpc3RpbmcgZWRpdG9yIGluIHRoZSB3b3Jrc3BhY2UgZm9yIHRoaXMgZmlsZSBvciBlbHNlIGNyZWF0ZVxuICAgIC8vIG9uZSBpZiBuZWVkZWQuXG4gICAgbGV0IGVkaXRvciA9IGF3YWl0IGF0b20ud29ya3NwYWNlLm9wZW4oXG4gICAgICBmaWxlUGF0aCxcbiAgICAgIHtcbiAgICAgICAgcGVuZGluZyxcbiAgICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgICAgIHNwbGl0OiBnZXRPcHBvc2l0ZVNwbGl0KHRoaXMuc3BsaXREaXJlY3Rpb24pXG4gICAgICB9XG4gICAgKSBhcyBUZXh0RWRpdG9yO1xuXG4gICAgdGhpcy5yZXZlYWxSZWZlcmVuY2VJbkVkaXRvcihmaWxlUGF0aCwgcm93LCByYW5nZVNwZWMsIGVkaXRvcik7XG4gIH1cblxuICByZXZlYWxSZWZlcmVuY2VJbkVkaXRvcihmaWxlUGF0aDogc3RyaW5nLCByb3c6IG51bWJlciwgcmFuZ2VTcGVjOiBzdHJpbmcsIGVkaXRvcjogVGV4dEVkaXRvcikge1xuICAgIGxldCByZWZlcmVuY2VzRm9yRmlsZVBhdGggPSB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoIXJlZmVyZW5jZXNGb3JGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgbGV0IHJlZmVyZW5jZXNGb3JMaW5lTnVtYmVyID0gcmVmZXJlbmNlc0ZvckZpbGVQYXRoLmZpbHRlcigoeyByYW5nZSB9KSA9PiB7XG4gICAgICByZXR1cm4gcmFuZ2Uuc3RhcnQucm93ID09IHJvdztcbiAgICB9KTtcblxuICAgIGxldCByYW5nZXMgPSByZWZlcmVuY2VzRm9yTGluZU51bWJlci5tYXAociA9PiByLnJhbmdlKTtcbiAgICBsZXQgdGFyZ2V0UmFuZ2UgPSByYW5nZVNwZWMgPT09ICcnID8gcmFuZ2VzWzBdIDogcmFuZ2VzLmZpbmQociA9PiB7XG4gICAgICByZXR1cm4gci50b1N0cmluZygpID09PSByYW5nZVNwZWM7XG4gICAgfSk7XG5cbiAgICAvLyBSZXZlYWwgdGhlIHJvdyB0aGUgcmVzdWx0IGlzIG9uIGlmIGl0IGhhcHBlbnMgdG8gYmUgZm9sZGVkLlxuICAgIGVkaXRvci51bmZvbGRCdWZmZXJSb3cocm93KTtcblxuICAgIGlmIChyYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciB1bmRvY3VtZW50ZWQgb3B0aW9uXG4gICAgICBlZGl0b3IuZ2V0TGFzdFNlbGVjdGlvbigpLnNldEJ1ZmZlclJhbmdlKHRhcmdldFJhbmdlID8/IHJhbmdlc1swXSwgeyBmbGFzaDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICBlZGl0b3Iuc2Nyb2xsVG9DdXJzb3JQb3NpdGlvbigpO1xuICB9XG5cbiAgLy8gR3JvdXBzIHRoZSByZWZlcmVuY2VzIGFjY29yZGluZyB0byB0aGUgZmlsZXMgdGhleSBiZWxvbmcgdG8uXG4gIGZpbHRlckFuZEdyb3VwUmVmZXJlbmNlcygpOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2VbXT4ge1xuICAgIGxldCBwYXRocyA9IGF0b20ucHJvamVjdC5nZXRQYXRocygpO1xuICAgIGxldCByZXN1bHRzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZVtdPigpO1xuICAgIGxldCB1cmlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBpZiAoIXRoaXMucmVmZXJlbmNlcykgcmV0dXJuIHJlc3VsdHM7XG5cbiAgICAvLyBHcm91cCByZWZlcmVuY2VzIGJ5IGZpbGUuXG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHRoaXMucmVmZXJlbmNlcykge1xuICAgICAgbGV0IHsgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICB1cmlzLmFkZCh1cmkpO1xuICAgICAgbGV0IHByb2plY3RQYXRoID0gZGVzY2VuZHNGcm9tQW55KHVyaSwgcGF0aHMpO1xuXG4gICAgICAvLyBJZ25vcmUgYW55IHJlc3VsdHMgdGhhdCBhcmVuJ3Qgd2l0aGluIHRoaXMgcHJvamVjdC5cbiAgICAgIGlmIChwcm9qZWN0UGF0aCA9PT0gZmFsc2UpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBJZ25vcmUgYW55IHJlc3VsdHMgd2l0aGluIGlnbm9yZWQgZmlsZXMuXG4gICAgICBpZiAobWF0Y2hlc0lnbm9yZWROYW1lcyh1cmksIHRoaXMuaWdub3JlZE5hbWVNYXRjaGVycyA/PyBbXSkpIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgW18sIHJlbGF0aXZlUGF0aF0gPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZVBhdGgodXJpKTtcbiAgICAgIGxldCByZXN1bHRzRm9yUGF0aCA9IHJlc3VsdHMuZ2V0KHJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc3VsdHNGb3JQYXRoKSB7XG4gICAgICAgIHJlc3VsdHNGb3JQYXRoID0gW107XG4gICAgICAgIHJlc3VsdHMuc2V0KHJlbGF0aXZlUGF0aCwgcmVzdWx0c0ZvclBhdGgpO1xuICAgICAgfVxuXG4gICAgICByZXN1bHRzRm9yUGF0aC5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgdGhpcy5maWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzID0gcmVzdWx0cztcbiAgICB0aGlzLnVyaXMgPSB1cmlzO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0IHByb3BzKCk6IFJlZmVyZW5jZXNWaWV3UHJvcGVydGllcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZmVyZW5jZXM6IHRoaXMucmVmZXJlbmNlcyA/PyBbXSxcbiAgICAgIHN5bWJvbE5hbWU6IHRoaXMuc3ltYm9sTmFtZSA/PyAnJyxcbiAgICAgIGVkaXRvcjogdGhpcy5lZGl0b3IsXG4gICAgICBtYXJrZXI6IHRoaXMubWFya2VyLFxuICAgICAgbWFuYWdlcjogdGhpcy5tYW5hZ2VyXG4gICAgfTtcbiAgfVxuXG4gIHdyaXRlQWZ0ZXJVcGRhdGUoKSB7XG4gICAgbGV0IHNlbGVjdGVkID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAnW2RhdGEtbmF2aWdhdGlvbi1pbmRleF0uc2VsZWN0ZWQsIC5saXN0LW5lc3RlZC1pdGVtLnNlbGVjdGVkJ1xuICAgICk7XG4gICAgaWYgKCFzZWxlY3RlZCkgcmV0dXJuO1xuICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgcHJvcHJpZXRhcnkgbWV0aG9kXG4gICAgc2VsZWN0ZWQuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpO1xuICB9XG5cbiAgY29weSgpIHtcbiAgICBsZXQgbmV3VXJpID0gUmVmZXJlbmNlc1ZpZXcubmV4dFVyaSgpO1xuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlc1ZpZXcobmV3VXJpLCB0aGlzLnByb3BzKTtcbiAgfVxuXG4gIGdldFRpdGxlKCkge1xuICAgIGxldCB7IHN5bWJvbE5hbWUgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGDigJwke3N5bWJvbE5hbWV94oCdOiBGaW5kIFJlZmVyZW5jZXMgUmVzdWx0c2A7XG4gIH1cblxuICBnZXRJY29uTmFtZSgpIHtcbiAgICByZXR1cm4gJ3NlYXJjaCc7XG4gIH1cblxuICBnZXRVUkkoKSB7XG4gICAgcmV0dXJuIFJlZmVyZW5jZXNWaWV3LlVSSTtcbiAgfVxuXG4gIGZvY3VzKCkge1xuICAgIGxldCByZWZlcmVuY2VzVmlldyA9IHRoaXMucmVmcy5yZWZlcmVuY2VzVmlldztcbiAgICBpZiAoIWlzRXRjaENvbXBvbmVudChyZWZlcmVuY2VzVmlldykpIHJldHVybjtcbiAgICByZWZlcmVuY2VzVmlldy5lbGVtZW50LmZvY3VzKCk7XG4gIH1cblxuICAvLyBBc3NlbWJsZXMgYSBtYXAgYmV0d2VlbiByZWZlcmVuY2UgVVJJcyBhbmQgYFRleHRCdWZmZXJgcyBmb3IgY2hpbGQgdmlld3NcbiAgLy8gdG8gY29uc3VsdC5cbiAgYXN5bmMgYnVpbGRCdWZmZXJDYWNoZSgpIHtcbiAgICBsZXQgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFRleHRCdWZmZXI+KCk7XG4gICAgbGV0IGVkaXRvcnMgPSBhdG9tLndvcmtzcGFjZS5nZXRUZXh0RWRpdG9ycygpO1xuICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7XG4gICAgICBsZXQgcGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBsZXQgYnVmZmVyID0gZWRpdG9yLmdldEJ1ZmZlcigpO1xuICAgICAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkgY29udGludWU7XG4gICAgICBpZiAobWFwLmhhcyhwYXRoKSkgY29udGludWU7XG4gICAgICBtYXAuc2V0KHBhdGgsIGJ1ZmZlcik7XG4gICAgfVxuICAgIC8vIEFueSBidWZmZXJzIHRoYXQgYXJlbid0IHByZXNlbnQgYWxyZWFkeSBpbiB0aGUgd29yayBzcGFjZSBjYW4gYmUgY3JlYXRlZFxuICAgIC8vIGZyb20gZmlsZXMgb24gZGlzay5cbiAgICBmb3IgKGxldCB1cmkgb2YgdGhpcy51cmlzKSB7XG4gICAgICBpZiAobWFwLmhhcyh1cmkpKSBjb250aW51ZTtcbiAgICAgIG1hcC5zZXQodXJpLCBhd2FpdCBUZXh0QnVmZmVyLmxvYWQodXJpKSk7XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICAvLyBIb3cgZG8gd2Uga2VlcCByZWZyZXNoaW5nIHRoZSByZWZlcmVuY2VzIHBhbmVsIGFzIHdlIG1ha2UgY2hhbmdlcyBpbiB0aGVcbiAgLy8gcHJvamVjdD9cbiAgLy9cbiAgLy8gKiBSZW1lbWJlciB0aGUgY3Vyc29yIHBvc2l0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBwYW5lbC4gQ3JlYXRlIGEgbWFya2VyXG4gIC8vICAgdG8gdHJhY2sgdGhlIGxvZ2ljYWwgYnVmZmVyIHBvc2l0aW9uIHRocm91Z2ggZWRpdHMuXG4gIC8vICogT3BlbiB0aGUgcGFuZWwgYW5kIHNob3cgdGhlIHJlc3VsdHMuXG4gIC8vICogV2hlbiB5b3Ugb3BlbiB0aGUgcGFuZWwsIGFkZCBhbiBgb25EaWRTdG9wQ2hhbmdpbmdgIG9ic2VydmVyIHRvIGV2ZXJ5XG4gIC8vICAgYFRleHRFZGl0b3JgIGluIHRoZSBwcm9qZWN0LiBUaGUgY2FsbGJhY2sgc2hvdWxkIHJldHVybiBlYXJseSBpZiB0aGVcbiAgLy8gICBlZGl0b3IgaXNuJ3QgY2hhbmdpbmcgYSBidWZmZXIgdGhhdCBpcyBpbiB0aGUgcmVzdWx0IHNldDsgb3RoZXJ3aXNlIGl0XG4gIC8vICAgc2hvdWxkIHJlLXJlcXVlc3QgdGhlIGxpc3Qgb2YgcmVmZXJlbmNlcy5cbiAgLy8gKiBXaGVuIHJlZmVyZW5jZXMgYXJlIHJlLXJlcXVlc3RlZCwgdGhleSBzaG91bGQgdXNlIHRoZSBjdXJyZW50IGJ1ZmZlclxuICAvLyAgIHBvc2l0aW9uIG9mIHRoZSBtYXJrZXIgd2UgY3JlYXRlZCBpbiBzdGVwIDEuXG4gIC8vXG4gIC8vIFRoaXMgd29ya3MgZm9yIGFzIGxvbmcgYXMgdGhlIGN1cnNvciBwb3NpdGlvbiBjYW4gYmUgbG9naWNhbGx5IHRyYWNrZWQuIElmXG4gIC8vIHRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQsIHRoYXQgbWVhbnMgYSBjaGFuZ2UgaGFzIGNvbXBsZXRlbHkgc3Vycm91bmRlZFxuICAvLyBpdCwgYW5kIHdlIGNhbiBubyBsb25nZXIgYWZmaXJtIGl0IHJlZmVycyB0byB0aGUgc2FtZSBzeW1ib2wuIEF0IHRoaXNcbiAgLy8gcG9pbnQsIHdlIGNsb3NlIHRoZSBwYW5lbC5cbiAgYXN5bmMgcmVmcmVzaFBhbmVsKCkge1xuICAgIGlmICghdGhpcy5tYW5hZ2VyIHx8ICF0aGlzLmVkaXRvciB8fCAhdGhpcy5tYXJrZXIpIHJldHVybjtcbiAgICBsZXQgYnVuZGxlID0gYXdhaXQgdGhpcy5tYW5hZ2VyLmZpbmRSZWZlcmVuY2VzRm9yUHJvamVjdEF0UG9zaXRpb24oXG4gICAgICB0aGlzLmVkaXRvcixcbiAgICAgIHRoaXMubWFya2VyLmdldEJ1ZmZlclJhbmdlKCkuc3RhcnRcbiAgICApO1xuICAgIGlmICghYnVuZGxlIHx8IGJ1bmRsZS50eXBlID09PSAnZXJyb3InKSByZXR1cm47XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZSh7XG4gICAgICByZWZlcmVuY2VzOiBidW5kbGUucmVmZXJlbmNlcyxcbiAgICAgIHN5bWJvbE5hbWU6IGJ1bmRsZS5yZWZlcmVuY2VkU3ltYm9sTmFtZVxuICAgIH0pO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIGxldCBsaXN0U3R5bGUgPSB7XG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgIG92ZXJmbG93OiAnaGlkZGVuJyxcbiAgICAgIGxlZnQ6ICcwJyxcbiAgICAgIHRvcDogJzAnLFxuICAgICAgcmlnaHQ6ICcwJ1xuICAgIH07XG5cbiAgICBsZXQgY2hpbGRyZW4gPSBbXTtcblxuICAgIGxldCBuYXZpZ2F0aW9uSW5kZXggPSAwO1xuICAgIGZvciAobGV0IFtyZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZXNdIG9mIHRoaXMuZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcykge1xuICAgICAgbGV0IHZpZXcgPSAoXG4gICAgICAgIDxSZWZlcmVuY2VHcm91cFZpZXdcbiAgICAgICAgICByZWxhdGl2ZVBhdGg9e3JlbGF0aXZlUGF0aH1cbiAgICAgICAgICByZWZlcmVuY2VzPXtyZWZlcmVuY2VzfVxuICAgICAgICAgIG5hdmlnYXRpb25JbmRleD17bmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIGluZGV4VG9SZWZlcmVuY2VNYXA9e3RoaXMuaW5kZXhUb1JlZmVyZW5jZU1hcH1cbiAgICAgICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg9e3RoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIGJ1ZmZlckNhY2hlPXt0aGlzLmJ1ZmZlckNhY2hlfVxuICAgICAgICAgIGlzQ29sbGFwc2VkPXt0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKG5hdmlnYXRpb25JbmRleCl9XG4gICAgICAgIC8+XG4gICAgICApO1xuICAgICAgY2hpbGRyZW4ucHVzaCh2aWV3KTtcbiAgICAgIG5hdmlnYXRpb25JbmRleCArPSByZWZlcmVuY2VzLmxlbmd0aCArIDE7XG4gICAgfVxuXG4gICAgdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4IC0gMTtcblxuICAgIGxldCBjb250YWluZXJTdHlsZSA9IHtcbiAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuICAgICAgaGVpZ2h0OiAnMTAwJScsXG4gICAgICBvdmVyZmxvdzogJ2F1dG8nLFxuICAgIH07XG5cbiAgICBsZXQgbWF0Y2hDb3VudCA9IHRoaXMucmVmZXJlbmNlcy5sZW5ndGg7XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBjeCgnZmluZC1yZWZlcmVuY2VzLXBhbmUnLCAncHJldmlldy1wYW5lJywgJ3BhbmUtaXRlbScsIHsgJ25vLXJlc3VsdHMnOiBtYXRjaENvdW50ID09PSAwIH0pO1xuXG4gICAgbGV0IHBpbkJ1dHRvbkNsYXNzTmFtZXMgPSBjeCgnYnRuJywgJ2ljb24nLCAnaWNvbi1waW4nLCB7XG4gICAgICAnc2VsZWN0ZWQnOiAhdGhpcy5vdmVycmlkYWJsZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPXtjbGFzc05hbWVzfSB0YWJJbmRleD17LTF9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInByZXZpZXctaGVhZGVyXCI+XG4gICAgICAgICAge2Rlc2NyaWJlUmVmZXJlbmNlcyh0aGlzLnJlZmVyZW5jZXMubGVuZ3RoLCB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMuc2l6ZSwgdGhpcy5zeW1ib2xOYW1lKX1cblxuICAgICAgICAgIDxkaXYgcmVmPVwicGluUmVmZXJlbmNlc1wiIGNsYXNzTmFtZT17cGluQnV0dG9uQ2xhc3NOYW1lc30+RG9u4oCZdCBvdmVycmlkZTwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IHJlZj1cInJlZmVyZW5jZXNWaWV3XCIgY2xhc3NOYW1lPVwicmVzdWx0cy12aWV3IGZvY3VzYWJsZS1wYW5lbFwiIHRhYkluZGV4PXstMX0gc3R5bGU9e3RoaXMucHJldmlld1N0eWxlfT5cbiAgICAgICAgICA8ZGl2IHJlZj1cInNjcm9sbENvbnRhaW5lclwiIGNsYXNzTmFtZT1cInJlc3VsdHMtdmlldy1jb250YWluZXJcIiBzdHlsZT17Y29udGFpbmVyU3R5bGV9PlxuICAgICAgICAgICAgPG9sXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImxpc3QtdHJlZSBoYXMtY29sbGFwc2FibGUtY2hpbGRyZW5cIlxuICAgICAgICAgICAgICBzdHlsZT17bGlzdFN0eWxlfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7Y2hpbGRyZW59XG4gICAgICAgICAgICA8L29sPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cbn1cbiJdfQ==