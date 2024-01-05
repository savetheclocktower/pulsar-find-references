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
const atom_1 = require("atom");
const etch_1 = __importDefault(require("etch"));
const path_1 = __importDefault(require("path"));
const classnames_1 = __importDefault(require("classnames"));
class ReferenceRowView {
    constructor({ relativePath, reference, navigationIndex, activeNavigationIndex = -1, isSelected = false }) {
        this.relativePath = relativePath;
        this.reference = reference;
        this.isSelected = isSelected;
        this.navigationIndex = navigationIndex;
        this.activeNavigationIndex = activeNavigationIndex;
        etch_1.default.initialize(this);
        this.getLineForReference().then(() => etch_1.default.update(this));
    }
    destroy() {
        return etch_1.default.destroy(this);
    }
    getLineForReference() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.textLine)
                return this.textLine;
            (_a = this.buffer) !== null && _a !== void 0 ? _a : (this.buffer = yield atom_1.TextBuffer.load(this.reference.uri));
            let { range } = this.reference;
            let row = range.start.row;
            let from = null, to = null;
            let line = (_b = this.buffer.lineForRow(row)) !== null && _b !== void 0 ? _b : '';
            console.log('range:', range.toString());
            if (range.start.row === range.end.row) {
                from = range.start.column;
                to = range.end.column;
                let before = line.substring(0, from);
                let after = line.substring(to);
                let middle = line.substring(from, to);
                line = `${before}<span class="match highlight-info">${middle}</span>${after}`;
            }
            this.textLine = line;
            return line;
        });
    }
    update({ relativePath, reference, isSelected = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            let changed = false;
            if (this.relativePath !== relativePath) {
                this.relativePath = relativePath;
                console.log('relative path changed');
                changed = true;
            }
            if (this.reference !== reference) {
                this.buffer = undefined;
                this.textLine = undefined;
                this.reference = reference;
                console.log('reference changed');
                yield this.getLineForReference();
                changed = true;
            }
            if (this.isSelected !== isSelected) {
                console.log('isSelected changed');
                this.isSelected = isSelected;
                changed = true;
            }
            return changed ? etch_1.default.update(this) : Promise.resolve();
        });
    }
    get props() {
        return {
            relativePath: this.relativePath,
            reference: this.reference,
            isSelected: this.isSelected,
            navigationIndex: this.navigationIndex,
            activeNavigationIndex: this.activeNavigationIndex
        };
    }
    get lineNumber() {
        return this.reference.range.start.row + 1;
    }
    updatePartial(props) {
        let newProps = Object.assign(Object.assign({}, this.props), props);
        return this.update(newProps);
    }
    render() {
        // console.log('ReferenceRowView render:', this.reference);
        let { relativePath } = this;
        if (atom.project) {
            let [rootPath, _] = atom.project.relativize(this.reference.uri);
            if (rootPath && atom.project.getDirectories().length > 1) {
                relativePath = path_1.default.join(path_1.default.basename(rootPath), relativePath);
            }
        }
        let classNames = (0, classnames_1.default)('list-item', 'match-row', {
            'selected': this.isSelected
        });
        return (etch_1.default.dom("li", { className: classNames, dataset: {
                navigationIndex: String(this.navigationIndex),
                lineNumber: String(this.lineNumber - 1),
                filePath: this.relativePath,
                range: this.reference.range.toString()
            } },
            etch_1.default.dom("span", { className: "line-number" }, this.lineNumber),
            etch_1.default.dom("span", { className: "preview", innerHTML: this.textLine })));
    }
}
exports.default = ReferenceRowView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLXJvdy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL3JlZmVyZW5jZS1yb3ctdmlldy50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSwrQkFBa0M7QUFDbEMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFVNUIsTUFBcUIsZ0JBQWdCO0lBY25DLFlBQVksRUFDVixZQUFZLEVBQ1osU0FBUyxFQUNULGVBQWUsRUFDZixxQkFBcUIsR0FBRyxDQUFDLENBQUMsRUFDMUIsVUFBVSxHQUFHLEtBQUssRUFDUztRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLENBQUM7UUFFbkQsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsY0FBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxPQUFPO1FBQ0wsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFSyxtQkFBbUI7OztZQUN2QixJQUFJLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUV4QyxNQUFBLElBQUksQ0FBQyxNQUFNLG9DQUFYLElBQUksQ0FBQyxNQUFNLEdBQUssTUFBTSxpQkFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFDO1lBQzFELElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQy9CLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBQzFCLElBQUksSUFBSSxHQUFHLElBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQzNCLElBQUksSUFBSSxHQUFHLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG1DQUFJLEVBQUUsQ0FBQztZQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN4QyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDMUIsRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO2dCQUN0QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDckMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBRXRDLElBQUksR0FBRyxHQUFHLE1BQU0sc0NBQXNDLE1BQU0sVUFBVSxLQUFLLEVBQUUsQ0FBQztZQUNoRixDQUFDO1lBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUM7O0tBQ2I7SUFFSyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsR0FBRyxLQUFLLEVBQThCOztZQUN0RixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDcEIsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztnQkFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO2dCQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDakMsTUFBTSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDakMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNqQixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO2dCQUM3QixPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLENBQUM7WUFFRCxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3pELENBQUM7S0FBQTtJQUVELElBQUksS0FBSztRQUNQLE9BQU87WUFDTCxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7WUFDckMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtTQUNsRCxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELGFBQWEsQ0FBQyxLQUEwQztRQUN0RCxJQUFJLFFBQVEsbUNBQ1AsSUFBSSxDQUFDLEtBQUssR0FDVixLQUFLLENBQ1QsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsTUFBTTtRQUNKLDJEQUEyRDtRQUMzRCxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRSxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekQsWUFBWSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQ3RCLGNBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFlBQVksQ0FDYixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLFVBQVUsR0FBRyxJQUFBLG9CQUFFLEVBQ2pCLFdBQVcsRUFDWCxXQUFXLEVBQ1g7WUFDRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDNUIsQ0FDRixDQUFDO1FBQ0YsT0FBTyxDQUNMLDJCQUFJLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFO2dCQUNsQyxlQUFlLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7Z0JBQzdDLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZDLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTthQUN2QztZQUNDLDZCQUFNLFNBQVMsRUFBQyxhQUFhLElBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBUTtZQUN0RCw2QkFBTSxTQUFTLEVBQUMsU0FBUyxFQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFJLENBQ25ELENBQ04sQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXZJRCxtQ0F1SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuaW1wb3J0IHsgVGV4dEJ1ZmZlciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IGV0Y2ggZnJvbSAnZXRjaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjeCBmcm9tICdjbGFzc25hbWVzJztcblxudHlwZSBSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcyA9IHtcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gIHJlZmVyZW5jZTogUmVmZXJlbmNlLFxuICBpc1NlbGVjdGVkPzogYm9vbGVhbixcbiAgYWN0aXZlTmF2aWdhdGlvbkluZGV4PzogbnVtYmVyXG4gIG5hdmlnYXRpb25JbmRleDogbnVtYmVyLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVmZXJlbmNlUm93VmlldyB7XG4gIHB1YmxpYyByZWxhdGl2ZVBhdGg6IHN0cmluZztcbiAgcHVibGljIHJlZmVyZW5jZTogUmVmZXJlbmNlO1xuICBwdWJsaWMgaXNTZWxlY3RlZDogYm9vbGVhbjtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcblxuICBwcm90ZWN0ZWQgbmF2aWdhdGlvbkluZGV4OiBudW1iZXI7XG4gIHByb3RlY3RlZCBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IG51bWJlcjtcblxuICBwcml2YXRlIGJ1ZmZlcj86IFRleHRCdWZmZXI7XG4gIHByaXZhdGUgdGV4dExpbmU/OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioe1xuICAgIHJlbGF0aXZlUGF0aCxcbiAgICByZWZlcmVuY2UsXG4gICAgbmF2aWdhdGlvbkluZGV4LFxuICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IC0xLFxuICAgIGlzU2VsZWN0ZWQgPSBmYWxzZVxuICB9OiBSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcykge1xuICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgIHRoaXMucmVmZXJlbmNlID0gcmVmZXJlbmNlO1xuICAgIHRoaXMuaXNTZWxlY3RlZCA9IGlzU2VsZWN0ZWQ7XG4gICAgdGhpcy5uYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG5cbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG4gICAgdGhpcy5nZXRMaW5lRm9yUmVmZXJlbmNlKCkudGhlbigoKSA9PiBldGNoLnVwZGF0ZSh0aGlzKSk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHJldHVybiBldGNoLmRlc3Ryb3kodGhpcyk7XG4gIH1cblxuICBhc3luYyBnZXRMaW5lRm9yUmVmZXJlbmNlKCkge1xuICAgIGlmICh0aGlzLnRleHRMaW5lKSByZXR1cm4gdGhpcy50ZXh0TGluZTtcblxuICAgIHRoaXMuYnVmZmVyID8/PSBhd2FpdCBUZXh0QnVmZmVyLmxvYWQodGhpcy5yZWZlcmVuY2UudXJpKTtcbiAgICBsZXQgeyByYW5nZSB9ID0gdGhpcy5yZWZlcmVuY2U7XG4gICAgbGV0IHJvdyA9IHJhbmdlLnN0YXJ0LnJvdztcbiAgICBsZXQgZnJvbSA9IG51bGwsIHRvID0gbnVsbDtcbiAgICBsZXQgbGluZSA9IHRoaXMuYnVmZmVyLmxpbmVGb3JSb3cocm93KSA/PyAnJztcbiAgICBjb25zb2xlLmxvZygncmFuZ2U6JywgcmFuZ2UudG9TdHJpbmcoKSk7XG4gICAgaWYgKHJhbmdlLnN0YXJ0LnJvdyA9PT0gcmFuZ2UuZW5kLnJvdykge1xuICAgICAgZnJvbSA9IHJhbmdlLnN0YXJ0LmNvbHVtbjtcbiAgICAgIHRvID0gcmFuZ2UuZW5kLmNvbHVtbjtcbiAgICAgIGxldCBiZWZvcmUgPSBsaW5lLnN1YnN0cmluZygwLCBmcm9tKTtcbiAgICAgIGxldCBhZnRlciA9IGxpbmUuc3Vic3RyaW5nKHRvKTtcbiAgICAgIGxldCBtaWRkbGUgPSBsaW5lLnN1YnN0cmluZyhmcm9tLCB0byk7XG5cbiAgICAgIGxpbmUgPSBgJHtiZWZvcmV9PHNwYW4gY2xhc3M9XCJtYXRjaCBoaWdobGlnaHQtaW5mb1wiPiR7bWlkZGxlfTwvc3Bhbj4ke2FmdGVyfWA7XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0TGluZSA9IGxpbmU7XG4gICAgcmV0dXJuIGxpbmU7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoeyByZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZSwgaXNTZWxlY3RlZCA9IGZhbHNlIH06IFJlZmVyZW5jZVJvd1ZpZXdQcm9wZXJ0aWVzKSB7XG4gICAgbGV0IGNoYW5nZWQgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5yZWxhdGl2ZVBhdGggIT09IHJlbGF0aXZlUGF0aCkge1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGggPSByZWxhdGl2ZVBhdGg7XG4gICAgICBjb25zb2xlLmxvZygncmVsYXRpdmUgcGF0aCBjaGFuZ2VkJyk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMucmVmZXJlbmNlICE9PSByZWZlcmVuY2UpIHtcbiAgICAgIHRoaXMuYnVmZmVyID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy50ZXh0TGluZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMucmVmZXJlbmNlID0gcmVmZXJlbmNlO1xuICAgICAgY29uc29sZS5sb2coJ3JlZmVyZW5jZSBjaGFuZ2VkJyk7XG4gICAgICBhd2FpdCB0aGlzLmdldExpbmVGb3JSZWZlcmVuY2UoKTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc1NlbGVjdGVkICE9PSBpc1NlbGVjdGVkKSB7XG4gICAgICBjb25zb2xlLmxvZygnaXNTZWxlY3RlZCBjaGFuZ2VkJyk7XG4gICAgICB0aGlzLmlzU2VsZWN0ZWQgPSBpc1NlbGVjdGVkO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZWQgPyBldGNoLnVwZGF0ZSh0aGlzKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgZ2V0IHByb3BzKCk6IFJlZmVyZW5jZVJvd1ZpZXdQcm9wZXJ0aWVzIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVsYXRpdmVQYXRoOiB0aGlzLnJlbGF0aXZlUGF0aCxcbiAgICAgIHJlZmVyZW5jZTogdGhpcy5yZWZlcmVuY2UsXG4gICAgICBpc1NlbGVjdGVkOiB0aGlzLmlzU2VsZWN0ZWQsXG4gICAgICBuYXZpZ2F0aW9uSW5kZXg6IHRoaXMubmF2aWdhdGlvbkluZGV4LFxuICAgICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4OiB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleFxuICAgIH07XG4gIH1cblxuICBnZXQgbGluZU51bWJlcigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZmVyZW5jZS5yYW5nZS5zdGFydC5yb3cgKyAxO1xuICB9XG5cbiAgdXBkYXRlUGFydGlhbChwcm9wczogUGFydGlhbDxSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcz4pIHtcbiAgICBsZXQgbmV3UHJvcHM6IFJlZmVyZW5jZVJvd1ZpZXdQcm9wZXJ0aWVzID0ge1xuICAgICAgLi4udGhpcy5wcm9wcyxcbiAgICAgIC4uLnByb3BzXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUobmV3UHJvcHMpO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdSZWZlcmVuY2VSb3dWaWV3IHJlbmRlcjonLCB0aGlzLnJlZmVyZW5jZSk7XG4gICAgbGV0IHsgcmVsYXRpdmVQYXRoIH0gPSB0aGlzO1xuICAgIGlmIChhdG9tLnByb2plY3QpIHtcbiAgICAgIGxldCBbcm9vdFBhdGgsIF9dID0gYXRvbS5wcm9qZWN0LnJlbGF0aXZpemUodGhpcy5yZWZlcmVuY2UudXJpKTtcbiAgICAgIGlmIChyb290UGF0aCAmJiBhdG9tLnByb2plY3QuZ2V0RGlyZWN0b3JpZXMoKS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJlbGF0aXZlUGF0aCA9IFBhdGguam9pbihcbiAgICAgICAgICBQYXRoLmJhc2VuYW1lKHJvb3RQYXRoKSxcbiAgICAgICAgICByZWxhdGl2ZVBhdGhcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBjeChcbiAgICAgICdsaXN0LWl0ZW0nLFxuICAgICAgJ21hdGNoLXJvdycsXG4gICAgICB7XG4gICAgICAgICdzZWxlY3RlZCc6IHRoaXMuaXNTZWxlY3RlZFxuICAgICAgfVxuICAgICk7XG4gICAgcmV0dXJuIChcbiAgICAgIDxsaSBjbGFzc05hbWU9e2NsYXNzTmFtZXN9IGRhdGFzZXQ9e3tcbiAgICAgICAgbmF2aWdhdGlvbkluZGV4OiBTdHJpbmcodGhpcy5uYXZpZ2F0aW9uSW5kZXgpLFxuICAgICAgICBsaW5lTnVtYmVyOiBTdHJpbmcodGhpcy5saW5lTnVtYmVyIC0gMSksXG4gICAgICAgIGZpbGVQYXRoOiB0aGlzLnJlbGF0aXZlUGF0aCxcbiAgICAgICAgcmFuZ2U6IHRoaXMucmVmZXJlbmNlLnJhbmdlLnRvU3RyaW5nKClcbiAgICAgIH19PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJsaW5lLW51bWJlclwiPnt0aGlzLmxpbmVOdW1iZXJ9PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJwcmV2aWV3XCIgaW5uZXJIVE1MPXt0aGlzLnRleHRMaW5lfSAvPlxuICAgICAgPC9saT5cbiAgICApO1xuICB9XG59XG4iXX0=