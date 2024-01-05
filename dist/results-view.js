"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const minimatch_1 = require("minimatch");
const etch_1 = __importDefault(require("etch"));
const node_path_1 = __importDefault(require("node:path"));
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
    return filePath.startsWith(projectPath.endsWith(node_path_1.default.sep) ? projectPath : `${projectPath}${node_path_1.default.sep}`);
}
function matchesIgnoredNames(filePath, ignoredNames) {
    return ignoredNames.some(ig => ig.match(filePath));
}
class ResultsView {
    constructor(results) {
        this.subscriptions = new atom_1.CompositeDisposable();
        this.ignoredNameMatchers = null;
        this.previewStyle = { fontFamily: '' };
        this.results = results;
        etch_1.default.initialize(this);
        let resizeObserver = new ResizeObserver(this.invalidateItemHeights.bind(this));
        resizeObserver.observe(this.element);
        this.element.addEventListener('mousedown', this.handleClick.bind(this));
        this.subscriptions.add(atom.config.observe('editor.fontFamily', this.fontFamilyChanged.bind(this)), atom.config.observe('core.ignoredNames', this.ignoredNamesChanged.bind(this)));
        atom.commands.add(this.element, {
            'core:move-up': this.moveUp.bind(this),
            'core:move-down': this.moveDown.bind(this),
            'core:move-left': this.collapseResult.bind(this),
            'core:move-right': this.expandResult.bind(this),
            'core:page-up': this.pageUp.bind(this),
            'core:page-down': this.pageDown.bind(this),
            'core:move-to-top': this.moveToTop.bind(this),
            'core:move-to-bottom': this.moveToBottom.bind(this),
            'core:confirm': this.confirmResult.bind(this),
            'core:copy': this.copyResult.bind(this),
            'find-and-replace:copy-path': this.copyPath.bind(this),
            'find-and-replace:open-in-new-tab': this.openInNewTab.bind(this),
        });
    }
    moveUp() {
    }
    moveDown() {
    }
    collapseResult() {
    }
    expandResult() {
    }
    pageUp() {
    }
    pageDown() {
    }
    moveToTop() {
    }
    moveToBottom() {
    }
    confirmResult() {
    }
    copyResult() {
    }
    copyPath() {
    }
    openInNewTab() {
    }
    update() {
    }
    destroy() {
        this.subscriptions.dispose();
    }
    getRowHeight() {
    }
    fontFamilyChanged(fontFamily) {
        this.previewStyle = { fontFamily };
        etch_1.default.update(this);
    }
    ignoredNamesChanged(ignoredNames) {
        this.ignoredNameMatchers = ignoredNames.map(ig => new minimatch_1.Minimatch(ig));
    }
    invalidateItemHeights() {
    }
    handleClick() {
    }
    filterAndGroupReferences() {
        var _a;
        let paths = atom.project.getPaths();
        let results = new Map();
        if (!this.results)
            return results;
        for (let reference of this.results) {
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
        return results;
    }
    render() {
        let containerStyle = {
            visibility: 'hidden',
            position: 'absolute',
            overflow: 'hidden',
            left: '0',
            top: '0',
            right: '0'
        };
        return (etch_1.default.dom("div", { className: "results-view focusable-panel", tabIndex: -1, style: this.previewStyle },
            etch_1.default.dom("ol", { className: "list-tree has-collapsible-children", style: containerStyle })));
    }
}
exports.default = ResultsView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0cy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL3Jlc3VsdHMtdmlldy50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwrQkFBMkM7QUFFM0MseUNBQXNDO0FBRXRDLGdEQUF3QjtBQUN4QiwwREFBNkI7QUFFN0IsU0FBUyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxZQUFzQjtJQUMvRCxLQUFLLElBQUksV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ3JDLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUM7WUFBRSxPQUFPLFdBQVcsQ0FBQztJQUM5RCxDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsUUFBZ0IsRUFBRSxXQUFtQjtJQUN6RCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUMvQyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQ3hCLFdBQVcsQ0FBQyxRQUFRLENBQUMsbUJBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsR0FBRyxtQkFBSSxDQUFDLEdBQUcsRUFBRSxDQUMzRSxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsUUFBZ0IsRUFBRSxZQUF5QjtJQUN0RSxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQUVELE1BQXFCLFdBQVc7SUFPOUIsWUFBWSxPQUFvQjtRQU54QixrQkFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFFL0Qsd0JBQW1CLEdBQXVCLElBQUksQ0FBQztRQUUvQyxpQkFBWSxHQUEyQixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUdoRSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUV2QixjQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRCLElBQUksY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvRSxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXhFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQzNFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDOUUsQ0FBQztRQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUNmLElBQUksQ0FBQyxPQUFPLEVBQ1o7WUFDRSxjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3RDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUMxQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDaEQsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQy9DLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDdEMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUM3QyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbkQsY0FBYyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUM3QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN0RCxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDakUsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU07SUFFTixDQUFDO0lBRUQsUUFBUTtJQUVSLENBQUM7SUFFRCxjQUFjO0lBRWQsQ0FBQztJQUVELFlBQVk7SUFFWixDQUFDO0lBRUQsTUFBTTtJQUVOLENBQUM7SUFFRCxRQUFRO0lBRVIsQ0FBQztJQUVELFNBQVM7SUFFVCxDQUFDO0lBRUQsWUFBWTtJQUVaLENBQUM7SUFFRCxhQUFhO0lBRWIsQ0FBQztJQUVELFVBQVU7SUFFVixDQUFDO0lBRUQsUUFBUTtJQUVSLENBQUM7SUFFRCxZQUFZO0lBRVosQ0FBQztJQUVELE1BQU07SUFFTixDQUFDO0lBRUQsT0FBTztRQUNMLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVELFlBQVk7SUFFWixDQUFDO0lBRUQsaUJBQWlCLENBQUMsVUFBa0I7UUFDbEMsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLFVBQVUsRUFBRSxDQUFDO1FBQ25DLGNBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUVELG1CQUFtQixDQUFDLFlBQXNCO1FBQ3hDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxxQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELHFCQUFxQjtJQUVyQixDQUFDO0lBRUQsV0FBVztJQUVYLENBQUM7SUFFRCx3QkFBd0I7O1FBQ3RCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxPQUFPLENBQUM7UUFFbEMsS0FBSyxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQztZQUN4QixJQUFJLFdBQVcsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlDLElBQUksV0FBVyxLQUFLLEtBQUs7Z0JBQUUsU0FBUztZQUNwQyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxNQUFBLElBQUksQ0FBQyxtQkFBbUIsbUNBQUksRUFBRSxDQUFDO2dCQUFFLFNBQVM7WUFFdkUsSUFBSSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN6RCxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsY0FBYyxHQUFHLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDNUMsQ0FBQztZQUNELGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxNQUFNO1FBQ0osSUFBSSxjQUFjLEdBQUc7WUFDbkIsVUFBVSxFQUFFLFFBQVE7WUFDcEIsUUFBUSxFQUFFLFVBQVU7WUFDcEIsUUFBUSxFQUFFLFFBQVE7WUFDbEIsSUFBSSxFQUFFLEdBQUc7WUFDVCxHQUFHLEVBQUUsR0FBRztZQUNSLEtBQUssRUFBRSxHQUFHO1NBQ1gsQ0FBQztRQUVGLE9BQU8sQ0FDTCw0QkFBSyxTQUFTLEVBQUMsOEJBQThCLEVBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWTtZQUNsRiwyQkFDRSxTQUFTLEVBQUMsb0NBQW9DLEVBQzlDLEtBQUssRUFBRSxjQUFjLEdBRWxCLENBRUQsQ0FDUCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBaktELDhCQWlLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvc2l0ZURpc3Bvc2FibGUgfSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgeyBNaW5pbWF0Y2ggfSBmcm9tICdtaW5pbWF0Y2gnO1xuXG5pbXBvcnQgZXRjaCBmcm9tICdldGNoJztcbmltcG9ydCBQYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5cbmZ1bmN0aW9uIGRlc2NlbmRzRnJvbUFueShmaWxlUGF0aDogc3RyaW5nLCBwcm9qZWN0UGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nIHwgZmFsc2Uge1xuICBmb3IgKGxldCBwcm9qZWN0UGF0aCBvZiBwcm9qZWN0UGF0aHMpIHtcbiAgICBpZiAoZGVzY2VuZHNGcm9tKGZpbGVQYXRoLCBwcm9qZWN0UGF0aCkpIHJldHVybiBwcm9qZWN0UGF0aDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGRlc2NlbmRzRnJvbShmaWxlUGF0aDogc3RyaW5nLCBwcm9qZWN0UGF0aDogc3RyaW5nKSB7XG4gIGlmICh0eXBlb2YgZmlsZVBhdGggIT09ICdzdHJpbmcnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBmaWxlUGF0aC5zdGFydHNXaXRoKFxuICAgIHByb2plY3RQYXRoLmVuZHNXaXRoKFBhdGguc2VwKSA/IHByb2plY3RQYXRoIDogYCR7cHJvamVjdFBhdGh9JHtQYXRoLnNlcH1gXG4gICk7XG59XG5cbmZ1bmN0aW9uIG1hdGNoZXNJZ25vcmVkTmFtZXMoZmlsZVBhdGg6IHN0cmluZywgaWdub3JlZE5hbWVzOiBNaW5pbWF0Y2hbXSkge1xuICByZXR1cm4gaWdub3JlZE5hbWVzLnNvbWUoaWcgPT4gaWcubWF0Y2goZmlsZVBhdGgpKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVzdWx0c1ZpZXcge1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwcml2YXRlIHJlc3VsdHM6IFJlZmVyZW5jZVtdIHwgbnVsbDtcbiAgcHJpdmF0ZSBpZ25vcmVkTmFtZU1hdGNoZXJzOiBNaW5pbWF0Y2hbXSB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgcHJldmlld1N0eWxlOiB7IGZvbnRGYW1pbHk6IHN0cmluZyB9ID0geyBmb250RmFtaWx5OiAnJyB9O1xuXG4gIGNvbnN0cnVjdG9yKHJlc3VsdHM6IFJlZmVyZW5jZVtdKSB7XG4gICAgdGhpcy5yZXN1bHRzID0gcmVzdWx0cztcblxuICAgIGV0Y2guaW5pdGlhbGl6ZSh0aGlzKTtcblxuICAgIGxldCByZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcih0aGlzLmludmFsaWRhdGVJdGVtSGVpZ2h0cy5iaW5kKHRoaXMpKTtcbiAgICByZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMuZWxlbWVudCk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnZWRpdG9yLmZvbnRGYW1pbHknLCB0aGlzLmZvbnRGYW1pbHlDaGFuZ2VkLmJpbmQodGhpcykpLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnY29yZS5pZ25vcmVkTmFtZXMnLCB0aGlzLmlnbm9yZWROYW1lc0NoYW5nZWQuYmluZCh0aGlzKSlcbiAgICApO1xuXG4gICAgYXRvbS5jb21tYW5kcy5hZGQoXG4gICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICB7XG4gICAgICAgICdjb3JlOm1vdmUtdXAnOiB0aGlzLm1vdmVVcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTptb3ZlLWRvd24nOiB0aGlzLm1vdmVEb3duLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtbGVmdCc6IHRoaXMuY29sbGFwc2VSZXN1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS1yaWdodCc6IHRoaXMuZXhwYW5kUmVzdWx0LmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOnBhZ2UtdXAnOiB0aGlzLnBhZ2VVcC5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpwYWdlLWRvd24nOiB0aGlzLnBhZ2VEb3duLmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOm1vdmUtdG8tdG9wJzogdGhpcy5tb3ZlVG9Ub3AuYmluZCh0aGlzKSxcbiAgICAgICAgJ2NvcmU6bW92ZS10by1ib3R0b20nOiB0aGlzLm1vdmVUb0JvdHRvbS5iaW5kKHRoaXMpLFxuICAgICAgICAnY29yZTpjb25maXJtJzogdGhpcy5jb25maXJtUmVzdWx0LmJpbmQodGhpcyksXG4gICAgICAgICdjb3JlOmNvcHknOiB0aGlzLmNvcHlSZXN1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgJ2ZpbmQtYW5kLXJlcGxhY2U6Y29weS1wYXRoJzogdGhpcy5jb3B5UGF0aC5iaW5kKHRoaXMpLFxuICAgICAgICAnZmluZC1hbmQtcmVwbGFjZTpvcGVuLWluLW5ldy10YWInOiB0aGlzLm9wZW5Jbk5ld1RhYi5iaW5kKHRoaXMpLFxuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBtb3ZlVXAoKSB7XG5cbiAgfVxuXG4gIG1vdmVEb3duKCkge1xuXG4gIH1cblxuICBjb2xsYXBzZVJlc3VsdCgpIHtcblxuICB9XG5cbiAgZXhwYW5kUmVzdWx0KCkge1xuXG4gIH1cblxuICBwYWdlVXAoKSB7XG5cbiAgfVxuXG4gIHBhZ2VEb3duKCkge1xuXG4gIH1cblxuICBtb3ZlVG9Ub3AoKSB7XG5cbiAgfVxuXG4gIG1vdmVUb0JvdHRvbSgpIHtcblxuICB9XG5cbiAgY29uZmlybVJlc3VsdCgpIHtcblxuICB9XG5cbiAgY29weVJlc3VsdCgpIHtcblxuICB9XG5cbiAgY29weVBhdGgoKSB7XG5cbiAgfVxuXG4gIG9wZW5Jbk5ld1RhYigpIHtcblxuICB9XG5cbiAgdXBkYXRlKCkge1xuXG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gIH1cblxuICBnZXRSb3dIZWlnaHQoKSB7XG5cbiAgfVxuXG4gIGZvbnRGYW1pbHlDaGFuZ2VkKGZvbnRGYW1pbHk6IHN0cmluZykge1xuICAgIHRoaXMucHJldmlld1N0eWxlID0geyBmb250RmFtaWx5IH07XG4gICAgZXRjaC51cGRhdGUodGhpcyk7XG4gIH1cblxuICBpZ25vcmVkTmFtZXNDaGFuZ2VkKGlnbm9yZWROYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmlnbm9yZWROYW1lTWF0Y2hlcnMgPSBpZ25vcmVkTmFtZXMubWFwKGlnID0+IG5ldyBNaW5pbWF0Y2goaWcpKTtcbiAgfVxuXG4gIGludmFsaWRhdGVJdGVtSGVpZ2h0cygpIHtcblxuICB9XG5cbiAgaGFuZGxlQ2xpY2soKSB7XG5cbiAgfVxuXG4gIGZpbHRlckFuZEdyb3VwUmVmZXJlbmNlcygpOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2VbXT4ge1xuICAgIGxldCBwYXRocyA9IGF0b20ucHJvamVjdC5nZXRQYXRocygpO1xuICAgIGxldCByZXN1bHRzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZVtdPigpO1xuICAgIGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gcmVzdWx0cztcblxuICAgIGZvciAobGV0IHJlZmVyZW5jZSBvZiB0aGlzLnJlc3VsdHMpIHtcbiAgICAgIGxldCB7IHVyaSB9ID0gcmVmZXJlbmNlO1xuICAgICAgbGV0IHByb2plY3RQYXRoID0gZGVzY2VuZHNGcm9tQW55KHVyaSwgcGF0aHMpO1xuICAgICAgaWYgKHByb2plY3RQYXRoID09PSBmYWxzZSkgY29udGludWU7XG4gICAgICBpZiAobWF0Y2hlc0lnbm9yZWROYW1lcyh1cmksIHRoaXMuaWdub3JlZE5hbWVNYXRjaGVycyA/PyBbXSkpIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgW18sIHJlbGF0aXZlUGF0aF0gPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZVBhdGgodXJpKTtcbiAgICAgIGxldCByZXN1bHRzRm9yUGF0aCA9IHJlc3VsdHMuZ2V0KHJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc3VsdHNGb3JQYXRoKSB7XG4gICAgICAgIHJlc3VsdHNGb3JQYXRoID0gW107XG4gICAgICAgIHJlc3VsdHMuc2V0KHJlbGF0aXZlUGF0aCwgcmVzdWx0c0ZvclBhdGgpO1xuICAgICAgfVxuICAgICAgcmVzdWx0c0ZvclBhdGgucHVzaChyZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIGxldCBjb250YWluZXJTdHlsZSA9IHtcbiAgICAgIHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICBsZWZ0OiAnMCcsXG4gICAgICB0b3A6ICcwJyxcbiAgICAgIHJpZ2h0OiAnMCdcbiAgICB9O1xuXG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVzdWx0cy12aWV3IGZvY3VzYWJsZS1wYW5lbFwiIHRhYkluZGV4PXstMX0gc3R5bGU9e3RoaXMucHJldmlld1N0eWxlfT5cbiAgICAgICAgPG9sXG4gICAgICAgICAgY2xhc3NOYW1lPVwibGlzdC10cmVlIGhhcy1jb2xsYXBzaWJsZS1jaGlsZHJlblwiXG4gICAgICAgICAgc3R5bGU9e2NvbnRhaW5lclN0eWxlfVxuICAgICAgICA+XG4gICAgICAgIDwvb2w+XG5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cbn1cbiJdfQ==