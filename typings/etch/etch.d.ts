export * from "./etch-element";
export * from "./dom";
import {EtchJSXElement} from "./etch-element";

export type EtchComponent = { element: HTMLElement, refs: { [key: string]: HTMLElement } };

export function destroy(component: any, removeNode?: boolean): Promise<void>;
export function destroySync(component: any, removeNode: any): void;
export function getScheduler(): any;
export function initialize(component: unknown): asserts component is EtchComponent;
export function render(virtualNode: EtchJSXElement, options?: any): Node;
export function setScheduler(customScheduler: any): void;
export function update(component: any, replaceNode?: boolean): Promise<void>;
export function updateSync(component: any, replaceNode?: boolean): void;
