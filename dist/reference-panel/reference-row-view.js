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
        let { relativePath, reference, navigationIndex, activeNavigationIndex = -1, isSelected = false, bufferCache } = props;
        console.debug('ReferenceRowView constructor:', props);
        this.relativePath = relativePath;
        this.reference = reference;
        this.isSelected = isSelected;
        this.navigationIndex = navigationIndex;
        this.activeNavigationIndex = activeNavigationIndex;
        this.bufferCache = bufferCache;
        etch_1.default.initialize(this);
        this.getLineForReference().then(() => etch_1.default.update(this));
    }
    destroy() {
        return etch_1.default.destroy(this);
    }
    getLineForReference() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.textLine)
                return this.textLine;
            // The language server’s results are positioned according to the current
            // state of the project — including what may be any number of unsaved
            // buffers that have local changes.
            //
            // For this reason, we must reuse a buffer in the workspace if it exists
            // before giving up and loading from disk.
            if (!this.buffer) {
                this.buffer = (_b = (_a = this.bufferCache) === null || _a === void 0 ? void 0 : _a.get(this.reference.uri)) !== null && _b !== void 0 ? _b : yield atom_1.TextBuffer.load(this.reference.uri);
            }
            if (!this.buffer) {
                throw new Error('No buffer');
            }
            let textLineParts = undefined;
            let { range } = this.reference;
            let row = range.start.row;
            let from = null, to = null;
            let line = (_c = this.buffer.lineForRow(row)) !== null && _c !== void 0 ? _c : '';
            if (range.start.row === range.end.row) {
                from = range.start.column;
                to = range.end.column;
                let before = line.substring(0, from);
                let after = line.substring(to);
                let middle = line.substring(from, to);
                textLineParts = [before, middle, after];
            }
            this.textLineParts = textLineParts;
            this.textLine = line;
            return line;
        });
    }
    update(newProps) {
        return __awaiter(this, void 0, void 0, function* () {
            let props = Object.assign(Object.assign({}, this.props), newProps);
            let { relativePath, reference, isSelected = false, bufferCache } = props;
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
            if (this.bufferCache !== bufferCache) {
                this.bufferCache = bufferCache;
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
            activeNavigationIndex: this.activeNavigationIndex,
            bufferCache: this.bufferCache
        };
    }
    get lineNumber() {
        return this.reference.range.start.row + 1;
    }
    render() {
        var _a;
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
        let [before, middle, after] = (_a = this.textLineParts) !== null && _a !== void 0 ? _a : ['', '', ''];
        return (etch_1.default.dom("li", { className: classNames, dataset: {
                navigationIndex: String(this.navigationIndex),
                lineNumber: String(this.lineNumber - 1),
                filePath: this.relativePath,
                range: this.reference.range.toString()
            } },
            etch_1.default.dom("span", { className: "line-number" }, this.lineNumber),
            etch_1.default.dom("span", { className: "preview" },
                before,
                etch_1.default.dom("span", { className: "match highlight-info" }, middle),
                after)));
    }
}
exports.default = ReferenceRowView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLXJvdy12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JlZmVyZW5jZS1wYW5lbC9yZWZlcmVuY2Utcm93LXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBa0M7QUFDbEMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFFNUIsb0RBQXNDO0FBYXRDLE1BQXFCLGdCQUFnQjtJQWdCbkMsWUFBWSxLQUFpQztRQUMzQyxJQUFJLEVBQ0YsWUFBWSxFQUNaLFNBQVMsRUFDVCxlQUFlLEVBQ2YscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLEVBQzFCLFVBQVUsR0FBRyxLQUFLLEVBQ2xCLFdBQVcsRUFDWixHQUFHLEtBQUssQ0FBQztRQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7UUFDdkMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO1FBQ25ELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBRS9CLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsT0FBTztRQUNMLE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUssbUJB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dGVudCI6WyJpbXBvcnQgeyBUZXh0QnVmZmVyIH0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgZXRjaCBmcm9tICdldGNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGN4IGZyb20gJ2NsYXNzbmFtZXMnO1xuXG5pbXBvcnQgKiBhcyBjb25zb2xlIGZyb20gJy4uL2NvbnNvbGUnO1xuXG5pbXBvcnQgdHlwZSB7IFJlZmVyZW5jZSB9IGZyb20gJ2F0b20taWRlLWJhc2UnO1xuXG50eXBlIFJlZmVyZW5jZVJvd1ZpZXdQcm9wZXJ0aWVzID0ge1xuICByZWxhdGl2ZVBhdGg6IHN0cmluZyxcbiAgcmVmZXJlbmNlOiBSZWZlcmVuY2UsXG4gIGlzU2VsZWN0ZWQ/OiBib29sZWFuLFxuICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg/OiBudW1iZXJcbiAgbmF2aWdhdGlvbkluZGV4OiBudW1iZXIsXG4gIGJ1ZmZlckNhY2hlPzogTWFwPHN0cmluZywgVGV4dEJ1ZmZlcj5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlZmVyZW5jZVJvd1ZpZXcge1xuICBwdWJsaWMgcmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIHB1YmxpYyByZWZlcmVuY2U6IFJlZmVyZW5jZTtcbiAgcHVibGljIGlzU2VsZWN0ZWQ6IGJvb2xlYW47XG5cbiAgcHVibGljIGVsZW1lbnQhOiBIVE1MRWxlbWVudDtcbiAgcHVibGljIHJlZnMhOiB7IFtrZXk6IHN0cmluZ106IEhUTUxFbGVtZW50IH07XG5cbiAgcHJvdGVjdGVkIG5hdmlnYXRpb25JbmRleDogbnVtYmVyO1xuICBwcm90ZWN0ZWQgYWN0aXZlTmF2aWdhdGlvbkluZGV4OiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBidWZmZXI/OiBUZXh0QnVmZmVyO1xuICBwcml2YXRlIHRleHRMaW5lPzogc3RyaW5nO1xuICBwcml2YXRlIHRleHRMaW5lUGFydHM/OiBbc3RyaW5nLCBzdHJpbmcsIHN0cmluZ11cbiAgcHJpdmF0ZSBidWZmZXJDYWNoZT86IE1hcDxzdHJpbmcsIFRleHRCdWZmZXI+O1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzOiBSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcykge1xuICAgIGxldCB7XG4gICAgICByZWxhdGl2ZVBhdGgsXG4gICAgICByZWZlcmVuY2UsXG4gICAgICBuYXZpZ2F0aW9uSW5kZXgsXG4gICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSAtMSxcbiAgICAgIGlzU2VsZWN0ZWQgPSBmYWxzZSxcbiAgICAgIGJ1ZmZlckNhY2hlXG4gICAgfSA9IHByb3BzO1xuICAgIGNvbnNvbGUuZGVidWcoJ1JlZmVyZW5jZVJvd1ZpZXcgY29uc3RydWN0b3I6JywgcHJvcHMpO1xuICAgIHRoaXMucmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoO1xuICAgIHRoaXMucmVmZXJlbmNlID0gcmVmZXJlbmNlO1xuICAgIHRoaXMuaXNTZWxlY3RlZCA9IGlzU2VsZWN0ZWQ7XG4gICAgdGhpcy5uYXZpZ2F0aW9uSW5kZXggPSBuYXZpZ2F0aW9uSW5kZXg7XG4gICAgdGhpcy5hY3RpdmVOYXZpZ2F0aW9uSW5kZXggPSBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg7XG4gICAgdGhpcy5idWZmZXJDYWNoZSA9IGJ1ZmZlckNhY2hlO1xuXG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpO1xuICAgIHRoaXMuZ2V0TGluZUZvclJlZmVyZW5jZSgpLnRoZW4oKCkgPT4gZXRjaC51cGRhdGUodGhpcykpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICByZXR1cm4gZXRjaC5kZXN0cm95KHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgZ2V0TGluZUZvclJlZmVyZW5jZSgpIHtcbiAgICBpZiAodGhpcy50ZXh0TGluZSkgcmV0dXJuIHRoaXMudGV4dExpbmU7XG5cbiAgICAvLyBUaGUgbGFuZ3VhZ2Ugc2VydmVy4oCZcyByZXN1bHRzIGFyZSBwb3NpdGlvbmVkIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICAgIC8vIHN0YXRlIG9mIHRoZSBwcm9qZWN0IOKAlCBpbmNsdWRpbmcgd2hhdCBtYXkgYmUgYW55IG51bWJlciBvZiB1bnNhdmVkXG4gICAgLy8gYnVmZmVycyB0aGF0IGhhdmUgbG9jYWwgY2hhbmdlcy5cbiAgICAvL1xuICAgIC8vIEZvciB0aGlzIHJlYXNvbiwgd2UgbXVzdCByZXVzZSBhIGJ1ZmZlciBpbiB0aGUgd29ya3NwYWNlIGlmIGl0IGV4aXN0c1xuICAgIC8vIGJlZm9yZSBnaXZpbmcgdXAgYW5kIGxvYWRpbmcgZnJvbSBkaXNrLlxuICAgIGlmICghdGhpcy5idWZmZXIpIHtcbiAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXJDYWNoZT8uZ2V0KHRoaXMucmVmZXJlbmNlLnVyaSkgPz9cbiAgICAgICAgYXdhaXQgVGV4dEJ1ZmZlci5sb2FkKHRoaXMucmVmZXJlbmNlLnVyaSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWZmZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYnVmZmVyJylcbiAgICB9XG5cbiAgICBsZXQgdGV4dExpbmVQYXJ0czogW3N0cmluZywgc3RyaW5nLCBzdHJpbmddIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCB7IHJhbmdlIH0gPSB0aGlzLnJlZmVyZW5jZTtcbiAgICBsZXQgcm93ID0gcmFuZ2Uuc3RhcnQucm93O1xuICAgIGxldCBmcm9tID0gbnVsbCwgdG8gPSBudWxsO1xuICAgIGxldCBsaW5lID0gdGhpcy5idWZmZXIubGluZUZvclJvdyhyb3cpID8/ICcnO1xuICAgIGlmIChyYW5nZS5zdGFydC5yb3cgPT09IHJhbmdlLmVuZC5yb3cpIHtcbiAgICAgIGZyb20gPSByYW5nZS5zdGFydC5jb2x1bW47XG4gICAgICB0byA9IHJhbmdlLmVuZC5jb2x1bW47XG4gICAgICBsZXQgYmVmb3JlID0gbGluZS5zdWJzdHJpbmcoMCwgZnJvbSk7XG4gICAgICBsZXQgYWZ0ZXIgPSBsaW5lLnN1YnN0cmluZyh0byk7XG4gICAgICBsZXQgbWlkZGxlID0gbGluZS5zdWJzdHJpbmcoZnJvbSwgdG8pO1xuXG4gICAgICB0ZXh0TGluZVBhcnRzID0gW2JlZm9yZSwgbWlkZGxlLCBhZnRlcl07XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0TGluZVBhcnRzID0gdGV4dExpbmVQYXJ0cztcbiAgICB0aGlzLnRleHRMaW5lID0gbGluZTtcbiAgICByZXR1cm4gbGluZTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZShuZXdQcm9wczogUGFydGlhbDxSZWZlcmVuY2VSb3dWaWV3UHJvcGVydGllcz4pIHtcbiAgICBsZXQgcHJvcHMgPSB7IC4uLnRoaXMucHJvcHMsIC4uLm5ld1Byb3BzIH07XG5cbiAgICBsZXQgeyByZWxhdGl2ZVBhdGgsIHJlZmVyZW5jZSwgaXNTZWxlY3RlZCA9IGZhbHNlLCBidWZmZXJDYWNoZSB9ID0gcHJvcHM7XG4gICAgbGV0IGNoYW5nZWQgPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLnJlbGF0aXZlUGF0aCAhPT0gcmVsYXRpdmVQYXRoKSB7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlUGF0aDtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJlZmVyZW5jZSAhPT0gcmVmZXJlbmNlKSB7XG4gICAgICB0aGlzLmJ1ZmZlciA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMudGV4dExpbmUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLnJlZmVyZW5jZSA9IHJlZmVyZW5jZTtcbiAgICAgIGF3YWl0IHRoaXMuZ2V0TGluZUZvclJlZmVyZW5jZSgpO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYnVmZmVyQ2FjaGUgIT09IGJ1ZmZlckNhY2hlKSB7XG4gICAgICB0aGlzLmJ1ZmZlckNhY2hlID0gYnVmZmVyQ2FjaGU7XG4gICAgICBhd2FpdCB0aGlzLmdldExpbmVGb3JSZWZlcmVuY2UoKTtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzU2VsZWN0ZWQgIT09IGlzU2VsZWN0ZWQpIHtcbiAgICAgIHRoaXMuaXNTZWxlY3RlZCA9IGlzU2VsZWN0ZWQ7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlZCA/IGV0Y2gudXBkYXRlKHRoaXMpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBnZXQgcHJvcHMoKTogUmVmZXJlbmNlUm93Vmlld1Byb3BlcnRpZXMge1xuICAgIHJldHVybiB7XG4gICAgICByZWxhdGl2ZVBhdGg6IHRoaXMucmVsYXRpdmVQYXRoLFxuICAgICAgcmVmZXJlbmNlOiB0aGlzLnJlZmVyZW5jZSxcbiAgICAgIGlzU2VsZWN0ZWQ6IHRoaXMuaXNTZWxlY3RlZCxcbiAgICAgIG5hdmlnYXRpb25JbmRleDogdGhpcy5uYXZpZ2F0aW9uSW5kZXgsXG4gICAgICBhY3RpdmVOYXZpZ2F0aW9uSW5kZXg6IHRoaXMuYWN0aXZlTmF2aWdhdGlvbkluZGV4LFxuICAgICAgYnVmZmVyQ2FjaGU6IHRoaXMuYnVmZmVyQ2FjaGVcbiAgICB9O1xuICB9XG5cbiAgZ2V0IGxpbmVOdW1iZXIoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5yZWZlcmVuY2UucmFuZ2Uuc3RhcnQucm93ICsgMTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBsZXQgeyByZWxhdGl2ZVBhdGggfSA9IHRoaXM7XG4gICAgaWYgKGF0b20ucHJvamVjdCkge1xuICAgICAgbGV0IFtyb290UGF0aCwgX10gPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZSh0aGlzLnJlZmVyZW5jZS51cmkpO1xuICAgICAgaWYgKHJvb3RQYXRoICYmIGF0b20ucHJvamVjdC5nZXREaXJlY3RvcmllcygpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgLy8gSWYgdGhlcmUncyBtb3JlIHRoYW4gb25lIHByb2plY3Qgcm9vdCwgYWRkIHRoZSBsYXN0IGNvbXBvbmVudCBvZlxuICAgICAgICAvLyBlYWNoIHJvb3QgdG8gdGhlIGZyb250IG9mIHRoZSBwYXRoIGluIG9yZGVyIHRvIGRpc2FtYmlndWF0ZS5cbiAgICAgICAgcmVsYXRpdmVQYXRoID0gUGF0aC5qb2luKFxuICAgICAgICAgIFBhdGguYmFzZW5hbWUocm9vdFBhdGgpLFxuICAgICAgICAgIHJlbGF0aXZlUGF0aFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgY2xhc3NOYW1lcyA9IGN4KFxuICAgICAgJ2xpc3QtaXRlbScsXG4gICAgICAnbWF0Y2gtcm93JyxcbiAgICAgIHtcbiAgICAgICAgJ3NlbGVjdGVkJzogdGhpcy5pc1NlbGVjdGVkXG4gICAgICB9XG4gICAgKTtcbiAgICBsZXQgW2JlZm9yZSwgbWlkZGxlLCBhZnRlcl0gPSB0aGlzLnRleHRMaW5lUGFydHMgPz8gWycnLCAnJywgJyddO1xuICAgIHJldHVybiAoXG4gICAgICA8bGkgY2xhc3NOYW1lPXtjbGFzc05hbWVzfSBkYXRhc2V0PXt7XG4gICAgICAgIG5hdmlnYXRpb25JbmRleDogU3RyaW5nKHRoaXMubmF2aWdhdGlvbkluZGV4KSxcbiAgICAgICAgbGluZU51bWJlcjogU3RyaW5nKHRoaXMubGluZU51bWJlciAtIDEpLFxuICAgICAgICBmaWxlUGF0aDogdGhpcy5yZWxhdGl2ZVBhdGgsXG4gICAgICAgIHJhbmdlOiB0aGlzLnJlZmVyZW5jZS5yYW5nZS50b1N0cmluZygpXG4gICAgICB9fT5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibGluZS1udW1iZXJcIj57dGhpcy5saW5lTnVtYmVyfTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHJldmlld1wiPlxuICAgICAgICAgIHtiZWZvcmV9PHNwYW4gY2xhc3NOYW1lPVwibWF0Y2ggaGlnaGxpZ2h0LWluZm9cIj57bWlkZGxlfTwvc3Bhbj57YWZ0ZXJ9XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvbGk+XG4gICAgKTtcbiAgfVxufVxuIl19