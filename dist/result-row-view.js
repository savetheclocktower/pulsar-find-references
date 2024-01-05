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
const node_path_1 = __importDefault(require("node:path"));
const get_icon_services_1 = __importDefault(require("./get-icon-services"));
class ReferencesForPathView {
    constructor({ relativePath, reference, isSelected = false }) {
        this.relativePath = relativePath;
        this.reference = reference;
        this.isSelected = isSelected;
        etch_1.default.initialize(this);
        this.iconServices.updateIcon(this, this.relativePath);
    }
    get iconServices() {
        return (0, get_icon_services_1.default)();
    }
    destroy() {
        return etch_1.default.destroy(this);
    }
    update({ relativePath, reference, isSelected = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            let changed = false;
            if (this.relativePath !== relativePath) {
                this.relativePath = relativePath;
                changed = true;
            }
            if (this.reference !== reference) {
                this.reference = reference;
                changed = true;
            }
            if (this.isSelected !== isSelected) {
                this.isSelected = isSelected;
                changed = true;
            }
            return changed ? etch_1.default.update(this) : Promise.resolve();
        });
    }
    writeAfterUpdate() {
        this.iconServices.updateIcon(this, this.relativePath);
    }
    render() {
        let { relativePath } = this;
        if (atom.project) {
            let [rootPath, _] = atom.project.relativize(this.reference.uri);
            if (rootPath && atom.project.getDirectories().length > 1) {
                relativePath = node_path_1.default.join(node_path_1.default.basename(rootPath), relativePath);
            }
        }
        let classNames = [
            'list-nested-item',
            this.isSelected
        ];
        return (etch_1.default.dom("li", { className: true, li: true }, "); } }"));
    }
}
exports.default = ReferencesForPathView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0LXJvdy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL3Jlc3VsdC1yb3ctdmlldy50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBd0I7QUFDeEIsMERBQTZCO0FBQzdCLDRFQUFrRDtBQVFsRCxNQUFxQixxQkFBcUI7SUFReEMsWUFBWSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxHQUFHLEtBQUssRUFBbUM7UUFDMUYsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFFN0IsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZCxPQUFPLElBQUEsMkJBQWUsR0FBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxPQUFPO1FBQ0wsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFSyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsR0FBRyxLQUFLLEVBQW1DOztZQUMzRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDcEIsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztnQkFDakMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNqQixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztnQkFDM0IsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNqQixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztnQkFDN0IsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNqQixDQUFDO1lBRUQsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6RCxDQUFDO0tBQUE7SUFFRCxnQkFBZ0I7UUFDZCxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxNQUFNO1FBQ0osSUFBSSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQztRQUM1QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEUsSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELFlBQVksR0FBRyxtQkFBSSxDQUFDLElBQUksQ0FDdEIsbUJBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFlBQVksQ0FDYixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLFVBQVUsR0FBRztZQUNmLGtCQUFrQjtZQUNsQixJQUFJLENBQUMsVUFBVTtTQUNoQixDQUFBO1FBQ0QsT0FBTyxDQUNMLDJCQUFJLFNBQVMsUUFBSSxFQUFFLG1CQUl6QixDQUFBLENBQUE7SUFBQSxDQUFDLEFBQUQ7Q0FBQTtBQW5FQSx3Q0FtRUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IGV0Y2ggZnJvbSAnZXRjaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGdldEljb25TZXJ2aWNlcyBmcm9tICcuL2dldC1pY29uLXNlcnZpY2VzJztcblxudHlwZSBSZWZlcmVuY2VzRm9yUGF0aFZpZXdQcm9wZXJ0aWVzID0ge1xuICByZWxhdGl2ZVBhdGg6IHN0cmluZyxcbiAgcmVmZXJlbmNlOiBSZWZlcmVuY2UsXG4gIGlzU2VsZWN0ZWQ6IGJvb2xlYW5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlZmVyZW5jZXNGb3JQYXRoVmlldyB7XG4gIHB1YmxpYyByZWxhdGl2ZVBhdGg6IHN0cmluZztcbiAgcHVibGljIHJlZmVyZW5jZTogUmVmZXJlbmNlO1xuICBwdWJsaWMgaXNTZWxlY3RlZDogYm9vbGVhbjtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcblxuICBjb25zdHJ1Y3Rvcih7IHJlbGF0aXZlUGF0aCwgcmVmZXJlbmNlLCBpc1NlbGVjdGVkID0gZmFsc2UgfTogUmVmZXJlbmNlc0ZvclBhdGhWaWV3UHJvcGVydGllcykge1xuICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgIHRoaXMucmVmZXJlbmNlID0gcmVmZXJlbmNlO1xuICAgIHRoaXMuaXNTZWxlY3RlZCA9IGlzU2VsZWN0ZWQ7XG5cbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG4gICAgdGhpcy5pY29uU2VydmljZXMudXBkYXRlSWNvbih0aGlzLCB0aGlzLnJlbGF0aXZlUGF0aCk7XG4gIH1cblxuICBnZXQgaWNvblNlcnZpY2VzKCkge1xuICAgIHJldHVybiBnZXRJY29uU2VydmljZXMoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgcmV0dXJuIGV0Y2guZGVzdHJveSh0aGlzKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZSh7IHJlbGF0aXZlUGF0aCwgcmVmZXJlbmNlLCBpc1NlbGVjdGVkID0gZmFsc2UgfTogUmVmZXJlbmNlc0ZvclBhdGhWaWV3UHJvcGVydGllcykge1xuICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucmVsYXRpdmVQYXRoICE9PSByZWxhdGl2ZVBhdGgpIHtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLnJlZmVyZW5jZSAhPT0gcmVmZXJlbmNlKSB7XG4gICAgICB0aGlzLnJlZmVyZW5jZSA9IHJlZmVyZW5jZTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc1NlbGVjdGVkICE9PSBpc1NlbGVjdGVkKSB7XG4gICAgICB0aGlzLmlzU2VsZWN0ZWQgPSBpc1NlbGVjdGVkO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZWQgPyBldGNoLnVwZGF0ZSh0aGlzKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgd3JpdGVBZnRlclVwZGF0ZSgpIHtcbiAgICB0aGlzLmljb25TZXJ2aWNlcy51cGRhdGVJY29uKHRoaXMsIHRoaXMucmVsYXRpdmVQYXRoKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBsZXQgeyByZWxhdGl2ZVBhdGggfSA9IHRoaXM7XG4gICAgaWYgKGF0b20ucHJvamVjdCkge1xuICAgICAgbGV0IFtyb290UGF0aCwgX10gPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZSh0aGlzLnJlZmVyZW5jZS51cmkpO1xuICAgICAgaWYgKHJvb3RQYXRoICYmIGF0b20ucHJvamVjdC5nZXREaXJlY3RvcmllcygpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmVsYXRpdmVQYXRoID0gUGF0aC5qb2luKFxuICAgICAgICAgIFBhdGguYmFzZW5hbWUocm9vdFBhdGgpLFxuICAgICAgICAgIHJlbGF0aXZlUGF0aFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgY2xhc3NOYW1lcyA9IFtcbiAgICAgICdsaXN0LW5lc3RlZC1pdGVtJyxcbiAgICAgIHRoaXMuaXNTZWxlY3RlZFxuICAgIF1cbiAgICByZXR1cm4gKFxuICAgICAgPGxpIGNsYXNzTmFtZT0+PC9saT5cbiAgICApO1xuICB9XG59XG4iXX0=