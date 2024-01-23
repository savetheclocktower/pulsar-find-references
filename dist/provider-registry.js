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
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const console = __importStar(require("./console"));
// This is what I'm reduced to just to get `typescript-language-server` to stop
// suggesting that I remove this import.
console;
class ProviderRegistry {
    constructor() {
        this.providers = [];
    }
    addProvider(provider) {
        this.providers.push(provider);
        return new atom_1.Disposable(() => this.removeProvider(provider));
    }
    removeProvider(provider) {
        const index = this.providers.indexOf(provider);
        if (index > -1)
            this.providers.splice(index, 1);
    }
    getAllProvidersForEditor(editor) {
        return this.providers.filter(provider => {
            return provider.isEditorSupported(editor);
        });
    }
    getFirstProviderForEditor(editor) {
        for (let provider of this.getAllProvidersForEditor(editor))
            return provider;
        return null;
    }
}
exports.default = ProviderRegistry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItcmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcHJvdmlkZXItcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUE4QztBQUU5QyxtREFBcUM7QUFFckMsK0VBQStFO0FBQy9FLHdDQUF3QztBQUN4QyxPQUFRLENBQUM7QUFFVCxNQUFxQixnQkFBZ0I7SUFBckM7UUFDRSxjQUFTLEdBQW9CLEVBQUUsQ0FBQztJQXVCbEMsQ0FBQztJQXJCQyxXQUFXLENBQUMsUUFBa0I7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLGlCQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxjQUFjLENBQUMsUUFBa0I7UUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxNQUFrQjtRQUN6QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sUUFBUSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHlCQUF5QixDQUFDLE1BQWtCO1FBQzFDLEtBQUssSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQztZQUN4RCxPQUFPLFFBQVEsQ0FBQztRQUNsQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQXhCRCxtQ0F3QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEaXNwb3NhYmxlLCBUZXh0RWRpdG9yIH0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIgfSBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy5kJztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcblxuLy8gVGhpcyBpcyB3aGF0IEknbSByZWR1Y2VkIHRvIGp1c3QgdG8gZ2V0IGB0eXBlc2NyaXB0LWxhbmd1YWdlLXNlcnZlcmAgdG8gc3RvcFxuLy8gc3VnZ2VzdGluZyB0aGF0IEkgcmVtb3ZlIHRoaXMgaW1wb3J0LlxuY29uc29sZSE7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByb3ZpZGVyUmVnaXN0cnk8UHJvdmlkZXIgZXh0ZW5kcyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiB7XG4gIHByb3ZpZGVyczogQXJyYXk8UHJvdmlkZXI+ID0gW107XG5cbiAgYWRkUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVyKTogRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5wcm92aWRlcnMucHVzaChwcm92aWRlcik7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHRoaXMucmVtb3ZlUHJvdmlkZXIocHJvdmlkZXIpKTtcbiAgfVxuXG4gIHJlbW92ZVByb3ZpZGVyKHByb3ZpZGVyOiBQcm92aWRlcikge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5wcm92aWRlcnMuaW5kZXhPZihwcm92aWRlcik7XG4gICAgaWYgKGluZGV4ID4gLTEpIHRoaXMucHJvdmlkZXJzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICBnZXRBbGxQcm92aWRlcnNGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogSXRlcmFibGU8UHJvdmlkZXI+IHtcbiAgICByZXR1cm4gdGhpcy5wcm92aWRlcnMuZmlsdGVyKHByb3ZpZGVyID0+IHtcbiAgICAgIHJldHVybiBwcm92aWRlci5pc0VkaXRvclN1cHBvcnRlZChlZGl0b3IpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0Rmlyc3RQcm92aWRlckZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm92aWRlciB8IG51bGwge1xuICAgIGZvciAobGV0IHByb3ZpZGVyIG9mIHRoaXMuZ2V0QWxsUHJvdmlkZXJzRm9yRWRpdG9yKGVkaXRvcikpXG4gICAgICByZXR1cm4gcHJvdmlkZXI7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==