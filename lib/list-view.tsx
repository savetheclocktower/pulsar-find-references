import etch from 'etch';
import type { EtchJSXElement } from 'etch';

type Item = any;

type ConstructorArgs<T> = {
  items: T[],
  heightForItem: (item: Item, index: number) => number,
  itemComponent: new () => T,
  className: string
};

export default class ListView {
  private items: Item[] | null = null;

  private heightForItem: ConstructorArgs<Item>['heightForItem'];

  private itemComponent: ConstructorArgs<Item>['itemComponent'];

  private className: string | null = null;

  private previousScrollTop: number = 0;
  private previousClientHeight: number = 0;

  private element: HTMLElement | null = null;

  constructor({ items, heightForItem, itemComponent, className }: ConstructorArgs<Item>) {
    this.items = items;
    this.heightForItem = heightForItem;
    this.itemComponent = itemComponent;
    this.className = className;

    etch.initialize(this);

    if (!this.element) {
      throw new Error(`Etch failed to initialize!`);
    }

    let resizeObserver = new ResizeObserver(() => etch.update(this));
    resizeObserver.observe(this.element);
    this.element.addEventListener('scroll', () => etch.update(this));
  }

  update({ items, heightForItem, itemComponent, className }: ConstructorArgs<Item>) {
    if (items) this.items = items;
    if (heightForItem) this.heightForItem = heightForItem;
    if (itemComponent) this.itemComponent = itemComponent;
    if (className) this.className = className;

    return etch.update(this);
  }

  render() {
    let children: EtchJSXElement[] | null = [];
    let itemTopPosition = 0;
    if (!this.items) return null;

    if (this.element) {
      let { scrollTop, clientHeight } = this.element;
      if (clientHeight > 0) {
        this.previousScrollTop = scrollTop;
        this.previousClientHeight = clientHeight;
      } else {
        scrollTop = this.previousScrollTop;
        clientHeight = this.previousClientHeight;
      }
      let scrollBottom = scrollTop + clientHeight;
      let i = 0;

      for (; i < this.items.length; i++) {
        let itemBottomPosition = itemTopPosition + this.heightForItem(this.items[i], i);
        if (itemBottomPosition > scrollTop) break;
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
        children.push(
          <div style={style} key={i}>
            <ItemComponent
              item={item}
              top={Math.max(0, scrollTop - itemTopPosition)}
              bottom={Math.min(itemHeight, scrollBottom - itemTopPosition)}
            />
          </div>
        );

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

    return (
      <div
        className="results-view-container"
        style={{ position: 'relative', height: '100%', overflow: 'auto' }}>
        <ol
          ref='list'
          className={this.className ?? ''}
          style={{height: `${itemTopPosition}px`}}
        >
          {children}
        </ol>
      </div>
    );
  }
}
