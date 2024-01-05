export default class ResultsPaneView {
    static URI: string;
    protected isLoading: boolean;
    private subscriptions;
    element: HTMLElement;
    refs: {
        [key: string]: HTMLElement;
    };
    constructor();
    update(): void;
    destroy(): void;
    render(): any;
    copy(): ResultsPaneView;
    getTitle(): string;
    getIconName(): string;
    getURI(): string;
    focus(): void;
}
