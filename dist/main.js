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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provideShowReferences = exports.consumeFindReferences = exports.deactivate = exports.activate = exports.findFirstTextEditorForPath = void 0;
const atom_1 = require("atom");
const find_references_manager_1 = __importDefault(require("./find-references-manager"));
const console = __importStar(require("./console"));
let manager;
let subscriptions = new atom_1.CompositeDisposable();
const pendingProviders = [];
function isTextEditor(thing) {
    return thing.constructor.name === 'TextEditor';
}
function findFirstTextEditorForPath(path) {
    let panes = atom.workspace.getPanes();
    for (let pane of panes) {
        for (let item of pane.getItems()) {
            if (!isTextEditor(item))
                continue;
            if (item.getPath() === path) {
                return item;
            }
        }
    }
    return undefined;
}
exports.findFirstTextEditorForPath = findFirstTextEditorForPath;
function activate() {
    manager !== null && manager !== void 0 ? manager : (manager = new find_references_manager_1.default());
    subscriptions.add(manager);
    try {
        manager.initialize(pendingProviders);
    }
    catch (err) {
        console.error(err);
    }
}
exports.activate = activate;
function deactivate() {
    subscriptions.dispose();
}
exports.deactivate = deactivate;
function consumeFindReferences(provider) {
    if (manager) {
        manager.addProvider(provider);
    }
    else {
        pendingProviders.push(provider);
    }
}
exports.consumeFindReferences = consumeFindReferences;
// Experimental: An API that can be consumed by other packages to trigger the
// display of a “show references” panel for an arbitrary point or range in an
// arbitrary buffer.
function provideShowReferences() {
    return {
        showReferencesForEditor: (editor, pointOrRange) => {
            if (!manager)
                return;
            manager.showReferencesForEditorAtPoint(editor, pointOrRange);
        },
        showReferencesForPath: (path, pointOrRange) => {
            if (!manager)
                return;
            let editor = findFirstTextEditorForPath(path);
            if (!editor)
                return;
            manager.showReferencesForEditorAtPoint(editor, pointOrRange);
        }
    };
}
exports.provideShowReferences = provideShowReferences;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQXVEO0FBQ3ZELHdGQUE4RDtBQUM5RCxtREFBcUM7QUFJckMsSUFBSSxPQUEwQyxDQUFDO0FBRS9DLElBQUksYUFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7QUFFbkUsTUFBTSxnQkFBZ0IsR0FBNkIsRUFBRSxDQUFDO0FBRXRELFNBQVMsWUFBWSxDQUFDLEtBQVU7SUFDOUIsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxZQUFZLENBQUE7QUFDaEQsQ0FBQztBQUVELFNBQWdCLDBCQUEwQixDQUFDLElBQVk7SUFDckQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNyQyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLEtBQUssSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUTtZQUNqQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxJQUFJLENBQUE7WUFDYixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNsQixDQUFDO0FBWEQsZ0VBV0M7QUFHRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sYUFBUCxPQUFPLGNBQVAsT0FBTyxJQUFQLE9BQU8sR0FBSyxJQUFJLGlDQUFxQixFQUFFLEVBQUM7SUFFeEMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUzQixJQUFJLENBQUM7UUFDSCxPQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7QUFDSCxDQUFDO0FBVkQsNEJBVUM7QUFFRCxTQUFnQixVQUFVO0lBQ3hCLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRkQsZ0NBRUM7QUFFRCxTQUFnQixxQkFBcUIsQ0FBQyxRQUFnQztJQUNwRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO1NBQU0sQ0FBQztRQUNOLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxDQUFDO0FBQ0gsQ0FBQztBQU5ELHNEQU1DO0FBRUQsNkVBQTZFO0FBQzdFLDZFQUE2RTtBQUM3RSxvQkFBb0I7QUFDcEIsU0FBZ0IscUJBQXFCO0lBQ25DLE9BQU87UUFDTCx1QkFBdUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRTtZQUNoRCxJQUFJLENBQUMsT0FBTztnQkFBRSxPQUFPO1lBQ3JCLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUNELHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFO1lBQzVDLElBQUksQ0FBQyxPQUFPO2dCQUFFLE9BQU87WUFDckIsSUFBSSxNQUFNLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLE1BQU07Z0JBQUUsT0FBTztZQUNwQixPQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQy9ELENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQWJELHNEQWFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IEZpbmRSZWZlcmVuY2VzTWFuYWdlciBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy1tYW5hZ2VyJztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcblxuaW1wb3J0IHR5cGUgeyBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyLCBTaG93UmVmZXJlbmNlc1Byb3ZpZGVyIH0gZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMuZCc7XG5cbmxldCBtYW5hZ2VyOiBGaW5kUmVmZXJlbmNlc01hbmFnZXIgfCB1bmRlZmluZWQ7XG5cbmxldCBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuY29uc3QgcGVuZGluZ1Byb3ZpZGVyczogRmluZFJlZmVyZW5jZXNQcm92aWRlcltdID0gW107XG5cbmZ1bmN0aW9uIGlzVGV4dEVkaXRvcih0aGluZzogYW55KTogdGhpbmcgaXMgVGV4dEVkaXRvciB7XG4gIHJldHVybiB0aGluZy5jb25zdHJ1Y3Rvci5uYW1lID09PSAnVGV4dEVkaXRvcidcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRGaXJzdFRleHRFZGl0b3JGb3JQYXRoKHBhdGg6IHN0cmluZyk6IFRleHRFZGl0b3IgfCB1bmRlZmluZWQge1xuICBsZXQgcGFuZXMgPSBhdG9tLndvcmtzcGFjZS5nZXRQYW5lcygpXG4gIGZvciAobGV0IHBhbmUgb2YgcGFuZXMpIHtcbiAgICBmb3IgKGxldCBpdGVtIG9mIHBhbmUuZ2V0SXRlbXMoKSkge1xuICAgICAgaWYgKCFpc1RleHRFZGl0b3IoaXRlbSkpIGNvbnRpbnVlXG4gICAgICBpZiAoaXRlbS5nZXRQYXRoKCkgPT09IHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZFxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgbWFuYWdlciA/Pz0gbmV3IEZpbmRSZWZlcmVuY2VzTWFuYWdlcigpO1xuXG4gIHN1YnNjcmlwdGlvbnMuYWRkKG1hbmFnZXIpO1xuXG4gIHRyeSB7XG4gICAgbWFuYWdlciEuaW5pdGlhbGl6ZShwZW5kaW5nUHJvdmlkZXJzKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnN1bWVGaW5kUmVmZXJlbmNlcyhwcm92aWRlcjogRmluZFJlZmVyZW5jZXNQcm92aWRlcikge1xuICBpZiAobWFuYWdlcikge1xuICAgIG1hbmFnZXIuYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICB9IGVsc2Uge1xuICAgIHBlbmRpbmdQcm92aWRlcnMucHVzaChwcm92aWRlcik7XG4gIH1cbn1cblxuLy8gRXhwZXJpbWVudGFsOiBBbiBBUEkgdGhhdCBjYW4gYmUgY29uc3VtZWQgYnkgb3RoZXIgcGFja2FnZXMgdG8gdHJpZ2dlciB0aGVcbi8vIGRpc3BsYXkgb2YgYSDigJxzaG93IHJlZmVyZW5jZXPigJ0gcGFuZWwgZm9yIGFuIGFyYml0cmFyeSBwb2ludCBvciByYW5nZSBpbiBhblxuLy8gYXJiaXRyYXJ5IGJ1ZmZlci5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlU2hvd1JlZmVyZW5jZXMgKCk6IFNob3dSZWZlcmVuY2VzUHJvdmlkZXIge1xuICByZXR1cm4ge1xuICAgIHNob3dSZWZlcmVuY2VzRm9yRWRpdG9yOiAoZWRpdG9yLCBwb2ludE9yUmFuZ2UpID0+IHtcbiAgICAgIGlmICghbWFuYWdlcikgcmV0dXJuO1xuICAgICAgbWFuYWdlci5zaG93UmVmZXJlbmNlc0ZvckVkaXRvckF0UG9pbnQoZWRpdG9yLCBwb2ludE9yUmFuZ2UpO1xuICAgIH0sXG4gICAgc2hvd1JlZmVyZW5jZXNGb3JQYXRoOiAocGF0aCwgcG9pbnRPclJhbmdlKSA9PiB7XG4gICAgICBpZiAoIW1hbmFnZXIpIHJldHVybjtcbiAgICAgIGxldCBlZGl0b3IgPSBmaW5kRmlyc3RUZXh0RWRpdG9yRm9yUGF0aChwYXRoKTtcbiAgICAgIGlmICghZWRpdG9yKSByZXR1cm47XG4gICAgICBtYW5hZ2VyLnNob3dSZWZlcmVuY2VzRm9yRWRpdG9yQXRQb2ludChlZGl0b3IsIHBvaW50T3JSYW5nZSk7XG4gICAgfVxuICB9O1xufVxuIl19