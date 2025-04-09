# pulsar-find-references

An IDE UI package for highlighting references to the token under the cursor.

<img width="617" alt="pulsar-find-references" src="https://gist.github.com/assets/3450/4383f6bf-5c19-4fce-8326-403fdacd7784" style="margin-bottom: 2rem;">

This package consumes the `find-references` service that is provided by many IDE backend packages. Here’s [a list of packages that provide the `find-references` service.](https://web.pulsar-edit.dev/packages?service=find-references&serviceType=provided)

## Usage

### Editor decoration

By default, this package will highlight references in your editor **automatically** whenever your cursor moves around. You can configure the amount of time it waits before trying to highlight references (`400ms` by default) or you can disable this behavior altogether and explicitly invoke **Pulsar Find References: Highlight** whenever you want to highlight references.

The color of the highlight defaults to a mostly-transparent version of the color of plain text in your syntax theme. (This was the only practical option for a color that adapted to the color of your syntax theme.) If you want to change this color, customize your user stylesheet:

```less
.highlight.pulsar-find-references-reference {
  .region {
    background-color: fade(#039, 20%);
  }
}
```

This allows you to customize much more than the background color; you can eschew the default highlighting experience entirely in favor of outlining, underlining, or some other weird presentation.

The references aren’t restricted to just the file you’re in; any other _visible_ text editors (e.g., active editors in different panes) will also have highlighting applied.

### Scrollbar decoration

This package also annotates the matches with markers in the scrollbar gutter. You can disable this behavior in the package settings, or else configure the color and opacity of the markers.

When these annotations are present behind your scrollbar, the scrollbar itself will become slightly transparent to allow them to be seen. You can customize the opacity change in your user stylesheet:

```less
atom-text-editor[with-pulsar-find-references-scroll-gutter="active"] {
  .vertical-scrollbar {
    opacity: 0.5; // defaults to 0.725
  }
}
```

### References panel

This package can also show you a project-wide list of references for a given symbol, whether or not those files are open: invoke the **Find References: Show Panel** command. The presentation is similar to that of a find-and-replace dialog’s results.

The panel offers a live-updating list of references to the symbol that was under your cursor when you invoked **Find References: Show Panel**. If you make changes to the document, the list will update.

#### Overrides

If you invoke **Find References: Show Panel** multiple times at different cursor positions, the package will attempt to reuse existing results panels, much like `find-and-replace` does. If you want to keep a certain panel, you can prevent it from being “overridden” by clicking the <kbd>Don’t override</kbd> button. You can therefore keep multiple lists of references at once and have them update as you make changes.

When the package wants to show a new results panel, it searches for an existing panel to reuse, stopping when it finds one that is overridable. If it doesn’t find any, it creates a new one. Its behavior upon creating a new panel — whether to split the active pane when showing results, and the direction of the split — is governed by the _Results Panel > Direction to Open Results Pane_ package setting.

#### Panel behavior

To give the user a list of references, language servers need to know a specific cursor position. For this reason, the package keeps track of the original cursor position from which a given results panel was triggered and tracks its logical movement over time. It adapts when content is added above or below the position, but if a buffer change surrounds the position, the panel will automatically close.

## What are “references”?

To quote the [LSP specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_references):

> The references request is sent from the client to the server to resolve project-wide references for the symbol denoted by the given text document position.

What this means is ultimately up to the underlying language server that provides the data to this extension. In the case of TypeScript, it will show other usages of _that exact symbol_. If you highlight a local variable named `foo`, it will _not_ highlight any other local variables named `foo` in _other methods_, because those aren’t the same thing.
