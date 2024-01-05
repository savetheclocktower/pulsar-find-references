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
const etch_1 = __importDefault(require("etch"));
const classnames_1 = __importDefault(require("classnames"));
const path_1 = __importDefault(require("path"));
const reference_row_view_1 = __importDefault(require("./reference-row-view"));
const get_icon_services_1 = __importDefault(require("./get-icon-services"));
const console_1 = __importDefault(require("./console"));
class ReferenceGroupView {
    constructor({ relativePath, references, navigationIndex, activeNavigationIndex = -1, isCollapsed = false }) {
        console_1.default.log('ReferenceGroupView constructor:', relativePath, references);
        this.relativePath = relativePath;
        this.references = references;
        this.isCollapsed = isCollapsed;
        this.navigationIndex = navigationIndex;
        this.activeNavigationIndex = activeNavigationIndex;
        etch_1.default.initialize(this);
        this.iconServices.updateIcon(this, this.relativePath);
    }
    get iconServices() {
        return (0, get_icon_services_1.default)();
    }
    update({ relativePath, references, navigationIndex, activeNavigationIndex = -1, isCollapsed = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            let changed = false;
            if (this.relativePath !== relativePath) {
                this.relativePath = relativePath;
                changed = true;
            }
            if (this.references !== references) {
                this.references = references;
                changed = true;
            }
            if (this.isCollapsed !== isCollapsed) {
                this.isCollapsed = isCollapsed;
                changed = true;
            }
            if (this.navigationIndex !== navigationIndex) {
                this.navigationIndex = navigationIndex;
                changed = true;
            }
            if (this.activeNavigationIndex !== activeNavigationIndex) {
                this.activeNavigationIndex = activeNavigationIndex;
                changed = true;
            }
            return changed ? etch_1.default.update(this) : Promise.resolve();
        });
    }
    writeAfterUpdate() {
        this.iconServices.updateIcon(this, this.relativePath);
    }
    get props() {
        var _a;
        return {
            relativePath: (_a = this.relativePath) !== null && _a !== void 0 ? _a : '',
            references: this.references,
            isCollapsed: this.isCollapsed,
            navigationIndex: this.navigationIndex,
            activeNavigationIndex: this.activeNavigationIndex
        };
    }
    render() {
        // console.log('ReferenceGroupView render:', this.references);
        let classNames = (0, classnames_1.default)('list-nested-item', {
            'selected': this.navigationIndex === this.activeNavigationIndex,
            'collapsed': this.isCollapsed
        });
        let matchCount = this.references.length;
        let matchText = `(${matchCount} match${matchCount === 1 ? '' : 'es'})`;
        let referenceRows = this.references.map((ref, i) => {
            let currentNavigationIndex = this.navigationIndex + i + 1;
            return (etch_1.default.dom(reference_row_view_1.default, { reference: ref, relativePath: this.relativePath, isSelected: currentNavigationIndex === this.activeNavigationIndex, navigationIndex: currentNavigationIndex, activeNavigationIndex: this.activeNavigationIndex }));
        });
        let listClassNames = (0, classnames_1.default)('list-tree', { 'hidden': this.isCollapsed });
        return (etch_1.default.dom("li", { className: classNames },
            etch_1.default.dom("div", { className: "list-item path-row", dataset: { filePath: this.relativePath, navigationIndex: String(this.navigationIndex) } },
                etch_1.default.dom("span", { ref: "icon", className: "icon", dataset: { name: path_1.default.basename(this.relativePath) } }),
                etch_1.default.dom("span", { className: "path-name bright" }, this.relativePath),
                etch_1.default.dom("span", { ref: "description", className: "path-match-number" }, matchText)),
            etch_1.default.dom("ul", { className: listClassNames }, referenceRows)));
    }
}
exports.default = ReferenceGroupView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLWdyb3VwLXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcmVmZXJlbmNlLWdyb3VwLXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBRXhCLDREQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsOEVBQW9EO0FBQ3BELDRFQUFrRDtBQUNsRCx3REFBZ0M7QUFVaEMsTUFBcUIsa0JBQWtCO0lBV3JDLFlBQVksRUFDVixZQUFZLEVBQ1osVUFBVSxFQUNWLGVBQWUsRUFDZixxQkFBcUIsR0FBRyxDQUFDLENBQUMsRUFDMUIsV0FBVyxHQUFHLEtBQUssRUFDVTtRQUM3QixpQkFBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7UUFDdkMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO1FBRW5ELGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2QsT0FBTyxJQUFBLDJCQUFlLEdBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUssTUFBTSxDQUFDLEVBQ1gsWUFBWSxFQUNaLFVBQVUsRUFDVixlQUFlLEVBQ2YscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLEVBQzFCLFdBQVcsR0FBRyxLQUFLLEVBQ1U7O1lBQzdCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQixJ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QUMsQ0FBQztRQUVyRSxPQUFPLENBQ0wsMkJBQUksU0FBUyxFQUFFLFVBQVU7WUFDdkIsNEJBQ0UsU0FBUyxFQUFDLG9CQUFvQixFQUM5QixPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFFdkYsNkJBQ0UsR0FBRyxFQUFDLE1BQU0sRUFDVixTQUFTLEVBQUMsTUFBTSxFQUNoQixPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsR0FDbkQ7Z0JBQ0YsNkJBQU0sU0FBUyxFQUFDLGtCQUFrQixJQUFFLElBQUksQ0FBQyxZQUFZLENBQVE7Z0JBQzdELDZCQUFNLEdBQUcsRUFBQyxhQUFhLEVBQUMsU0FBUyxFQUFDLG1CQUFtQixJQUFFLFNBQVMsQ0FBUSxDQUNwRTtZQUNOLDJCQUFJLFNBQVMsRUFBRSxjQUFjLElBQUcsYUFBYSxDQUFNLENBQ2hELENBQ04sQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTNIRCxxQ0EySEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXRjaCBmcm9tICdldGNoJztcbmltcG9ydCB0eXBlIHsgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgY3ggZnJvbSAnY2xhc3NuYW1lcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBSZWZlcmVuY2VSb3dWaWV3IGZyb20gJy4vcmVmZXJlbmNlLXJvdy12aWV3JztcbmltcG9ydCBnZXRJY29uU2VydmljZXMgZnJvbSAnLi9nZXQtaWNvbi1zZXJ2aWNlcyc7XG5pbXBvcnQgY29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuXG50eXBlIFJlZmVyZW5jZUdyb3VwVmlld1Byb3BlcnRpZXMgPSB7XG4gIHJlbGF0aXZlUGF0aDogc3RyaW5nLFxuICByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSxcbiAgbmF2aWdhdGlvbkluZGV4OiBudW1iZXIsXG4gIGFjdGl2ZU5hdmlnYXRpb25JbmRleD86IG51bWJlcixcbiAgaXNDb2xsYXBzZWQ/OiBib29sZWFuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VHcm91cFZpZXcge1xuICBwdWJsaWMgcmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIHB1YmxpYyByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXTtcbiAgcHVibGljIGlzQ29sbGFwc2VkOiBib29sZWFuO1xuXG4gIHByb3RlY3RlZCBuYXZpZ2F0aW9uSW5kZXg6IG51bWJlcjtcbiAgcHJvdGVjdGVkIGFjdGl2ZU5hdmlnYXRpb25JbmRleDogbnVtYmVyO1xuXG4gIHB1YmxpYyBlbGVtZW50ITogSFRNTEVsZW1lbnQ7XG4gIHB1YmxpYyByZWZzITogeyBba2V5OiBzdHJpbmddOiBIVE1MRWxlbWVudCB9O1xuXG4gIGNvbnN0cnVjdG9yKHtcbiAgICByZWxhdGl2ZVBhdGgsXG4gICAgcmVmZXJlbmNlcyxcbiAgICBuYXZpZ2F0aW9uSW5kZXgsXG4gICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gLTEsXG4gICAgaXNDb2xsYXBzZWQgPSBmYWxzZVxuICB9OiBSZWZlcmVuY2VHcm91cFZpZXdQcm9wZXJ0aWVzKSB7XG4gICAgY29uc29sZS5sb2coJ1JlZmVyZW5jZUdyb3VwVmlldyBjb25zdHJ1Y3RvcjonLCByZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZXMpO1xuICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgdGhpcy5pc0NvbGxhcHNlZCA9IGlzQ29sbGFwc2VkO1xuICAgIHRoaXMubmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4O1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gYWN0aXZlTmF2aWdhdGlvbkluZGV4O1xuXG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpO1xuICAgIHRoaXMuaWNvblNlcnZpY2VzLnVwZGF0ZUljb24odGhpcywgdGhpcy5yZWxhdGl2ZVBhdGgpO1xuICB9XG5cbiAgZ2V0IGljb25TZXJ2aWNlcygpIHtcbiAgICByZXR1cm4gZ2V0SWNvblNlcnZpY2VzKCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoe1xuICAgIHJlbGF0aXZlUGF0aCxcbiAgICByZWZlcmVuY2VzLFxuICAgIG5hdmlnYXRpb25JbmRleCxcbiAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAtMSxcbiAgICBpc0NvbGxhcHNlZCA9IGZhbHNlXG4gIH06IFJlZmVyZW5jZUdyb3VwVmlld1Byb3BlcnRpZXMpIHtcbiAgICBsZXQgY2hhbmdlZCA9IGZhbHNlO1xuICAgIGlmICh0aGlzLnJlbGF0aXZlUGF0aCAhPT0gcmVsYXRpdmVQYXRoKSB7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlUGF0aDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5yZWZlcmVuY2VzICE9PSByZWZlcmVuY2VzKSB7XG4gICAgICB0aGlzLnJlZmVyZW5jZXMgPSByZWZlcmVuY2VzO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzQ29sbGFwc2VkICE9PSBpc0NvbGxhcHNlZCkge1xuICAgICAgdGhpcy5pc0NvbGxhcHNlZCA9IGlzQ29sbGFwc2VkO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLm5hdmlnYXRpb25JbmRleCAhPT0gbmF2aWdhdGlvbkluZGV4KSB7XG4gICAgICB0aGlzLm5hdmlnYXRpb25JbmRleCA9IG5hdmlnYXRpb25JbmRleDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggIT09IGFjdGl2ZU5hdmlnYXRpb25JbmRleCkge1xuICAgICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZWQgPyBldGNoLnVwZGF0ZSh0aGlzKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgd3JpdGVBZnRlclVwZGF0ZSgpIHtcbiAgICB0aGlzLmljb25TZXJ2aWNlcy51cGRhdGVJY29uKHRoaXMsIHRoaXMucmVsYXRpdmVQYXRoKTtcbiAgfVxuXG4gIGdldCBwcm9wcygpOiBSZWZlcmVuY2VHcm91cFZpZXdQcm9wZXJ0aWVzIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVsYXRpdmVQYXRoOiB0aGlzLnJlbGF0aXZlUGF0aCA/PyAnJyxcbiAgICAgIHJlZmVyZW5jZXM6IHRoaXMucmVmZXJlbmNlcyxcbiAgICAgIGlzQ29sbGFwc2VkOiB0aGlzLmlzQ29sbGFwc2VkLFxuICAgICAgbmF2aWdhdGlvbkluZGV4OiB0aGlzLm5hdmlnYXRpb25JbmRleCxcbiAgICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleDogdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXhcbiAgICB9O1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdSZWZlcmVuY2VHcm91cFZpZXcgcmVuZGVyOicsIHRoaXMucmVmZXJlbmNlcyk7XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBjeChcbiAgICAgICdsaXN0LW5lc3RlZC1pdGVtJyxcbiAgICAgIHtcbiAgICAgICAgJ3NlbGVjdGVkJzogdGhpcy5uYXZpZ2F0aW9uSW5kZXggPT09IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4LFxuICAgICAgICAnY29sbGFwc2VkJzogdGhpcy5pc0NvbGxhcHNlZFxuICAgICAgfVxuICAgICk7XG4gICAgbGV0IG1hdGNoQ291bnQgPSB0aGlzLnJlZmVyZW5jZXMubGVuZ3RoO1xuICAgIGxldCBtYXRjaFRleHQgPSBgKCR7bWF0Y2hDb3VudH0gbWF0Y2gke21hdGNoQ291bnQgPT09IDEgPyAnJyA6ICdlcyd9KWA7XG5cbiAgICBsZXQgcmVmZXJlbmNlUm93cyA9IHRoaXMucmVmZXJlbmNlcy5tYXAoKHJlZiwgaSkgPT4ge1xuICAgICAgbGV0IGN1cnJlbnROYXZpZ2F0aW9uSW5kZXggPSB0aGlzLm5hdmlnYXRpb25JbmRleCArIGkgKyAxO1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgPFJlZmVyZW5jZVJvd1ZpZXdcbiAgICAgICAgICByZWZlcmVuY2U9e3JlZn1cbiAgICAgICAgICByZWxhdGl2ZVBhdGg9e3RoaXMucmVsYXRpdmVQYXRofVxuICAgICAgICAgIGlzU2VsZWN0ZWQ9e2N1cnJlbnROYXZpZ2F0aW9uSW5kZXggPT09IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIG5hdmlnYXRpb25JbmRleD17Y3VycmVudE5hdmlnYXRpb25JbmRleH1cbiAgICAgICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg9e3RoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAvPlxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGxldCBsaXN0Q2xhc3NOYW1lcyA9IGN4KCdsaXN0LXRyZWUnLCB7ICdoaWRkZW4nOiB0aGlzLmlzQ29sbGFwc2VkIH0pO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIDxsaSBjbGFzc05hbWU9e2NsYXNzTmFtZXN9PlxuICAgICAgICA8ZGl2XG4gICAgICAgICAgY2xhc3NOYW1lPVwibGlzdC1pdGVtIHBhdGgtcm93XCJcbiAgICAgICAgICBkYXRhc2V0PXt7IGZpbGVQYXRoOiB0aGlzLnJlbGF0aXZlUGF0aCwgbmF2aWdhdGlvbkluZGV4OiBTdHJpbmcodGhpcy5uYXZpZ2F0aW9uSW5kZXgpIH19XG4gICAgICAgID5cbiAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgcmVmPVwiaWNvblwiXG4gICAgICAgICAgICBjbGFzc05hbWU9XCJpY29uXCJcbiAgICAgICAgICAgIGRhdGFzZXQ9e3sgbmFtZTogUGF0aC5iYXNlbmFtZSh0aGlzLnJlbGF0aXZlUGF0aCkgfX1cbiAgICAgICAgICAvPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInBhdGgtbmFtZSBicmlnaHRcIj57dGhpcy5yZWxhdGl2ZVBhdGh9PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIHJlZj1cImRlc2NyaXB0aW9uXCIgY2xhc3NOYW1lPVwicGF0aC1tYXRjaC1udW1iZXJcIj57bWF0Y2hUZXh0fTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDx1bCBjbGFzc05hbWU9e2xpc3RDbGFzc05hbWVzfT57cmVmZXJlbmNlUm93c308L3VsPlxuICAgICAgPC9saT5cbiAgICApO1xuICB9XG59XG4iXX0=