import { CompositeDisposable } from 'atom';
import FindReferencesManager from './find-references-manager';
import * as console from './console';

import type { FindReferencesProvider } from './find-references.d';

let manager: FindReferencesManager | undefined;
let subscriptions: CompositeDisposable = new CompositeDisposable();
const pendingProviders: FindReferencesProvider[] = [];

export function activate() {
  manager ??= new FindReferencesManager();

  subscriptions.add(manager);

  try {
    manager!.initialize(pendingProviders);
  } catch (err) {
    console.error(err);
  }
}

export function deactivate() {
  subscriptions.dispose();
}

export function consumeFindReferences(provider: FindReferencesProvider) {
  if (manager) {
    manager.addProvider(provider);
  } else {
    pendingProviders.push(provider);
  }
}
