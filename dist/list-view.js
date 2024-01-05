"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const etch_1 = __importDefault(require("etch"));
class ListView {
    constructor({ items, heightForItem, itemComponent, className }) {
        this.items = null;
        this.className = null;
        this.previousScrollTop = 0;
        this.previousClientHeight = 0;
        this.element = null;
        this.items = items;
        this.heightForItem = heightForItem;
        this.itemComponent = itemComponent;
        this.className = className;
        etch_1.default.initialize(this);
        if (!this.element) {
            throw new Error(`Etch failed to initialize!`);
        }
        let resizeObserver = new ResizeObserver(() => etch_1.default.update(this));
        resizeObserver.observe(this.element);
        this.element.addEventListener('scroll', () => etch_1.default.update(this));
    }
    update({ items, heightForItem, itemComponent, className }) {
        if (items)
            this.items = items;
        if (heightForItem)
            this.heightForItem = heightForItem;
        if (itemComponent)
            this.itemComponent = itemComponent;
        if (className)
            this.className = className;
        return etch_1.default.update(this);
    }
    render() {
        var _a;
        let children = [];
        let itemTopPosition = 0;
        if (!this.items)
            return null;
        if (this.element) {
            let { scrollTop, clientHeight } = this.element;
            if (clientHeight > 0) {
                this.previousScrollTop = scrollTop;
                this.previousClientHeight = clientHeight;
            }
            else {
                scrollTop = this.previousScrollTop;
                clientHeight = this.previousClientHeight;
            }
            let scrollBottom = scrollTop + clientHeight;
            let i = 0;
            for (; i < this.items.length; i++) {
                let itemBottomPosition = itemTopPosition + this.heightForItem(this.items[i], i);
                if (itemBottomPosition > scrollTop)
                    break;
                itemTopPosition = itemBottomPosition;
            }
            const ItemComponent = this.itemComponent;
            for (; i < this.items.length; i++) {
                let item = this.items[i];
                let itemHeight = this.heightForItem(this.items[i], i);
                let style = {
                    position: 'absolute',
                    height: `${itemHeight}px`,
                    width: '100%',
                    top: `${itemTopPosition}px`
                };
                children.push(etch_1.default.dom("div", { style: style, key: i },
                    etch_1.default.dom(ItemComponent, { item: item, top: Math.max(0, scrollTop - itemTopPosition), bottom: Math.min(itemHeight, scrollBottom - itemTopPosition) })));
                itemTopPosition += itemHeight;
                if (itemTopPosition >= scrollBottom) {
                    i++;
                    break;
                }
                for (; i < this.items.length; i++) {
                    itemTopPosition += this.heightForItem(this.items[i], i);
                }
            }
        }
        return (etch_1.default.dom("div", { className: "results-view-container", style: { position: 'relative', height: '100%', overflow: 'auto' } },
            etch_1.default.dom("ol", { ref: 'list', className: (_a = this.className) !== null && _a !== void 0 ? _a : '', style: { height: `${itemTopPosition}px` } }, children)));
    }
}
exports.default = ListView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL2xpc3Qtdmlldy50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxnREFBd0I7QUFZeEIsTUFBcUIsUUFBUTtJQWMzQixZQUFZLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUF5QjtRQWI3RSxVQUFLLEdBQWtCLElBQUksQ0FBQztRQU01QixjQUFTLEdBQWtCLElBQUksQ0FBQztRQUVoQyxzQkFBaUIsR0FBVyxDQUFDLENBQUM7UUFDOUIseUJBQW9CLEdBQVcsQ0FBQyxDQUFDO1FBRWpDLFlBQU8sR0FBdUIsSUFBSSxDQUFDO1FBR3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBRTNCLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUVELElBQUksY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRSxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxjQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFB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LENBQUM7b0JBQ0osTUFBTTtnQkFDUixDQUFDO2dCQUNELE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2xDLGVBQWUsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sQ0FDTCw0QkFDRSxTQUFTLEVBQUMsd0JBQXdCLEVBQ2xDLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFO1lBQ2pFLDJCQUNFLEdBQUcsRUFBQyxNQUFNLEVBQ1YsU0FBUyxFQUFFLE1BQUEsSUFBSSxDQUFDLFNBQVMsbUNBQUksRUFBRSxFQUMvQixLQUFLLEVBQUUsRUFBQyxNQUFNLEVBQUUsR0FBRyxlQUFlLElBQUksRUFBQyxJQUV0QyxRQUFRLENBQ04sQ0FDRCxDQUNQLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE1R0QsMkJBNEdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV0Y2ggZnJvbSAnZXRjaCc7XG5pbXBvcnQgdHlwZSB7IEV0Y2hKU1hFbGVtZW50IH0gZnJvbSAnZXRjaCc7XG5cbnR5cGUgSXRlbSA9IGFueTtcblxudHlwZSBDb25zdHJ1Y3RvckFyZ3M8VD4gPSB7XG4gIGl0ZW1zOiBUW10sXG4gIGhlaWdodEZvckl0ZW06IChpdGVtOiBJdGVtLCBpbmRleDogbnVtYmVyKSA9PiBudW1iZXIsXG4gIGl0ZW1Db21wb25lbnQ6IG5ldyAoKSA9PiBULFxuICBjbGFzc05hbWU6IHN0cmluZ1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGlzdFZpZXcge1xuICBwcml2YXRlIGl0ZW1zOiBJdGVtW10gfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGhlaWdodEZvckl0ZW06IENvbnN0cnVjdG9yQXJnczxJdGVtPlsnaGVpZ2h0Rm9ySXRlbSddO1xuXG4gIHByaXZhdGUgaXRlbUNvbXBvbmVudDogQ29uc3RydWN0b3JBcmdzPEl0ZW0+WydpdGVtQ29tcG9uZW50J107XG5cbiAgcHJpdmF0ZSBjbGFzc05hbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgcHJldmlvdXNTY3JvbGxUb3A6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgcHJldmlvdXNDbGllbnRIZWlnaHQ6IG51bWJlciA9IDA7XG5cbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHsgaXRlbXMsIGhlaWdodEZvckl0ZW0sIGl0ZW1Db21wb25lbnQsIGNsYXNzTmFtZSB9OiBDb25zdHJ1Y3RvckFyZ3M8SXRlbT4pIHtcbiAgICB0aGlzLml0ZW1zID0gaXRlbXM7XG4gICAgdGhpcy5oZWlnaHRGb3JJdGVtID0gaGVpZ2h0Rm9ySXRlbTtcbiAgICB0aGlzLml0ZW1Db21wb25lbnQgPSBpdGVtQ29tcG9uZW50O1xuICAgIHRoaXMuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuXG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLmVsZW1lbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXRjaCBmYWlsZWQgdG8gaW5pdGlhbGl6ZSFgKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKCkgPT4gZXRjaC51cGRhdGUodGhpcykpO1xuICAgIHJlc2l6ZU9ic2VydmVyLm9ic2VydmUodGhpcy5lbGVtZW50KTtcbiAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKCkgPT4gZXRjaC51cGRhdGUodGhpcykpO1xuICB9XG5cbiAgdXBkYXRlKHsgaXRlbXMsIGhlaWdodEZvckl0ZW0sIGl0ZW1Db21wb25lbnQsIGNsYXNzTmFtZSB9OiBDb25zdHJ1Y3RvckFyZ3M8SXRlbT4pIHtcbiAgICBpZiAoaXRlbXMpIHRoaXMuaXRlbXMgPSBpdGVtcztcbiAgICBpZiAoaGVpZ2h0Rm9ySXRlbSkgdGhpcy5oZWlnaHRGb3JJdGVtID0gaGVpZ2h0Rm9ySXRlbTtcbiAgICBpZiAoaXRlbUNvbXBvbmVudCkgdGhpcy5pdGVtQ29tcG9uZW50ID0gaXRlbUNvbXBvbmVudDtcbiAgICBpZiAoY2xhc3NOYW1lKSB0aGlzLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcblxuICAgIHJldHVybiBldGNoLnVwZGF0ZSh0aGlzKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBsZXQgY2hpbGRyZW46IEV0Y2hKU1hFbGVtZW50W10gfCBudWxsID0gW107XG4gICAgbGV0IGl0ZW1Ub3BQb3NpdGlvbiA9IDA7XG4gICAgaWYgKCF0aGlzLml0ZW1zKSByZXR1cm4gbnVsbDtcblxuICAgIGlmICh0aGlzLmVsZW1lbnQpIHtcbiAgICAgIGxldCB7IHNjcm9sbFRvcCwgY2xpZW50SGVpZ2h0IH0gPSB0aGlzLmVsZW1lbnQ7XG4gICAgICBpZiAoY2xpZW50SGVpZ2h0ID4gMCkge1xuICAgICAgICB0aGlzLnByZXZpb3VzU2Nyb2xsVG9wID0gc2Nyb2xsVG9wO1xuICAgICAgICB0aGlzLnByZXZpb3VzQ2xpZW50SGVpZ2h0ID0gY2xpZW50SGVpZ2h0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsVG9wID0gdGhpcy5wcmV2aW91c1Njcm9sbFRvcDtcbiAgICAgICAgY2xpZW50SGVpZ2h0ID0gdGhpcy5wcmV2aW91c0NsaWVudEhlaWdodDtcbiAgICAgIH1cbiAgICAgIGxldCBzY3JvbGxCb3R0b20gPSBzY3JvbGxUb3AgKyBjbGllbnRIZWlnaHQ7XG4gICAgICBsZXQgaSA9IDA7XG5cbiAgICAgIGZvciAoOyBpIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgaXRlbUJvdHRvbVBvc2l0aW9uID0gaXRlbVRvcFBvc2l0aW9uICsgdGhpcy5oZWlnaHRGb3JJdGVtKHRoaXMuaXRlbXNbaV0sIGkpO1xuICAgICAgICBpZiAoaXRlbUJvdHRvbVBvc2l0aW9uID4gc2Nyb2xsVG9wKSBicmVhaztcbiAgICAgICAgaXRlbVRvcFBvc2l0aW9uID0gaXRlbUJvdHRvbVBvc2l0aW9uO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBJdGVtQ29tcG9uZW50ID0gdGhpcy5pdGVtQ29tcG9uZW50O1xuICAgICAgZm9yICg7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBpdGVtID0gdGhpcy5pdGVtc1tpXTtcbiAgICAgICAgbGV0IGl0ZW1IZWlnaHQgPSB0aGlzLmhlaWdodEZvckl0ZW0odGhpcy5pdGVtc1tpXSwgaSk7XG4gICAgICAgIGxldCBzdHlsZSA9IHtcbiAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICAgICBoZWlnaHQ6IGAke2l0ZW1IZWlnaHR9cHhgLFxuICAgICAgICAgIHdpZHRoOiAnMTAwJScsXG4gICAgICAgICAgdG9wOiBgJHtpdGVtVG9wUG9zaXRpb259cHhgXG4gICAgICAgIH07XG4gICAgICAgIGNoaWxkcmVuLnB1c2goXG4gICAgICAgICAgPGRpdiBzdHlsZT17c3R5bGV9IGtleT17aX0+XG4gICAgICAgICAgICA8SXRlbUNvbXBvbmVudFxuICAgICAgICAgICAgICBpdGVtPXtpdGVtfVxuICAgICAgICAgICAgICB0b3A9e01hdGgubWF4KDAsIHNjcm9sbFRvcCAtIGl0ZW1Ub3BQb3NpdGlvbil9XG4gICAgICAgICAgICAgIGJvdHRvbT17TWF0aC5taW4oaXRlbUhlaWdodCwgc2Nyb2xsQm90dG9tIC0gaXRlbVRvcFBvc2l0aW9uKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICk7XG5cbiAgICAgICAgaXRlbVRvcFBvc2l0aW9uICs9IGl0ZW1IZWlnaHQ7XG4gICAgICAgIGlmIChpdGVtVG9wUG9zaXRpb24gPj0gc2Nyb2xsQm90dG9tKSB7XG4gICAgICAgICAgaSsrO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoOyBpIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGl0ZW1Ub3BQb3NpdGlvbiArPSB0aGlzLmhlaWdodEZvckl0ZW0odGhpcy5pdGVtc1tpXSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdlxuICAgICAgICBjbGFzc05hbWU9XCJyZXN1bHRzLXZpZXctY29udGFpbmVyXCJcbiAgICAgICAgc3R5bGU9e3sgcG9zaXRpb246ICdyZWxhdGl2ZScsIGhlaWdodDogJzEwMCUnLCBvdmVyZmxvdzogJ2F1dG8nIH19PlxuICAgICAgICA8b2xcbiAgICAgICAgICByZWY9J2xpc3QnXG4gICAgICAgICAgY2xhc3NOYW1lPXt0aGlzLmNsYXNzTmFtZSA/PyAnJ31cbiAgICAgICAgICBzdHlsZT17e2hlaWdodDogYCR7aXRlbVRvcFBvc2l0aW9ufXB4YH19XG4gICAgICAgID5cbiAgICAgICAgICB7Y2hpbGRyZW59XG4gICAgICAgIDwvb2w+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG59XG4iXX0=