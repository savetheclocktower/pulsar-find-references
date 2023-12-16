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
exports.consumeFindReferences = exports.deactivate = exports.activate = void 0;
const atom_1 = require("atom");
const find_references_manager_1 = __importDefault(require("./find-references-manager"));
const console = __importStar(require("./console"));
let manager;
let subscriptions = new atom_1.CompositeDisposable();
const pendingProviders = [];
function activate() {
    console.log('Activate!');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQTJDO0FBQzNDLHdGQUE4RDtBQUM5RCxtREFBcUM7QUFJckMsSUFBSSxPQUEwQyxDQUFDO0FBQy9DLElBQUksYUFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7QUFDbkUsTUFBTSxnQkFBZ0IsR0FBNkIsRUFBRSxDQUFDO0FBRXRELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6QixPQUFPLGFBQVAsT0FBTyxjQUFQLE9BQU8sSUFBUCxPQUFPLEdBQUssSUFBSSxpQ0FBcUIsRUFBRSxFQUFDO0lBRXhDLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFM0IsSUFBSSxDQUFDO1FBQ0gsT0FBUSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDO0FBQ0gsQ0FBQztBQVhELDRCQVdDO0FBRUQsU0FBZ0IsVUFBVTtJQUN4QixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUZELGdDQUVDO0FBRUQsU0FBZ0IscUJBQXFCLENBQUUsUUFBZ0M7SUFDckUsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNaLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQztTQUFNLENBQUM7UUFDTixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsQ0FBQztBQUNILENBQUM7QUFORCxzREFNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvc2l0ZURpc3Bvc2FibGUgfSBmcm9tICdhdG9tJztcbmltcG9ydCBGaW5kUmVmZXJlbmNlc01hbmFnZXIgZnJvbSAnLi9maW5kLXJlZmVyZW5jZXMtbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbmltcG9ydCB0eXBlIHsgRmluZFJlZmVyZW5jZXNQcm92aWRlciB9IGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLmQnO1xuXG5sZXQgbWFuYWdlcjogRmluZFJlZmVyZW5jZXNNYW5hZ2VyIHwgdW5kZWZpbmVkO1xubGV0IHN1YnNjcmlwdGlvbnM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuY29uc3QgcGVuZGluZ1Byb3ZpZGVyczogRmluZFJlZmVyZW5jZXNQcm92aWRlcltdID0gW107XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSAoKSB7XG4gIGNvbnNvbGUubG9nKCdBY3RpdmF0ZSEnKTtcbiAgbWFuYWdlciA/Pz0gbmV3IEZpbmRSZWZlcmVuY2VzTWFuYWdlcigpO1xuXG4gIHN1YnNjcmlwdGlvbnMuYWRkKG1hbmFnZXIpO1xuXG4gIHRyeSB7XG4gICAgbWFuYWdlciEuaW5pdGlhbGl6ZShwZW5kaW5nUHJvdmlkZXJzKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlICgpIHtcbiAgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25zdW1lRmluZFJlZmVyZW5jZXMgKHByb3ZpZGVyOiBGaW5kUmVmZXJlbmNlc1Byb3ZpZGVyKSB7XG4gIGlmIChtYW5hZ2VyKSB7XG4gICAgbWFuYWdlci5hZGRQcm92aWRlcihwcm92aWRlcik7XG4gIH0gZWxzZSB7XG4gICAgcGVuZGluZ1Byb3ZpZGVycy5wdXNoKHByb3ZpZGVyKTtcbiAgfVxufVxuIl19