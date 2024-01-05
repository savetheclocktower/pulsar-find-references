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
        // if (result) {
        //   console.log('file', filePath, 'matches ignore pattern:', ig);
        // }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2VzLXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBdUQ7QUFDdkQseUNBQXNDO0FBQ3RDLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsNERBQTRCO0FBRTVCLGtGQUF3RDtBQUN4RCxvREFBc0M7QUFLdEMsU0FBUyxlQUFlLENBQUMsRUFBVztJQUNsQyxJQUFJLENBQUMsRUFBRTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3RCLElBQUksT0FBTyxFQUFFLEtBQUssUUFBUTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3pDLE9BQU8sQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLFFBQWdCLEVBQUUsTUFBYyxFQUFFLEtBQWE7SUFDaEUsT0FBTyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN2QyxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxjQUFzQixFQUFFLFNBQWlCLEVBQUUsVUFBa0I7SUFDdkYsT0FBTyxDQUNMLDZCQUFNLEdBQUcsRUFBQyxjQUFjLEVBQUMsU0FBUyxFQUFDLDRCQUE0QjtRQUM1RCxjQUFjOztRQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQzs7UUFBWSxTQUFTOztRQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQzs7UUFBTyxHQUFHO1FBQ3ZJLDZCQUFNLFNBQVMsRUFBQyxnQkFBZ0IsSUFBRSxVQUFVLENBQVEsQ0FDL0MsQ0FDUixDQUFDO0FBQ0osQ0FBQztB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QUFFLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTdHLElBQUksbUJBQW1CLEdBQUcsSUFBQSxvQkFBRSxFQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sQ0FDTCw0QkFBSyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDdEMsNEJBQUssU0FBUyxFQUFDLGdCQUFnQjtnQkFDNUIsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUVwRyw0QkFBSyxHQUFHLEVBQUMsZUFBZSxFQUFDLFNBQVMsRUFBRSxtQkFBbUIscUJBQXNCLENBQ3pFO1lBRU4sNEJBQUssR0FBRyxFQUFDLGdCQUFnQixFQUFDLFNBQVMsRUFBQyw4QkFBOEIsRUFBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUN2Ryw0QkFBSyxHQUFHLEVBQUMsaUJBQWlCLEVBQUMsU0FBUyxFQUFDLHdCQUF3QixFQUFDLEtBQUssRUFBRSxjQUFjO29CQUNqRiwyQkFDRSxTQUFTLEVBQUMsb0NBQW9DLEVBQzlDLEtBQUssRUFBRSxTQUFTLElBRWYsUUFBUSxDQUNOLENBQ0QsQ0FDRixDQUNGLENBQ1AsQ0FBQztJQUNKLENBQUM7O0FBcGRNLGtCQUFHLEdBQUcsdUNBQXVDLEFBQTFDLENBQTJDO0FBRTlDLHdCQUFTLEdBQXdCLElBQUksR0FBRyxFQUFFLEFBQWpDLENBQWtDO2tCQUgvQixjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IHsgTWluaW1hdGNoIH0gZnJvbSAnbWluaW1hdGNoJztcbmltcG9ydCBldGNoIGZyb20gJ2V0Y2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY3ggZnJvbSAnY2xhc3NuYW1lcyc7XG5cbmltcG9ydCBSZWZlcmVuY2VHcm91cFZpZXcgZnJvbSAnLi9yZWZlcmVuY2UtZ3JvdXAtdmlldyc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4uL2NvbnNvbGUnO1xuXG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IHR5cGUgeyBFdGNoQ29tcG9uZW50IH0gZnJvbSAnZXRjaCc7XG5cbmZ1bmN0aW9uIGlzRXRjaENvbXBvbmVudChlbDogdW5rbm93bik6IGVsIGlzIEV0Y2hDb21wb25lbnQge1xuICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgZWwgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ3JlZnMnIGluIGVsKSAmJiAoJ2VsZW1lbnQnIGluIGVsKTtcbn1cblxuZnVuY3Rpb24gcGx1cmFsaXplKHNpbmd1bGFyOiBzdHJpbmcsIHBsdXJhbDogc3RyaW5nLCBjb3VudDogbnVtYmVyKSB7XG4gIHJldHVybiBjb3VudCA+IDEgPyBwbHVyYWwgOiBzaW5ndWxhcjtcbn1cblxuZnVuY3Rpb24gZGVzY3JpYmVSZWZlcmVuY2VzKHJlZmVyZW5jZUNvdW50OiBudW1iZXIsIGZpbGVDb3VudDogbnVtYmVyLCBzeW1ib2xOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIChcbiAgICA8c3BhbiByZWY9XCJwcmV2aWV3Q291bnRcIiBjbGFzc05hbWU9XCJwcmV2aWV3LWNvdW50IGlubGluZS1ibG9ja1wiPlxuICAgICAge3JlZmVyZW5jZUNvdW50fSB7cGx1cmFsaXplKCdyZXN1bHQnLCAncmVzdWx0cycsIHJlZmVyZW5jZUNvdW50KX0gZm91bmQgaW4ge2ZpbGVDb3VudH0ge3BsdXJhbGl6ZSgnZmlsZScsICdmaWxlcycsIGZpbGVDb3VudCl9IGZvciB7JyAnfVxuICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaGlnaGxpZ2h0LWluZm9cIj57c3ltYm9sTmFtZX08L3NwYW4+XG4gICAgPC9zcGFuPlxuICApO1xufVxuXG5mdW5jdGlvbiBkZXNjZW5kc0Zyb21BbnkoZmlsZVBhdGg6IHN0cmluZywgcHJvamVjdFBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB8IGZhbHNlIHtcbiAgZm9yIChsZXQgcHJvamVjdFBhdGggb2YgcHJvamVjdFBhdGhzKSB7XG4gICAgaWYgKGRlc2NlbmRzRnJvbShmaWxlUGF0aCwgcHJvamVjdFBhdGgpKSByZXR1cm4gcHJvamVjdFBhdGg7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBkZXNjZW5kc0Zyb20oZmlsZVBhdGg6IHN0cmluZywgcHJvamVjdFBhdGg6IHN0cmluZykge1xuICBpZiAodHlwZW9mIGZpbGVQYXRoICE9PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gZmlsZVBhdGguc3RhcnRzV2l0aChcbiAgICBwcm9qZWN0UGF0aC5lbmRzV2l0aChQYXRoLnNlcCkgPyBwcm9qZWN0UGF0aCA6IGAke3Byb2plY3RQYXRofSR7UGF0aC5zZXB9YFxuICApO1xufVxuXG5mdW5jdGlvbiBtYXRjaGVzSWdub3JlZE5hbWVzKGZpbGVQYXRoOiBzdHJpbmcsIGlnbm9yZWROYW1lczogTWluaW1hdGNoW10pIHtcbiAgbGV0IHJlcG9zaXRvcmllcyA9IGF0b20ucHJvamVjdC5nZXRSZXBvc2l0b3JpZXMoKTtcbiAgaWYgKHJlcG9zaXRvcmllcy5zb21lKHIgPT4gci5pc1BhdGhJZ25vcmVkKGZpbGVQYXRoKSkpIHJldHVybiB0cnVlO1xuICByZXR1cm4gaWdub3JlZE5hbWVzLnNvbWUoaWcgPT4ge1xuICAgIGxldCByZXN1bHQgPSBpZy5tYXRjaChmaWxlUGF0aCk7XG4gICAgLy8gaWYgKHJlc3VsdCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ2ZpbGUnLCBmaWxlUGF0aCwgJ21hdGNoZXMgaWdub3JlIHBhdHRlcm46JywgaWcpO1xuICAgIC8vIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxudHlwZSBTcGxpdERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIHwgJ25vbmUnO1xudHlwZSBGb3JtYWxTcGxpdERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIHwgdW5kZWZpbmVkO1xuXG50eXBlIFJlZmVyZW5jZXNWaWV3UHJvcGVydGllcyA9IHtcbiAgcmVmPzogc3RyaW5nLFxuICByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSxcbiAgc3ltYm9sTmFtZTogc3RyaW5nXG59O1xuXG5sZXQgbGFzdFJlZmVyZW5jZXM6IHsgcmVmZXJlbmNlczogUmVmZXJlbmNlW10sIHN5bWJvbE5hbWU6IHN0cmluZyB9ID0ge1xuICByZWZlcmVuY2VzOiBbXSxcbiAgc3ltYm9sTmFtZTogJydcbn07XG5cbmZ1bmN0aW9uIGdldE9wcG9zaXRlU3BsaXQoc3BsaXQ6IFNwbGl0RGlyZWN0aW9uKTogRm9ybWFsU3BsaXREaXJlY3Rpb24ge1xuICByZXR1cm4ge1xuICAgIGxlZnQ6ICdyaWdodCcsXG4gICAgcmlnaHQ6ICdsZWZ0JyxcbiAgICBkb3duOiAndXAnLFxuICAgIHVwOiAnZG93bicsXG4gICAgbm9uZTogdW5kZWZpbmVkXG4gIH1bc3BsaXRdIGFzIEZvcm1hbFNwbGl0RGlyZWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VzVmlldyB7XG4gIHN0YXRpYyBVUkkgPSBcImF0b206Ly9wdWxzYXItZmluZC1yZWZlcmVuY2VzL3Jlc3VsdHNcIjtcblxuICBzdGF0aWMgaW5zdGFuY2VzOiBTZXQ8UmVmZXJlbmNlc1ZpZXc+ID0gbmV3IFNldCgpO1xuXG4gIHN0YXRpYyBzZXRSZWZlcmVuY2VzKHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdLCBzeW1ib2xOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZygnUmVmZXJlbmNlc1BhbmVWaWV3LnNldFJlZmVyZW5jZXM6JywgcmVmZXJlbmNlcyk7XG4gICAgbGFzdFJlZmVyZW5jZXMgPSB7IHJlZmVyZW5jZXMsIHN5bWJvbE5hbWUgfTtcblxuICAgIGZvciAobGV0IGluc3RhbmNlIG9mIFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcykge1xuICAgICAgaW5zdGFuY2UudXBkYXRlKGxhc3RSZWZlcmVuY2VzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwcml2YXRlIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdO1xuICBwcml2YXRlIHN5bWJvbE5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpZ25vcmVkTmFtZU1hdGNoZXJzOiBNaW5pbWF0Y2hbXSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbiA9ICdub25lJztcblxuICBwcml2YXRlIGZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMhOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2VbXT47XG5cbiAgcHJpdmF0ZSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IG51bWJlciA9IC0xO1xuICBwcml2YXRlIGxhc3ROYXZpZ2F0aW9uSW5kZXg6IG51bWJlciA9IC0xO1xuXG4gIHByaXZhdGUgY29sbGFwc2VkSW5kaWNlczogU2V0PG51bWJlcj4gPSBuZXcgU2V0KCk7XG5cbiAgcHJpdmF0ZSBwaW5uZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIHByZXZpZXdTdHlsZTogeyBmb250RmFtaWx5OiBzdHJpbmcgfSA9IHsgZm9udEZhbWlseTogJycgfTtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBSZWZlcmVuY2VzVmlldy5pbnN0YW5jZXMuYWRkKHRoaXMpO1xuICAgIHRoaXMucmVmZXJlbmNlcyA9IGxhc3RSZWZlcmVuY2VzLnJlZmVyZW5jZXM7XG4gICAgdGhpcy5zeW1ib2xOYW1lID0gbGFzdFJlZmVyZW5jZXMuc3ltYm9sTmFtZTtcbiAgICBjb25zb2xlLmRlYnVnKCdSZWZlcmVuY2VzVmlldyBjb25zdHJ1Y3RvcjonLCB0aGlzLnJlZmVyZW5jZXMsIHRoaXMuc3ltYm9sTmFtZSk7XG5cbiAgICBpZiAoIXRoaXMucmVmZXJlbmNlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyByZWZlcmVuY2VzIWApO1xuICAgIH1cblxuICAgIHRoaXMuZmlsdGVyQW5kR3JvdXBSZWZlcmVuY2VzKCk7XG5cbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG5cbiAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKCdlZGl0b3IuZm9udEZhbWlseScsIHRoaXMuZm9udEZhbWlseUNoYW5nZWQuYmluZCh0aGlzKSksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKCdjb3JlLmlnbm9yZWROYW1lcycsIHRoaXMuaWdub3JlZE5hbWVzQ2hhbmdlZC5iaW5kKHRoaXMpKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ3B1bHNhci1maW5kLXJlZmVyZW5jZXMucGFuZWwuc3BsaXREaXJlY3Rpb24nLCB0aGlzLnNwbGl0RGlyZWN0aW9uQ2hhbmdlZC5iaW5kKHRoaXMpKVxuICAgICk7XG5cbiAgICBhdG9tLmNvbW1hbmRzLmFkZDxOb2RlPihcbiAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgIHtcbiAgICAgICAgJ2NvcmU6bW92ZS11cCc6IHRoaXMubW92ZVVwLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtZG93bic6IHRoaXMubW92ZURvd24uYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS1sZWZ0JzogdGhpcy5jb2xsYXBzZUFjdGl2ZS5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLXJpZ2h0JzogdGhpcy5leHBhbmRBY3RpdmUuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6cGFnZS11cCc6IHRoaXMucGFnZVVwLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOnBhZ2UtZG93bic6IHRoaXMucGFnZURvd24uYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS10by10b3AnOiB0aGlzLm1vdmVUb1RvcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLXRvLWJvdHRvbSc6IHRoaXMubW92ZVRvQm90dG9tLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOmNvbmZpcm0nOiB0aGlzLmNvbmZpcm1SZXN1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6Y29weSc6IHRoaXMuY29weVJlc3VsdC5iaW5kKHRoaXMpLFxuICAgICAgICAnZmluZC1hbmQtcmVwbGFjZTpjb3B5LXBhdGgnOiB0aGlzLmNvcHlQYXRoLmJpbmQodGhpcyksXG4gICAgICAgICdmaW5kLWFuZC1yZXBsYWNlOm9wZW4taW4tbmV3LXRhYic6IHRoaXMub3BlbkluTmV3VGFiLmJpbmQodGhpcyksXG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMucmVmcy5waW5SZWZlcmVuY2VzLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnY2xpY2snLFxuICAgICAgdGhpcy5oYW5kbGVQaW5SZWZlcmVuY2VzQ2xpY2tlZC5iaW5kKHRoaXMpXG4gICAgKTtcblxuICAgIHRoaXMuZm9jdXMoKTtcbiAgfVxuXG4gIG1vdmVVcCgpIHtcbiAgICBpZiAodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPT09IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCkgcmV0dXJuO1xuICAgIGxldCBpbmRleCA9IHRoaXMuZmluZFZpc2libGVOYXZpZ2F0aW9uSW5kZXgoLTEpO1xuICAgIGlmIChpbmRleCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBtb3ZlRG93bigpIHtcbiAgICBpZiAodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPT09IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCkgcmV0dXJuO1xuICAgIGxldCBpbmRleCA9IHRoaXMuZmluZFZpc2libGVOYXZpZ2F0aW9uSW5kZXgoMSk7XG4gICAgaWYgKGluZGV4ID09PSBudWxsKSByZXR1cm47XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGZpbmRWaXNpYmxlTmF2aWdhdGlvbkluZGV4KGRlbHRhOiBudW1iZXIpIHtcbiAgICBsZXQgY3VycmVudCA9IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4O1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjdXJyZW50ICs9IGRlbHRhO1xuICAgICAgaWYgKGN1cnJlbnQgPCAwIHx8IGN1cnJlbnQgPiB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXgpIHJldHVybiBudWxsO1xuICAgICAgbGV0IGVsZW1lbnQgPSB0aGlzLmdldEVsZW1lbnRBdEluZGV4KGN1cnJlbnQpO1xuICAgICAgaWYgKGVsZW1lbnQgJiYgZWxlbWVudC5jbGllbnRIZWlnaHQgPiAwKSByZXR1cm4gY3VycmVudDtcbiAgICB9XG4gIH1cblxuICBpc1ZhbGlkRWxlbWVudEluZGV4KGluZGV4OiBudW1iZXIpIHtcbiAgICBpZiAoaW5kZXggPCAwKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGluZGV4ID4gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4KSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzY3JvbGxPZmZzZXRPZkVsZW1lbnRBdEluZGV4KGluZGV4OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZEVsZW1lbnRJbmRleChpbmRleCkpIHJldHVybiAtMTtcbiAgICBsZXQgeyBzY3JvbGxDb250YWluZXIgfSA9IHRoaXMucmVmcztcbiAgICBsZXQgc2Nyb2xsUmVjdCA9IHNjcm9sbENvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0RWxlbWVudEF0SW5kZXgoaW5kZXgpO1xuICAgIGlmICghZWxlbWVudCB8fCAhZWxlbWVudC5jbGllbnRIZWlnaHQpIHJldHVybiBudWxsO1xuICAgIGxldCBlbGVtZW50UmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIGVsZW1lbnRSZWN0LnRvcCAtIHNjcm9sbFJlY3QudG9wO1xuICB9XG5cbiAgZmluZEVsZW1lbnRJbmRleE5lYXJIZWlnaHQodG9wOiBudW1iZXIpIHtcbiAgICBsZXQgY2xvc2VzdEVsID0gbnVsbCwgY2xvc2VzdERpZmYgPSBudWxsO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleDsgaSsrKSB7XG4gICAgICBsZXQgb2Zmc2V0ID0gdGhpcy5zY3JvbGxPZmZzZXRPZkVsZW1lbnRBdEluZGV4KGkpO1xuICAgICAgaWYgKG9mZnNldCA9PT0gbnVsbCkgY29udGludWU7XG4gICAgICBsZXQgZGlmZiA9IE1hdGguYWJzKHRvcCAtIG9mZnNldCk7XG4gICAgICBpZiAob2Zmc2V0ID09PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGlmIChjbG9zZXN0RWwgPT09IG51bGwgfHwgY2xvc2VzdERpZmYgIT09IG51bGwgJiYgY2xvc2VzdERpZmYgPiBkaWZmKSB7XG4gICAgICAgIGNsb3Nlc3REaWZmID0gZGlmZjtcbiAgICAgICAgY2xvc2VzdEVsID0gaTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xvc2VzdEVsID8/IC0xO1xuICB9XG5cbiAgY29sbGFwc2VBY3RpdmUoKSB7XG4gICAgdGhpcy5jb2xsYXBzZVJlc3VsdCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gIH1cblxuICBleHBhbmRBY3RpdmUoKSB7XG4gICAgdGhpcy5leHBhbmRSZXN1bHQodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICB9XG5cbiAgY29sbGFwc2VSZXN1bHQoaW5kZXg6IG51bWJlcikge1xuICAgIGlmICh0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKGluZGV4KSkgcmV0dXJuO1xuICAgIHRoaXMuY29sbGFwc2VkSW5kaWNlcy5hZGQoaW5kZXgpO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgZXhwYW5kUmVzdWx0KGluZGV4OiBudW1iZXIpIHtcbiAgICBpZiAoIXRoaXMuY29sbGFwc2VkSW5kaWNlcy5oYXMoaW5kZXgpKSByZXR1cm47XG4gICAgdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmRlbGV0ZShpbmRleCk7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICB0b2dnbGVSZXN1bHQoaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBpc0NvbGxhcHNlZCA9IHRoaXMuY29sbGFwc2VkSW5kaWNlcy5oYXMoaW5kZXgpO1xuICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgdGhpcy5leHBhbmRSZXN1bHQoaW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbGxhcHNlUmVzdWx0KGluZGV4KTtcbiAgICB9XG4gIH1cblxuICBwYWdlVXAoKSB7XG4gICAgbGV0IGN1cnJlbnRPZmZzZXQgPSB0aGlzLnNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICAgIGlmIChjdXJyZW50T2Zmc2V0ID09PSBudWxsKSByZXR1cm47XG5cbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbmRFbGVtZW50SW5kZXhOZWFySGVpZ2h0KGN1cnJlbnRPZmZzZXQgLSB0aGlzLnJlZnMuc2Nyb2xsQ29udGFpbmVyLm9mZnNldEhlaWdodCk7XG5cbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgcGFnZURvd24oKSB7XG4gICAgbGV0IGN1cnJlbnRPZmZzZXQgPSB0aGlzLnNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICAgIGlmIChjdXJyZW50T2Zmc2V0ID09PSBudWxsKSByZXR1cm47XG5cbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbmRFbGVtZW50SW5kZXhOZWFySGVpZ2h0KGN1cnJlbnRPZmZzZXQgKyB0aGlzLnJlZnMuc2Nyb2xsQ29udGFpbmVyLm9mZnNldEhlaWdodCk7XG5cbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgbW92ZVRvVG9wKCkge1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gMDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIG1vdmVUb0JvdHRvbSgpIHtcbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGNvbmZpcm1SZXN1bHQoKSB7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmFjdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKCFlbGVtZW50KSByZXR1cm47XG4gICAgbGV0IHsgZmlsZVBhdGggPSAnJywgbGluZU51bWJlclN0ciA9ICctMScsIHJhbmdlID0gJycgfSA9IGVsZW1lbnQuZGF0YXNldDtcbiAgICBsZXQgbGluZU51bWJlciA9IE51bWJlcihsaW5lTnVtYmVyU3RyKTtcblxuICAgIHRoaXMub3BlblJlc3VsdChmaWxlUGF0aCwgbGluZU51bWJlciwgcmFuZ2UpO1xuICB9XG5cbiAgY29weVJlc3VsdCgpIHtcbiAgICAvLyBUT0RPXG4gIH1cblxuICBjb3B5UGF0aCgpIHtcbiAgICAvLyBUT0RPXG4gIH1cblxuICBvcGVuSW5OZXdUYWIoKSB7XG4gICAgLy8gVE9ET1xuICB9XG5cbiAgZ2V0RWxlbWVudEF0SW5kZXgoaW5kZXg6IG51bWJlcik6IEhUTUxFbGVtZW50IHwgbnVsbCAge1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hdmlnYXRpb24taW5kZXg9XCIke2luZGV4fVwiXWApO1xuICAgIHJldHVybiBlbGVtZW50ID8gKGVsZW1lbnQgYXMgSFRNTEVsZW1lbnQpIDogbnVsbDtcbiAgfVxuXG4gIGdldCBhY3RpdmVFbGVtZW50KCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4IDwgMCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RWxlbWVudEF0SW5kZXgodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlKHsgcmVmZXJlbmNlcywgc3ltYm9sTmFtZSB9OiBSZWZlcmVuY2VzVmlld1Byb3BlcnRpZXMpIHtcbiAgICAvLyBJZ25vcmUgbmV3IHJlZmVyZW5jZXMgd2hlbiBwaW5uZWQuXG4gICAgaWYgKHRoaXMucGlubmVkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICBsZXQgY2hhbmdlZCA9IGZhbHNlO1xuICAgIGlmIChyZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCAmJiBzeW1ib2xOYW1lID09PSAnJylcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgIGlmICh0aGlzLnJlZmVyZW5jZXMgIT09IHJlZmVyZW5jZXMpIHtcbiAgICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB0aGlzLmZpbHRlckFuZEdyb3VwUmVmZXJlbmNlcygpO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3ltYm9sTmFtZSAhPT0gc3ltYm9sTmFtZSkge1xuICAgICAgdGhpcy5zeW1ib2xOYW1lID0gc3ltYm9sTmFtZTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFuZ2VkID8gZXRjaC51cGRhdGUodGhpcykgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgUmVmZXJlbmNlc1ZpZXcuaW5zdGFuY2VzLmRlbGV0ZSh0aGlzKTtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpO1xuICB9XG5cbiAgZm9udEZhbWlseUNoYW5nZWQoZm9udEZhbWlseTogc3RyaW5nKSB7XG4gICAgdGhpcy5wcmV2aWV3U3R5bGUgPSB7IGZvbnRGYW1pbHkgfTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGlnbm9yZWROYW1lc0NoYW5nZWQoaWdub3JlZE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuaWdub3JlZE5hbWVNYXRjaGVycyA9IGlnbm9yZWROYW1lcy5tYXAoaWcgPT4gbmV3IE1pbmltYXRjaChpZykpO1xuICB9XG5cbiAgc3BsaXREaXJlY3Rpb25DaGFuZ2VkKHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbikge1xuICAgIHRoaXMuc3BsaXREaXJlY3Rpb24gPSBzcGxpdERpcmVjdGlvbjtcbiAgfVxuXG4gIGhhbmRsZUNsaWNrKGV2ZW50OiBNb3VzZUV2ZW50KSB7XG4gICAgaWYgKCFldmVudC50YXJnZXQpIHJldHVybjtcbiAgICBsZXQgdGFyZ2V0ID0gKGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudCk/LmNsb3Nlc3QoJ1tkYXRhLW5hdmlnYXRpb24taW5kZXhdJykgYXMgSFRNTEVsZW1lbnQ7XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgbGV0IG5hdmlnYXRpb25JbmRleCA9IE51bWJlcih0YXJnZXQuZGF0YXNldC5uYXZpZ2F0aW9uSW5kZXgpO1xuICAgICAgbGV0IHZpZXdwb3J0WE9mZnNldCA9IGV2ZW50LmNsaWVudFg7XG4gICAgICBsZXQgdGFyZ2V0UmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHRhcmdldC5tYXRjaGVzKCcubGlzdC1pdGVtJykgJiYgdmlld3BvcnRYT2Zmc2V0IC0gdGFyZ2V0UmVjdC5sZWZ0IDw9IDE2KSB7XG4gICAgICAgIHRoaXMudG9nZ2xlUmVzdWx0KG5hdmlnYXRpb25JbmRleCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldC5tYXRjaGVzKCdbZGF0YS1saW5lLW51bWJlcl1bZGF0YS1maWxlLXBhdGhdJykpIHtcbiAgICAgICAgbGV0IGZpbGVQYXRoID0gdGFyZ2V0LmRhdGFzZXQuZmlsZVBhdGggPz8gJyc7XG4gICAgICAgIGxldCBsaW5lTnVtYmVyID0gTnVtYmVyKHRhcmdldC5kYXRhc2V0LmxpbmVOdW1iZXIgfHwgJy0xJyk7XG4gICAgICAgIGxldCByYW5nZVNwZWMgPSB0YXJnZXQuZGF0YXNldC5yYW5nZSA/PyAnJztcblxuICAgICAgICB0aGlzLm9wZW5SZXN1bHQoZmlsZVBhdGgsIGxpbmVOdW1iZXIsIHJhbmdlU3BlYyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IC0xO1xuICAgIH1cblxuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgLy8gdGhpcy5hY3RpdmF0ZSgpO1xuICB9XG5cbiAgYWN0aXZhdGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgaGFuZGxlUGluUmVmZXJlbmNlc0NsaWNrZWQoKSB7XG4gICAgdGhpcy5waW5uZWQgPSAhdGhpcy5waW5uZWQ7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBhc3luYyBvcGVuUmVzdWx0KFxuICAgIGZpbGVQYXRoOiBzdHJpbmcsXG4gICAgcm93OiBudW1iZXIsXG4gICAgcmFuZ2VTcGVjOiBzdHJpbmcsXG4gICAgeyBwZW5kaW5nID0gdHJ1ZSB9OiB7IHBlbmRpbmc6IGJvb2xlYW4gfSA9IHsgcGVuZGluZzogdHJ1ZSB9XG4gICkge1xuICAgIGxldCByZWZlcmVuY2VzRm9yRmlsZVBhdGggPSB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoIXJlZmVyZW5jZXNGb3JGaWxlUGF0aCkgcmV0dXJuO1xuICAgIGxldCByZWZlcmVuY2VzRm9yTGluZU51bWJlciA9IHJlZmVyZW5jZXNGb3JGaWxlUGF0aC5maWx0ZXIoKHsgcmFuZ2UgfSkgPT4ge1xuICAgICAgcmV0dXJuIHJhbmdlLnN0YXJ0LnJvdyA9PSByb3c7XG4gICAgfSk7XG4gICAgbGV0IHJhbmdlcyA9IHJlZmVyZW5jZXNGb3JMaW5lTnVtYmVyLm1hcChyID0+IHIucmFuZ2UpO1xuICAgIGxldCB0YXJnZXRSYW5nZSA9IHJhbmdlU3BlYyA9PT0gJycgPyByYW5nZXNbMF0gOiByYW5nZXMuZmluZChyID0+IHtcbiAgICAgIHJldHVybiByLnRvU3RyaW5nKCkgPT09IHJhbmdlU3BlYztcbiAgICB9KTtcbiAgICBsZXQgZWRpdG9yID0gYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3BlbihcbiAgICAgIGZpbGVQYXRoLFxuICAgICAge1xuICAgICAgICBwZW5kaW5nLFxuICAgICAgICBzZWFyY2hBbGxQYW5lczogdHJ1ZSxcbiAgICAgICAgc3BsaXQ6IGdldE9wcG9zaXRlU3BsaXQodGhpcy5zcGxpdERpcmVjdGlvbilcbiAgICAgIH1cbiAgICApIGFzIFRleHRFZGl0b3I7XG4gICAgZWRpdG9yLnVuZm9sZEJ1ZmZlclJvdyhyb3cpO1xuICAgIGlmIChyYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciB1bmRvY3VtZW50ZWQgb3B0aW9uXG4gICAgICBlZGl0b3IuZ2V0TGFzdFNlbGVjdGlvbigpLnNldEJ1ZmZlclJhbmdlKHRhcmdldFJhbmdlID8/IHJhbmdlc1swXSwgeyBmbGFzaDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgZWRpdG9yLnNjcm9sbFRvQ3Vyc29yUG9zaXRpb24oKTtcbiAgfVxuXG4gIGZpbHRlckFuZEdyb3VwUmVmZXJlbmNlcygpOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2VbXT4ge1xuICAgIGxldCBwYXRocyA9IGF0b20ucHJvamVjdC5nZXRQYXRocygpO1xuICAgIGxldCByZXN1bHRzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZVtdPigpO1xuICAgIGlmICghdGhpcy5yZWZlcmVuY2VzKSByZXR1cm4gcmVzdWx0cztcblxuICAgIGZvciAobGV0IHJlZmVyZW5jZSBvZiB0aGlzLnJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgbGV0IHByb2plY3RQYXRoID0gZGVzY2VuZHNGcm9tQW55KHVyaSwgcGF0aHMpO1xuICAgICAgaWYgKHByb2plY3RQYXRoID09PSBmYWxzZSkgY29udGludWU7XG4gICAgICBpZiAobWF0Y2hlc0lnbm9yZWROYW1lcyh1cmksIHRoaXMuaWdub3JlZE5hbWVNYXRjaGVycyA/PyBbXSkpIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgW18sIHJlbGF0aXZlUGF0aF0gPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZVBhdGgodXJpKTtcbiAgICAgIGxldCByZXN1bHRzRm9yUGF0aCA9IHJlc3VsdHMuZ2V0KHJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc3VsdHNGb3JQYXRoKSB7XG4gICAgICAgIHJlc3VsdHNGb3JQYXRoID0gW107XG4gICAgICAgIHJlc3VsdHMuc2V0KHJlbGF0aXZlUGF0aCwgcmVzdWx0c0ZvclBhdGgpO1xuICAgICAgfVxuICAgICAgcmVzdWx0c0ZvclBhdGgucHVzaChyZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIHRoaXMuZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcyA9IHJlc3VsdHM7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXQgcHJvcHMoKTogUmVmZXJlbmNlc1ZpZXdQcm9wZXJ0aWVzIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVmZXJlbmNlczogdGhpcy5yZWZlcmVuY2VzID8/IFtdLFxuICAgICAgc3ltYm9sTmFtZTogdGhpcy5zeW1ib2xOYW1lID8/ICcnXG4gICAgfTtcbiAgfVxuXG4gIHdyaXRlQWZ0ZXJVcGRhdGUoKSB7XG4gICAgbGV0IHNlbGVjdGVkID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAnW2RhdGEtbmF2aWdhdGlvbi1pbmRleF0uc2VsZWN0ZWQsIC5saXN0LW5lc3RlZC1pdGVtLnNlbGVjdGVkJ1xuICAgICk7XG4gICAgaWYgKCFzZWxlY3RlZCkgcmV0dXJuO1xuICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgcHJvcHJpZXRhcnkgbWV0aG9kXG4gICAgc2VsZWN0ZWQuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpO1xuICB9XG5cbiAgY29weSgpIHtcbiAgICByZXR1cm4gbmV3IFJlZmVyZW5jZXNWaWV3KCk7XG4gIH1cblxuICBnZXRUaXRsZSgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgUmVmZXJlbmNlcyBSZXN1bHRzJztcbiAgfVxuXG4gIGdldEljb25OYW1lKCkge1xuICAgIHJldHVybiAnc2VhcmNoJztcbiAgfVxuXG4gIGdldFVSSSgpIHtcbiAgICByZXR1cm4gUmVmZXJlbmNlc1ZpZXcuVVJJO1xuICB9XG5cbiAgZm9jdXMoKSB7XG4gICAgbGV0IHJlZmVyZW5jZXNWaWV3ID0gdGhpcy5yZWZzLnJlZmVyZW5jZXNWaWV3O1xuICAgIGlmICghaXNFdGNoQ29tcG9uZW50KHJlZmVyZW5jZXNWaWV3KSkgcmV0dXJuO1xuICAgIHJlZmVyZW5jZXNWaWV3LmVsZW1lbnQuZm9jdXMoKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnUmVmZXJlbmNlc1ZpZXcgcmVuZGVyOicsIHRoaXMucHJvcHMsIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgICBsZXQgbGlzdFN0eWxlID0ge1xuICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICBsZWZ0OiAnMCcsXG4gICAgICB0b3A6ICcwJyxcbiAgICAgIHJpZ2h0OiAnMCdcbiAgICB9O1xuXG4gICAgbGV0IGluZGV4ID0gdGhpcy5maWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzO1xuICAgIGxldCBjaGlsZHJlbiA9IFtdO1xuXG4gICAgbGV0IG5hdmlnYXRpb25JbmRleCA9IDA7XG4gICAgZm9yIChsZXQgW3JlbGF0aXZlUGF0aCwgcmVmZXJlbmNlc10gb2YgaW5kZXgpIHtcbiAgICAgIGxldCB2aWV3ID0gKFxuICAgICAgICA8UmVmZXJlbmNlR3JvdXBWaWV3XG4gICAgICAgICAgcmVsYXRpdmVQYXRoPXtyZWxhdGl2ZVBhdGh9XG4gICAgICAgICAgcmVmZXJlbmNlcz17cmVmZXJlbmNlc31cbiAgICAgICAgICBuYXZpZ2F0aW9uSW5kZXg9e25hdmlnYXRpb25JbmRleH1cbiAgICAgICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg9e3RoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIGlzQ29sbGFwc2VkPXt0aGlzLmNvbGxhcHNlZEluZGljZXMuaGFzKG5hdmlnYXRpb25JbmRleCl9XG4gICAgICAgIC8+XG4gICAgICApO1xuICAgICAgLy8gY29uc29sZS5sb2coJ1JlZmVyZW5jZXNWaWV3IGFkZGluZyBjaGlsZDonLCB2aWV3KTtcbiAgICAgIGNoaWxkcmVuLnB1c2godmlldyk7XG4gICAgICBuYXZpZ2F0aW9uSW5kZXggKz0gcmVmZXJlbmNlcy5sZW5ndGggKyAxO1xuICAgIH1cblxuICAgIHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCA9IG5hdmlnYXRpb25JbmRleDtcblxuICAgIGxldCBjb250YWluZXJTdHlsZSA9ICB7XG4gICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcbiAgICAgIGhlaWdodDogJzEwMCUnLFxuICAgICAgb3ZlcmZsb3c6ICdhdXRvJyxcbiAgICB9O1xuXG4gICAgbGV0IG1hdGNoQ291bnQgPSB0aGlzLnJlZmVyZW5jZXMubGVuZ3RoO1xuICAgIGxldCBjbGFzc05hbWVzID0gY3goJ2ZpbmQtcmVmZXJlbmNlcy1wYW5lJywgJ3ByZXZpZXctcGFuZScsICdwYW5lLWl0ZW0nLCB7ICduby1yZXN1bHRzJzogbWF0Y2hDb3VudCA9PT0gMCB9KTtcblxuICAgIGxldCBwaW5CdXR0b25DbGFzc05hbWVzID0gY3goJ2J0bicsICdpY29uJywgJ2ljb24tcGluJywgeyAnc2VsZWN0ZWQnOiB0aGlzLnBpbm5lZCB9KTtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9e2NsYXNzTmFtZXN9IHRhYkluZGV4PXstMX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHJldmlldy1oZWFkZXJcIj5cbiAgICAgICAgICB7ZGVzY3JpYmVSZWZlcmVuY2VzKHRoaXMucmVmZXJlbmNlcy5sZW5ndGgsIHRoaXMuZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcy5zaXplLCB0aGlzLnN5bWJvbE5hbWUpfVxuXG4gICAgICAgICAgPGRpdiByZWY9XCJwaW5SZWZlcmVuY2VzXCIgY2xhc3NOYW1lPXtwaW5CdXR0b25DbGFzc05hbWVzfT5QaW4gcmVmZXJlbmNlczwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IHJlZj1cInJlZmVyZW5jZXNWaWV3XCIgY2xhc3NOYW1lPVwicmVzdWx0cy12aWV3IGZvY3VzYWJsZS1wYW5lbFwiIHRhYkluZGV4PXstMX0gc3R5bGU9e3RoaXMucHJldmlld1N0eWxlfT5cbiAgICAgICAgICA8ZGl2IHJlZj1cInNjcm9sbENvbnRhaW5lclwiIGNsYXNzTmFtZT1cInJlc3VsdHMtdmlldy1jb250YWluZXJcIiBzdHlsZT17Y29udGFpbmVyU3R5bGV9PlxuICAgICAgICAgICAgPG9sXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImxpc3QtdHJlZSBoYXMtY29sbGFwc2FibGUtY2hpbGRyZW5cIlxuICAgICAgICAgICAgICBzdHlsZT17bGlzdFN0eWxlfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7Y2hpbGRyZW59XG4gICAgICAgICAgICA8L29sPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cbn1cbiJdfQ==