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
function pluralize(singular, plural, count) {
    return count > 1 ? plural : singular;
}
function describeReferences(referenceCount, fileCount, symbolName) {
    return (etch_1.default.dom("span", { ref: "previewCount", className: "preview-count inline-block" },
        referenceCount,
        " ",
        pluralize('result', 'results', referenceCount),
        " found in ",
        fileCount,
        " ",
        pluralize('file', 'files', fileCount),
        " for ",
        ' ',
        etch_1.default.dom("span", { className: "highlight-info" }, symbolName)));
}
function descendsFromAny(filePath, projectPaths) {
    for (let projectPath of projectPaths) {
        if (descendsFrom(filePath, projectPath))
            return projectPath;
    }
    return false;
}
function descendsFrom(filePath, projectPath) {
    if (typeof filePath !== 'string')
        return false;
    return filePath.startsWith(projectPath.endsWith(path_1.default.sep) ? projectPath : `${projectPath}${path_1.default.sep}`);
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
let lastReferences = {
    references: [],
    symbolName: ''
};
function getOppositeSplit(split) {
    return {
        left: 'right',
        right: 'left',
        down: 'up',
        up: 'down',
        none: undefined
    }[split];
}
class ReferencesView {
    static setReferences(references, symbolName) {
        console.log('ReferencesPaneView.setReferences:', references);
        lastReferences = { references, symbolName };
        for (let instance of ReferencesView.instances) {
            instance.update(lastReferences);
        }
    }
    constructor() {
        this.subscriptions = new atom_1.CompositeDisposable();
        this.ignoredNameMatchers = null;
        this.splitDirection = 'none';
        this.activeNavigationIndex = -1;
        this.lastNavigationIndex = -1;
        this.collapsedIndices = new Set();
        this.pinned = false;
        this.previewStyle = { fontFamily: '' };
        ReferencesView.instances.add(this);
        this.references = lastReferences.references;
        this.symbolName = lastReferences.symbolName;
        console.debug('ReferencesView constructor:', this.references, this.symbolName);
        if (!this.references) {
            throw new Error(`No references!`);
        }
        this.filterAndGroupReferences();
        etch_1.default.initialize(this);
        this.element.addEventListener('mousedown', this.handleClick.bind(this));
        this.subscriptions.add(atom.config.observe('editor.fontFamily', this.fontFamilyChanged.bind(this)), atom.config.observe('core.ignoredNames', this.ignoredNamesChanged.bind(this)), atom.config.observe('pulsar-find-references.panel.splitDirection', this.splitDirectionChanged.bind(this)));
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
            'find-and-replace:copy-path': this.copyPath.bind(this),
            'find-and-replace:open-in-new-tab': this.openInNewTab.bind(this),
        });
        this.refs.pinReferences.addEventListener('click', this.handlePinReferencesClicked.bind(this));
        this.focus();
    }
    moveUp() {
        if (this.activeNavigationIndex === this.lastNavigationIndex)
            return;
        let index = this.findVisibleNavigationIndex(-1);
        if (index === null)
            return;
        this.activeNavigationIndex = index;
        etch_1.default.update(this);
    }
    moveDown() {
        if (this.activeNavigationIndex === this.lastNavigationIndex)
            return;
        let index = this.findVisibleNavigationIndex(1);
        if (index === null)
            return;
        this.activeNavigationIndex = index;
        etch_1.default.update(this);
    }
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
        etch_1.default.update(this);
    }
    pageDown() {
        let currentOffset = this.scrollOffsetOfElementAtIndex(this.activeNavigationIndex);
        if (currentOffset === null)
            return;
        let index = this.findElementIndexNearHeight(currentOffset + this.refs.scrollContainer.offsetHeight);
        this.activeNavigationIndex = index;
        etch_1.default.update(this);
    }
    moveToTop() {
        this.activeNavigationIndex = 0;
        etch_1.default.update(this);
    }
    moveToBottom() {
        this.activeNavigationIndex = this.lastNavigationIndex;
        etch_1.default.update(this);
    }
    confirmResult() {
        let element = this.activeElement;
        if (!element)
            return;
        let { filePath = '', lineNumberStr = '-1', range = '' } = element.dataset;
        let lineNumber = Number(lineNumberStr);
        this.openResult(filePath, lineNumber, range);
    }
    copyResult() {
        // TODO
    }
    copyPath() {
        // TODO
    }
    openInNewTab() {
        // TODO
    }
    getElementAtIndex(index) {
        let element = this.element.querySelector(`[data-navigation-index="${index}"]`);
        return element ? element : null;
    }
    get activeElement() {
        if (this.activeNavigationIndex < 0)
            return null;
        return this.getElementAtIndex(this.activeNavigationIndex);
    }
    update({ references, symbolName }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Ignore new references when pinned.
            if (this.pinned)
                return Promise.resolve();
            let changed = false;
            if (references.length === 0 && symbolName === '')
                return Promise.resolve();
            if (this.references !== references) {
                this.references = references;
                this.filterAndGroupReferences();
                changed = true;
            }
            if (this.symbolName !== symbolName) {
                this.symbolName = symbolName;
                changed = true;
            }
            return changed ? etch_1.default.update(this) : Promise.resolve();
        });
    }
    destroy() {
        ReferencesView.instances.delete(this);
        this.subscriptions.dispose();
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
    handleClick(event) {
        var _a, _b, _c;
        if (!event.target)
            return;
        let target = (_a = event.target) === null || _a === void 0 ? void 0 : _a.closest('[data-navigation-index]');
        if (target) {
            let navigationIndex = Number(target.dataset.navigationIndex);
            let viewportXOffset = event.clientX;
            let targetRect = target.getBoundingClientRect();
            if (target.matches('.list-item') && viewportXOffset - targetRect.left <= 16) {
                this.toggleResult(navigationIndex);
                return;
            }
            if (target.matches('[data-line-number][data-file-path]')) {
                let filePath = (_b = target.dataset.filePath) !== null && _b !== void 0 ? _b : '';
                let lineNumber = Number(target.dataset.lineNumber || '-1');
                let rangeSpec = (_c = target.dataset.range) !== null && _c !== void 0 ? _c : '';
                this.openResult(filePath, lineNumber, rangeSpec);
            }
            this.activeNavigationIndex = navigationIndex;
        }
        else {
            this.activeNavigationIndex = -1;
        }
        etch_1.default.update(this);
        event.preventDefault();
        // this.activate();
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
        this.pinned = !this.pinned;
        etch_1.default.update(this);
    }
    openResult(filePath, row, rangeSpec, { pending = true } = { pending: true }) {
        return __awaiter(this, void 0, void 0, function* () {
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
            let editor = yield atom.workspace.open(filePath, {
                pending,
                searchAllPanes: true,
                split: getOppositeSplit(this.splitDirection)
            });
            editor.unfoldBufferRow(row);
            if (ranges.length > 0) {
                // @ts-expect-error undocumented option
                editor.getLastSelection().setBufferRange(targetRange !== null && targetRange !== void 0 ? targetRange : ranges[0], { flash: true });
            }
            editor.scrollToCursorPosition();
        });
    }
    filterAndGroupReferences() {
        var _a;
        let paths = atom.project.getPaths();
        let results = new Map();
        if (!this.references)
            return results;
        for (let reference of this.references) {
            let { uri } = reference;
            let projectPath = descendsFromAny(uri, paths);
            if (projectPath === false)
                continue;
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
        return results;
    }
    get props() {
        var _a, _b;
        return {
            references: (_a = this.references) !== null && _a !== void 0 ? _a : [],
            symbolName: (_b = this.symbolName) !== null && _b !== void 0 ? _b : ''
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
        return new ReferencesView();
    }
    getTitle() {
        return 'Find References Results';
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
    render() {
        // console.log('ReferencesView render:', this.props, this.activeNavigationIndex);
        let listStyle = {
            position: 'absolute',
            overflow: 'hidden',
            left: '0',
            top: '0',
            right: '0'
        };
        let index = this.filteredAndGroupedReferences;
        let children = [];
        let navigationIndex = 0;
        for (let [relativePath, references] of index) {
            let view = (etch_1.default.dom(reference_group_view_1.default, { relativePath: relativePath, references: references, navigationIndex: navigationIndex, activeNavigationIndex: this.activeNavigationIndex, isCollapsed: this.collapsedIndices.has(navigationIndex) }));
            // console.log('ReferencesView adding child:', view);
            children.push(view);
            navigationIndex += references.length + 1;
        }
        this.lastNavigationIndex = navigationIndex;
        let containerStyle = {
            position: 'relative',
            height: '100%',
            overflow: 'auto',
        };
        let matchCount = this.references.length;
        let classNames = (0, classnames_1.default)('find-references-pane', 'preview-pane', 'pane-item', { 'no-results': matchCount === 0 });
        let pinButtonClassNames = (0, classnames_1.default)('btn', 'icon', 'icon-pin', { 'selected': this.pinned });
        return (etch_1.default.dom("div", { className: classNames, tabIndex: -1 },
            etch_1.default.dom("div", { className: "preview-header" },
                describeReferences(this.references.length, this.filteredAndGroupedReferences.size, this.symbolName),
                etch_1.default.dom("div", { ref: "pinReferences", className: pinButtonClassNames }, "Pin references")),
            etch_1.default.dom("div", { ref: "referencesView", className: "results-view focusable-panel", tabIndex: -1, style: this.previewStyle },
                etch_1.default.dom("div", { ref: "scrollContainer", className: "results-view-container", style: containerStyle },
                    etch_1.default.dom("ol", { className: "list-tree has-collapsable-children", style: listStyle }, children)))));
    }
}
ReferencesView.URI = "atom://pulsar-find-references/results";
ReferencesView.instances = new Set();
exports.default = ReferencesView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBdUQ7QUFDdkQseUNBQXNDO0FBQ3RDLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsNERBQTRCO0FBRTVCLGtGQUF3RDtBQUN4RCxvREFBc0M7QUFLdEMsU0FBUyxlQUFlLENBQUMsRUFBVztJQUNsQyxJQUFJLENBQUMsRUFBRTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3RCLElBQUksT0FBTyxFQUFFLEtBQUssUUFBUTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3pDLE9BQU8sQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLFFBQWdCLEVBQUUsTUFBYyxFQUFFLEtBQWE7SUFDaEUsT0FBTyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN2QyxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxjQUFzQixFQUFFLFNBQWlCLEVBQUUsVUFBa0I7SUFDdkYsT0FBTyxDQUNMLDZCQUFNLEdBQUcsRUFBQyxjQUFjLEVBQUMsU0FBUyxFQUFDLDRCQUE0QjtRQUM1RCxjQUFjOztRQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQzs7UUFBWSxTQUFTOztRQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQzs7UUFBTyxHQUFHO1FBQ3ZJLDZCQUFNLFNBQVMsRUFBQyxnQkFBZ0IsSUFBRSxVQUFVLENBQVEsQ0FDL0MsQ0FDUixDQUFDO0FBQ0osQ0FBQztB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RTdHLElBQUksbUJBQW1CLEdBQUcsSUFBQSxvQkFBRSxFQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sQ0FDTCw0QkFBSyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDdEMsNEJBQUssU0FBUyxFQUFDLGdCQUFnQjtnQkFDNUIsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUVwRyw0QkFBSyxHQUFHLEVBQUMsZUFBZSxFQUFDLFNBQVMsRUFBRSxtQkFBbUIscUJBQXNCLENBQ3pFO1lBRU4sNEJBQUssR0FBRyxFQUFDLGdCQUFnQixFQUFDLFNBQVMsRUFBQyw4QkFBOEIsRUFBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUN2Ryw0QkFBSyxHQUFHLEVBQUMsaUJBQWlCLEVBQUMsU0FBUyxFQUFDLHdCQUF3QixFQUFDLEtBQUssRUFBRSxjQUFjO29CQUNqRiwyQkFDRSxTQUFTLEVBQUMsb0NBQW9DLEVBQzlDLEtBQUssRUFBRSxTQUFTLElBRWYsUUFBUSxDQUNOLENBQ0QsQ0FDRixDQUNGLENBQ1AsQ0FBQztJQUNKLENBQUM7O0FBcGRNLGtCQUFHLEdBQUcsdUNBQXVDLEFBQTFDLENBQTJDO0FBRTlDLHdCQUFTLEdBQXdCLElBQUksR0FBRyxFQUFFLEFBQWpDLENBQWtDO2tCQUgvQixjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IHsgTWluaW1hdGNoIH0gZnJvbSAnbWluaW1hdGNoJztcbmltcG9ydCBldGNoIGZyb20gJ2V0Y2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY3ggZnJvbSAnY2xhc3NuYW1lcyc7XG5cbmltcG9ydCBSZWZlcmVuY2VHcm91cFZpZXcgZnJvbSAnLi9yZWZlcmVuY2UtZ3JvdXAtdmlldyc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4uL2NvbnNvbGUnO1xuXG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IHR5cGUgeyBFdGNoQ29tcG9uZW50IH0gZnJvbSAnZXRjaCc7XG5cbmZ1bmN0aW9uIGlzRXRjaENvbXBvbmVudChlbDogdW5rbm93bik6IGVsIGlzIEV0Y2hDb21wb25lbnQge1xuICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgZWwgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ3JlZnMnIGluIGVsKSAmJiAoJ2VsZW1lbnQnIGluIGVsKTtcbn1cblxuZnVuY3Rpb24gcGx1cmFsaXplKHNpbmd1bGFyOiBzdHJpbmcsIHBsdXJhbDogc3RyaW5nLCBjb3VudDogbnVtYmVyKSB7XG4gIHJldHVybiBjb3VudCA+IDEgPyBwbHVyYWwgOiBzaW5ndWxhcjtcbn1cblxuZnVuY3Rpb24gZGVzY3JpYmVSZWZlcmVuY2VzKHJlZmVyZW5jZUNvdW50OiBudW1iZXIsIGZpbGVDb3VudDogbnVtYmVyLCBzeW1ib2xOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIChcbiAgICA8c3BhbiByZWY9XCJwcmV2aWV3Q291bnRcIiBjbGFzc05hbWU9XCJwcmV2aWV3LWNvdW50IGlubGluZS1ibG9ja1wiPlxuICAgICAge3JlZmVyZW5jZUNvdW50fSB7cGx1cmFsaXplKCdyZXN1bHQnLCAncmVzdWx0cycsIHJlZmVyZW5jZUNvdW50KX0gZm91bmQgaW4ge2ZpbGVDb3VudH0ge3BsdXJhbGl6ZSgnZmlsZScsICdmaWxlcycsIGZpbGVDb3VudCl9IGZvciB7JyAnfVxuICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaGlnaGxpZ2h0LWluZm9cIj57c3ltYm9sTmFtZX08L3NwYW4+XG4gICAgPC9zcGFuPlxuICApO1xufVxuXG5mdW5jdGlvbiBkZXNjZW5kc0Zyb21BbnkoZmlsZVBhdGg6IHN0cmluZywgcHJvamVjdFBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB8IGZhbHNlIHtcbiAgZm9yIChsZXQgcHJvamVjdFBhdGggb2YgcHJvamVjdFBhdGhzKSB7XG4gICAgaWYgKGRlc2NlbmRzRnJvbShmaWxlUGF0aCwgcHJvamVjdFBhdGgpKSByZXR1cm4gcHJvamVjdFBhdGg7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBkZXNjZW5kc0Zyb20oZmlsZVBhdGg6IHN0cmluZywgcHJvamVjdFBhdGg6IHN0cmluZykge1xuICBpZiAodHlwZW9mIGZpbGVQYXRoICE9PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gZmlsZVBhdGguc3RhcnRzV2l0aChcbiAgICBwcm9qZWN0UGF0aC5lbmRzV2l0aChQYXRoLnNlcCkgPyBwcm9qZWN0UGF0aCA6IGAke3Byb2plY3RQYXRofSR7UGF0aC5zZXB9YFxuICApO1xufVxuXG5mdW5jdGlvbiBtYXRjaGVzSWdub3JlZE5hbWVzKGZpbGVQYXRoOiBzdHJpbmcsIGlnbm9yZWROYW1lczogTWluaW1hdGNoW10pIHtcbiAgbGV0IHJlcG9zaXRvcmllcyA9IGF0b20ucHJvamVjdC5nZXRSZXBvc2l0b3JpZXMoKTtcbiAgaWYgKHJlcG9zaXRvcmllcy5zb21lKHIgPT4gci5pc1BhdGhJZ25vcmVkKGZpbGVQYXRoKSkpIHJldHVybiB0cnVlO1xuICByZXR1cm4gaWdub3JlZE5hbWVzLnNvbWUoaWcgPT4ge1xuICAgIGxldCByZXN1bHQgPSBpZy5tYXRjaChmaWxlUGF0aCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59XG5cbnR5cGUgU3BsaXREaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyB8ICdub25lJztcbnR5cGUgRm9ybWFsU3BsaXREaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyB8IHVuZGVmaW5lZDtcblxudHlwZSBSZWZlcmVuY2VzVmlld1Byb3BlcnRpZXMgPSB7XG4gIHJlZj86IHN0cmluZyxcbiAgcmVmZXJlbmNlczogUmVmZXJlbmNlW10sXG4gIHN5bWJvbE5hbWU6IHN0cmluZ1xufTtcblxubGV0IGxhc3RSZWZlcmVuY2VzOiB7IHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdLCBzeW1ib2xOYW1lOiBzdHJpbmcgfSA9IHtcbiAgcmVmZXJlbmNlczogW10sXG4gIHN5bWJvbE5hbWU6ICcnXG59O1xuXG5mdW5jdGlvbiBnZXRPcHBvc2l0ZVNwbGl0KHNwbGl0OiBTcGxpdERpcmVjdGlvbik6IEZvcm1hbFNwbGl0RGlyZWN0aW9uIHtcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiAncmlnaHQnLFxuICAgIHJpZ2h0OiAnbGVmdCcsXG4gICAgZG93bjogJ3VwJyxcbiAgICB1cDogJ2Rvd24nLFxuICAgIG5vbmU6IHVuZGVmaW5lZFxuICB9W3NwbGl0XSBhcyBGb3JtYWxTcGxpdERpcmVjdGlvbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVmZXJlbmNlc1ZpZXcge1xuICBzdGF0aWMgVVJJID0gXCJhdG9tOi8vcHVsc2FyLWZpbmQtcmVmZXJlbmNlcy9yZXN1bHRzXCI7XG5cbiAgc3RhdGljIGluc3RhbmNlczogU2V0PFJlZmVyZW5jZXNWaWV3PiA9IG5ldyBTZXQoKTtcblxuICBzdGF0aWMgc2V0UmVmZXJlbmNlcyhyZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSwgc3ltYm9sTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc29sZS5sb2coJ1JlZmVyZW5jZXNQYW5lVmlldy5zZXRSZWZlcmVuY2VzOicsIHJlZmVyZW5jZXMpO1xuICAgIGxhc3RSZWZlcmVuY2VzID0geyByZWZlcmVuY2VzLCBzeW1ib2xOYW1lIH07XG5cbiAgICBmb3IgKGxldCBpbnN0YW5jZSBvZiBSZWZlcmVuY2VzVmlldy5pbnN0YW5jZXMpIHtcbiAgICAgIGluc3RhbmNlLnVwZGF0ZShsYXN0UmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHJpdmF0ZSByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXTtcbiAgcHJpdmF0ZSBzeW1ib2xOYW1lOiBzdHJpbmc7XG4gIHByaXZhdGUgaWdub3JlZE5hbWVNYXRjaGVyczogTWluaW1hdGNoW10gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzcGxpdERpcmVjdGlvbjogU3BsaXREaXJlY3Rpb24gPSAnbm9uZSc7XG5cbiAgcHJpdmF0ZSBmaWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzITogTWFwPHN0cmluZywgUmVmZXJlbmNlW10+O1xuXG4gIHByaXZhdGUgYWN0aXZlTmF2aWdhdGlvbkluZGV4OiBudW1iZXIgPSAtMTtcbiAgcHJpdmF0ZSBsYXN0TmF2aWdhdGlvbkluZGV4OiBudW1iZXIgPSAtMTtcblxuICBwcml2YXRlIGNvbGxhcHNlZEluZGljZXM6IFNldDxudW1iZXI+ID0gbmV3IFNldCgpO1xuXG4gIHByaXZhdGUgcGlubmVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBwcmV2aWV3U3R5bGU6IHsgZm9udEZhbWlseTogc3RyaW5nIH0gPSB7IGZvbnRGYW1pbHk6ICcnIH07XG5cbiAgcHVibGljIGVsZW1lbnQhOiBIVE1MRWxlbWVudDtcbiAgcHVibGljIHJlZnMhOiB7IFtrZXk6IHN0cmluZ106IEhUTUxFbGVtZW50IH07XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgUmVmZXJlbmNlc1ZpZXcuaW5zdGFuY2VzLmFkZCh0aGlzKTtcbiAgICB0aGlzLnJlZmVyZW5jZXMgPSBsYXN0UmVmZXJlbmNlcy5yZWZlcmVuY2VzO1xuICAgIHRoaXMuc3ltYm9sTmFtZSA9IGxhc3RSZWZlcmVuY2VzLnN5bWJvbE5hbWU7XG4gICAgY29uc29sZS5kZWJ1ZygnUmVmZXJlbmNlc1ZpZXcgY29uc3RydWN0b3I6JywgdGhpcy5yZWZlcmVuY2VzLCB0aGlzLnN5bWJvbE5hbWUpO1xuXG4gICAgaWYgKCF0aGlzLnJlZmVyZW5jZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gcmVmZXJlbmNlcyFgKTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbHRlckFuZEdyb3VwUmVmZXJlbmNlcygpO1xuXG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpO1xuXG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnZWRpdG9yLmZvbnRGYW1pbHknLCB0aGlzLmZvbnRGYW1pbHlDaGFuZ2VkLmJpbmQodGhpcykpLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnY29yZS5pZ25vcmVkTmFtZXMnLCB0aGlzLmlnbm9yZWROYW1lc0NoYW5nZWQuYmluZCh0aGlzKSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKCdwdWxzYXItZmluZC1yZWZlcmVuY2VzLnBhbmVsLnNwbGl0RGlyZWN0aW9uJywgdGhpcy5zcGxpdERpcmVjdGlvbkNoYW5nZWQuYmluZCh0aGlzKSlcbiAgICApO1xuXG4gICAgYXRvbS5jb21tYW5kcy5hZGQ8Tm9kZT4oXG4gICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICB7XG4gICAgICAgICdjb3JlOm1vdmUtdXAnOiB0aGlzLm1vdmVVcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLWRvd24nOiB0aGlzLm1vdmVEb3duLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtbGVmdCc6IHRoaXMuY29sbGFwc2VBY3RpdmUuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS1yaWdodCc6IHRoaXMuZXhwYW5kQWN0aXZlLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOnBhZ2UtdXAnOiB0aGlzLnBhZ2VVcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpwYWdlLWRvd24nOiB0aGlzLnBhZ2VEb3duLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtdG8tdG9wJzogdGhpcy5tb3ZlVG9Ub3AuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS10by1ib3R0b20nOiB0aGlzLm1vdmVUb0JvdHRvbS5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpjb25maXJtJzogdGhpcy5jb25maXJtUmVzdWx0LmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOmNvcHknOiB0aGlzLmNvcHlSZXN1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgJ2ZpbmQtYW5kLXJlcGxhY2U6Y29weS1wYXRoJzogdGhpcy5jb3B5UGF0aC5iaW5kKHRoaXMpLFxuICAgICAgICAnZmluZC1hbmQtcmVwbGFjZTpvcGVuLWluLW5ldy10YWInOiB0aGlzLm9wZW5Jbk5ld1RhYi5iaW5kKHRoaXMpLFxuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLnJlZnMucGluUmVmZXJlbmNlcy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgJ2NsaWNrJyxcbiAgICAgIHRoaXMuaGFuZGxlUGluUmVmZXJlbmNlc0NsaWNrZWQuYmluZCh0aGlzKVxuICAgICk7XG5cbiAgICB0aGlzLmZvY3VzKCk7XG4gIH1cblxuICBtb3ZlVXAoKSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID09PSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXgpIHJldHVybjtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbmRWaXNpYmxlTmF2aWdhdGlvbkluZGV4KC0xKTtcbiAgICBpZiAoaW5kZXggPT09IG51bGwpIHJldHVybjtcbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgbW92ZURvd24oKSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID09PSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXgpIHJldHVybjtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbmRWaXNpYmxlTmF2aWdhdGlvbkluZGV4KDEpO1xuICAgIGlmIChpbmRleCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBmaW5kVmlzaWJsZU5hdmlnYXRpb25JbmRleChkZWx0YTogbnVtYmVyKSB7XG4gICAgbGV0IGN1cnJlbnQgPSB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY3VycmVudCArPSBkZWx0YTtcbiAgICAgIGlmIChjdXJyZW50IDwgMCB8fCBjdXJyZW50ID4gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4KSByZXR1cm4gbnVsbDtcbiAgICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRFbGVtZW50QXRJbmRleChjdXJyZW50KTtcbiAgICAgIGlmIChlbGVtZW50ICYmIGVsZW1lbnQuY2xpZW50SGVpZ2h0ID4gMCkgcmV0dXJuIGN1cnJlbnQ7XG4gICAgfVxuICB9XG5cbiAgaXNWYWxpZEVsZW1lbnRJbmRleChpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChpbmRleCA+IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleChpbmRleDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWRFbGVtZW50SW5kZXgoaW5kZXgpKSByZXR1cm4gLTE7XG4gICAgbGV0IHsgc2Nyb2xsQ29udGFpbmVyIH0gPSB0aGlzLnJlZnM7XG4gICAgbGV0IHNjcm9sbFJlY3QgPSBzY3JvbGxDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmdldEVsZW1lbnRBdEluZGV4KGluZGV4KTtcbiAgICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQuY2xpZW50SGVpZ2h0KSByZXR1cm4gbnVsbDtcbiAgICBsZXQgZWxlbWVudFJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiBlbGVtZW50UmVjdC50b3AgLSBzY3JvbGxSZWN0LnRvcDtcbiAgfVxuXG4gIGZpbmRFbGVtZW50SW5kZXhOZWFySGVpZ2h0KHRvcDogbnVtYmVyKSB7XG4gICAgbGV0IGNsb3Nlc3RFbCA9IG51bGwsIGNsb3Nlc3REaWZmID0gbnVsbDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXg7IGkrKykge1xuICAgICAgbGV0IG9mZnNldCA9IHRoaXMuc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleChpKTtcbiAgICAgIGlmIChvZmZzZXQgPT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgbGV0IGRpZmYgPSBNYXRoLmFicyh0b3AgLSBvZmZzZXQpO1xuICAgICAgaWYgKG9mZnNldCA9PT0gbnVsbCkgY29udGludWU7XG4gICAgICBpZiAoY2xvc2VzdEVsID09PSBudWxsIHx8IGNsb3Nlc3REaWZmICE9PSBudWxsICYmIGNsb3Nlc3REaWZmID4gZGlmZikge1xuICAgICAgICBjbG9zZXN0RGlmZiA9IGRpZmY7XG4gICAgICAgIGNsb3Nlc3RFbCA9IGk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb3Nlc3RFbCA/PyAtMTtcbiAgfVxuXG4gIGNvbGxhcHNlQWN0aXZlKCkge1xuICAgIHRoaXMuY29sbGFwc2VSZXN1bHQodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICB9XG5cbiAgZXhwYW5kQWN0aXZlKCkge1xuICAgIHRoaXMuZXhwYW5kUmVzdWx0KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgfVxuXG4gIGNvbGxhcHNlUmVzdWx0KGluZGV4OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhpbmRleCkpIHJldHVybjtcbiAgICB0aGlzLmNvbGxhcHNlZEluZGljZXMuYWRkKGluZGV4KTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGV4cGFuZFJlc3VsdChpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKCF0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKGluZGV4KSkgcmV0dXJuO1xuICAgIHRoaXMuY29sbGFwc2VkSW5kaWNlcy5kZWxldGUoaW5kZXgpO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgdG9nZ2xlUmVzdWx0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgaXNDb2xsYXBzZWQgPSB0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKGluZGV4KTtcbiAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgIHRoaXMuZXhwYW5kUmVzdWx0KGluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb2xsYXBzZVJlc3VsdChpbmRleCk7XG4gICAgfVxuICB9XG5cbiAgcGFnZVVwKCkge1xuICAgIGxldCBjdXJyZW50T2Zmc2V0ID0gdGhpcy5zY3JvbGxPZmZzZXRPZkVsZW1lbnRBdEluZGV4KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgICBpZiAoY3VycmVudE9mZnNldCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kRWxlbWVudEluZGV4TmVhckhlaWdodChjdXJyZW50T2Zmc2V0IC0gdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lci5vZmZzZXRIZWlnaHQpO1xuXG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIHBhZ2VEb3duKCkge1xuICAgIGxldCBjdXJyZW50T2Zmc2V0ID0gdGhpcy5zY3JvbGxPZmZzZXRPZkVsZW1lbnRBdEluZGV4KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgICBpZiAoY3VycmVudE9mZnNldCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kRWxlbWVudEluZGV4TmVhckhlaWdodChjdXJyZW50T2Zmc2V0ICsgdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lci5vZmZzZXRIZWlnaHQpO1xuXG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIG1vdmVUb1RvcCgpIHtcbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IDA7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBtb3ZlVG9Cb3R0b20oKSB7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBjb25maXJtUmVzdWx0KCkge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5hY3RpdmVFbGVtZW50O1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuICAgIGxldCB7IGZpbGVQYXRoID0gJycsIGxpbmVOdW1iZXJTdHIgPSAnLTEnLCByYW5nZSA9ICcnIH0gPSBlbGVtZW50LmRhdGFzZXQ7XG4gICAgbGV0IGxpbmVOdW1iZXIgPSBOdW1iZXIobGluZU51bWJlclN0cik7XG5cbiAgICB0aGlzLm9wZW5SZXN1bHQoZmlsZVBhdGgsIGxpbmVOdW1iZXIsIHJhbmdlKTtcbiAgfVxuXG4gIGNvcHlSZXN1bHQoKSB7XG4gICAgLy8gVE9ET1xuICB9XG5cbiAgY29weVBhdGgoKSB7XG4gICAgLy8gVE9ET1xuICB9XG5cbiAgb3BlbkluTmV3VGFiKCkge1xuICAgIC8vIFRPRE9cbiAgfVxuXG4gIGdldEVsZW1lbnRBdEluZGV4KGluZGV4OiBudW1iZXIpOiBIVE1MRWxlbWVudCB8IG51bGwgIHtcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYXZpZ2F0aW9uLWluZGV4PVwiJHtpbmRleH1cIl1gKTtcbiAgICByZXR1cm4gZWxlbWVudCA/IChlbGVtZW50IGFzIEhUTUxFbGVtZW50KSA6IG51bGw7XG4gIH1cblxuICBnZXQgYWN0aXZlRWxlbWVudCgpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA8IDApIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdEluZGV4KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZSh7IHJlZmVyZW5jZXMsIHN5bWJvbE5hbWUgfTogUmVmZXJlbmNlc1ZpZXdQcm9wZXJ0aWVzKSB7XG4gICAgLy8gSWdub3JlIG5ldyByZWZlcmVuY2VzIHdoZW4gcGlubmVkLlxuICAgIGlmICh0aGlzLnBpbm5lZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgbGV0IGNoYW5nZWQgPSBmYWxzZTtcbiAgICBpZiAocmVmZXJlbmNlcy5sZW5ndGggPT09IDAgJiYgc3ltYm9sTmFtZSA9PT0gJycpXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICBpZiAodGhpcy5yZWZlcmVuY2VzICE9PSByZWZlcmVuY2VzKSB7XG4gICAgICB0aGlzLnJlZmVyZW5jZXMgPSByZWZlcmVuY2VzO1xuICAgICAgdGhpcy5maWx0ZXJBbmRHcm91cFJlZmVyZW5jZXMoKTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN5bWJvbE5hbWUgIT09IHN5bWJvbE5hbWUpIHtcbiAgICAgIHRoaXMuc3ltYm9sTmFtZSA9IHN5bWJvbE5hbWU7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlZCA/IGV0Y2gudXBkYXRlKHRoaXMpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcy5kZWxldGUodGhpcyk7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIGZvbnRGYW1pbHlDaGFuZ2VkKGZvbnRGYW1pbHk6IHN0cmluZykge1xuICAgIHRoaXMucHJldmlld1N0eWxlID0geyBmb250RmFtaWx5IH07XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBpZ25vcmVkTmFtZXNDaGFuZ2VkKGlnbm9yZWROYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmlnbm9yZWROYW1lTWF0Y2hlcnMgPSBpZ25vcmVkTmFtZXMubWFwKGlnID0+IG5ldyBNaW5pbWF0Y2goaWcpKTtcbiAgfVxuXG4gIHNwbGl0RGlyZWN0aW9uQ2hhbmdlZChzcGxpdERpcmVjdGlvbjogU3BsaXREaXJlY3Rpb24pIHtcbiAgICB0aGlzLnNwbGl0RGlyZWN0aW9uID0gc3BsaXREaXJlY3Rpb247XG4gIH1cblxuICBoYW5kbGVDbGljayhldmVudDogTW91c2VFdmVudCkge1xuICAgIGlmICghZXZlbnQudGFyZ2V0KSByZXR1cm47XG4gICAgbGV0IHRhcmdldCA9IChldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpPy5jbG9zZXN0KCdbZGF0YS1uYXZpZ2F0aW9uLWluZGV4XScpIGFzIEhUTUxFbGVtZW50O1xuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIGxldCBuYXZpZ2F0aW9uSW5kZXggPSBOdW1iZXIodGFyZ2V0LmRhdGFzZXQubmF2aWdhdGlvbkluZGV4KTtcbiAgICAgIGxldCB2aWV3cG9ydFhPZmZzZXQgPSBldmVudC5jbGllbnRYO1xuICAgICAgbGV0IHRhcmdldFJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmICh0YXJnZXQubWF0Y2hlcygnLmxpc3QtaXRlbScpICYmIHZpZXdwb3J0WE9mZnNldCAtIHRhcmdldFJlY3QubGVmdCA8PSAxNikge1xuICAgICAgICB0aGlzLnRvZ2dsZVJlc3VsdChuYXZpZ2F0aW9uSW5kZXgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0YXJnZXQubWF0Y2hlcygnW2RhdGEtbGluZS1udW1iZXJdW2RhdGEtZmlsZS1wYXRoXScpKSB7XG4gICAgICAgIGxldCBmaWxlUGF0aCA9IHRhcmdldC5kYXRhc2V0LmZpbGVQYXRoID8/ICcnO1xuICAgICAgICBsZXQgbGluZU51bWJlciA9IE51bWJlcih0YXJnZXQuZGF0YXNldC5saW5lTnVtYmVyIHx8ICctMScpO1xuICAgICAgICBsZXQgcmFuZ2VTcGVjID0gdGFyZ2V0LmRhdGFzZXQucmFuZ2UgPz8gJyc7XG5cbiAgICAgICAgdGhpcy5vcGVuUmVzdWx0KGZpbGVQYXRoLCBsaW5lTnVtYmVyLCByYW5nZVNwZWMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IG5hdmlnYXRpb25JbmRleDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAtMTtcbiAgICB9XG5cbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIC8vIHRoaXMuYWN0aXZhdGUoKTtcbiAgfVxuXG4gIGFjdGl2YXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuZWxlbWVudC5mb2N1cygpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGhhbmRsZVBpblJlZmVyZW5jZXNDbGlja2VkKCkge1xuICAgIHRoaXMucGlubmVkID0gIXRoaXMucGlubmVkO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgb3BlblJlc3VsdChcbiAgICBmaWxlUGF0aDogc3RyaW5nLFxuICAgIHJvdzogbnVtYmVyLFxuICAgIHJhbmdlU3BlYzogc3RyaW5nLFxuICAgIHsgcGVuZGluZyA9IHRydWUgfTogeyBwZW5kaW5nOiBib29sZWFuIH0gPSB7IHBlbmRpbmc6IHRydWUgfVxuICApIHtcbiAgICBsZXQgcmVmZXJlbmNlc0ZvckZpbGVQYXRoID0gdGhpcy5maWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzLmdldChmaWxlUGF0aCk7XG4gICAgaWYgKCFyZWZlcmVuY2VzRm9yRmlsZVBhdGgpIHJldHVybjtcbiAgICBsZXQgcmVmZXJlbmNlc0ZvckxpbmVOdW1iZXIgPSByZWZlcmVuY2VzRm9yRmlsZVBhdGguZmlsdGVyKCh7IHJhbmdlIH0pID0+IHtcbiAgICAgIHJldHVybiByYW5nZS5zdGFydC5yb3cgPT0gcm93O1xuICAgIH0pO1xuICAgIGxldCByYW5nZXMgPSByZWZlcmVuY2VzRm9yTGluZU51bWJlci5tYXAociA9PiByLnJhbmdlKTtcbiAgICBsZXQgdGFyZ2V0UmFuZ2UgPSByYW5nZVNwZWMgPT09ICcnID8gcmFuZ2VzWzBdIDogcmFuZ2VzLmZpbmQociA9PiB7XG4gICAgICByZXR1cm4gci50b1N0cmluZygpID09PSByYW5nZVNwZWM7XG4gICAgfSk7XG4gICAgbGV0IGVkaXRvciA9IGF3YWl0IGF0b20ud29ya3NwYWNlLm9wZW4oXG4gICAgICBmaWxlUGF0aCxcbiAgICAgIHtcbiAgICAgICAgcGVuZGluZyxcbiAgICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgICAgIHNwbGl0OiBnZXRPcHBvc2l0ZVNwbGl0KHRoaXMuc3BsaXREaXJlY3Rpb24pXG4gICAgICB9XG4gICAgKSBhcyBUZXh0RWRpdG9yO1xuICAgIGVkaXRvci51bmZvbGRCdWZmZXJSb3cocm93KTtcbiAgICBpZiAocmFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgdW5kb2N1bWVudGVkIG9wdGlvblxuICAgICAgZWRpdG9yLmdldExhc3RTZWxlY3Rpb24oKS5zZXRCdWZmZXJSYW5nZSh0YXJnZXRSYW5nZSA/PyByYW5nZXNbMF0sIHsgZmxhc2g6IHRydWUgfSk7XG4gICAgfVxuICAgIGVkaXRvci5zY3JvbGxUb0N1cnNvclBvc2l0aW9uKCk7XG4gIH1cblxuICBmaWx0ZXJBbmRHcm91cFJlZmVyZW5jZXMoKTogTWFwPHN0cmluZywgUmVmZXJlbmNlW10+IHtcbiAgICBsZXQgcGF0aHMgPSBhdG9tLnByb2plY3QuZ2V0UGF0aHMoKTtcbiAgICBsZXQgcmVzdWx0cyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2VbXT4oKTtcbiAgICBpZiAoIXRoaXMucmVmZXJlbmNlcykgcmV0dXJuIHJlc3VsdHM7XG5cbiAgICBmb3IgKGxldCByZWZlcmVuY2Ugb2YgdGhpcy5yZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgeyB1cmkgfSA9IHJlZmVyZW5jZTtcbiAgICAgIGxldCBwcm9qZWN0UGF0aCA9IGRlc2NlbmRzRnJvbUFueSh1cmksIHBhdGhzKTtcbiAgICAgIGlmIChwcm9qZWN0UGF0aCA9PT0gZmFsc2UpIGNvbnRpbnVlO1xuICAgICAgaWYgKG1hdGNoZXNJZ25vcmVkTmFtZXModXJpLCB0aGlzLmlnbm9yZWROYW1lTWF0Y2hlcnMgPz8gW10pKSBjb250aW51ZTtcblxuICAgICAgbGV0IFtfLCByZWxhdGl2ZVBhdGhdID0gYXRvbS5wcm9qZWN0LnJlbGF0aXZpemVQYXRoKHVyaSk7XG4gICAgICBsZXQgcmVzdWx0c0ZvclBhdGggPSByZXN1bHRzLmdldChyZWxhdGl2ZVBhdGgpO1xuICAgICAgaWYgKCFyZXN1bHRzRm9yUGF0aCkge1xuICAgICAgICByZXN1bHRzRm9yUGF0aCA9IFtdO1xuICAgICAgICByZXN1bHRzLnNldChyZWxhdGl2ZVBhdGgsIHJlc3VsdHNGb3JQYXRoKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHNGb3JQYXRoLnB1c2gocmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMgPSByZXN1bHRzO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0IHByb3BzKCk6IFJlZmVyZW5jZXNWaWV3UHJvcGVydGllcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZmVyZW5jZXM6IHRoaXMucmVmZXJlbmNlcyA/PyBbXSxcbiAgICAgIHN5bWJvbE5hbWU6IHRoaXMuc3ltYm9sTmFtZSA/PyAnJ1xuICAgIH07XG4gIH1cblxuICB3cml0ZUFmdGVyVXBkYXRlKCkge1xuICAgIGxldCBzZWxlY3RlZCA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgJ1tkYXRhLW5hdmlnYXRpb24taW5kZXhdLnNlbGVjdGVkLCAubGlzdC1uZXN0ZWQtaXRlbS5zZWxlY3RlZCdcbiAgICApO1xuICAgIGlmICghc2VsZWN0ZWQpIHJldHVybjtcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yIHByb3ByaWV0YXJ5IG1ldGhvZFxuICAgIHNlbGVjdGVkLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKTtcbiAgfVxuXG4gIGNvcHkoKSB7XG4gICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzVmlldygpO1xuICB9XG5cbiAgZ2V0VGl0bGUoKSB7XG4gICAgcmV0dXJuICdGaW5kIFJlZmVyZW5jZXMgUmVzdWx0cyc7XG4gIH1cblxuICBnZXRJY29uTmFtZSgpIHtcbiAgICByZXR1cm4gJ3NlYXJjaCc7XG4gIH1cblxuICBnZXRVUkkoKSB7XG4gICAgcmV0dXJuIFJlZmVyZW5jZXNWaWV3LlVSSTtcbiAgfVxuXG4gIGZvY3VzKCkge1xuICAgIGxldCByZWZlcmVuY2VzVmlldyA9IHRoaXMucmVmcy5yZWZlcmVuY2VzVmlldztcbiAgICBpZiAoIWlzRXRjaENvbXBvbmVudChyZWZlcmVuY2VzVmlldykpIHJldHVybjtcbiAgICByZWZlcmVuY2VzVmlldy5lbGVtZW50LmZvY3VzKCk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ1JlZmVyZW5jZXNWaWV3IHJlbmRlcjonLCB0aGlzLnByb3BzLCB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gICAgbGV0IGxpc3RTdHlsZSA9IHtcbiAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgb3ZlcmZsb3c6ICdoaWRkZW4nLFxuICAgICAgbGVmdDogJzAnLFxuICAgICAgdG9wOiAnMCcsXG4gICAgICByaWdodDogJzAnXG4gICAgfTtcblxuICAgIGxldCBpbmRleCA9IHRoaXMuZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcztcbiAgICBsZXQgY2hpbGRyZW4gPSBbXTtcblxuICAgIGxldCBuYXZpZ2F0aW9uSW5kZXggPSAwO1xuICAgIGZvciAobGV0IFtyZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZXNdIG9mIGluZGV4KSB7XG4gICAgICBsZXQgdmlldyA9IChcbiAgICAgICAgPFJlZmVyZW5jZUdyb3VwVmlld1xuICAgICAgICAgIHJlbGF0aXZlUGF0aD17cmVsYXRpdmVQYXRofVxuICAgICAgICAgIHJlZmVyZW5jZXM9e3JlZmVyZW5jZXN9XG4gICAgICAgICAgbmF2aWdhdGlvbkluZGV4PXtuYXZpZ2F0aW9uSW5kZXh9XG4gICAgICAgICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4PXt0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleH1cbiAgICAgICAgICBpc0NvbGxhcHNlZD17dGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhuYXZpZ2F0aW9uSW5kZXgpfVxuICAgICAgICAvPlxuICAgICAgKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdSZWZlcmVuY2VzVmlldyBhZGRpbmcgY2hpbGQ6Jywgdmlldyk7XG4gICAgICBjaGlsZHJlbi5wdXNoKHZpZXcpO1xuICAgICAgbmF2aWdhdGlvbkluZGV4ICs9IHJlZmVyZW5jZXMubGVuZ3RoICsgMTtcbiAgICB9XG5cbiAgICB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG5cbiAgICBsZXQgY29udGFpbmVyU3R5bGUgPSAge1xuICAgICAgcG9zaXRpb246ICdyZWxhdGl2ZScsXG4gICAgICBoZWlnaHQ6ICcxMDAlJyxcbiAgICAgIG92ZXJmbG93OiAnYXV0bycsXG4gICAgfTtcblxuICAgIGxldCBtYXRjaENvdW50ID0gdGhpcy5yZWZlcmVuY2VzLmxlbmd0aDtcbiAgICBsZXQgY2xhc3NOYW1lcyA9IGN4KCdmaW5kLXJlZmVyZW5jZXMtcGFuZScsICdwcmV2aWV3LXBhbmUnLCAncGFuZS1pdGVtJywgeyAnbm8tcmVzdWx0cyc6IG1hdGNoQ291bnQgPT09IDAgfSk7XG5cbiAgICBsZXQgcGluQnV0dG9uQ2xhc3NOYW1lcyA9IGN4KCdidG4nLCAnaWNvbicsICdpY29uLXBpbicsIHsgJ3NlbGVjdGVkJzogdGhpcy5waW5uZWQgfSk7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPXtjbGFzc05hbWVzfSB0YWJJbmRleD17LTF9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInByZXZpZXctaGVhZGVyXCI+XG4gICAgICAgICAge2Rlc2NyaWJlUmVmZXJlbmNlcyh0aGlzLnJlZmVyZW5jZXMubGVuZ3RoLCB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMuc2l6ZSwgdGhpcy5zeW1ib2xOYW1lKX1cblxuICAgICAgICAgIDxkaXYgcmVmPVwicGluUmVmZXJlbmNlc1wiIGNsYXNzTmFtZT17cGluQnV0dG9uQ2xhc3NOYW1lc30+UGluIHJlZmVyZW5jZXM8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiByZWY9XCJyZWZlcmVuY2VzVmlld1wiIGNsYXNzTmFtZT1cInJlc3VsdHMtdmlldyBmb2N1c2FibGUtcGFuZWxcIiB0YWJJbmRleD17LTF9IHN0eWxlPXt0aGlzLnByZXZpZXdTdHlsZX0+XG4gICAgICAgICAgPGRpdiByZWY9XCJzY3JvbGxDb250YWluZXJcIiBjbGFzc05hbWU9XCJyZXN1bHRzLXZpZXctY29udGFpbmVyXCIgc3R5bGU9e2NvbnRhaW5lclN0eWxlfT5cbiAgICAgICAgICAgIDxvbFxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJsaXN0LXRyZWUgaGFzLWNvbGxhcHNhYmxlLWNoaWxkcmVuXCJcbiAgICAgICAgICAgICAgc3R5bGU9e2xpc3RTdHlsZX1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge2NoaWxkcmVufVxuICAgICAgICAgICAgPC9vbD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG59XG4iXX0=