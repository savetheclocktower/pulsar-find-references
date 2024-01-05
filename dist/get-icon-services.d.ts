import { Disposable } from 'atom';
type IconService = any;
type Callback = () => any;
type EtchRefsCollection = {
    [key: string]: HTMLElement;
};
type EtchComponent = {
    refs: EtchRefsCollection;
    element: HTMLElement;
    iconDisposable?: Disposable;
};
export default function getIconServices(): IconServices;
export declare class IconServices {
    private emitter;
    private fileIcons;
    private elementIcons;
    private elementIconDisposables;
    constructor();
    onDidChange(callback: Callback): Disposable;
    resetElementIcons(): void;
    setElementIcons(service: IconService): void;
    setFileIcons(service: IconService): void;
    updateIcon(view: EtchComponent, filePath: string): void;
}
export {};
