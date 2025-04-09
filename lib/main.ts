import { CompositeDisposable, TextEditor } from 'atom';
import FindReferencesManager from './find-references-manager';
import * as console from './console';

import type {
  FindReferencesProvider,
  ShowReferencesProvider
} from './find-references.d';

let manager: FindReferencesManager | undefined;

let subscriptions: CompositeDisposable = new CompositeDisposable();

const pendingProviders: FindReferencesProvider[] = [];

function isTextEditor(thing: any): thing is TextEditor {
  return thing.constructor.name === 'TextEditor'
}

export function findFirstTextEditorForPath(path: string): TextEditor | undefined {
  let panes = atom.workspace.getPanes()
  for (let pane of panes) {
    for (let item of pane.getItems()) {
      if (!isTextEditor(item)) continue
      if (item.getPath() === path) {
        return item
      }
    }
  }
  return undefined
}

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

// Experimental: An API that can be consumed by other packages to trigger the
// display of a “show references” panel for an arbitrary point or range in an
// arbitrary buffer.
export function provideShowReferences(): ShowReferencesProvider {
  return {
    showReferencesForEditor: (editor, pointOrRange) => {
      if (!manager) return;
      manager.showReferencesForEditorAtPoint(editor, pointOrRange);
    },
    showReferencesForPath: (path, pointOrRange) => {
      if (!manager) return;
      let editor = findFirstTextEditorForPath(path);
      if (!editor) return;
      manager.showReferencesForEditorAtPoint(editor, pointOrRange);
    }
  };
}
