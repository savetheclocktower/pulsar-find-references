import { TextEditor } from 'atom';
type Callback = () => void;
export default class References {
    private emitter;
    constructor();
    onDidClear(callback: Callback): import("atom").Disposable;
    onDidClearSearchState(callback: Callback): import("atom").Disposable;
    onDidClearReplacementState(callback: Callback): import("atom").Disposable;
    clear(): void;
    onContentsModified(editor: TextEditor): void;
}
export {};
