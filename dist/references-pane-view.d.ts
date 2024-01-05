import etch from 'etch';
import type { EtchComponent } from 'etch';
import type { Reference } from 'atom-ide-base';
export default class ReferencesPaneView {
    static URI: string;
    static setReferences(references: Reference[]): void;
    protected isLoading: boolean;
    private subscriptions;
    element: HTMLElement;
    refs: {
        [key: string]: HTMLElement | EtchComponent;
    };
    references: Reference[];
    constructor();
    update(): void;
    destroy(): void;
    render(): etch.EtchJSXElement;
    copy(): ReferencesPaneView;
    getTitle(): string;
    getIconName(): string;
    getURI(): string;
    focus(): void;
}
