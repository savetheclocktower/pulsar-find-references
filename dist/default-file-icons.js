"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_plus_1 = __importDefault(require("fs-plus"));
const path_1 = __importDefault(require("path"));
class DefaultFileIcons {
    iconClassForPath(filePath) {
        let extension = path_1.default.extname(filePath);
        if (fs_plus_1.default.isSymbolicLinkSync(filePath)) {
            return 'icon-file-symlink-file';
        }
        else if (fs_plus_1.default.isReadmePath(filePath)) {
            return 'icon-book';
        }
        else if (fs_plus_1.default.isCompressedExtension(extension)) {
            return 'icon-file-zip';
        }
        else if (fs_plus_1.default.isImageExtension(extension)) {
            return 'icon-file-media';
        }
        else if (fs_plus_1.default.isPdfExtension(extension)) {
            return 'icon-file-pdf';
        }
        else if (fs_plus_1.default.isBinaryExtension(extension)) {
            return 'icon-file-binary';
        }
        else {
            return 'icon-file-text';
        }
    }
}
exports.default = new DefaultFileIcons();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1maWxlLWljb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL2RlZmF1bHQtZmlsZS1pY29ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHNEQUF5QjtBQUN6QixnREFBd0I7QUFFeEIsTUFBTSxnQkFBZ0I7SUFDcEIsZ0JBQWdCLENBQUMsUUFBZ0I7UUFDL0IsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV2QyxJQUFJLGlCQUFFLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLHdCQUF3QixDQUFDO1FBQ2xDLENBQUM7YUFBTSxJQUFJLGlCQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQzthQUFNLElBQUksaUJBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7YUFBTSxJQUFJLGlCQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLGlCQUFpQixDQUFDO1FBQzNCLENBQUM7YUFBTSxJQUFJLGlCQUFFLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTyxlQUFlLENBQUM7UUFDekIsQ0FBQzthQUFNLElBQUksaUJBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sa0JBQWtCLENBQUM7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLGdCQUFnQixDQUFDO1FBQzFCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxrQkFBZSxJQUFJLGdCQUFnQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRlMgZnJvbSAnZnMtcGx1cyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY2xhc3MgRGVmYXVsdEZpbGVJY29ucyB7XG4gIGljb25DbGFzc0ZvclBhdGgoZmlsZVBhdGg6IHN0cmluZykge1xuICAgIGxldCBleHRlbnNpb24gPSBQYXRoLmV4dG5hbWUoZmlsZVBhdGgpO1xuXG4gICAgaWYgKEZTLmlzU3ltYm9saWNMaW5rU3luYyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiAnaWNvbi1maWxlLXN5bWxpbmstZmlsZSc7XG4gICAgfSBlbHNlIGlmIChGUy5pc1JlYWRtZVBhdGgoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gJ2ljb24tYm9vayc7XG4gICAgfSBlbHNlIGlmIChGUy5pc0NvbXByZXNzZWRFeHRlbnNpb24oZXh0ZW5zaW9uKSkge1xuICAgICAgcmV0dXJuICdpY29uLWZpbGUtemlwJztcbiAgICB9IGVsc2UgaWYgKEZTLmlzSW1hZ2VFeHRlbnNpb24oZXh0ZW5zaW9uKSkge1xuICAgICAgcmV0dXJuICdpY29uLWZpbGUtbWVkaWEnO1xuICAgIH0gZWxzZSBpZiAoRlMuaXNQZGZFeHRlbnNpb24oZXh0ZW5zaW9uKSkge1xuICAgICAgcmV0dXJuICdpY29uLWZpbGUtcGRmJztcbiAgICB9IGVsc2UgaWYgKEZTLmlzQmluYXJ5RXh0ZW5zaW9uKGV4dGVuc2lvbikpIHtcbiAgICAgIHJldHVybiAnaWNvbi1maWxlLWJpbmFyeSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnaWNvbi1maWxlLXRleHQnO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgRGVmYXVsdEZpbGVJY29ucygpO1xuIl19