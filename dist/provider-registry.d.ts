import { Disposable, TextEditor } from 'atom';
import type { FindReferencesProvider } from './find-references.d';
export default class ProviderRegistry<Provider extends FindReferencesProvider> {
    providers: Array<Provider>;
    addProvider(provider: Provider): Disposable;
    removeProvider(provider: Provider): void;
    getAllProvidersForEditor(editor: TextEditor): Iterable<Provider>;
    getFirstProviderForEditor(editor: TextEditor): Provider | null;
}
