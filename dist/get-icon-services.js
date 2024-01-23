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
exports.IconServices = void 0;
const default_file_icons_1 = __importDefault(require("./default-file-icons"));
const atom_1 = require("atom");
const console = __importStar(require("./console"));
let iconServices;
function getIconServices() {
    iconServices !== null && iconServices !== void 0 ? iconServices : (iconServices = new IconServices());
    return iconServices;
}
exports.default = getIconServices;
class IconServices {
    constructor() {
        this.emitter = new atom_1.Emitter();
        this.fileIcons = default_file_icons_1.default;
        this.elementIcons = null;
        this.elementIconDisposables = new atom_1.CompositeDisposable();
    }
    onDidChange(callback) {
        return this.emitter.on('did-change', callback);
    }
    resetElementIcons() {
        this.setElementIcons(null);
    }
    setElementIcons(service) {
        if (service === this.elementIcons)
            return;
        if (this.elementIconDisposables !== null) {
            this.elementIconDisposables.dispose();
        }
        if (service) {
            this.elementIconDisposables = new atom_1.CompositeDisposable();
        }
        this.elementIcons = service;
        return this.emitter.emit('did-change');
    }
    setFileIcons(service) {
        if (service !== this.fileIcons) {
            this.fileIcons = service;
            return this.emitter.emit('did-change');
        }
    }
    updateIcon(view, filePath) {
        var _a;
        console.log('IconServices updateIcon:', view);
        if (this.elementIcons) {
            if (view.refs && view.refs.icon instanceof Element) {
                if (view.iconDisposable) {
                    view.iconDisposable.dispose();
                    (_a = this.elementIconDisposables) === null || _a === void 0 ? void 0 : _a.remove(view.iconDisposable);
                }
            }
        }
        else {
            let iconClass = this.fileIcons.iconClassForPath(filePath, 'find-and-replace') || '';
            if (Array.isArray(iconClass)) {
                iconClass = iconClass.join(' ');
            }
            view.refs.icon.className = iconClass + ' icon';
        }
    }
}
exports.IconServices = IconServices;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWljb24tc2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvZ2V0LWljb24tc2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw4RUFBb0Q7QUFDcEQsK0JBQWdFO0FBQ2hFLG1EQUFxQztBQVlyQyxJQUFJLFlBQTBCLENBQUM7QUFFL0IsU0FBd0IsZUFBZTtJQUNyQyxZQUFZLGFBQVosWUFBWSxjQUFaLFlBQVksSUFBWixZQUFZLEdBQUssSUFBSSxZQUFZLEVBQUUsRUFBQztJQUNwQyxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBSEQsa0NBR0M7QUFFRCxNQUFhLFlBQVk7SUFPdkI7UUFOUSxZQUFPLEdBQVksSUFBSSxjQUFPLEVBQUUsQ0FBQztRQUNqQyxjQUFTLEdBQVEsNEJBQWdCLENBQUM7UUFFbEMsaUJBQVksR0FBdUIsSUFBSSxDQUFDO1FBQ3hDLDJCQUFzQixHQUErQixJQUFJLDBCQUFtQixFQUFFLENBQUM7SUFHdkYsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFrQjtRQUM1QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsaUJBQWlCO1FBQ2YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsZUFBZSxDQUFDLE9BQW9CO1FBQ2xDLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxZQUFZO1lBQUUsT0FBTztRQUMxQyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBQzFELENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztRQUM1QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBb0I7UUFDL0IsSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNILENBQUM7SUFFRCxVQUFVLENBQUMsSUFBbUIsRUFBRSxRQUFnQjs7UUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN0QixJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLFlBQVksT0FBTyxFQUFFLENBQUM7Z0JBQ25ELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM5QixNQUFBLElBQUksQ0FBQyxzQkFBc0IsMENBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDM0QsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BGLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM3QixTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDakQsQ0FBQztJQUNILENBQUM7Q0FDRjtBQXRERCxvQ0FzREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRGVmYXVsdEZpbGVJY29ucyBmcm9tICcuL2RlZmF1bHQtZmlsZS1pY29ucyc7XG5pbXBvcnQgeyBDb21wb3NpdGVEaXNwb3NhYmxlLCBEaXNwb3NhYmxlLCBFbWl0dGVyIH0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5cbnR5cGUgSWNvblNlcnZpY2UgPSBhbnk7XG50eXBlIENhbGxiYWNrID0gKCkgPT4gYW55O1xuXG50eXBlIEV0Y2hSZWZzQ29sbGVjdGlvbiA9IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcbnR5cGUgRXRjaENvbXBvbmVudCA9IHtcbiAgcmVmczogRXRjaFJlZnNDb2xsZWN0aW9uLFxuICBlbGVtZW50OiBIVE1MRWxlbWVudCxcbiAgaWNvbkRpc3Bvc2FibGU/OiBEaXNwb3NhYmxlXG59O1xuXG5sZXQgaWNvblNlcnZpY2VzOiBJY29uU2VydmljZXM7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldEljb25TZXJ2aWNlcygpIHtcbiAgaWNvblNlcnZpY2VzID8/PSBuZXcgSWNvblNlcnZpY2VzKCk7XG4gIHJldHVybiBpY29uU2VydmljZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBJY29uU2VydmljZXMge1xuICBwcml2YXRlIGVtaXR0ZXI6IEVtaXR0ZXIgPSBuZXcgRW1pdHRlcigpO1xuICBwcml2YXRlIGZpbGVJY29uczogYW55ID0gRGVmYXVsdEZpbGVJY29ucztcblxuICBwcml2YXRlIGVsZW1lbnRJY29uczogSWNvblNlcnZpY2UgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBlbGVtZW50SWNvbkRpc3Bvc2FibGVzOiBDb21wb3NpdGVEaXNwb3NhYmxlIHwgbnVsbCA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gIH1cblxuICBvbkRpZENoYW5nZShjYWxsYmFjazogQ2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtY2hhbmdlJywgY2FsbGJhY2spO1xuICB9XG5cbiAgcmVzZXRFbGVtZW50SWNvbnMoKSB7XG4gICAgdGhpcy5zZXRFbGVtZW50SWNvbnMobnVsbCk7XG4gIH1cblxuICBzZXRFbGVtZW50SWNvbnMoc2VydmljZTogSWNvblNlcnZpY2UpIHtcbiAgICBpZiAoc2VydmljZSA9PT0gdGhpcy5lbGVtZW50SWNvbnMpIHJldHVybjtcbiAgICBpZiAodGhpcy5lbGVtZW50SWNvbkRpc3Bvc2FibGVzICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmVsZW1lbnRJY29uRGlzcG9zYWJsZXMuZGlzcG9zZSgpO1xuICAgIH1cbiAgICBpZiAoc2VydmljZSkge1xuICAgICAgdGhpcy5lbGVtZW50SWNvbkRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50SWNvbnMgPSBzZXJ2aWNlO1xuICAgIHJldHVybiB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZScpO1xuICB9XG5cbiAgc2V0RmlsZUljb25zKHNlcnZpY2U6IEljb25TZXJ2aWNlKSB7XG4gICAgaWYgKHNlcnZpY2UgIT09IHRoaXMuZmlsZUljb25zKSB7XG4gICAgICB0aGlzLmZpbGVJY29ucyA9IHNlcnZpY2U7XG4gICAgICByZXR1cm4gdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1jaGFuZ2UnKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVJY29uKHZpZXc6IEV0Y2hDb21wb25lbnQsIGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZygnSWNvblNlcnZpY2VzIHVwZGF0ZUljb246Jywgdmlldyk7XG4gICAgaWYgKHRoaXMuZWxlbWVudEljb25zKSB7XG4gICAgICBpZiAodmlldy5yZWZzICYmIHZpZXcucmVmcy5pY29uIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICBpZiAodmlldy5pY29uRGlzcG9zYWJsZSkge1xuICAgICAgICAgIHZpZXcuaWNvbkRpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgICAgICAgIHRoaXMuZWxlbWVudEljb25EaXNwb3NhYmxlcz8ucmVtb3ZlKHZpZXcuaWNvbkRpc3Bvc2FibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBpY29uQ2xhc3MgPSB0aGlzLmZpbGVJY29ucy5pY29uQ2xhc3NGb3JQYXRoKGZpbGVQYXRoLCAnZmluZC1hbmQtcmVwbGFjZScpIHx8ICcnO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaWNvbkNsYXNzKSkge1xuICAgICAgICBpY29uQ2xhc3MgPSBpY29uQ2xhc3Muam9pbignICcpO1xuICAgICAgfVxuICAgICAgdmlldy5yZWZzLmljb24uY2xhc3NOYW1lID0gaWNvbkNsYXNzICsgJyBpY29uJztcbiAgICB9XG4gIH1cbn1cbiJdfQ==