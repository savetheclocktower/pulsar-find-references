## 0.0.22

- Overhaul of how the panel works:
  - No longer follows the cursor. (This did not make much sense.)
  - Lookup position is captured when you first open the panel, then is logically tracked as it moves. This allows the panel to keep updating in real time as you make edits.
  - Invoking the “Show Panel” command again will reuse the existing panel — or else you can use the “Don’t override” button to force it to open a new panel.
- Fixed bugs relating to keyboard navigation.
- Implemented some methods that had been left as TODOs for the purpose of feature parity with `find-and-replace`.
- Fixed issue where line previews were looked up by loading buffers from disk — even where there were uncommitted changes in workspace buffers.
