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
class ProviderRegistry {
    constructor() {
        this.providers = [];
    }
    addProvider(provider) {
        console.log('addProvider:', provider);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItcmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcHJvdmlkZXItcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUE4QztBQUU5QyxtREFBcUM7QUFFckMsTUFBcUIsZ0JBQWdCO0lBQXJDO1FBQ0UsY0FBUyxHQUFvQixFQUFFLENBQUM7SUF3QmxDLENBQUM7SUF0QkMsV0FBVyxDQUFDLFFBQWtCO1FBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLE9BQU8sSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWtCO1FBQy9CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsd0JBQXdCLENBQUMsTUFBa0I7UUFDekMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN0QyxPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxNQUFrQjtRQUMxQyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUM7WUFDeEQsT0FBTyxRQUFRLENBQUM7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUF6QkQsbUNBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyIH0gZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMuZCc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByb3ZpZGVyUmVnaXN0cnk8UHJvdmlkZXIgZXh0ZW5kcyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiB7XG4gIHByb3ZpZGVyczogQXJyYXk8UHJvdmlkZXI+ID0gW107XG5cbiAgYWRkUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVyKTogRGlzcG9zYWJsZSB7XG4gICAgY29uc29sZS5sb2coJ2FkZFByb3ZpZGVyOicsIHByb3ZpZGVyKTtcbiAgICB0aGlzLnByb3ZpZGVycy5wdXNoKHByb3ZpZGVyKTtcbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4gdGhpcy5yZW1vdmVQcm92aWRlcihwcm92aWRlcikpO1xuICB9XG5cbiAgcmVtb3ZlUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVyKSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLnByb3ZpZGVycy5pbmRleE9mKHByb3ZpZGVyKTtcbiAgICBpZiAoaW5kZXggPiAtMSkgdGhpcy5wcm92aWRlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGdldEFsbFByb3ZpZGVyc0ZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBJdGVyYWJsZTxQcm92aWRlcj4ge1xuICAgIHJldHVybiB0aGlzLnByb3ZpZGVycy5maWx0ZXIocHJvdmlkZXIgPT4ge1xuICAgICAgcmV0dXJuIHByb3ZpZGVyLmlzRWRpdG9yU3VwcG9ydGVkKGVkaXRvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcik6IFByb3ZpZGVyIHwgbnVsbCB7XG4gICAgZm9yIChsZXQgcHJvdmlkZXIgb2YgdGhpcy5nZXRBbGxQcm92aWRlcnNGb3JFZGl0b3IoZWRpdG9yKSlcbiAgICAgIHJldHVybiBwcm92aWRlcjtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl19