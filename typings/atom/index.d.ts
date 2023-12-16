import type { Grammar } from 'atom';

type MarkdownRenderOptions = {
  renderMode?: 'full' | 'fragment',
  html?: boolean,
  sanitize?: boolean,
  sanitizeAllowUnknownProtocols?: boolean,
  sanitizeAllowSelfClose?: boolean,
  breaks?: boolean,
  handleFrontMatter?: boolean,
  useDefaultEmoji?: boolean,
  useGitHubHeadings?: boolean,
  useTaskCheckbox?: boolean,
  taskCheckboxDisabled?: boolean,
  taskCheckboxDivWrap?: boolean,
  transformImageLinks?: boolean,
  transformAtomLinks?: boolean,
  transformNonFqdnLinks?: boolean,
  rootDomain?: string,
  filePath?: string,
  disableMode?: 'none' | 'strict'
};

type ApplySyntaxHighlightingOptions = {
  syntaxScopeNameFunc?: (id: string) => string,
  renderMode?: 'full'| 'fragment',
  grammar?: Grammar
};

type UI = {
  markdown: {
    render(content: string, options?: MarkdownRenderOptions): string;
    applySyntaxHighlighting(content: DocumentFragment, options?: ApplySyntaxHighlightingOptions): Promise<HTMLElement>;
    convertToDOM(content: string): DocumentFragment;
  }
};

declare module "atom/src/workspace-center" {
  interface WorkspaceCenter {
    activate(): void
  }
}

declare module "atom/src/ui" {
  interface UI {
    markdown: {
      render(content: string, options?: MarkdownRenderOptions): string;
      applySyntaxHighlighting(content: string, options?: ApplySyntaxHighlightingOptions): string;
      convertToDOM(content: string): DocumentFragment;
    }
  }
}

declare module "atom/src/atom-environment" {
  interface AtomEnvironment {
    ui: UI
  }
}
