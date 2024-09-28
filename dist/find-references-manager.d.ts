import { DisplayMarkerLayer, Disposable, Point, Range, TextEditor, TextEditorElement, CommandEvent, CursorPositionChangedEvent } from 'atom';
import type { FindReferencesProvider } from './find-references.d';
import type { FindReferencesReturn, Reference } from 'atom-ide-base';
import ProviderRegistry from './provider-registry';
import { default as ScrollGutter, ScrollGutterVisibilityEvent } from './elements/scroll-gutter';
export default class FindReferencesManager {
    editor: TextEditor | null;
    editorView: TextEditorElement | null;
    private isTyping;
    private subscriptions;
    providerRegistry: ProviderRegistry<FindReferencesProvider>;
    private editorSubscriptions;
    private watchedEditors;
    private markerLayersForEditors;
    private scrollGuttersForEditors;
    private splitDirection;
    private enableEditorDecoration;
    private skipCurrentReference;
    private ignoreThreshold;
    private cursorMoveDelay;
    private cursorMoveTimer?;
    private typingTimer?;
    constructor();
    initialize(pendingProviders: FindReferencesProvider[]): void;
    addProvider(provider: FindReferencesProvider): void;
    dispose(): void;
    watchEditor(editor: TextEditor): Disposable | undefined;
    updateCurrentEditor(editor: TextEditor | null): void;
    onCursorMove(_event?: CursorPositionChangedEvent): void;
    requestReferencesForPanel(): Promise<void>;
    showReferencesPanel(result: FindReferencesReturn): Promise<object> | undefined;
    showReferencesForEditorAtPoint(editor: TextEditor, pointOrRange: Point | Range): Promise<void>;
    findReferencesForEditorAtPoint(editor: TextEditor, pointOrRange: Point | Range): Promise<FindReferencesReturn | null>;
    findReferencesForProject(editor: TextEditor): Promise<FindReferencesReturn | null>;
    requestReferencesUnderCursor(force?: boolean): Promise<void>;
    findReferencesForVisibleEditors(mainEditor: TextEditor, force?: boolean): Promise<void>;
    findReferences(event: CommandEvent<TextEditorElement>): Promise<void>;
    highlightReferences(editor: TextEditor, references: Reference[] | null, force?: boolean): void;
    getCursorPositionForEditor(editor: TextEditor): Point | null;
    getOrCreateMarkerLayerForEditor(editor: TextEditor): DisplayMarkerLayer;
    getOrCreateScrollGutterForEditor(editor: TextEditor): ScrollGutter;
    /**
     * Sets an attribute on `atom-text-editor` whenever a `scroll-gutter` element
     * is present. This allows us to define custom scrollbar opacity styles.
     */
    onScrollGutterVisibilityChange(event: ScrollGutterVisibilityEvent): void;
    clearAllVisibleScrollGutters(): void;
    updateScrollGutter(editor: TextEditor, references: Reference[] | null): void;
    getVisibleEditors(): TextEditor[];
}
