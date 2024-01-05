"use strict";
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
        console.log('ReferencesView constructor:', this.references);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL3JlZmVyZW5jZXMtdmlldy50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBdUQ7QUFDdkQseUNBQXNDO0FBQ3RDLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLGtGQUF3RDtBQUt4RCxTQUFTLGVBQWUsQ0FBQyxFQUFXO0lBQ2xDLElBQUksQ0FBQyxFQUFFO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDdEIsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDekMsT0FBTyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsS0FBYTtJQUNoRSxPQUFPLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ3ZDLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLGNBQXNCLEVBQUUsU0FBaUIsRUFBRSxVQUFrQjtJQUN2RixPQUFPLENBQ0wsNkJBQU0sR0FBRyxFQUFDLGNBQWMsRUFBQyxTQUFTLEVBQUMsNEJBQTRCO1FBQzVELGNBQWM7O1FBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDOztRQUFZLFNBQVM7O1FBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDOztRQUFPLEdBQUc7UUFDdkksNkJBQU0sU0FBUyxFQUFDLGdCQUFnQixJQUFFLFVBQVUsQ0FBUSxDQUMvQyxDQUNSLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxZQUFzQjtJQUMvRCxLQUFLLElBQUksV0FB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QUssRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sQ0FDTCw0QkFBSyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDdEMsNEJBQUssU0FBUyxFQUFDLGdCQUFnQjtnQkFDNUIsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUVwRyw0QkFBSyxHQUFHLEVBQUMsZUFBZSxFQUFDLFNBQVMsRUFBRSxtQkFBbUIscUJBQXNCLENBQ3pFO1lBRU4sNEJBQUssR0FBRyxFQUFDLGdCQUFnQixFQUFDLFNBQVMsRUFBQyw4QkFBOEIsRUFBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUN2Ryw0QkFBSyxHQUFHLEVBQUMsaUJBQWlCLEVBQUMsU0FBUyxFQUFDLHdCQUF3QixFQUFDLEtBQUssRUFBRSxjQUFjO29CQUNqRiwyQkFDRSxTQUFTLEVBQUMsb0NBQW9DLEVBQzlDLEtBQUssRUFBRSxTQUFTLElBRWYsUUFBUSxDQUNOLENBQ0QsQ0FDRixDQUNGLENBQ1AsQ0FBQztJQUNKLENBQUM7O0FBcGRNLGtCQUFHLEdBQUcsdUNBQXVDLEFBQTFDLENBQTJDO0FBRTlDLHdCQUFTLEdBQXdCLElBQUksR0FBRyxFQUFFLEFBQWpDLENBQWtDO2tCQUgvQixjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IHsgTWluaW1hdGNoIH0gZnJvbSAnbWluaW1hdGNoJztcbmltcG9ydCBldGNoIGZyb20gJ2V0Y2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY3ggZnJvbSAnY2xhc3NuYW1lcyc7XG5pbXBvcnQgUmVmZXJlbmNlR3JvdXBWaWV3IGZyb20gJy4vcmVmZXJlbmNlLWdyb3VwLXZpZXcnO1xuXG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IHR5cGUgeyBFdGNoQ29tcG9uZW50IH0gZnJvbSAnZXRjaCc7XG5cbmZ1bmN0aW9uIGlzRXRjaENvbXBvbmVudChlbDogdW5rbm93bik6IGVsIGlzIEV0Y2hDb21wb25lbnQge1xuICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgZWwgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ3JlZnMnIGluIGVsKSAmJiAoJ2VsZW1lbnQnIGluIGVsKTtcbn1cblxuZnVuY3Rpb24gcGx1cmFsaXplKHNpbmd1bGFyOiBzdHJpbmcsIHBsdXJhbDogc3RyaW5nLCBjb3VudDogbnVtYmVyKSB7XG4gIHJldHVybiBjb3VudCA+IDEgPyBwbHVyYWwgOiBzaW5ndWxhcjtcbn1cblxuZnVuY3Rpb24gZGVzY3JpYmVSZWZlcmVuY2VzKHJlZmVyZW5jZUNvdW50OiBudW1iZXIsIGZpbGVDb3VudDogbnVtYmVyLCBzeW1ib2xOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIChcbiAgICA8c3BhbiByZWY9XCJwcmV2aWV3Q291bnRcIiBjbGFzc05hbWU9XCJwcmV2aWV3LWNvdW50IGlubGluZS1ibG9ja1wiPlxuICAgICAge3JlZmVyZW5jZUNvdW50fSB7cGx1cmFsaXplKCdyZXN1bHQnLCAncmVzdWx0cycsIHJlZmVyZW5jZUNvdW50KX0gZm91bmQgaW4ge2ZpbGVDb3VudH0ge3BsdXJhbGl6ZSgnZmlsZScsICdmaWxlcycsIGZpbGVDb3VudCl9IGZvciB7JyAnfVxuICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaGlnaGxpZ2h0LWluZm9cIj57c3ltYm9sTmFtZX08L3NwYW4+XG4gICAgPC9zcGFuPlxuICApO1xufVxuXG5mdW5jdGlvbiBkZXNjZW5kc0Zyb21BbnkoZmlsZVBhdGg6IHN0cmluZywgcHJvamVjdFBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB8IGZhbHNlIHtcbiAgZm9yIChsZXQgcHJvamVjdFBhdGggb2YgcHJvamVjdFBhdGhzKSB7XG4gICAgaWYgKGRlc2NlbmRzRnJvbShmaWxlUGF0aCwgcHJvamVjdFBhdGgpKSByZXR1cm4gcHJvamVjdFBhdGg7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBkZXNjZW5kc0Zyb20oZmlsZVBhdGg6IHN0cmluZywgcHJvamVjdFBhdGg6IHN0cmluZykge1xuICBpZiAodHlwZW9mIGZpbGVQYXRoICE9PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gZmlsZVBhdGguc3RhcnRzV2l0aChcbiAgICBwcm9qZWN0UGF0aC5lbmRzV2l0aChQYXRoLnNlcCkgPyBwcm9qZWN0UGF0aCA6IGAke3Byb2plY3RQYXRofSR7UGF0aC5zZXB9YFxuICApO1xufVxuXG5mdW5jdGlvbiBtYXRjaGVzSWdub3JlZE5hbWVzKGZpbGVQYXRoOiBzdHJpbmcsIGlnbm9yZWROYW1lczogTWluaW1hdGNoW10pIHtcbiAgbGV0IHJlcG9zaXRvcmllcyA9IGF0b20ucHJvamVjdC5nZXRSZXBvc2l0b3JpZXMoKTtcbiAgaWYgKHJlcG9zaXRvcmllcy5zb21lKHIgPT4gci5pc1BhdGhJZ25vcmVkKGZpbGVQYXRoKSkpIHJldHVybiB0cnVlO1xuICByZXR1cm4gaWdub3JlZE5hbWVzLnNvbWUoaWcgPT4ge1xuICAgIGxldCByZXN1bHQgPSBpZy5tYXRjaChmaWxlUGF0aCk7XG4gICAgLy8gaWYgKHJlc3VsdCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ2ZpbGUnLCBmaWxlUGF0aCwgJ21hdGNoZXMgaWdub3JlIHBhdHRlcm46JywgaWcpO1xuICAgIC8vIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxudHlwZSBTcGxpdERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIHwgJ25vbmUnO1xudHlwZSBGb3JtYWxTcGxpdERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIHwgdW5kZWZpbmVkO1xuXG50eXBlIFJlZmVyZW5jZXNWaWV3UHJvcGVydGllcyA9IHtcbiAgcmVmPzogc3RyaW5nLFxuICByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSxcbiAgc3ltYm9sTmFtZTogc3RyaW5nXG59O1xuXG5sZXQgbGFzdFJlZmVyZW5jZXM6IHsgcmVmZXJlbmNlczogUmVmZXJlbmNlW10sIHN5bWJvbE5hbWU6IHN0cmluZyB9ID0ge1xuICByZWZlcmVuY2VzOiBbXSxcbiAgc3ltYm9sTmFtZTogJydcbn07XG5cbmZ1bmN0aW9uIGdldE9wcG9zaXRlU3BsaXQoc3BsaXQ6IFNwbGl0RGlyZWN0aW9uKTogRm9ybWFsU3BsaXREaXJlY3Rpb24ge1xuICByZXR1cm4ge1xuICAgIGxlZnQ6ICdyaWdodCcsXG4gICAgcmlnaHQ6ICdsZWZ0JyxcbiAgICBkb3duOiAndXAnLFxuICAgIHVwOiAnZG93bicsXG4gICAgbm9uZTogdW5kZWZpbmVkXG4gIH1bc3BsaXRdIGFzIEZvcm1hbFNwbGl0RGlyZWN0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VzVmlldyB7XG4gIHN0YXRpYyBVUkkgPSBcImF0b206Ly9wdWxzYXItZmluZC1yZWZlcmVuY2VzL3Jlc3VsdHNcIjtcblxuICBzdGF0aWMgaW5zdGFuY2VzOiBTZXQ8UmVmZXJlbmNlc1ZpZXc+ID0gbmV3IFNldCgpO1xuXG4gIHN0YXRpYyBzZXRSZWZlcmVuY2VzKHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdLCBzeW1ib2xOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZygnUmVmZXJlbmNlc1BhbmVWaWV3LnNldFJlZmVyZW5jZXM6JywgcmVmZXJlbmNlcyk7XG4gICAgbGFzdFJlZmVyZW5jZXMgPSB7IHJlZmVyZW5jZXMsIHN5bWJvbE5hbWUgfTtcblxuICAgIGZvciAobGV0IGluc3RhbmNlIG9mIFJlZmVyZW5jZXNWaWV3Lmluc3RhbmNlcykge1xuICAgICAgaW5zdGFuY2UudXBkYXRlKGxhc3RSZWZlcmVuY2VzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwcml2YXRlIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdO1xuICBwcml2YXRlIHN5bWJvbE5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpZ25vcmVkTmFtZU1hdGNoZXJzOiBNaW5pbWF0Y2hbXSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNwbGl0RGlyZWN0aW9uOiBTcGxpdERpcmVjdGlvbiA9ICdub25lJztcblxuICBwcml2YXRlIGZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXMhOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2VbXT47XG5cbiAgcHJpdmF0ZSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IG51bWJlciA9IC0xO1xuICBwcml2YXRlIGxhc3ROYXZpZ2F0aW9uSW5kZXg6IG51bWJlciA9IC0xO1xuXG4gIHByaXZhdGUgY29sbGFwc2VkSW5kaWNlczogU2V0PG51bWJlcj4gPSBuZXcgU2V0KCk7XG5cbiAgcHJpdmF0ZSBwaW5uZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIHByZXZpZXdTdHlsZTogeyBmb250RmFtaWx5OiBzdHJpbmcgfSA9IHsgZm9udEZhbWlseTogJycgfTtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBSZWZlcmVuY2VzVmlldy5pbnN0YW5jZXMuYWRkKHRoaXMpO1xuICAgIHRoaXMucmVmZXJlbmNlcyA9IGxhc3RSZWZlcmVuY2VzLnJlZmVyZW5jZXM7XG4gICAgdGhpcy5zeW1ib2xOYW1lID0gbGFzdFJlZmVyZW5jZXMuc3ltYm9sTmFtZTtcbiAgICBjb25zb2xlLmxvZygnUmVmZXJlbmNlc1ZpZXcgY29uc3RydWN0b3I6JywgdGhpcy5yZWZlcmVuY2VzKTtcblxuICAgIGlmICghdGhpcy5yZWZlcmVuY2VzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHJlZmVyZW5jZXMhYCk7XG4gICAgfVxuXG4gICAgdGhpcy5maWx0ZXJBbmRHcm91cFJlZmVyZW5jZXMoKTtcblxuICAgIGV0Y2guaW5pdGlhbGl6ZSh0aGlzKTtcblxuICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ2VkaXRvci5mb250RmFtaWx5JywgdGhpcy5mb250RmFtaWx5Q2hhbmdlZC5iaW5kKHRoaXMpKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ2NvcmUuaWdub3JlZE5hbWVzJywgdGhpcy5pZ25vcmVkTmFtZXNDaGFuZ2VkLmJpbmQodGhpcykpLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5wYW5lbC5zcGxpdERpcmVjdGlvbicsIHRoaXMuc3BsaXREaXJlY3Rpb25DaGFuZ2VkLmJpbmQodGhpcykpXG4gICAgKTtcblxuICAgIGF0b20uY29tbWFuZHMuYWRkPE5vZGU+KFxuICAgICAgdGhpcy5lbGVtZW50LFxuICAgICAge1xuICAgICAgICAnY29yZTptb3ZlLXVwJzogdGhpcy5tb3ZlVXAuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS1kb3duJzogdGhpcy5tb3ZlRG93bi5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLWxlZnQnOiB0aGlzLmNvbGxhcHNlQWN0aXZlLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtcmlnaHQnOiB0aGlzLmV4cGFuZEFjdGl2ZS5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpwYWdlLXVwJzogdGhpcy5wYWdlVXAuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6cGFnZS1kb3duJzogdGhpcy5wYWdlRG93bi5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLXRvLXRvcCc6IHRoaXMubW92ZVRvVG9wLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtdG8tYm90dG9tJzogdGhpcy5tb3ZlVG9Cb3R0b20uYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6Y29uZmlybSc6IHRoaXMuY29uZmlybVJlc3VsdC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpjb3B5JzogdGhpcy5jb3B5UmVzdWx0LmJpbmQodGhpcyksXG4gICAgICAgICdmaW5kLWFuZC1yZXBsYWNlOmNvcHktcGF0aCc6IHRoaXMuY29weVBhdGguYmluZCh0aGlzKSxcbiAgICAgICAgJ2ZpbmQtYW5kLXJlcGxhY2U6b3Blbi1pbi1uZXctdGFiJzogdGhpcy5vcGVuSW5OZXdUYWIuYmluZCh0aGlzKSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgdGhpcy5yZWZzLnBpblJlZmVyZW5jZXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdjbGljaycsXG4gICAgICB0aGlzLmhhbmRsZVBpblJlZmVyZW5jZXNDbGlja2VkLmJpbmQodGhpcylcbiAgICApO1xuXG4gICAgdGhpcy5mb2N1cygpO1xuICB9XG5cbiAgbW92ZVVwKCkge1xuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9PT0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4KSByZXR1cm47XG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kVmlzaWJsZU5hdmlnYXRpb25JbmRleCgtMSk7XG4gICAgaWYgKGluZGV4ID09PSBudWxsKSByZXR1cm47XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBpbmRleDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIG1vdmVEb3duKCkge1xuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9PT0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4KSByZXR1cm47XG4gICAgbGV0IGluZGV4ID0gdGhpcy5maW5kVmlzaWJsZU5hdmlnYXRpb25JbmRleCgxKTtcbiAgICBpZiAoaW5kZXggPT09IG51bGwpIHJldHVybjtcbiAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgZmluZFZpc2libGVOYXZpZ2F0aW9uSW5kZXgoZGVsdGE6IG51bWJlcikge1xuICAgIGxldCBjdXJyZW50ID0gdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGN1cnJlbnQgKz0gZGVsdGE7XG4gICAgICBpZiAoY3VycmVudCA8IDAgfHwgY3VycmVudCA+IHRoaXMubGFzdE5hdmlnYXRpb25JbmRleCkgcmV0dXJuIG51bGw7XG4gICAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0RWxlbWVudEF0SW5kZXgoY3VycmVudCk7XG4gICAgICBpZiAoZWxlbWVudCAmJiBlbGVtZW50LmNsaWVudEhlaWdodCA+IDApIHJldHVybiBjdXJyZW50O1xuICAgIH1cbiAgfVxuXG4gIGlzVmFsaWRFbGVtZW50SW5kZXgoaW5kZXg6IG51bWJlcikge1xuICAgIGlmIChpbmRleCA8IDApIHJldHVybiBmYWxzZTtcbiAgICBpZiAoaW5kZXggPiB0aGlzLmxhc3ROYXZpZ2F0aW9uSW5kZXgpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgoaW5kZXg6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xuICAgIGlmICghdGhpcy5pc1ZhbGlkRWxlbWVudEluZGV4KGluZGV4KSkgcmV0dXJuIC0xO1xuICAgIGxldCB7IHNjcm9sbENvbnRhaW5lciB9ID0gdGhpcy5yZWZzO1xuICAgIGxldCBzY3JvbGxSZWN0ID0gc2Nyb2xsQ29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGxldCBlbGVtZW50ID0gdGhpcy5nZXRFbGVtZW50QXRJbmRleChpbmRleCk7XG4gICAgaWYgKCFlbGVtZW50IHx8ICFlbGVtZW50LmNsaWVudEhlaWdodCkgcmV0dXJuIG51bGw7XG4gICAgbGV0IGVsZW1lbnRSZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gZWxlbWVudFJlY3QudG9wIC0gc2Nyb2xsUmVjdC50b3A7XG4gIH1cblxuICBmaW5kRWxlbWVudEluZGV4TmVhckhlaWdodCh0b3A6IG51bWJlcikge1xuICAgIGxldCBjbG9zZXN0RWwgPSBudWxsLCBjbG9zZXN0RGlmZiA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4OyBpKyspIHtcbiAgICAgIGxldCBvZmZzZXQgPSB0aGlzLnNjcm9sbE9mZnNldE9mRWxlbWVudEF0SW5kZXgoaSk7XG4gICAgICBpZiAob2Zmc2V0ID09PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGxldCBkaWZmID0gTWF0aC5hYnModG9wIC0gb2Zmc2V0KTtcbiAgICAgIGlmIChvZmZzZXQgPT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgaWYgKGNsb3Nlc3RFbCA9PT0gbnVsbCB8fCBjbG9zZXN0RGlmZiAhPT0gbnVsbCAmJiBjbG9zZXN0RGlmZiA+IGRpZmYpIHtcbiAgICAgICAgY2xvc2VzdERpZmYgPSBkaWZmO1xuICAgICAgICBjbG9zZXN0RWwgPSBpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbG9zZXN0RWwgPz8gLTE7XG4gIH1cblxuICBjb2xsYXBzZUFjdGl2ZSgpIHtcbiAgICB0aGlzLmNvbGxhcHNlUmVzdWx0KHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4KTtcbiAgfVxuXG4gIGV4cGFuZEFjdGl2ZSgpIHtcbiAgICB0aGlzLmV4cGFuZFJlc3VsdCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gIH1cblxuICBjb2xsYXBzZVJlc3VsdChpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY29sbGFwc2VkSW5kaWNlcy5oYXMoaW5kZXgpKSByZXR1cm47XG4gICAgdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmFkZChpbmRleCk7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBleHBhbmRSZXN1bHQoaW5kZXg6IG51bWJlcikge1xuICAgIGlmICghdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhpbmRleCkpIHJldHVybjtcbiAgICB0aGlzLmNvbGxhcHNlZEluZGljZXMuZGVsZXRlKGluZGV4KTtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIHRvZ2dsZVJlc3VsdChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IGlzQ29sbGFwc2VkID0gdGhpcy5jb2xsYXBzZWRJbmRpY2VzLmhhcyhpbmRleCk7XG4gICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICB0aGlzLmV4cGFuZFJlc3VsdChpbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGFwc2VSZXN1bHQoaW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHBhZ2VVcCgpIHtcbiAgICBsZXQgY3VycmVudE9mZnNldCA9IHRoaXMuc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gICAgaWYgKGN1cnJlbnRPZmZzZXQgPT09IG51bGwpIHJldHVybjtcblxuICAgIGxldCBpbmRleCA9IHRoaXMuZmluZEVsZW1lbnRJbmRleE5lYXJIZWlnaHQoY3VycmVudE9mZnNldCAtIHRoaXMucmVmcy5zY3JvbGxDb250YWluZXIub2Zmc2V0SGVpZ2h0KTtcblxuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBwYWdlRG93bigpIHtcbiAgICBsZXQgY3VycmVudE9mZnNldCA9IHRoaXMuc2Nyb2xsT2Zmc2V0T2ZFbGVtZW50QXRJbmRleCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gICAgaWYgKGN1cnJlbnRPZmZzZXQgPT09IG51bGwpIHJldHVybjtcblxuICAgIGxldCBpbmRleCA9IHRoaXMuZmluZEVsZW1lbnRJbmRleE5lYXJIZWlnaHQoY3VycmVudE9mZnNldCArIHRoaXMucmVmcy5zY3JvbGxDb250YWluZXIub2Zmc2V0SGVpZ2h0KTtcblxuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBtb3ZlVG9Ub3AoKSB7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAwO1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgbW92ZVRvQm90dG9tKCkge1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgY29uZmlybVJlc3VsdCgpIHtcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuYWN0aXZlRWxlbWVudDtcbiAgICBpZiAoIWVsZW1lbnQpIHJldHVybjtcbiAgICBsZXQgeyBmaWxlUGF0aCA9ICcnLCBsaW5lTnVtYmVyU3RyID0gJy0xJywgcmFuZ2UgPSAnJyB9ID0gZWxlbWVudC5kYXRhc2V0O1xuICAgIGxldCBsaW5lTnVtYmVyID0gTnVtYmVyKGxpbmVOdW1iZXJTdHIpO1xuXG4gICAgdGhpcy5vcGVuUmVzdWx0KGZpbGVQYXRoLCBsaW5lTnVtYmVyLCByYW5nZSk7XG4gIH1cblxuICBjb3B5UmVzdWx0KCkge1xuICAgIC8vIFRPRE9cbiAgfVxuXG4gIGNvcHlQYXRoKCkge1xuICAgIC8vIFRPRE9cbiAgfVxuXG4gIG9wZW5Jbk5ld1RhYigpIHtcbiAgICAvLyBUT0RPXG4gIH1cblxuICBnZXRFbGVtZW50QXRJbmRleChpbmRleDogbnVtYmVyKTogSFRNTEVsZW1lbnQgfCBudWxsICB7XG4gICAgbGV0IGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtbmF2aWdhdGlvbi1pbmRleD1cIiR7aW5kZXh9XCJdYCk7XG4gICAgcmV0dXJuIGVsZW1lbnQgPyAoZWxlbWVudCBhcyBIVE1MRWxlbWVudCkgOiBudWxsO1xuICB9XG5cbiAgZ2V0IGFjdGl2ZUVsZW1lbnQoKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPCAwKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXRJbmRleCh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoeyByZWZlcmVuY2VzLCBzeW1ib2xOYW1lIH06IFJlZmVyZW5jZXNWaWV3UHJvcGVydGllcykge1xuICAgIC8vIElnbm9yZSBuZXcgcmVmZXJlbmNlcyB3aGVuIHBpbm5lZC5cbiAgICBpZiAodGhpcy5waW5uZWQpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XG4gICAgaWYgKHJlZmVyZW5jZXMubGVuZ3RoID09PSAwICYmIHN5bWJvbE5hbWUgPT09ICcnKVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgaWYgKHRoaXMucmVmZXJlbmNlcyAhPT0gcmVmZXJlbmNlcykge1xuICAgICAgdGhpcy5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcztcbiAgICAgIHRoaXMuZmlsdGVyQW5kR3JvdXBSZWZlcmVuY2VzKCk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zeW1ib2xOYW1lICE9PSBzeW1ib2xOYW1lKSB7XG4gICAgICB0aGlzLnN5bWJvbE5hbWUgPSBzeW1ib2xOYW1lO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZWQgPyBldGNoLnVwZGF0ZSh0aGlzKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBSZWZlcmVuY2VzVmlldy5pbnN0YW5jZXMuZGVsZXRlKHRoaXMpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gIH1cblxuICBmb250RmFtaWx5Q2hhbmdlZChmb250RmFtaWx5OiBzdHJpbmcpIHtcbiAgICB0aGlzLnByZXZpZXdTdHlsZSA9IHsgZm9udEZhbWlseSB9O1xuICAgIGV0Y2gudXBkYXRlKHRoaXMpO1xuICB9XG5cbiAgaWdub3JlZE5hbWVzQ2hhbmdlZChpZ25vcmVkTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5pZ25vcmVkTmFtZU1hdGNoZXJzID0gaWdub3JlZE5hbWVzLm1hcChpZyA9PiBuZXcgTWluaW1hdGNoKGlnKSk7XG4gIH1cblxuICBzcGxpdERpcmVjdGlvbkNoYW5nZWQoc3BsaXREaXJlY3Rpb246IFNwbGl0RGlyZWN0aW9uKSB7XG4gICAgdGhpcy5zcGxpdERpcmVjdGlvbiA9IHNwbGl0RGlyZWN0aW9uO1xuICB9XG5cbiAgaGFuZGxlQ2xpY2soZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICBpZiAoIWV2ZW50LnRhcmdldCkgcmV0dXJuO1xuICAgIGxldCB0YXJnZXQgPSAoZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KT8uY2xvc2VzdCgnW2RhdGEtbmF2aWdhdGlvbi1pbmRleF0nKSBhcyBIVE1MRWxlbWVudDtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBsZXQgbmF2aWdhdGlvbkluZGV4ID0gTnVtYmVyKHRhcmdldC5kYXRhc2V0Lm5hdmlnYXRpb25JbmRleCk7XG4gICAgICBsZXQgdmlld3BvcnRYT2Zmc2V0ID0gZXZlbnQuY2xpZW50WDtcbiAgICAgIGxldCB0YXJnZXRSZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICBpZiAodGFyZ2V0Lm1hdGNoZXMoJy5saXN0LWl0ZW0nKSAmJiB2aWV3cG9ydFhPZmZzZXQgLSB0YXJnZXRSZWN0LmxlZnQgPD0gMTYpIHtcbiAgICAgICAgdGhpcy50b2dnbGVSZXN1bHQobmF2aWdhdGlvbkluZGV4KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0Lm1hdGNoZXMoJ1tkYXRhLWxpbmUtbnVtYmVyXVtkYXRhLWZpbGUtcGF0aF0nKSkge1xuICAgICAgICBsZXQgZmlsZVBhdGggPSB0YXJnZXQuZGF0YXNldC5maWxlUGF0aCA/PyAnJztcbiAgICAgICAgbGV0IGxpbmVOdW1iZXIgPSBOdW1iZXIodGFyZ2V0LmRhdGFzZXQubGluZU51bWJlciB8fCAnLTEnKTtcbiAgICAgICAgbGV0IHJhbmdlU3BlYyA9IHRhcmdldC5kYXRhc2V0LnJhbmdlID8/ICcnO1xuXG4gICAgICAgIHRoaXMub3BlblJlc3VsdChmaWxlUGF0aCwgbGluZU51bWJlciwgcmFuZ2VTcGVjKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gLTE7XG4gICAgfVxuXG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAvLyB0aGlzLmFjdGl2YXRlKCk7XG4gIH1cblxuICBhY3RpdmF0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICB0aGlzLmVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBoYW5kbGVQaW5SZWZlcmVuY2VzQ2xpY2tlZCgpIHtcbiAgICB0aGlzLnBpbm5lZCA9ICF0aGlzLnBpbm5lZDtcbiAgICBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIGFzeW5jIG9wZW5SZXN1bHQoXG4gICAgZmlsZVBhdGg6IHN0cmluZyxcbiAgICByb3c6IG51bWJlcixcbiAgICByYW5nZVNwZWM6IHN0cmluZyxcbiAgICB7IHBlbmRpbmcgPSB0cnVlIH06IHsgcGVuZGluZzogYm9vbGVhbiB9ID0geyBwZW5kaW5nOiB0cnVlIH1cbiAgKSB7XG4gICAgbGV0IHJlZmVyZW5jZXNGb3JGaWxlUGF0aCA9IHRoaXMuZmlsdGVyZWRBbmRHcm91cGVkUmVmZXJlbmNlcy5nZXQoZmlsZVBhdGgpO1xuICAgIGlmICghcmVmZXJlbmNlc0ZvckZpbGVQYXRoKSByZXR1cm47XG4gICAgbGV0IHJlZmVyZW5jZXNGb3JMaW5lTnVtYmVyID0gcmVmZXJlbmNlc0ZvckZpbGVQYXRoLmZpbHRlcigoeyByYW5nZSB9KSA9PiB7XG4gICAgICByZXR1cm4gcmFuZ2Uuc3RhcnQucm93ID09IHJvdztcbiAgICB9KTtcbiAgICBsZXQgcmFuZ2VzID0gcmVmZXJlbmNlc0ZvckxpbmVOdW1iZXIubWFwKHIgPT4gci5yYW5nZSk7XG4gICAgbGV0IHRhcmdldFJhbmdlID0gcmFuZ2VTcGVjID09PSAnJyA/IHJhbmdlc1swXSA6IHJhbmdlcy5maW5kKHIgPT4ge1xuICAgICAgcmV0dXJuIHIudG9TdHJpbmcoKSA9PT0gcmFuZ2VTcGVjO1xuICAgIH0pO1xuICAgIGxldCBlZGl0b3IgPSBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKFxuICAgICAgZmlsZVBhdGgsXG4gICAgICB7XG4gICAgICAgIHBlbmRpbmcsXG4gICAgICAgIHNlYXJjaEFsbFBhbmVzOiB0cnVlLFxuICAgICAgICBzcGxpdDogZ2V0T3Bwb3NpdGVTcGxpdCh0aGlzLnNwbGl0RGlyZWN0aW9uKVxuICAgICAgfVxuICAgICkgYXMgVGV4dEVkaXRvcjtcbiAgICBlZGl0b3IudW5mb2xkQnVmZmVyUm93KHJvdyk7XG4gICAgaWYgKHJhbmdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yIHVuZG9jdW1lbnRlZCBvcHRpb25cbiAgICAgIGVkaXRvci5nZXRMYXN0U2VsZWN0aW9uKCkuc2V0QnVmZmVyUmFuZ2UodGFyZ2V0UmFuZ2UgPz8gcmFuZ2VzWzBdLCB7IGZsYXNoOiB0cnVlIH0pO1xuICAgIH1cbiAgICBlZGl0b3Iuc2Nyb2xsVG9DdXJzb3JQb3NpdGlvbigpO1xuICB9XG5cbiAgZmlsdGVyQW5kR3JvdXBSZWZlcmVuY2VzKCk6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZVtdPiB7XG4gICAgbGV0IHBhdGhzID0gYXRvbS5wcm9qZWN0LmdldFBhdGhzKCk7XG4gICAgbGV0IHJlc3VsdHMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlW10+KCk7XG4gICAgaWYgKCF0aGlzLnJlZmVyZW5jZXMpIHJldHVybiByZXN1bHRzO1xuXG4gICAgZm9yIChsZXQgcmVmZXJlbmNlIG9mIHRoaXMucmVmZXJlbmNlcykge1xuICAgICAgbGV0IHsgdXJpIH0gPSByZWZlcmVuY2U7XG4gICAgICBsZXQgcHJvamVjdFBhdGggPSBkZXNjZW5kc0Zyb21BbnkodXJpLCBwYXRocyk7XG4gICAgICBpZiAocHJvamVjdFBhdGggPT09IGZhbHNlKSBjb250aW51ZTtcbiAgICAgIGlmIChtYXRjaGVzSWdub3JlZE5hbWVzKHVyaSwgdGhpcy5pZ25vcmVkTmFtZU1hdGNoZXJzID8/IFtdKSkgY29udGludWU7XG5cbiAgICAgIGxldCBbXywgcmVsYXRpdmVQYXRoXSA9IGF0b20ucHJvamVjdC5yZWxhdGl2aXplUGF0aCh1cmkpO1xuICAgICAgbGV0IHJlc3VsdHNGb3JQYXRoID0gcmVzdWx0cy5nZXQocmVsYXRpdmVQYXRoKTtcbiAgICAgIGlmICghcmVzdWx0c0ZvclBhdGgpIHtcbiAgICAgICAgcmVzdWx0c0ZvclBhdGggPSBbXTtcbiAgICAgICAgcmVzdWx0cy5zZXQocmVsYXRpdmVQYXRoLCByZXN1bHRzRm9yUGF0aCk7XG4gICAgICB9XG4gICAgICByZXN1bHRzRm9yUGF0aC5wdXNoKHJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgdGhpcy5maWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzID0gcmVzdWx0cztcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldCBwcm9wcygpOiBSZWZlcmVuY2VzVmlld1Byb3BlcnRpZXMge1xuICAgIHJldHVybiB7XG4gICAgICByZWZlcmVuY2VzOiB0aGlzLnJlZmVyZW5jZXMgPz8gW10sXG4gICAgICBzeW1ib2xOYW1lOiB0aGlzLnN5bWJvbE5hbWUgPz8gJydcbiAgICB9O1xuICB9XG5cbiAgd3JpdGVBZnRlclVwZGF0ZSgpIHtcbiAgICBsZXQgc2VsZWN0ZWQgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihcbiAgICAgICdbZGF0YS1uYXZpZ2F0aW9uLWluZGV4XS5zZWxlY3RlZCwgLmxpc3QtbmVzdGVkLWl0ZW0uc2VsZWN0ZWQnXG4gICAgKTtcbiAgICBpZiAoIXNlbGVjdGVkKSByZXR1cm47XG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciBwcm9wcmlldGFyeSBtZXRob2RcbiAgICBzZWxlY3RlZC5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKCk7XG4gIH1cblxuICBjb3B5KCkge1xuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlc1ZpZXcoKTtcbiAgfVxuXG4gIGdldFRpdGxlKCkge1xuICAgIHJldHVybiAnRmluZCBSZWZlcmVuY2VzIFJlc3VsdHMnO1xuICB9XG5cbiAgZ2V0SWNvbk5hbWUoKSB7XG4gICAgcmV0dXJuICdzZWFyY2gnO1xuICB9XG5cbiAgZ2V0VVJJKCkge1xuICAgIHJldHVybiBSZWZlcmVuY2VzVmlldy5VUkk7XG4gIH1cblxuICBmb2N1cygpIHtcbiAgICBsZXQgcmVmZXJlbmNlc1ZpZXcgPSB0aGlzLnJlZnMucmVmZXJlbmNlc1ZpZXc7XG4gICAgaWYgKCFpc0V0Y2hDb21wb25lbnQocmVmZXJlbmNlc1ZpZXcpKSByZXR1cm47XG4gICAgcmVmZXJlbmNlc1ZpZXcuZWxlbWVudC5mb2N1cygpO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdSZWZlcmVuY2VzVmlldyByZW5kZXI6JywgdGhpcy5wcm9wcywgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgpO1xuICAgIGxldCBsaXN0U3R5bGUgPSB7XG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgIG92ZXJmbG93OiAnaGlkZGVuJyxcbiAgICAgIGxlZnQ6ICcwJyxcbiAgICAgIHRvcDogJzAnLFxuICAgICAgcmlnaHQ6ICcwJ1xuICAgIH07XG5cbiAgICBsZXQgaW5kZXggPSB0aGlzLmZpbHRlcmVkQW5kR3JvdXBlZFJlZmVyZW5jZXM7XG4gICAgbGV0IGNoaWxkcmVuID0gW107XG5cbiAgICBsZXQgbmF2aWdhdGlvbkluZGV4ID0gMDtcbiAgICBmb3IgKGxldCBbcmVsYXRpdmVQYXRoLCByZWZlcmVuY2VzXSBvZiBpbmRleCkge1xuICAgICAgbGV0IHZpZXcgPSAoXG4gICAgICAgIDxSZWZlcmVuY2VHcm91cFZpZXdcbiAgICAgICAgICByZWxhdGl2ZVBhdGg9e3JlbGF0aXZlUGF0aH1cbiAgICAgICAgICByZWZlcmVuY2VzPXtyZWZlcmVuY2VzfVxuICAgICAgICAgIG5hdmlnYXRpb25JbmRleD17bmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleD17dGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXh9XG4gICAgICAgICAgaXNDb2xsYXBzZWQ9e3RoaXMuY29sbGFwc2VkSW5kaWNlcy5oYXMobmF2aWdhdGlvbkluZGV4KX1cbiAgICAgICAgLz5cbiAgICAgICk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnUmVmZXJlbmNlc1ZpZXcgYWRkaW5nIGNoaWxkOicsIHZpZXcpO1xuICAgICAgY2hpbGRyZW4ucHVzaCh2aWV3KTtcbiAgICAgIG5hdmlnYXRpb25JbmRleCArPSByZWZlcmVuY2VzLmxlbmd0aCArIDE7XG4gICAgfVxuXG4gICAgdGhpcy5sYXN0TmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4O1xuXG4gICAgbGV0IGNvbnRhaW5lclN0eWxlID0gIHtcbiAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuICAgICAgaGVpZ2h0OiAnMTAwJScsXG4gICAgICBvdmVyZmxvdzogJ2F1dG8nLFxuICAgIH07XG5cbiAgICBsZXQgbWF0Y2hDb3VudCA9IHRoaXMucmVmZXJlbmNlcy5sZW5ndGg7XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBjeCgnZmluZC1yZWZlcmVuY2VzLXBhbmUnLCAncHJldmlldy1wYW5lJywgJ3BhbmUtaXRlbScsIHsgJ25vLXJlc3VsdHMnOiBtYXRjaENvdW50ID09PSAwIH0pO1xuXG4gICAgbGV0IHBpbkJ1dHRvbkNsYXNzTmFtZXMgPSBjeCgnYnRuJywgJ2ljb24nLCAnaWNvbi1waW4nLCB7ICdzZWxlY3RlZCc6IHRoaXMucGlubmVkIH0pO1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT17Y2xhc3NOYW1lc30gdGFiSW5kZXg9ey0xfT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwcmV2aWV3LWhlYWRlclwiPlxuICAgICAgICAgIHtkZXNjcmliZVJlZmVyZW5jZXModGhpcy5yZWZlcmVuY2VzLmxlbmd0aCwgdGhpcy5maWx0ZXJlZEFuZEdyb3VwZWRSZWZlcmVuY2VzLnNpemUsIHRoaXMuc3ltYm9sTmFtZSl9XG5cbiAgICAgICAgICA8ZGl2IHJlZj1cInBpblJlZmVyZW5jZXNcIiBjbGFzc05hbWU9e3BpbkJ1dHRvbkNsYXNzTmFtZXN9PlBpbiByZWZlcmVuY2VzPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgcmVmPVwicmVmZXJlbmNlc1ZpZXdcIiBjbGFzc05hbWU9XCJyZXN1bHRzLXZpZXcgZm9jdXNhYmxlLXBhbmVsXCIgdGFiSW5kZXg9ey0xfSBzdHlsZT17dGhpcy5wcmV2aWV3U3R5bGV9PlxuICAgICAgICAgIDxkaXYgcmVmPVwic2Nyb2xsQ29udGFpbmVyXCIgY2xhc3NOYW1lPVwicmVzdWx0cy12aWV3LWNvbnRhaW5lclwiIHN0eWxlPXtjb250YWluZXJTdHlsZX0+XG4gICAgICAgICAgICA8b2xcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwibGlzdC10cmVlIGhhcy1jb2xsYXBzYWJsZS1jaGlsZHJlblwiXG4gICAgICAgICAgICAgIHN0eWxlPXtsaXN0U3R5bGV9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtjaGlsZHJlbn1cbiAgICAgICAgICAgIDwvb2w+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufVxuIl19