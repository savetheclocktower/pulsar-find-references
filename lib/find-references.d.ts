import type { TextEditor, Point } from 'atom';
import { FindReferencesReturn } from 'atom-ide-base';

export type FindReferencesProvider = {
  isEditorSupported: (editor: TextEditor) => boolean,
  findReferences: (editor: TextEditor, point: Point) => Promise<FindReferencesReturn | null>
};
