import etch from 'etch';
type Item = any;
type ConstructorArgs<T> = {
    items: T[];
    heightForItem: (item: Item, index: number) => number;
    itemComponent: new () => T;
    className: string;
};
export default class ListView {
    private items;
    private heightForItem;
    private itemComponent;
    private className;
    private previousScrollTop;
    private previousClientHeight;
    private element;
    constructor({ items, heightForItem, itemComponent, className }: ConstructorArgs<Item>);
    update({ items, heightForItem, itemComponent, className }: ConstructorArgs<Item>): Promise<void>;
    render(): etch.EtchElement<etch.TagSpec> | {
        text: string | number;
    } | null;
}
export {};
