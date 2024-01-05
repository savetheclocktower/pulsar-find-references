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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQTJDO0FBQzNDLHdGQUE4RDtBQUM5RCxtREFBcUM7QUFJckMsSUFBSSxPQUEwQyxDQUFDO0FBQy9DLElBQUksYUFBYSxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7QUFDbkUsTUFBTSxnQkFBZ0IsR0FBNkIsRUFBRSxDQUFDO0FBRXRELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxhQUFQLE9BQU8sY0FBUCxPQUFPLElBQVAsT0FBTyxHQUFLLElBQUksaUNBQXFCLEVBQUUsRUFBQztJQUV4QyxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTNCLElBQUksQ0FBQztRQUNILE9BQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckIsQ0FBQztBQUNILENBQUM7QUFWRCw0QkFVQztBQUVELFNBQWdCLFVBQVU7SUFDeEIsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzFCLENBQUM7QUFGRCxnQ0FFQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLFFBQWdDO0lBQ3BFLElBQUksT0FBTyxFQUFFLENBQUM7UUFDWixPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7U0FBTSxDQUFDO1FBQ04sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7QUFDSCxDQUFDO0FBTkQsc0RBTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb3NpdGVEaXNwb3NhYmxlIH0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgRmluZFJlZmVyZW5jZXNNYW5hZ2VyIGZyb20gJy4vZmluZC1yZWZlcmVuY2VzLW1hbmFnZXInO1xuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuXG5pbXBvcnQgdHlwZSB7IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIgfSBmcm9tICcuL2ZpbmQtcmVmZXJlbmNlcy5kJztcblxubGV0IG1hbmFnZXI6IEZpbmRSZWZlcmVuY2VzTWFuYWdlciB8IHVuZGVmaW5lZDtcbmxldCBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbmNvbnN0IHBlbmRpbmdQcm92aWRlcnM6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXJbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIG1hbmFnZXIgPz89IG5ldyBGaW5kUmVmZXJlbmNlc01hbmFnZXIoKTtcblxuICBzdWJzY3JpcHRpb25zLmFkZChtYW5hZ2VyKTtcblxuICB0cnkge1xuICAgIG1hbmFnZXIhLmluaXRpYWxpemUocGVuZGluZ1Byb3ZpZGVycyk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25zdW1lRmluZFJlZmVyZW5jZXMocHJvdmlkZXI6IEZpbmRSZWZlcmVuY2VzUHJvdmlkZXIpIHtcbiAgaWYgKG1hbmFnZXIpIHtcbiAgICBtYW5hZ2VyLmFkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgfSBlbHNlIHtcbiAgICBwZW5kaW5nUHJvdmlkZXJzLnB1c2gocHJvdmlkZXIpO1xuICB9XG59XG4iXX0=