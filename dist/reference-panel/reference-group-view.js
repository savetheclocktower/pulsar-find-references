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
        let { relativePath, references, navigationIndex, activeNavigationIndex = -1, isCollapsed = false, indexToReferenceMap, bufferCache } = props;
        console.debug('ReferenceGroupView constructor:', props);
        this.relativePath = relativePath;
        this.references = references;
        this.isCollapsed = isCollapsed;
        this.navigationIndex = navigationIndex;
        this.activeNavigationIndex = activeNavigationIndex;
        this.indexToReferenceMap = indexToReferenceMap;
        this.bufferCache = bufferCache;
        etch_1.default.initialize(this);
        this.iconServices.updateIcon(this, this.relativePath);
    }
    get iconServices() {
        return (0, get_icon_services_1.default)();
    }
    update({ relativePath, references, navigationIndex, activeNavigationIndex = -1, isCollapsed = false, indexToReferenceMap, bufferCache }) {
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
            if (this.bufferCache !== bufferCache) {
                this.bufferCache = bufferCache;
                changed = true;
            }
            if (this.indexToReferenceMap !== indexToReferenceMap) {
                this.indexToReferenceMap = indexToReferenceMap;
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
            activeNavigationIndex: this.activeNavigationIndex,
            indexToReferenceMap: this.indexToReferenceMap,
            bufferCache: this.bufferCache
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
            this.indexToReferenceMap.set(currentNavigationIndex, ref);
            return (etch_1.default.dom(reference_row_view_1.default, { reference: ref, relativePath: this.relativePath, isSelected: currentNavigationIndex === this.activeNavigationIndex, navigationIndex: currentNavigationIndex, bufferCache: this.bufferCache, activeNavigationIndex: this.activeNavigationIndex }));
        });
        let listClassNames = (0, classnames_1.default)('list-tree', {
            'hidden': this.isCollapsed
        });
        return (etch_1.default.dom("li", { className: classNames },
            etch_1.default.dom("div", { className: "list-item path-row", dataset: { filePath: this.relativePath, navigationIndex: String(this.navigationIndex) } },
                etch_1.default.dom("span", { ref: "icon", className: "icon", dataset: { name: path_1.default.basename(this.relativePath) } }),
                etch_1.default.dom("span", { className: "path-name bright" }, this.relativePath),
                etch_1.default.dom("span", { ref: "description", className: "path-match-number" }, matchText)),
            etch_1.default.dom("ul", { className: listClassNames }, referenceRows)));
    }
}
exports.default = ReferenceGroupView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLWdyb3VwLXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvcmVmZXJlbmNlLXBhbmVsL3JlZmVyZW5jZS1ncm91cC12aWV3LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBRXhCLDREQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsOEVBQW9EO0FBQ3BELDZFQUFtRDtBQUNuRCxvREFBc0M7QUFhdEMsTUFBcUIsa0JBQWtCO0lBY3JDLFlBQVksS0FBbUM7UUFDN0MsSUFBSSxFQUNGLFlBQVksRUFDWixVQUFVLEVBQ1YsZUFBZSxFQUNmLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxFQUMxQixXQUFXLEdBQUcsS0FBSyxFQUNuQixtQkFBbUIsRUFDbkIsV0FBVyxFQUNaLEdBQUcsS0FBSyxDQUFDO1FBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLENBQUM7UUFDbkQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO1FBQy9DLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBRS9CLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2QsT0FBTyxJQUFBLDJC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QUNGLDZCQUFNLFNBQVMsRUFBQyxrQkFBa0IsSUFBRSxJQUFJLENBQUMsWUFBWSxDQUFRO2dCQUM3RCw2QkFBTSxHQUFHLEVBQUMsYUFBYSxFQUFDLFNBQVMsRUFBQyxtQkFBbUIsSUFBRSxTQUFTLENBQVEsQ0FDcEU7WUFDTiwyQkFBSSxTQUFTLEVBQUUsY0FBYyxJQUFHLGFBQWEsQ0FBTSxDQUNoRCxDQUNOLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFuSkQscUNBbUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV0Y2ggZnJvbSAnZXRjaCc7XG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IGN4IGZyb20gJ2NsYXNzbmFtZXMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgUmVmZXJlbmNlUm93VmlldyBmcm9tICcuL3JlZmVyZW5jZS1yb3ctdmlldyc7XG5pbXBvcnQgZ2V0SWNvblNlcnZpY2VzIGZyb20gJy4uL2dldC1pY29uLXNlcnZpY2VzJztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi4vY29uc29sZSc7XG5pbXBvcnQgeyBUZXh0QnVmZmVyIH0gZnJvbSAnYXRvbSc7XG5cbnR5cGUgUmVmZXJlbmNlR3JvdXBWaWV3UHJvcGVydGllcyA9IHtcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gIHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdLFxuICBuYXZpZ2F0aW9uSW5kZXg6IG51bWJlcixcbiAgYWN0aXZlTmF2aWdhdGlvbkluZGV4PzogbnVtYmVyLFxuICBpc0NvbGxhcHNlZD86IGJvb2xlYW4sXG4gIGluZGV4VG9SZWZlcmVuY2VNYXA6IE1hcDxudW1iZXIsIFJlZmVyZW5jZT5cbiAgYnVmZmVyQ2FjaGU6IE1hcDxzdHJpbmcsIFRleHRCdWZmZXI+XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VHcm91cFZpZXcge1xuICBwdWJsaWMgcmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIHB1YmxpYyByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXTtcbiAgcHVibGljIGlzQ29sbGFwc2VkOiBib29sZWFuO1xuXG4gIHByb3RlY3RlZCBuYXZpZ2F0aW9uSW5kZXg6IG51bWJlcjtcbiAgcHJvdGVjdGVkIGFjdGl2ZU5hdmlnYXRpb25JbmRleDogbnVtYmVyO1xuXG4gIHB1YmxpYyBlbGVtZW50ITogSFRNTEVsZW1lbnQ7XG4gIHB1YmxpYyByZWZzITogeyBba2V5OiBzdHJpbmddOiBIVE1MRWxlbWVudCB9O1xuXG4gIHByaXZhdGUgYnVmZmVyQ2FjaGU6IE1hcDxzdHJpbmcsIFRleHRCdWZmZXI+O1xuICBwcml2YXRlIGluZGV4VG9SZWZlcmVuY2VNYXA6IE1hcDxudW1iZXIsIFJlZmVyZW5jZT47XG5cbiAgY29uc3RydWN0b3IocHJvcHM6IFJlZmVyZW5jZUdyb3VwVmlld1Byb3BlcnRpZXMpIHtcbiAgICBsZXQge1xuICAgICAgcmVsYXRpdmVQYXRoLFxuICAgICAgcmVmZXJlbmNlcyxcbiAgICAgIG5hdmlnYXRpb25JbmRleCxcbiAgICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IC0xLFxuICAgICAgaXNDb2xsYXBzZWQgPSBmYWxzZSxcbiAgICAgIGluZGV4VG9SZWZlcmVuY2VNYXAsXG4gICAgICBidWZmZXJDYWNoZVxuICAgIH0gPSBwcm9wcztcbiAgICBjb25zb2xlLmRlYnVnKCdSZWZlcmVuY2VHcm91cFZpZXcgY29uc3RydWN0b3I6JywgcHJvcHMpO1xuICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgdGhpcy5pc0NvbGxhcHNlZCA9IGlzQ29sbGFwc2VkO1xuICAgIHRoaXMubmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4O1xuICAgIHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4ID0gYWN0aXZlTmF2aWdhdGlvbkluZGV4O1xuICAgIHRoaXMuaW5kZXhUb1JlZmVyZW5jZU1hcCA9IGluZGV4VG9SZWZlcmVuY2VNYXA7XG4gICAgdGhpcy5idWZmZXJDYWNoZSA9IGJ1ZmZlckNhY2hlO1xuXG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpO1xuICAgIHRoaXMuaWNvblNlcnZpY2VzLnVwZGF0ZUljb24odGhpcywgdGhpcy5yZWxhdGl2ZVBhdGgpO1xuICB9XG5cbiAgZ2V0IGljb25TZXJ2aWNlcygpIHtcbiAgICByZXR1cm4gZ2V0SWNvblNlcnZpY2VzKCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoe1xuICAgIHJlbGF0aXZlUGF0aCxcbiAgICByZWZlcmVuY2VzLFxuICAgIG5hdmlnYXRpb25JbmRleCxcbiAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAtMSxcbiAgICBpc0NvbGxhcHNlZCA9IGZhbHNlLFxuICAgIGluZGV4VG9SZWZlcmVuY2VNYXAsXG4gICAgYnVmZmVyQ2FjaGVcbiAgfTogUmVmZXJlbmNlR3JvdXBWaWV3UHJvcGVydGllcykge1xuICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucmVsYXRpdmVQYXRoICE9PSByZWxhdGl2ZVBhdGgpIHtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLnJlZmVyZW5jZXMgIT09IHJlZmVyZW5jZXMpIHtcbiAgICAgIHRoaXMucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNDb2xsYXBzZWQgIT09IGlzQ29sbGFwc2VkKSB7XG4gICAgICB0aGlzLmlzQ29sbGFwc2VkID0gaXNDb2xsYXBzZWQ7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMubmF2aWdhdGlvbkluZGV4ICE9PSBuYXZpZ2F0aW9uSW5kZXgpIHtcbiAgICAgIHRoaXMubmF2aWdhdGlvbkluZGV4ID0gbmF2aWdhdGlvbkluZGV4O1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCAhPT0gYWN0aXZlTmF2aWdhdGlvbkluZGV4KSB7XG4gICAgICB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IGFjdGl2ZU5hdmlnYXRpb25JbmRleDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5idWZmZXJDYWNoZSAhPT0gYnVmZmVyQ2FjaGUpIHtcbiAgICAgIHRoaXMuYnVmZmVyQ2FjaGUgPSBidWZmZXJDYWNoZTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5pbmRleFRvUmVmZXJlbmNlTWFwICE9PSBpbmRleFRvUmVmZXJlbmNlTWFwKSB7XG4gICAgICB0aGlzLmluZGV4VG9SZWZlcmVuY2VNYXAgPSBpbmRleFRvUmVmZXJlbmNlTWFwO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VkID8gZXRjaC51cGRhdGUodGhpcykgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIHdyaXRlQWZ0ZXJVcGRhdGUoKSB7XG4gICAgdGhpcy5pY29uU2VydmljZXMudXBkYXRlSWNvbih0aGlzLCB0aGlzLnJlbGF0aXZlUGF0aCk7XG4gIH1cblxuICBnZXQgcHJvcHMoKTogUmVmZXJlbmNlR3JvdXBWaWV3UHJvcGVydGllcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlbGF0aXZlUGF0aDogdGhpcy5yZWxhdGl2ZVBhdGggPz8gJycsXG4gICAgICByZWZlcmVuY2VzOiB0aGlzLnJlZmVyZW5jZXMsXG4gICAgICBpc0NvbGxhcHNlZDogdGhpcy5pc0NvbGxhcHNlZCxcbiAgICAgIG5hdmlnYXRpb25JbmRleDogdGhpcy5uYXZpZ2F0aW9uSW5kZXgsXG4gICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4LFxuICAgICAgaW5kZXhUb1JlZmVyZW5jZU1hcDogdGhpcy5pbmRleFRvUmVmZXJlbmNlTWFwLFxuICAgICAgYnVmZmVyQ2FjaGU6IHRoaXMuYnVmZmVyQ2FjaGVcbiAgICB9O1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdSZWZlcmVuY2VHcm91cFZpZXcgcmVuZGVyOicsIHRoaXMucmVmZXJlbmNlcyk7XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBjeChcbiAgICAgICdsaXN0LW5lc3RlZC1pdGVtJyxcbiAgICAgIHtcbiAgICAgICAgJ3NlbGVjdGVkJzogdGhpcy5uYXZpZ2F0aW9uSW5kZXggPT09IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4LFxuICAgICAgICAnY29sbGFwc2VkJzogdGhpcy5pc0NvbGxhcHNlZFxuICAgICAgfVxuICAgICk7XG4gICAgbGV0IG1hdGNoQ291bnQgPSB0aGlzLnJlZmVyZW5jZXMubGVuZ3RoO1xuICAgIGxldCBtYXRjaFRleHQgPSBgKCR7bWF0Y2hDb3VudH0gbWF0Y2gke21hdGNoQ291bnQgPT09IDEgPyAnJyA6ICdlcyd9KWA7XG5cbiAgICBsZXQgcmVmZXJlbmNlUm93cyA9IHRoaXMucmVmZXJlbmNlcy5tYXAoKHJlZiwgaSkgPT4ge1xuICAgICAgbGV0IGN1cnJlbnROYXZpZ2F0aW9uSW5kZXggPSB0aGlzLm5hdmlnYXRpb25JbmRleCArIGkgKyAxO1xuICAgICAgdGhpcy5pbmRleFRvUmVmZXJlbmNlTWFwLnNldChjdXJyZW50TmF2aWdhdGlvbkluZGV4LCByZWYpO1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgPFJlZmVyZW5jZVJvd1ZpZXdcbiAgICAgICAgICByZWZlcmVuY2U9e3JlZn1cbiAgICAgICAgICByZWxhdGl2ZVBhdGg9e3RoaXMucmVsYXRpdmVQYXRofVxuICAgICAgICAgIGlzU2VsZWN0ZWQ9e2N1cnJlbnROYXZpZ2F0aW9uSW5kZXggPT09IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAgIG5hdmlnYXRpb25JbmRleD17Y3VycmVudE5hdmlnYXRpb25JbmRleH1cbiAgICAgICAgICBidWZmZXJDYWNoZT17dGhpcy5idWZmZXJDYWNoZX1cbiAgICAgICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg9e3RoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4fVxuICAgICAgICAvPlxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGxldCBsaXN0Q2xhc3NOYW1lcyA9IGN4KCdsaXN0LXRyZWUnLCB7XG4gICAgICAnaGlkZGVuJzogdGhpcy5pc0NvbGxhcHNlZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIDxsaSBjbGFzc05hbWU9e2NsYXNzTmFtZXN9PlxuICAgICAgICA8ZGl2XG4gICAgICAgICAgY2xhc3NOYW1lPVwibGlzdC1pdGVtIHBhdGgtcm93XCJcbiAgICAgICAgICBkYXRhc2V0PXt7IGZpbGVQYXRoOiB0aGlzLnJlbGF0aXZlUGF0aCwgbmF2aWdhdGlvbkluZGV4OiBTdHJpbmcodGhpcy5uYXZpZ2F0aW9uSW5kZXgpIH19XG4gICAgICAgID5cbiAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgcmVmPVwiaWNvblwiXG4gICAgICAgICAgICBjbGFzc05hbWU9XCJpY29uXCJcbiAgICAgICAgICAgIGRhdGFzZXQ9e3sgbmFtZTogUGF0aC5iYXNlbmFtZSh0aGlzLnJlbGF0aXZlUGF0aCkgfX1cbiAgICAgICAgICAvPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInBhdGgtbmFtZSBicmlnaHRcIj57dGhpcy5yZWxhdGl2ZVBhdGh9PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIHJlZj1cImRlc2NyaXB0aW9uXCIgY2xhc3NOYW1lPVwicGF0aC1tYXRjaC1udW1iZXJcIj57bWF0Y2hUZXh0fTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDx1bCBjbGFzc05hbWU9e2xpc3RDbGFzc05hbWVzfT57cmVmZXJlbmNlUm93c308L3VsPlxuICAgICAgPC9saT5cbiAgICApO1xuICB9XG59XG4iXX0=