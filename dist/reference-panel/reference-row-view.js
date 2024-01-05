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
const console = __importStar(require("../console"));
class ReferenceRowView {
    constructor(props) {
        let { relativePath, reference, navigationIndex, activeNavigationIndex = -1, isSelected = false } = props;
        console.debug('ReferenceRowView constructor:', props);
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
    update(newProps) {
        return __awaiter(this, void 0, void 0, function* () {
            let props = Object.assign(Object.assign({}, this.props), { newProps });
            let { relativePath, reference, isSelected = false } = props;
            let changed = false;
            if (this.relativePath !== relativePath) {
                this.relativePath = relativePath;
                changed = true;
            }
            if (this.reference !== reference) {
                this.buffer = undefined;
                this.textLine = undefined;
                this.reference = reference;
                yield this.getLineForReference();
                changed = true;
            }
            if (this.isSelected !== isSelected) {
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
    render() {
        let { relativePath } = this;
        if (atom.project) {
            let [rootPath, _] = atom.project.relativize(this.reference.uri);
            if (rootPath && atom.project.getDirectories().length > 1) {
                // If there's more than one project root, add the last component of
                // each root to the front of the path in order to disambiguate.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLXJvdy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2Utcm93LXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBa0M7QUFDbEMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFFNUIsb0RBQXNDO0FBWXRDLE1BQXFCLGdCQUFnQjtJQWNuQyxZQUFZLEtBQWlDO1FBQzNDLElBQUksRUFDRixZQUFZLEVBQ1osU0FBUyxFQUNULGVBQWUsRUFDZixxQkFBcUIsR0FBRyxDQUFDLENBQUMsRUFDMUIsVUFBVSxHQUFHLEtBQUssRUFDbkIsR0FBRyxLQUFLLENBQUM7UUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQztRQUVuRCxjQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxjQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELE9BQU87UUFDTCxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVLLG1CQUFtQjs7O1lBQ3ZCLElBQUksSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxJQUFJ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TSxTQUFTLEVBQUMsYUFBYSxJQUFFLElBQUksQ0FBQyxVQUFVLENBQVE7WUFDdEQsNkJBQU0sU0FBUyxFQUFDLFNBQVMsRUFBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBSSxDQUNuRCxDQUNOLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFwSUQsbUNBb0lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGV4dEJ1ZmZlciB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IGV0Y2ggZnJvbSAnZXRjaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjeCBmcm9tICdjbGFzc25hbWVzJztcblxuaW1wb3J0ICogYXMgY29uc29sZSBmcm9tICcuLi9jb25zb2xlJztcblxuaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcblxudHlwZSBSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcyA9IHtcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gIHJlZmVyZW5jZTogUmVmZXJlbmNlLFxuICBpc1NlbGVjdGVkPzogYm9vbGVhbixcbiAgYWN0aXZlTmF2aWdhdGlvbkluZGV4PzogbnVtYmVyXG4gIG5hdmlnYXRpb25JbmRleDogbnVtYmVyLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVmZXJlbmNlUm93VmlldyB7XG4gIHB1YmxpYyByZWxhdGl2ZVBhdGg6IHN0cmluZztcbiAgcHVibGljIHJlZmVyZW5jZTogUmVmZXJlbmNlO1xuICBwdWJsaWMgaXNTZWxlY3RlZDogYm9vbGVhbjtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfTtcblxuICBwcm90ZWN0ZWQgbmF2aWdhdGlvbkluZGV4OiBudW1iZXI7XG4gIHByb3RlY3RlZCBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IG51bWJlcjtcblxuICBwcml2YXRlIGJ1ZmZlcj86IFRleHRCdWZmZXI7XG4gIHByaXZhdGUgdGV4dExpbmU/OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJvcHM6IFJlZmVyZW5jZVJvd1ZpZXdQcm9wZXJ0aWVzKSB7XG4gICAgbGV0IHtcbiAgICAgIHJlbGF0aXZlUGF0aCxcbiAgICAgIHJlZmVyZW5jZSxcbiAgICAgIG5hdmlnYXRpb25JbmRleCxcbiAgICAgIGFjdGl2ZU5hdmlnYXRpb25JbmRleCA9IC0xLFxuICAgICAgaXNTZWxlY3RlZCA9IGZhbHNlXG4gICAgfSA9IHByb3BzO1xuICAgIGNvbnNvbGUuZGVidWcoJ1JlZmVyZW5jZVJvd1ZpZXcgY29uc3RydWN0b3I6JywgcHJvcHMpO1xuICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgIHRoaXMucmVmZXJlbmNlID0gcmVmZXJlbmNlO1xuICAgIHRoaXMuaXNTZWxlY3RlZCA9IGlzU2VsZWN0ZWQ7XG4gICAgdGhpcy5uYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG5cbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG4gICAgdGhpcy5nZXRMaW5lRm9yUmVmZXJlbmNlKCkudGhlbigoKSA9PiBldGNoLnVwZGF0ZSh0aGlzKSk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHJldHVybiBldGNoLmRlc3Ryb3kodGhpcyk7XG4gIH1cblxuICBhc3luYyBnZXRMaW5lRm9yUmVmZXJlbmNlKCkge1xuICAgIGlmICh0aGlzLnRleHRMaW5lKSByZXR1cm4gdGhpcy50ZXh0TGluZTtcblxuICAgIHRoaXMuYnVmZmVyID8/PSBhd2FpdCBUZXh0QnVmZmVyLmxvYWQodGhpcy5yZWZlcmVuY2UudXJpKTtcbiAgICBsZXQgeyByYW5nZSB9ID0gdGhpcy5yZWZlcmVuY2U7XG4gICAgbGV0IHJvdyA9IHJhbmdlLnN0YXJ0LnJvdztcbiAgICBsZXQgZnJvbSA9IG51bGwsIHRvID0gbnVsbDtcbiAgICBsZXQgbGluZSA9IHRoaXMuYnVmZmVyLmxpbmVGb3JSb3cocm93KSA/PyAnJztcbiAgICBpZiAocmFuZ2Uuc3RhcnQucm93ID09PSByYW5nZS5lbmQucm93KSB7XG4gICAgICBmcm9tID0gcmFuZ2Uuc3RhcnQuY29sdW1uO1xuICAgICAgdG8gPSByYW5nZS5lbmQuY29sdW1uO1xuICAgICAgbGV0IGJlZm9yZSA9IGxpbmUuc3Vic3RyaW5nKDAsIGZyb20pO1xuICAgICAgbGV0IGFmdGVyID0gbGluZS5zdWJzdHJpbmcodG8pO1xuICAgICAgbGV0IG1pZGRsZSA9IGxpbmUuc3Vic3RyaW5nKGZyb20sIHRvKTtcblxuICAgICAgbGluZSA9IGAke2JlZm9yZX08c3BhbiBjbGFzcz1cIm1hdGNoIGhpZ2hsaWdodC1pbmZvXCI+JHttaWRkbGV9PC9zcGFuPiR7YWZ0ZXJ9YDtcbiAgICB9XG5cbiAgICB0aGlzLnRleHRMaW5lID0gbGluZTtcbiAgICByZXR1cm4gbGluZTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZShuZXdQcm9wczogUGFydGlhbDxSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcz4pIHtcbiAgICBsZXQgcHJvcHMgPSB7IC4uLnRoaXMucHJvcHMsIG5ld1Byb3BzIH07XG5cbiAgICBsZXQgeyByZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZSwgaXNTZWxlY3RlZCA9IGZhbHNlIH0gPSBwcm9wcztcbiAgICBsZXQgY2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMucmVsYXRpdmVQYXRoICE9PSByZWxhdGl2ZVBhdGgpIHtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVmZXJlbmNlICE9PSByZWZlcmVuY2UpIHtcbiAgICAgIHRoaXMuYnVmZmVyID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy50ZXh0TGluZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMucmVmZXJlbmNlID0gcmVmZXJlbmNlO1xuICAgICAgYXdhaXQgdGhpcy5nZXRMaW5lRm9yUmVmZXJlbmNlKCk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1NlbGVjdGVkICE9PSBpc1NlbGVjdGVkKSB7XG4gICAgICB0aGlzLmlzU2VsZWN0ZWQgPSBpc1NlbGVjdGVkO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZWQgPyBldGNoLnVwZGF0ZSh0aGlzKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgZ2V0IHByb3BzKCk6IFJlZmVyZW5jZVJvd1ZpZXdQcm9wZXJ0aWVzIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVsYXRpdmVQYXRoOiB0aGlzLnJlbGF0aXZlUGF0aCxcbiAgICAgIHJlZmVyZW5jZTogdGhpcy5yZWZlcmVuY2UsXG4gICAgICBpc1NlbGVjdGVkOiB0aGlzLmlzU2VsZWN0ZWQsXG4gICAgICBuYXZpZ2F0aW9uSW5kZXg6IHRoaXMubmF2aWdhdGlvbkluZGV4LFxuICAgICAgYWN0aXZlTmF2aWdhdGlvbkluZGV4OiB0aGlzLmFjdGl2ZU5hdmlnYXRpb25JbmRleFxuICAgIH07XG4gIH1cblxuICBnZXQgbGluZU51bWJlcigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZmVyZW5jZS5yYW5nZS5zdGFydC5yb3cgKyAxO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIGxldCB7IHJlbGF0aXZlUGF0aCB9ID0gdGhpcztcbiAgICBpZiAoYXRvbS5wcm9qZWN0KSB7XG4gICAgICBsZXQgW3Jvb3RQYXRoLCBfXSA9IGF0b20ucHJvamVjdC5yZWxhdGl2aXplKHRoaXMucmVmZXJlbmNlLnVyaSk7XG4gICAgICBpZiAocm9vdFBhdGggJiYgYXRvbS5wcm9qZWN0LmdldERpcmVjdG9yaWVzKCkubGVuZ3RoID4gMSkge1xuICAgICAgICAvLyBJZiB0aGVyZSdzIG1vcmUgdGhhbiBvbmUgcHJvamVjdCByb290LCBhZGQgdGhlIGxhc3QgY29tcG9uZW50IG9mXG4gICAgICAgIC8vIGVhY2ggcm9vdCB0byB0aGUgZnJvbnQgb2YgdGhlIHBhdGggaW4gb3JkZXIgdG8gZGlzYW1iaWd1YXRlLlxuICAgICAgICByZWxhdGl2ZVBhdGggPSBQYXRoLmpvaW4oXG4gICAgICAgICAgUGF0aC5iYXNlbmFtZShyb290UGF0aCksXG4gICAgICAgICAgcmVsYXRpdmVQYXRoXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBjbGFzc05hbWVzID0gY3goXG4gICAgICAnbGlzdC1pdGVtJyxcbiAgICAgICdtYXRjaC1yb3cnLFxuICAgICAge1xuICAgICAgICAnc2VsZWN0ZWQnOiB0aGlzLmlzU2VsZWN0ZWRcbiAgICAgIH1cbiAgICApO1xuICAgIHJldHVybiAoXG4gICAgICA8bGkgY2xhc3NOYW1lPXtjbGFzc05hbWVzfSBkYXRhc2V0PXt7XG4gICAgICAgIG5hdmlnYXRpb25JbmRleDogU3RyaW5nKHRoaXMubmF2aWdhdGlvbkluZGV4KSxcbiAgICAgICAgbGluZU51bWJlcjogU3RyaW5nKHRoaXMubGluZU51bWJlciAtIDEpLFxuICAgICAgICBmaWxlUGF0aDogdGhpcy5yZWxhdGl2ZVBhdGgsXG4gICAgICAgIHJhbmdlOiB0aGlzLnJlZmVyZW5jZS5yYW5nZS50b1N0cmluZygpXG4gICAgICB9fT5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibGluZS1udW1iZXJcIj57dGhpcy5saW5lTnVtYmVyfTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHJldmlld1wiIGlubmVySFRNTD17dGhpcy50ZXh0TGluZX0gLz5cbiAgICAgIDwvbGk+XG4gICAgKTtcbiAgfVxufVxuIl19