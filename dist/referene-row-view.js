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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmUtcm93LXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcmVmZXJlbmUtcm93LXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLDBEQUE2QjtBQUM3Qiw0RUFBa0Q7QUFRbEQsTUFBcUIscUJBQXFCO0lBUXhDLFlBQVksRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsR0FBRyxLQUFLLEVBQW1DO1FBQzFGLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBRTdCLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2QsT0FBTyxJQUFBLDJCQUFlLEdBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsT0FBTztRQUNMLE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUssTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLEdBQUcsS0FBSyxFQUFtQzs7WUFDM0YsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7Z0JBQ2pDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDakIsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBQzNCLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDakIsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQzdCLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDakIsQ0FBQztZQUVELE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekQsQ0FBQztLQUFBO0lBRUQsZ0JBQWdCO1FBQ2QsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsTUFBTTtRQUNKLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hFLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN6RCxZQUFZLEdBQUcsbUJBQUksQ0FBQyxJQUFJLENBQ3RCLG1CQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixZQUFZLENBQ2IsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBQ0QsSUFBSSxVQUFVLEdBQUc7WUFDZixrQkFBa0I7WUFDbEIsSUFBSSxDQUFDLFVBQVU7U0FDaEIsQ0FBQTtRQUNELE9BQU8sQ0FDTCwyQkFBSSxTQUFTLFFBQUksRUFBRSxtQkFJekIsQ0FBQSxDQUFBO0lBQUEsQ0FBQyxBQUFEO0NBQUE7QUFuRUEsd0NBbUVBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcbmltcG9ydCBldGNoIGZyb20gJ2V0Y2gnO1xuaW1wb3J0IFBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCBnZXRJY29uU2VydmljZXMgZnJvbSAnLi9nZXQtaWNvbi1zZXJ2aWNlcyc7XG5cbnR5cGUgUmVmZXJlbmNlc0ZvclBhdGhWaWV3UHJvcGVydGllcyA9IHtcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gIHJlZmVyZW5jZTogUmVmZXJlbmNlLFxuICBpc1NlbGVjdGVkOiBib29sZWFuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VzRm9yUGF0aFZpZXcge1xuICBwdWJsaWMgcmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIHB1YmxpYyByZWZlcmVuY2U6IFJlZmVyZW5jZTtcbiAgcHVibGljIGlzU2VsZWN0ZWQ6IGJvb2xlYW47XG5cbiAgcHVibGljIGVsZW1lbnQhOiBIVE1MRWxlbWVudDtcbiAgcHVibGljIHJlZnMhOiB7IFtrZXk6IHN0cmluZ106IEhUTUxFbGVtZW50IH07XG5cbiAgY29uc3RydWN0b3IoeyByZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZSwgaXNTZWxlY3RlZCA9IGZhbHNlIH06IFJlZmVyZW5jZXNGb3JQYXRoVmlld1Byb3BlcnRpZXMpIHtcbiAgICB0aGlzLnJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlUGF0aDtcbiAgICB0aGlzLnJlZmVyZW5jZSA9IHJlZmVyZW5jZTtcbiAgICB0aGlzLmlzU2VsZWN0ZWQgPSBpc1NlbGVjdGVkO1xuXG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpO1xuICAgIHRoaXMuaWNvblNlcnZpY2VzLnVwZGF0ZUljb24odGhpcywgdGhpcy5yZWxhdGl2ZVBhdGgpO1xuICB9XG5cbiAgZ2V0IGljb25TZXJ2aWNlcygpIHtcbiAgICByZXR1cm4gZ2V0SWNvblNlcnZpY2VzKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHJldHVybiBldGNoLmRlc3Ryb3kodGhpcyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoeyByZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZSwgaXNTZWxlY3RlZCA9IGZhbHNlIH06IFJlZmVyZW5jZXNGb3JQYXRoVmlld1Byb3BlcnRpZXMpIHtcbiAgICBsZXQgY2hhbmdlZCA9IGZhbHNlO1xuICAgIGlmICh0aGlzLnJlbGF0aXZlUGF0aCAhPT0gcmVsYXRpdmVQYXRoKSB7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlUGF0aDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5yZWZlcmVuY2UgIT09IHJlZmVyZW5jZSkge1xuICAgICAgdGhpcy5yZWZlcmVuY2UgPSByZWZlcmVuY2U7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNTZWxlY3RlZCAhPT0gaXNTZWxlY3RlZCkge1xuICAgICAgdGhpcy5pc1NlbGVjdGVkID0gaXNTZWxlY3RlZDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFuZ2VkID8gZXRjaC51cGRhdGUodGhpcykgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIHdyaXRlQWZ0ZXJVcGRhdGUoKSB7XG4gICAgdGhpcy5pY29uU2VydmljZXMudXBkYXRlSWNvbih0aGlzLCB0aGlzLnJlbGF0aXZlUGF0aCk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgbGV0IHsgcmVsYXRpdmVQYXRoIH0gPSB0aGlzO1xuICAgIGlmIChhdG9tLnByb2plY3QpIHtcbiAgICAgIGxldCBbcm9vdFBhdGgsIF9dID0gYXRvbS5wcm9qZWN0LnJlbGF0aXZpemUodGhpcy5yZWZlcmVuY2UudXJpKTtcbiAgICAgIGlmIChyb290UGF0aCAmJiBhdG9tLnByb2plY3QuZ2V0RGlyZWN0b3JpZXMoKS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJlbGF0aXZlUGF0aCA9IFBhdGguam9pbihcbiAgICAgICAgICBQYXRoLmJhc2VuYW1lKHJvb3RQYXRoKSxcbiAgICAgICAgICByZWxhdGl2ZVBhdGhcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBbXG4gICAgICAnbGlzdC1uZXN0ZWQtaXRlbScsXG4gICAgICB0aGlzLmlzU2VsZWN0ZWRcbiAgICBdXG4gICAgcmV0dXJuIChcbiAgICAgIDxsaSBjbGFzc05hbWU9PjwvbGk+XG4gICAgKTtcbiAgfVxufVxuIl19