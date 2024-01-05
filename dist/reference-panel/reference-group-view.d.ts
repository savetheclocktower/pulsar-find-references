import etch from 'etch';
import type { Reference } from 'atom-ide-base';
type ReferenceGroupViewProperties = {
    relativePath: string;
    references: Reference[];
    navigationIndex: number;
    activeNavigationIndex?: number;
    isCollapsed?: boolean;
};
export default class ReferenceGroupView {
    relativePath: string;
    references: Reference[];
    isCollapsed: boolean;
    protected navigationIndex: number;
    protected activeNavigationIndex: number;
    element: HTMLElement;
    refs: {
        [key: string]: HTMLElement;
    };
    constructor(props: ReferenceGroupViewProperties);
    get iconServices(): import("../get-icon-services").IconServices;
    update({ relativePath, references, navigationIndex, activeNavigationIndex, isCollapsed }: ReferenceGroupViewProperties): Promise<void>;
    writeAfterUpdate(): void;
    get props(): ReferenceGroupViewProperties;
    render(): etch.EtchJSXElement;
}
export {};
