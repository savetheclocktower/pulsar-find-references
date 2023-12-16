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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItcmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcHJvdmlkZXItcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUE4QztBQUU5QyxtREFBcUM7QUFFckMsTUFBcUIsZ0JBQWdCO0lBQXJDO1FBQ0UsY0FBUyxHQUFvQixFQUFFLENBQUM7SUF3QmxDLENBQUM7SUF0QkMsV0FBVyxDQUFFLFFBQWtCO1FBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLE9BQU8sSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsY0FBYyxDQUFFLFFBQWtCO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsd0JBQXdCLENBQUUsTUFBa0I7UUFDMUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN0QyxPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCx5QkFBeUIsQ0FBRSxNQUFrQjtRQUMzQyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUM7WUFDeEQsT0FBTyxRQUFRLENBQUM7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUF6QkQsbUNBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyIH0gZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMuZCc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByb3ZpZGVyUmVnaXN0cnk8UHJvdmlkZXIgZXh0ZW5kcyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyPiB7XG4gIHByb3ZpZGVyczogQXJyYXk8UHJvdmlkZXI+ID0gW107XG5cbiAgYWRkUHJvdmlkZXIgKHByb3ZpZGVyOiBQcm92aWRlcik6IERpc3Bvc2FibGUge1xuICAgIGNvbnNvbGUubG9nKCdhZGRQcm92aWRlcjonLCBwcm92aWRlcik7XG4gICAgdGhpcy5wcm92aWRlcnMucHVzaChwcm92aWRlcik7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHRoaXMucmVtb3ZlUHJvdmlkZXIocHJvdmlkZXIpKTtcbiAgfVxuXG4gIHJlbW92ZVByb3ZpZGVyIChwcm92aWRlcjogUHJvdmlkZXIpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMucHJvdmlkZXJzLmluZGV4T2YocHJvdmlkZXIpO1xuICAgIGlmIChpbmRleCA+IC0xKSB0aGlzLnByb3ZpZGVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgZ2V0QWxsUHJvdmlkZXJzRm9yRWRpdG9yIChlZGl0b3I6IFRleHRFZGl0b3IpOiBJdGVyYWJsZTxQcm92aWRlcj4ge1xuICAgIHJldHVybiB0aGlzLnByb3ZpZGVycy5maWx0ZXIocHJvdmlkZXIgPT4ge1xuICAgICAgcmV0dXJuIHByb3ZpZGVyLmlzRWRpdG9yU3VwcG9ydGVkKGVkaXRvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRGaXJzdFByb3ZpZGVyRm9yRWRpdG9yIChlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm92aWRlciB8IG51bGwge1xuICAgIGZvciAobGV0IHByb3ZpZGVyIG9mIHRoaXMuZ2V0QWxsUHJvdmlkZXJzRm9yRWRpdG9yKGVkaXRvcikpXG4gICAgICByZXR1cm4gcHJvdmlkZXI7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==