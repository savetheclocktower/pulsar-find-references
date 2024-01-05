import type { Reference } from 'atom-ide-base';
import etch from 'etch';
type ReferencesForPathViewProperties = {
    relativePath: string;
    reference: Reference;
    isSelected: boolean;
};
export default class ReferencesForPathView {
    relativePath: string;
    reference: Reference;
    isSelected: boolean;
    element: HTMLElement;
    refs: {
        [key: string]: HTMLElement;
    };
    constructor({ relativePath, reference, isSelected }: ReferencesForPathViewProperties);
    get iconServices(): import("./get-icon-services").IconServices;
    destroy(): Promise<void>;
    update({ relativePath, reference, isSelected }: ReferencesForPathViewProperties): Promise<void>;
    writeAfterUpdate(): void;
    render(): etch.EtchJSXElement;
}
export {};
