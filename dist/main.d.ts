import { TextEditor } from 'atom';
import type { FindReferencesProvider, ShowReferencesProvider } from './find-references.d';
export declare function findFirstTextEditorForPath(path: string): TextEditor | undefined;
export declare function activate(): void;
export declare function deactivate(): void;
export declare function consumeFindReferences(provider: FindReferencesProvider): void;
export declare function provideShowReferences(): ShowReferencesProvider;
