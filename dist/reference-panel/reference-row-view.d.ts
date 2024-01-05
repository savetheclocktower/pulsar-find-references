import etch from 'etch';
import type { Reference } from 'atom-ide-base';
type ReferenceRowViewProperties = {
    relativePath: string;
    reference: Reference;
    isSelected?: boolean;
    activeNavigationIndex?: number;
    navigationIndex: number;
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
    constructor(props: ReferenceRowViewProperties);
    destroy(): Promise<void>;
    getLineForReference(): Promise<string>;
    update(newProps: Partial<ReferenceRowViewProperties>): Promise<void>;
    get props(): ReferenceRowViewProperties;
    get lineNumber(): number;
    render(): etch.EtchJSXElement;
}
export {};
