# upcoming

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
