# pulsar-find-references

An IDE UI package for highlighting references to the token under the cursor.

<img width="617" alt="pulsar-find-references" src="https://gist.github.com/assets/3450/4383f6bf-5c19-4fce-8326-403fdacd7784" style="margin-bottom: 2rem;">

This package consumes the `find-references` service that is provided by many IDE backend packages. Here’s [a list of packages that provide the `find-references` service.](https://web.pulsar-edit.dev/packages?service=find-references&serviceType=provided)

## Usage

### Editor decoration

By default, this package will highlight references in your editor **automatically** whenever your cursor moves around. You can configure the amount of time it waits before trying to highlight references (`200ms` by default) or you can disable this behavior altogether and explicitly invoke **Pulsar Find References: Highlight** whenever you want to highlight references.

The color of the highlight defaults to a mostly-transparent version of the color of plain text in your syntax theme. (This was the only practical option for a color that adapted to the color of your syntax theme.) If you want to change this color, customize your user stylesheet:

```less
.highlight.pulsar-find-references-reference {
  .region {
    background-color: fade(#039, 20%);
  }
}
```

This allows you to customize much more than the background color; you can eschew the default highlighting experience entirely in favor of outlining, underlining, or some other weird presentation.

The references aren’t restricted to just the file you’re in; any other _visible_ text editors (e.g., active editors in different panes) will also have highlighting applied to their scrollbars.

### References panel

This package can also show you a project-wide list of references for a given symbol, whether or not those files are open: invoke the **Find References: Show Pane** command. The presentation is similar to that of a find-and-replace dialog’s results.

Once the panel is open, it will update to show the most recent references. If you retain the default behavior, that means the results will change automatically as your cursor moves. To prevent this behavior, click the <kbd>Pin references</kbd> button at the top of the panel.

### Scrollbar decoration

This package also annotates the matches with markers in the scrollbar gutter. You can disable this behavior in the package settings, or else configure the color and opacity of the markers.

When these annotations are present behind your scrollbar, the scrollbar itself will become slightly transparent to allow them to be seen. You can customize the opacity change in your `styles.less`:

```less
atom-text-editor[with-pulsar-find-references-scroll-gutter="active"] {
  .vertical-scrollbar {
    opacity: 0.5; // defaults to 0.725
  }
}
```

## What are “references”?

To quote the [LSP specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_references):

> The references request is sent from the client to the server to resolve project-wide references for the symbol denoted by the given text document position.

What this means is ultimately up to the underlying language server that provides the data to this extension. In the case of TypeScript, it will show other usages of _that exact symbol_. If you highlight a local variable named `foo`, it will _not_ highlight any other local variables named `foo` in _other methods_, because those aren’t the same thing.
