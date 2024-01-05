"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const etch_1 = __importDefault(require("etch"));
const classnames_1 = __importDefault(require("classnames"));
const references_view_1 = __importDefault(require("./references-view"));
function isEtchComponent(el) {
    if (!el)
        return false;
    if (typeof el !== 'object')
        return false;
    return ('refs' in el) && ('element' in el);
}
let lastReferences;
class ReferencesPaneView {
    static setReferences(references) {
        console.log('ReferencesPaneView.setReferences:', references);
        lastReferences = references;
    }
    constructor() {
        this.isLoading = false;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.references = lastReferences;
        console.log('ReferencesPaneView references:', this.references);
        etch_1.default.initialize(this);
    }
    update() {
    }
    destroy() {
        this.subscriptions.dispose();
    }
    render() {
        console.log('ReferencesPaneView render!', this.references);
        let matchCount = this.references.length;
        let classNames = (0, classnames_1.default)('find-references-pane', 'preview-pane', 'pane-item', { 'no-results': matchCount === 0 });
        return (etch_1.default.dom("div", { className: classNames, tabIndex: -1 },
            etch_1.default.dom("div", { className: "preview-header" },
                etch_1.default.dom("span", { ref: "previewCount", className: "preview-count inline-block" }, 'Project search results')),
            etch_1.default.dom(references_view_1.default, { ref: "referencesView", references: this.references })));
    }
    copy() {
        return new ReferencesPaneView();
    }
    getTitle() {
        return 'Find References Results';
    }
    getIconName() {
        return 'search';
    }
    getURI() {
        return ReferencesPaneView.URI;
    }
    focus() {
        let referencesView = this.refs.referencesView;
        if (!isEtchComponent(referencesView))
            return;
        referencesView.element.focus();
    }
}
ReferencesPaneView.URI = "atom://pulsar-find-references/results";
exports.default = ReferencesPaneView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy1wYW5lLXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcmVmZXJlbmNlcy1wYW5lLXZpZXcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQ0EsK0JBQTJDO0FBQzNDLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFDNUIsd0VBQStDO0FBSS9DLFNBQVMsZUFBZSxDQUFDLEVBQVc7SUFDbEMsSUFBSSxDQUFDLEVBQUU7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN0QixJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN6QyxPQUFPLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFFRCxJQUFJLGNBQTJCLENBQUM7QUFFaEMsTUFBcUIsa0JBQWtCO0lBSXJDLE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBdUI7UUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3RCxjQUFjLEdBQUcsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFVRDtRQVJVLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFFN0Isa0JBQWEsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBT3JFLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9ELGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVELE1BQU07SUFDTixDQUFDO0lBRUQsT0FBTztRQUNMLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU07UUFDSixPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUN4QyxJQUFJLFVBQVUsR0FBRyxJQUFBLG9CQUFFLEVBQUMsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxFQUFFLFlBQVksRUFBRSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RyxPQUFPLENBQ0wsNEJBQUssU0FBUyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLDRCQUFLLFNBQVMsRUFBQyxnQkFBZ0I7Z0JBQzdCLDZCQUFNLEdBQUcsRUFBQyxjQUFjLEVBQUMsU0FBUyxFQUFDLDRCQUE0QixJQUM1RCx3QkFBd0IsQ0FFcEIsQ0FDSDtZQUNOLG1CQUFDLHlCQUFjLElBQUMsR0FBRyxFQUFDLGdCQUFnQixFQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFJLENBQ2hFLENBQ1AsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJO1FBQ0YsT0FBTyxJQUFJLGtCQUFrQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLHlCQUF5QixDQUFDO0lBQ25DLENBQUM7SUFFRCxXQUFXO1FBQ1QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU07UUFDSixPQUFPLGtCQUFrQixDQUFDLEdBQUcsQ0FBQztJQUNoQyxDQUFDO0lBRUQsS0FBSztRQUNILElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQzlDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDO1lBQUUsT0FBTztRQUM3QyxjQUFjLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2pDLENBQUM7O0FBakVNLHNCQUFHLEdBQUcsdUNBQXVDLEFBQTFDLENBQTJDO2tCQUZsQyxrQkFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IENvbXBvc2l0ZURpc3Bvc2FibGUgfSBmcm9tICdhdG9tJztcbmltcG9ydCBldGNoIGZyb20gJ2V0Y2gnO1xuaW1wb3J0IGN4IGZyb20gJ2NsYXNzbmFtZXMnO1xuaW1wb3J0IFJlZmVyZW5jZXNWaWV3IGZyb20gJy4vcmVmZXJlbmNlcy12aWV3JztcbmltcG9ydCB0eXBlIHsgRXRjaENvbXBvbmVudCB9IGZyb20gJ2V0Y2gnO1xuaW1wb3J0IHR5cGUgeyBSZWZlcmVuY2UgfSBmcm9tICdhdG9tLWlkZS1iYXNlJztcblxuZnVuY3Rpb24gaXNFdGNoQ29tcG9uZW50KGVsOiB1bmtub3duKTogZWwgaXMgRXRjaENvbXBvbmVudCB7XG4gIGlmICghZWwpIHJldHVybiBmYWxzZTtcbiAgaWYgKHR5cGVvZiBlbCAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICgncmVmcycgaW4gZWwpICYmICgnZWxlbWVudCcgaW4gZWwpO1xufVxuXG5sZXQgbGFzdFJlZmVyZW5jZXM6IFJlZmVyZW5jZVtdO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWZlcmVuY2VzUGFuZVZpZXcge1xuXG4gIHN0YXRpYyBVUkkgPSBcImF0b206Ly9wdWxzYXItZmluZC1yZWZlcmVuY2VzL3Jlc3VsdHNcIjtcblxuICBzdGF0aWMgc2V0UmVmZXJlbmNlcyhyZWZlcmVuY2VzOiBSZWZlcmVuY2VbXSkge1xuICAgIGNvbnNvbGUubG9nKCdSZWZlcmVuY2VzUGFuZVZpZXcuc2V0UmVmZXJlbmNlczonLCByZWZlcmVuY2VzKTtcbiAgICBsYXN0UmVmZXJlbmNlcyA9IHJlZmVyZW5jZXM7XG4gIH1cblxuICBwcm90ZWN0ZWQgaXNMb2FkaW5nOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICBwdWJsaWMgZWxlbWVudCE6IEhUTUxFbGVtZW50O1xuICBwdWJsaWMgcmVmcyE6IHsgW2tleTogc3RyaW5nXTogSFRNTEVsZW1lbnQgfCBFdGNoQ29tcG9uZW50IH07XG4gIHB1YmxpYyByZWZlcmVuY2VzOiBSZWZlcmVuY2VbXTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJlZmVyZW5jZXMgPSBsYXN0UmVmZXJlbmNlcztcbiAgICBjb25zb2xlLmxvZygnUmVmZXJlbmNlc1BhbmVWaWV3IHJlZmVyZW5jZXM6JywgdGhpcy5yZWZlcmVuY2VzKTtcbiAgICBldGNoLmluaXRpYWxpemUodGhpcyk7XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgY29uc29sZS5sb2coJ1JlZmVyZW5jZXNQYW5lVmlldyByZW5kZXIhJywgdGhpcy5yZWZlcmVuY2VzKTtcbiAgICBsZXQgbWF0Y2hDb3VudCA9IHRoaXMucmVmZXJlbmNlcy5sZW5ndGg7XG4gICAgbGV0IGNsYXNzTmFtZXMgPSBjeCgnZmluZC1yZWZlcmVuY2VzLXBhbmUnLCAncHJldmlldy1wYW5lJywgJ3BhbmUtaXRlbScsIHsgJ25vLXJlc3VsdHMnOiBtYXRjaENvdW50ID09PSAwIH0pO1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT17Y2xhc3NOYW1lc30gdGFiSW5kZXg9ey0xfT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwcmV2aWV3LWhlYWRlclwiPlxuICAgICAgICAgIDxzcGFuIHJlZj1cInByZXZpZXdDb3VudFwiIGNsYXNzTmFtZT1cInByZXZpZXctY291bnQgaW5saW5lLWJsb2NrXCI+XG4gICAgICAgICAgICB7J1Byb2plY3Qgc2VhcmNoIHJlc3VsdHMnfVxuICAgICAgICAgICAgey8qIFRPRE8gKi99XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPFJlZmVyZW5jZXNWaWV3IHJlZj1cInJlZmVyZW5jZXNWaWV3XCIgcmVmZXJlbmNlcz17dGhpcy5yZWZlcmVuY2VzfSAvPlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGNvcHkoKSB7XG4gICAgcmV0dXJuIG5ldyBSZWZlcmVuY2VzUGFuZVZpZXcoKTtcbiAgfVxuXG4gIGdldFRpdGxlKCkge1xuICAgIHJldHVybiAnRmluZCBSZWZlcmVuY2VzIFJlc3VsdHMnO1xuICB9XG5cbiAgZ2V0SWNvbk5hbWUoKSB7XG4gICAgcmV0dXJuICdzZWFyY2gnO1xuICB9XG5cbiAgZ2V0VVJJKCkge1xuICAgIHJldHVybiBSZWZlcmVuY2VzUGFuZVZpZXcuVVJJO1xuICB9XG5cbiAgZm9jdXMoKSB7XG4gICAgbGV0IHJlZmVyZW5jZXNWaWV3ID0gdGhpcy5yZWZzLnJlZmVyZW5jZXNWaWV3O1xuICAgIGlmICghaXNFdGNoQ29tcG9uZW50KHJlZmVyZW5jZXNWaWV3KSkgcmV0dXJuO1xuICAgIHJlZmVyZW5jZXNWaWV3LmVsZW1lbnQuZm9jdXMoKTtcbiAgfVxuXG5cblxufVxuIl19