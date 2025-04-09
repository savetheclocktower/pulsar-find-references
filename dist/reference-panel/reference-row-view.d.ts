import { TextBuffer } from 'atom';
import etch from 'etch';
import type { Reference } from 'atom-ide-base';
type ReferenceRowViewProperties = {
    relativePath: string;
    reference: Reference;
    isSelected?: boolean;
    activeNavigationIndex?: number;
    navigationIndex: number;
    bufferCache?: Map<string, TextBuffer>;
};
export default class ReferenceRowView {
    relativePath: string;
    reference: Reference;
    isSelected: boolean;
    element: HTMLElement;
    refs: {
        [key: string]: HTMLElement;
    };
    protected navigationIndex: number;
    protected activeNavigationIndex: number;
    private buffer?;
    private textLine?;
    private textLineParts?;
    private bufferCache?;
    constructor(props: ReferenceRowViewProperties);
    destroy(): Promise<void>;
    getLineForReference(): Promise<string>;
    update(newProps: Partial<ReferenceRowViewProperties>): Promise<void>;
    get props(): ReferenceRowViewProperties;
    get lineNumber(): number;
    render(): etch.EtchJSXElement;
}
export {};
