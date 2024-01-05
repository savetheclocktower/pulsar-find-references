"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
class References {
    constructor() {
        // static create(references: Reference[]) {
        //   if (references.length > 0) {
        //
        //   }
        // }
        this.emitter = new atom_1.Emitter();
        this.onContentsModified = this.onContentsModified.bind(this);
        atom.workspace.getCenter().observeActivePaneItem(item => {
            var _a;
            if (!('getPath' in item))
                return;
            if (item instanceof atom_1.TextEditor && atom.project.contains((_a = item.getPath()) !== null && _a !== void 0 ? _a : '')) {
                item.onDidStopChanging(() => this.onContentsModified(item));
            }
        });
    }
    onDidClear(callback) {
        return this.emitter.on('did-clear', callback);
    }
    onDidClearSearchState(callback) {
        return this.emitter.on('did-clear-search-state', callback);
    }
    onDidClearReplacementState(callback) {
        return this.emitter.on('did-clear-replacement-state', callback);
    }
    clear() {
        // TODO
    }
    onContentsModified(editor) {
    }
}
exports.default = References;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9yZWZlcmVuY2VzLW1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQTJDO0FBSzNDLE1BQXFCLFVBQVU7SUFVN0I7UUFSQSwyQ0FBMkM7UUFDM0MsaUNBQWlDO1FBQ2pDLEVBQUU7UUFDRixNQUFNO1FBQ04sSUFBSTtRQUVJLFlBQU8sR0FBWSxJQUFJLGNBQU8sRUFBRSxDQUFDO1FBR3ZDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7O1lBQ3RELElBQUksQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUM7Z0JBQUUsT0FBTztZQUNqQyxJQUFJLElBQUksWUFBWSxpQkFBVSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQUEsSUFBSSxDQUFDLE9BQU8sRUFBRSxtQ0FBSSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM5RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUQsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFVBQVUsQ0FBQyxRQUFrQjtRQUMzQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBa0I7UUFDdEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsMEJBQTBCLENBQUMsUUFBa0I7UUFDM0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyw2QkFBNkIsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsS0FBSztRQUNILE9BQU87SUFDVCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsTUFBa0I7SUFFckMsQ0FBQztDQUNGO0FBeENELDZCQXdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVtaXR0ZXIsIFRleHRFZGl0b3IgfSBmcm9tICdhdG9tJztcbmltcG9ydCB0eXBlIHsgUmVmZXJlbmNlIH0gZnJvbSAnYXRvbS1pZGUtYmFzZSc7XG5cbnR5cGUgQ2FsbGJhY2sgPSAoKSA9PiB2b2lkO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VzIHtcblxuICAvLyBzdGF0aWMgY3JlYXRlKHJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdKSB7XG4gIC8vICAgaWYgKHJlZmVyZW5jZXMubGVuZ3RoID4gMCkge1xuICAvL1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIHByaXZhdGUgZW1pdHRlcjogRW1pdHRlciA9IG5ldyBFbWl0dGVyKCk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5vbkNvbnRlbnRzTW9kaWZpZWQgPSB0aGlzLm9uQ29udGVudHNNb2RpZmllZC5iaW5kKHRoaXMpO1xuXG4gICAgYXRvbS53b3Jrc3BhY2UuZ2V0Q2VudGVyKCkub2JzZXJ2ZUFjdGl2ZVBhbmVJdGVtKGl0ZW0gPT4ge1xuICAgICAgaWYgKCEoJ2dldFBhdGgnIGluIGl0ZW0pKSByZXR1cm47XG4gICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFRleHRFZGl0b3IgJiYgYXRvbS5wcm9qZWN0LmNvbnRhaW5zKGl0ZW0uZ2V0UGF0aCgpID8/ICcnKSkge1xuICAgICAgICBpdGVtLm9uRGlkU3RvcENoYW5naW5nKCgpID0+IHRoaXMub25Db250ZW50c01vZGlmaWVkKGl0ZW0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG9uRGlkQ2xlYXIoY2FsbGJhY2s6IENhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNsZWFyJywgY2FsbGJhY2spO1xuICB9XG5cbiAgb25EaWRDbGVhclNlYXJjaFN0YXRlKGNhbGxiYWNrOiBDYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmVtaXR0ZXIub24oJ2RpZC1jbGVhci1zZWFyY2gtc3RhdGUnLCBjYWxsYmFjayk7XG4gIH1cblxuICBvbkRpZENsZWFyUmVwbGFjZW1lbnRTdGF0ZShjYWxsYmFjazogQ2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtY2xlYXItcmVwbGFjZW1lbnQtc3RhdGUnLCBjYWxsYmFjayk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICAvLyBUT0RPXG4gIH1cblxuICBvbkNvbnRlbnRzTW9kaWZpZWQoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG5cbiAgfVxufVxuIl19