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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQXVEO0FBQ3ZELHdGQUE4RDtBQUM5RCxtREFBcUM7QUFPckMsSUFBSSxPQUEwQyxDQUFDO0FBRS9DLElBQUksYUFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7QUFFbkUsTUFBTSxnQkFBZ0IsR0FBNkIsRUFBRSxDQUFDO0FBRXRELFNBQVMsWUFBWSxDQUFDLEtBQVU7SUFDOUIsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxZQUFZLENBQUE7QUFDaEQsQ0FBQztBQUVELFNBQWdCLDBCQUEwQixDQUFDLElBQVk7SUFDckQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNyQyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLEtBQUssSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUTtZQUNqQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxJQUFJLENBQUE7WUFDYixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNsQixDQUFDO0FBWEQsZ0VBV0M7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sYUFBUCxPQUFPLGNBQVAsT0FBTyxJQUFQLE9BQU8sR0FBSyxJQUFJLGlDQUFxQixFQUFFLEVBQUM7SUFDeEMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQixJQUFJLENBQUM7UUFDSCxPQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7QUFDSCxDQUFDO0FBUkQsNEJBUUM7QUFFRCxTQUFnQixVQUFVO0lBQ3hCLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRkQsZ0NBRUM7QUFFRCxTQUFnQixxQkFBcUIsQ0FBQyxRQUFnQztJQUNwRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO1NBQU0sQ0FBQztRQUNOLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxDQUFDO0FBQ0gsQ0FBQztBQU5ELHNEQU1DO0FBRUQsNkVBQTZFO0FBQzdFLDZFQUE2RTtBQUM3RSxvQkFBb0I7QUFDcEIsU0FBZ0IscUJBQXFCO0lBQ25DLE9BQU87UUFDTCx1QkFBdUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRTtZQUNoRCxJQUFJLENBQUMsT0FBTztnQkFBRSxPQUFPO1lBQ3JCLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUNELHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFO1lBQzVDLElBQUksQ0FBQyxPQUFPO2dCQUFFLE9BQU87WUFDckIsSUFBSSxNQUFNLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLE1BQU07Z0JBQUUsT0FBTztZQUNwQixPQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQy9ELENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQWJELHNEQWFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSwgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IEZpbmRSZWZlcmVuY2VzTWFuYWdlciBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy1tYW5hZ2VyJztcbmltcG9ydCAqIGFzIGNvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcblxuaW1wb3J0IHR5cGUge1xuICBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyLFxuICBTaG93UmVmZXJlbmNlc1Byb3ZpZGVyXG59IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuXG5sZXQgbWFuYWdlcjogRmluZFJlZmVyZW5jZXNNYW5hZ2VyIHwgdW5kZWZpbmVkO1xuXG5sZXQgc3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG5cbmNvbnN0IHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSA9IFtdO1xuXG5mdW5jdGlvbiBpc1RleHRFZGl0b3IodGhpbmc6IGFueSk6IHRoaW5nIGlzIFRleHRFZGl0b3Ige1xuICByZXR1cm4gdGhpbmcuY29uc3RydWN0b3IubmFtZSA9PT0gJ1RleHRFZGl0b3InXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kRmlyc3RUZXh0RWRpdG9yRm9yUGF0aChwYXRoOiBzdHJpbmcpOiBUZXh0RWRpdG9yIHwgdW5kZWZpbmVkIHtcbiAgbGV0IHBhbmVzID0gYXRvbS53b3Jrc3BhY2UuZ2V0UGFuZXMoKVxuICBmb3IgKGxldCBwYW5lIG9mIHBhbmVzKSB7XG4gICAgZm9yIChsZXQgaXRlbSBvZiBwYW5lLmdldEl0ZW1zKCkpIHtcbiAgICAgIGlmICghaXNUZXh0RWRpdG9yKGl0ZW0pKSBjb250aW51ZVxuICAgICAgaWYgKGl0ZW0uZ2V0UGF0aCgpID09PSBwYXRoKSB7XG4gICAgICAgIHJldHVybiBpdGVtXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICBtYW5hZ2VyID8/PSBuZXcgRmluZFJlZmVyZW5jZXNNYW5hZ2VyKCk7XG4gIHN1YnNjcmlwdGlvbnMuYWRkKG1hbmFnZXIpO1xuICB0cnkge1xuICAgIG1hbmFnZXIhLmluaXRpYWxpemUocGVuZGluZ1Byb3ZpZGVycyk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25zdW1lRmluZFJlZmVyZW5jZXMocHJvdmlkZXI6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIpIHtcbiAgaWYgKG1hbmFnZXIpIHtcbiAgICBtYW5hZ2VyLmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfSBlbHNlIHtcbiAgICBwZW5kaW5nUHJvdmlkZXJzLnB1c2gocHJvdmlkZXIpO1xuICB9XG59XG5cbi8vIEV4cGVyaW1lbnRhbDogQW4gQVBJIHRoYXQgY2FuIGJlIGNvbnN1bWVkIGJ5IG90aGVyIHBhY2thZ2VzIHRvIHRyaWdnZXIgdGhlXG4vLyBkaXNwbGF5IG9mIGEg4oCcc2hvdyByZWZlcmVuY2Vz4oCdIHBhbmVsIGZvciBhbiBhcmJpdHJhcnkgcG9pbnQgb3IgcmFuZ2UgaW4gYW5cbi8vIGFyYml0cmFyeSBidWZmZXIuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVNob3dSZWZlcmVuY2VzKCk6IFNob3dSZWZlcmVuY2VzUHJvdmlkZXIge1xuICByZXR1cm4ge1xuICAgIHNob3dSZWZlcmVuY2VzRm9yRWRpdG9yOiAoZWRpdG9yLCBwb2ludE9yUmFuZ2UpID0+IHtcbiAgICAgIGlmICghbWFuYWdlcikgcmV0dXJuO1xuICAgICAgbWFuYWdlci5zaG93UmVmZXJlbmNlc0ZvckVkaXRvckF0UG9pbnQoZWRpdG9yLCBwb2ludE9yUmFuZ2UpO1xuICAgIH0sXG4gICAgc2hvd1JlZmVyZW5jZXNGb3JQYXRoOiAocGF0aCwgcG9pbnRPclJhbmdlKSA9PiB7XG4gICAgICBpZiAoIW1hbmFnZXIpIHJldHVybjtcbiAgICAgIGxldCBlZGl0b3IgPSBmaW5kRmlyc3RUZXh0RWRpdG9yRm9yUGF0aChwYXRoKTtcbiAgICAgIGlmICghZWRpdG9yKSByZXR1cm47XG4gICAgICBtYW5hZ2VyLnNob3dSZWZlcmVuY2VzRm9yRWRpdG9yQXRQb2ludChlZGl0b3IsIHBvaW50T3JSYW5nZSk7XG4gICAgfVxuICB9O1xufVxuIl19