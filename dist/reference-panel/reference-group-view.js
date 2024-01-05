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
const etch_1 = __importDefault(require("etch"));
const classnames_1 = __importDefault(require("classnames"));
const path_1 = __importDefault(require("path"));
const reference_row_view_1 = __importDefault(require("./reference-row-view"));
const get_icon_services_1 = __importDefault(require("../get-icon-services"));
const console = __importStar(require("../console"));
class ReferenceGroupView {
    constructor(props) {
        let { relativePath, references, navigationIndex, activeNavigationIndex = -1, isCollapsed = false } = props;
        console.debug('ReferenceGroupView constructor:', props);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLWdyb3VwLXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvcmVmZXJlbmNlLXBhbmVsL3JlZmVyZW5jZS1ncm91cC12aWV3LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBRXhCLDREQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsOEVBQW9EO0FBQ3BELDZFQUFtRDtBQUNuRCxvREFBc0M7QUFVdEMsTUFBcUIsa0JBQWtCO0lBV3JDLFlBQVksS0FBbUM7UUFDN0MsSUFBSSxFQUNGLFlBQVksRUFDWixVQUFVLEVBQ1YsZUFBZSxFQUNmLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxFQUMxQixXQUFXLEdBQUcsS0FBSyxFQUNwQixHQUFHLEtBQUssQ0FBQztRQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7UUFDdkMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO1FBRW5ELGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2QsT0FBTyxJQUFBLDJCQUFlLEdBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUssTUFBTSxDQUFDLEVBQ1gsWUFBWSxFQUNaLFVBQVUsRUFDVixlQUFlLEVBQ2YscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLEVB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SUFBQSxvQkFBRSxFQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUVyRSxPQUFPLENBQ0wsMkJBQUksU0FBUyxFQUFFLFVBQVU7WUFDdkIsNEJBQ0UsU0FBUyxFQUFDLG9CQUFvQixFQUM5QixPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFFdkYsNkJBQ0UsR0FBRyxFQUFDLE1BQU0sRUFDVixTQUFTLEVBQUMsTUFBTSxFQUNoQixPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsR0FDbkQ7Z0JBQ0YsNkJBQU0sU0FBUyxFQUFDLGtCQUFrQixJQUFFLElBQUksQ0FBQyxZQUFZLENBQVE7Z0JBQzdELDZCQUFNLEdBQUcsRUFBQyxhQUFhLEVBQUMsU0FBUyxFQUFDLG1CQUFtQixJQUFFLFNBQVMsQ0FBUSxDQUNwRTtZQUNOLDJCQUFJLFNBQVMsRUFBRSxjQUFjLElBQUcsYUFBYSxDQUFNLENBQ2hELENBQ04sQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTVIRCxxQ0E0SEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXRjaCBmcm9tICdldGNoJztcbmltcG9ydCB0eXBlIHsgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5pbXBvcnQgY3ggZnJvbSAnY2xhc3NuYW1lcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBSZWZlcmVuY2VSb3dWaWV3IGZyb20gJy4vcmVmZXJlbmNlLXJvdy12aWV3JztcbmltcG9ydCBnZXRJY29uU2VydmljZXMgZnJvbSAnLi4vZ2V0LWljb24tc2VydmljZXMnO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuLi9jb25zb2xlJztcblxudHlwZSBSZWZlcmVuY2VHcm91cFZpZXdQcm9wZXJ0aWVzID0ge1xuICByZWxhdGl2ZVBhdGg6IHN0cmluZyxcbiAgcmVmZXJlbmNlczogUmVmZXJlbmNlW10sXG4gIG5hdmlnYXRpb25JbmRleDogbnVtYmVyLFxuICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg/OiBudW1iZXIsXG4gIGlzQ29sbGFwc2VkPzogYm9vbGVhblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVmZXJlbmNlR3JvdXBWaWV3IHtcbiAgcHVibGljIHJlbGF0aXZlUGF0aDogc3RyaW5nO1xuICBwdWJsaWMgcmVmZXJlbmNlczogUmVmZXJlbmNlW107XG4gIHB1YmxpYyBpc0NvbGxhcHNlZDogYm9vbGVhbjtcblxuICBwcm90ZWN0ZWQgbmF2aWdhdGlvbkluZGV4OiBudW1iZXI7XG4gIHByb3RlY3RlZCBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IG51bWJlcjtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcblxuICBjb25zdHJ1Y3Rvcihwcm9wczogUmVmZXJlbmNlR3JvdXBWaWV3UHJvcGVydGllcykge1xuICAgIGxldCB7XG4gICAgICByZWxhdGl2ZVBhdGgsXG4gICAgICByZWZlcmVuY2VzLFxuICAgICAgbmF2aWdhdGlvbkluZGV4LFxuICAgICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gLTEsXG4gICAgICBpc0NvbGxhcHNlZCA9IGZhbHNlXG4gICAgfSA9IHByb3BzO1xuICAgIGNvbnNvbGUuZGVidWcoJ1JlZmVyZW5jZUdyb3VwVmlldyBjb25zdHJ1Y3RvcjonLCBwcm9wcyk7XG4gICAgdGhpcy5yZWxhdGl2ZVBhdGggPSByZWxhdGl2ZVBhdGg7XG4gICAgdGhpcy5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcztcbiAgICB0aGlzLmlzQ29sbGFwc2VkID0gaXNDb2xsYXBzZWQ7XG4gICAgdGhpcy5uYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG5cbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG4gICAgdGhpcy5pY29uU2VydmljZXMudXBkYXRlSWNvbih0aGlzLCB0aGlzLnJlbGF0aXZlUGF0aCk7XG4gIH1cblxuICBnZXQgaWNvblNlcnZpY2VzKCkge1xuICAgIHJldHVybiBnZXRJY29uU2VydmljZXMoKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZSh7XG4gICAgcmVsYXRpdmVQYXRoLFxuICAgIHJlZmVyZW5jZXMsXG4gICAgbmF2aWdhdGlvbkluZGV4LFxuICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IC0xLFxuICAgIGlzQ29sbGFwc2VkID0gZmFsc2VcbiAgfTogUmVmZXJlbmNlR3JvdXBWaWV3UHJvcGVydGllcykge1xuICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucmVsYXRpdmVQYXRoICE9PSByZWxhdGl2ZVBhdGgpIHtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLnJlZmVyZW5jZXMgIT09IHJlZmVyZW5jZXMpIHtcbiAgICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNDb2xsYXBzZWQgIT09IGlzQ29sbGFwc2VkKSB7XG4gICAgICB0aGlzLmlzQ29sbGFwc2VkID0gaXNDb2xsYXBzZWQ7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMubmF2aWdhdGlvbkluZGV4ICE9PSBuYXZpZ2F0aW9uSW5kZXgpIHtcbiAgICAgIHRoaXMubmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4O1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCAhPT0gYWN0aXZlTmF2aWdhdGlvbkluZGV4KSB7XG4gICAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGFjdGl2ZU5hdmlnYXRpb25JbmRleDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlZCA/IGV0Y2gudXBkYXRlKHRoaXMpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICB3cml0ZUFmdGVyVXBkYXRlKCkge1xuICAgIHRoaXMuaWNvblNlcnZpY2VzLnVwZGF0ZUljb24odGhpcywgdGhpcy5yZWxhdGl2ZVBhdGgpO1xuICB9XG5cbiAgZ2V0IHByb3BzKCk6IFJlZmVyZW5jZUdyb3VwVmlld1Byb3BlcnRpZXMge1xuICAgIHJldHVybiB7XG4gICAgICByZWxhdGl2ZVBhdGg6IHRoaXMucmVsYXRpdmVQYXRoID8/ICcnLFxuICAgICAgcmVmZXJlbmNlczogdGhpcy5yZWZlcmVuY2VzLFxuICAgICAgaXNDb2xsYXBzZWQ6IHRoaXMuaXNDb2xsYXBzZWQsXG4gICAgICBuYXZpZ2F0aW9uSW5kZXg6IHRoaXMubmF2aWdhdGlvbkluZGV4LFxuICAgICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4OiB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleFxuICAgIH07XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ1JlZmVyZW5jZUdyb3VwVmlldyByZW5kZXI6JywgdGhpcy5yZWZlcmVuY2VzKTtcbiAgICBsZXQgY2xhc3NOYW1lcyA9IGN4KFxuICAgICAgJ2xpc3QtbmVzdGVkLWl0ZW0nLFxuICAgICAge1xuICAgICAgICAnc2VsZWN0ZWQnOiB0aGlzLm5hdmlnYXRpb25JbmRleCA9PT0gdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXgsXG4gICAgICAgICdjb2xsYXBzZWQnOiB0aGlzLmlzQ29sbGFwc2VkXG4gICAgICB9XG4gICAgKTtcbiAgICBsZXQgbWF0Y2hDb3VudCA9IHRoaXMucmVmZXJlbmNlcy5sZW5ndGg7XG4gICAgbGV0IG1hdGNoVGV4dCA9IGAoJHttYXRjaENvdW50fSBtYXRjaCR7bWF0Y2hDb3VudCA9PT0gMSA/ICcnIDogJ2VzJ30pYDtcblxuICAgIGxldCByZWZlcmVuY2VSb3dzID0gdGhpcy5yZWZlcmVuY2VzLm1hcCgocmVmLCBpKSA9PiB7XG4gICAgICBsZXQgY3VycmVudE5hdmlnYXRpb25JbmRleCA9IHRoaXMubmF2aWdhdGlvbkluZGV4ICsgaSArIDE7XG4gICAgICByZXR1cm4gKFxuICAgICAgICA8UmVmZXJlbmNlUm93Vmlld1xuICAgICAgICAgIHJlZmVyZW5jZT17cmVmfVxuICAgICAgICAgIHJlbGF0aXZlUGF0aD17dGhpcy5yZWxhdGl2ZVBhdGh9XG4gICAgICAgICAgaXNTZWxlY3RlZD17Y3VycmVudE5hdmlnYXRpb25JbmRleCA9PT0gdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXh9XG4gICAgICAgICAgbmF2aWdhdGlvbkluZGV4PXtjdXJyZW50TmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleD17dGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXh9XG4gICAgICAgIC8+XG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgbGV0IGxpc3RDbGFzc05hbWVzID0gY3goJ2xpc3QtdHJlZScsIHsgJ2hpZGRlbic6IHRoaXMuaXNDb2xsYXBzZWQgfSk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGxpIGNsYXNzTmFtZT17Y2xhc3NOYW1lc30+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9XCJsaXN0LWl0ZW0gcGF0aC1yb3dcIlxuICAgICAgICAgIGRhdGFzZXQ9e3sgZmlsZVBhdGg6IHRoaXMucmVsYXRpdmVQYXRoLCBuYXZpZ2F0aW9uSW5kZXg6IFN0cmluZyh0aGlzLm5hdmlnYXRpb25JbmRleCkgfX1cbiAgICAgICAgPlxuICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICByZWY9XCJpY29uXCJcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImljb25cIlxuICAgICAgICAgICAgZGF0YXNldD17eyBuYW1lOiBQYXRoLmJhc2VuYW1lKHRoaXMucmVsYXRpdmVQYXRoKSB9fVxuICAgICAgICAgIC8+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicGF0aC1uYW1lIGJyaWdodFwiPnt0aGlzLnJlbGF0aXZlUGF0aH08L3NwYW4+XG4gICAgICAgICAgPHNwYW4gcmVmPVwiZGVzY3JpcHRpb25cIiBjbGFzc05hbWU9XCJwYXRoLW1hdGNoLW51bWJlclwiPnttYXRjaFRleHR9PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHVsIGNsYXNzTmFtZT17bGlzdENsYXNzTmFtZXN9PntyZWZlcmVuY2VSb3dzfTwvdWw+XG4gICAgICA8L2xpPlxuICAgICk7XG4gIH1cbn1cbiJdfQ==