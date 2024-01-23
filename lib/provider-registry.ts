import { Disposable, TextEditor } from 'atom';
import type { FindReferencesProvider } from './find-references.d';
import * as console from './console';

// This is what I'm reduced to just to get `typescript-language-server` to stop
// suggesting that I remove this import.
console!;

export default class ProviderRegistry<Provider extends FindReferencesProvider> {
  providers: Array<Provider> = [];

  addProvider(provider: Provider): Disposable {
    this.providers.push(provider);
    return new Disposable(() => this.removeProvider(provider));
  }

  removeProvider(provider: Provider) {
    const index = this.providers.indexOf(provider);
    if (index > -1) this.providers.splice(index, 1);
  }

  getAllProvidersForEditor(editor: TextEditor): Iterable<Provider> {
    return this.providers.filter(provider => {
      return provider.isEditorSupported(editor);
    });
  }

  getFirstProviderForEditor(editor: TextEditor): Provider | null {
    for (let provider of this.getAllProvidersForEditor(editor))
      return provider;
    return null;
  }
}
