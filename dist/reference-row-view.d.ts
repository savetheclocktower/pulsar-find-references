import type { Reference } from 'atom-ide-base';
import etch from 'etch';
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
    constructor({ relativePath, reference, navigationIndex, activeNavigationIndex, isSelected }: ReferenceRowViewProperties);
    destroy(): Promise<void>;
    getLineForReference(): Promise<string>;
    update({ relativePath, reference, isSelected }: ReferenceRowViewProperties): Promise<void>;
    get props(): ReferenceRowViewProperties;
    get lineNumber(): number;
    updatePartial(props: Partial<ReferenceRowViewProperties>): Promise<void>;
    render(): etch.EtchJSXElement;
}
export {};
