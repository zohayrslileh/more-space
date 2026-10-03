# Tasks

## Phase 1: First working app (2026-10-03)

- [x] Single source for the name (`package.json` → `source/libs/identity.ts`)
- [x] Board state in the core: text, steps, flow, ask; erase with ghost; avatar move/mood/say
- [x] Command tree: hierarchical help, `--all`, `guide`, batch via `-` and stdin
- [x] Instance socket server + thin CLI run by Electron as Node (`ELECTRON_RUN_AS_NODE`)
- [x] Command on PATH only inside the app's shells (per-instance temp bin folder)
- [x] Terminal: node-pty shell, xterm.js, floating glass panel, resizable height
- [x] Board stage: endless grid, pan (drag/scroll), zoom (pinch/⌘ scroll/buttons), fit, follow avatar,
      cell numbers, chalk colors legend
- [x] Visible cells reported back to the core (`board info`), `board focus` moves the user's view
- [x] Ask: buttons on the board answer a waiting command
- [x] Writing animation (chalk written letter by letter, flows drawn, steps struck)

## Next


- [x] Characters: catalog of 5 with own moods, picker, agent knows its moods
- [x] Automatic framing + agent view commands (fit, show, auto)
- [x] Erasing scatters and leaves lasting traces; board wash
- [x] Choose a project on open; copyable agent prompt on a clean board
- [x] Character voices (synthesized) and 4 characters from several cultures
- [x] Avatar reflects terminal activity (working, done, needs you) from generic signals
- [x] Handwriting choice (6 chalk-like fonts)
- [ ] Decide how the agent discovers the board on its own
- [x] Terminal pin (auto-hide); drag to resize up to the toolbar
- [x] Sounds (toggle) and attention for waiting questions
- [x] Pin images (path or URL) and notes; link items (threads, chalk arrows)
- [x] Title bar: app / project / git branch
- [x] Marks: circle, underline, cross
- [x] Writes report the cells they really cover
- [x] Richer questions: multi, other, text, scale
- [ ] Terminal tabs
- [x] Board kept per project folder (app cache), restored on open
- [x] App icon (direction C) and identity
- [x] Packaging, CI and releases (unsigned)
- [ ] Developer ID signing and notarization for macOS
