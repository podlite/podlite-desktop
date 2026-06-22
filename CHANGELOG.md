# upcoming

- bump transitive deps: lodash, follow-redirects, serialize-javascript, tmp, postcss, shell-quote, js-yaml, tar, @tootallnate/once
- bump webpack to ^5.76 (resolves cross-realm object access advisory)
- bump electron to 39.8.5 (resolves four use-after-free / command-line switch injection advisories)
- bump electron-updater to 6.8 (resolves windows code-signing bypass advisory)
- replace electron-builder-notarize with @electron/notarize notarytool (Apple deprecated altool in Nov 2024 — submissions failed with ArgumentParsingFailure)

# 0.8.3

## Changed

- macOS distribution ships separate arm64 and x64 builds; Apple Silicon users get native performance instead of running through Rosetta 2

## Fixed

- `=picture` now renders in the live preview on the Mac App Store build — image bytes are read in the main process and inlined as a base64 data URL, so the renderer doesn't depend on `file://` access that the sandbox denies for sibling files
- numbered lists from `=config item1 :numbered` — items now render as an ordered list (`1.` `2.` `3.`) instead of bullets ([#61](https://github.com/podlite/podlite-desktop/issues/61))
- `=code` blocks with `:lang<…>` attribute are syntax-highlighted in the live preview, matching the editor pane. Inline formatting codes inside `=code` (when `:allow<…>` is set) layer on top — `B<…>` becomes bold, `I<…>` becomes italic, `C<…>` becomes inline code, with the highlighter's colors preserved underneath ([#62](https://github.com/podlite/podlite-desktop/issues/62))

# 0.8.2

## Fixed

- file watcher no longer crashes the app when the OS denies recursive directory watching (Mac App Store sandbox, iCloud Drive folders, Windows AppX) — auto-reload silently disables for that document instead ([#60](https://github.com/podlite/podlite-desktop/issues/60))

# 0.8.1

## Fixed

- `=Mermaid` block no longer crashes the live preview while you type — the renderer now handles empty/transient block content gracefully

# 0.8.0

## New

- inline image paste and drag-drop — clipboard images and dropped files save to a `media/` folder next to the current document and insert `=picture media/<name>`; dropping a file that already lives in that folder references it in place without copying
- `=include` resolves in the preview at render time — fs reader against current document's directory with `mtime` cache; recursive watcher invalidates cache and re-renders when included files change externally
- glob patterns in `=include` (e.g. `=include file:**/*.podlite | defn`) expand via depth-bounded directory walk, skipping dotfiles
- automatic numbering for `:numbered` headings — renders as `N.M.K.` prefix; respects `=config head1 :numbered` defaults and `:!numbered` per-block override

## Fixed

- double window on launch when opening a file from Finder or by drag-onto-icon ([#57](https://github.com/podlite/podlite-desktop/issues/57))
- `File → Open` no longer replaces the currently-open document — opens the new file in a fresh window; empty untitled windows still accept the opened file in place ([#56](https://github.com/podlite/podlite-desktop/issues/56))
- `Cmd+S` on an untitled document now opens the Save-As dialog instead of doing nothing ([#55](https://github.com/podlite/podlite-desktop/issues/55))
- `=picture` rendering in the preview pane — the previous `file:///` protocol handler stripped the leading slash; absolute and relative-to-document paths both display correctly ([#58](https://github.com/podlite/podlite-desktop/issues/58))
- external-edit reload after atomic writes (IDE autosave, sync tools) — watch the parent directory instead of the file
- performance: attach IPC listeners once per mount instead of every render

## Spec conformance (via `@podlite/*` libs rebuild)

- `:folded` on `=head` now folds the whole section recursively, including headings inside `=begin nested`/`=defn`/etc.
- `=config` block preconfiguration (`=config head1 :folded`, `=config code :lang<python>`) is now applied at render time — previously parsed but ignored
- single-letter `=alias` identifiers (`=alias X foo` → `A<X>`) now accepted per spec
- `=alias` no longer leaks state into the next `=begin`/`=end` block's syntax highlighting
- `=TITLE`/`=NAME`/`=SYNOPSIS`/`=Diagram` and other semantic/custom blocks in abbreviated form recognised by the editor highlighter
- `=row`, `=cell`, `=data-table`, `=boundary`, `=set`, `G<>`, `:masked` recognised in the editor highlighter (spec v2.0)

## Acknowledgements

Several of this release's fixes started as a detailed bug report by [@schueani](https://github.com/schueani) in [#53](https://github.com/podlite/podlite-desktop/issues/53) — thanks for the careful diagnosis and follow-up.

# 0.7.2

- fix snap Wayland crash on Ubuntu 24.04 — enable `allowNativeWayland` to prevent `DISABLE_WAYLAND=1` injection by electron-builder ([#43](https://github.com/podlite/podlite-desktop/issues/43))

# 0.7.1

- syntax highlighting for code blocks in preview ([#42](https://github.com/podlite/podlite-desktop/issues/42))
- snap: add Wayland support — `wayland` plug + `ELECTRON_OZONE_PLATFORM_HINT=auto` ([#43](https://github.com/podlite/podlite-desktop/issues/43))

# 0.7.0

## New

- code folding for `=begin`/`=end` blocks and `=head` sections (Ctrl-Shift-[ / Ctrl-Shift-])
- list continuation on Enter — auto-insert `=item` with preserved type prefix (`[ ]`, `#`)
- Tab/Shift-Tab to change `=item` nesting level
- auto-reload file when changed on disk (silent or with dialog)
- "Open Files in Preview" toggle in View menu
- per-file view mode persistence across sessions (editor/preview/split)
- restore editor state between sessions (cursor, scroll, fold state)
- "Copy as PNG" for preview content

## Fixed

- editor input latency reduced from 860ms to near-zero per keystroke
- search panel disappearing after Enter on first result
- links not opening from preview panel (Electron 38 compatibility)
- crash when opening a directory path instead of a file
- cursor not visible on new window open
- fold markers appearing inside verbatim blocks (`=code`, `=comment`, `=data`)

# 0.6.1

- editor refactored and rebuilt using updated libraries
- added syntax highlighting for Podlite markup language
- refactored key bindings
- refactored window open/save/new workflow
- fixed duplicate file opening issues
- added `=markdown` standard block support
- added text search (`Cmd-F`)
- added new blocks: `=Mermaid`, `=picture`
- added ability to open URLs from editor using `L<>` links (`Cmd`/`Win` or `Ctrl` modifier)
- added `file:` schema support in `L<>` links - opens files in new editor window
- half-screen preview toggle — <kbd>Ctrl</kbd> + <kbd>.</kbd> / <kbd>Cmd</kbd> + <kbd>.</kbd>
- full-screen preview toggle — <kbd>Ctrl</kbd> + <kbd>\</kbd> / <kbd>Cmd</kbd> + <kbd>\</kbd>
- added inline text style support (bold `B<>`, italic `I<>`, code `C<>`, links `L<>`, strikethrough `O<>`) within paragraphs and table cells
- fixed redraw issue when resizing the application window
- improved code block visibility in CSS
- fixed build configuration to support macOS 26 (Thaoe)

# 0.4.0

- support `=useReact`, `=React` blocks
- `=Markdown` - markdown block
- enhance code snippets, add markdown suggestions
- fix `=Image` .mov, .mp4 files
- fix styles

# 0.3.0

- =Toc - table of contents block.
- add :caption support for =Images and =Diagrams
- =Image block now supports :link and formatting codes in caption.

# 0.2.1

- fix save menu #22
- add "New", "Save As" menu items
- add View menu with Preview toggle
- add "Release notes" reference

# 0.2.0

- directive suggestions
- pod6 snippets 🏷

# 0.1.0

- save windows state between app restarts
- open external url in browser
- update export to html
- add export to pdf
- fix show assets from disk
- add =Diagram component
- switch to using shared podlite library
- refactor main app
- fix macos and windows distributions
- use flexible application windows size

# 0.0.3

- supports local video ( i.e. .mp4 files) for =Image
- update pod6 lib to ver 0.28
- add import from markdown
- add export to html

# 0.0.2

- use pod mode by default for .pod6, .rakudoc (#3)
- enhance user interface
- add distribution for Mac
- add auto update for Podlite app
- open Podlite as editor for pod6's files
- adopt app's menu for windows and mac

# 0.0.1

- Initial release
