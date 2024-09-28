import type { TextEditor, Point, Range } from 'atom';
import { FindReferencesReturn } from 'atom-ide-base';

export type FindReferencesProvider = {
  isEditorSupported: (editor: TextEditor) => boolean,
  findReferences: (editor: TextEditor, point: Point) => Promise<FindReferencesReturn | null>
};

export interface ShowReferencesProvider {
  showReferencesForPath(path: string, pointOrRange: Point | Range): void
  showReferencesForEditor(editor: TextEditor, pointOrRange: Point | Range): void
}
