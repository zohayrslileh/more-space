# Changelog

## 0.1.2

- The project chooser lists only the last three projects that still exist, with short one-line
  paths. Temporary folders are no longer remembered.
- macOS downloads are a single `.dmg` per processor.

## 0.1.1

- macOS builds are signed ad hoc. The 0.1.0 download was refused as "damaged" on Apple silicon;
  now macOS only asks once (System Settings → Privacy & Security → Open Anyway).
- Releases list only the files people download.

## 0.1.0

First release, for macOS, Windows and Linux.

- An endless chalkboard with a floating glass terminal; automatic framing, pan and zoom.
- An in-terminal command for agents (Claude Code, Codex, or any agent that runs shell commands):
  write, checklists, flows, pinned images and notes, links, marks, erase (with lasting traces) and
  wash; avatar info, moods, lines; questions with choices, several answers, written answers and
  scales; view control. Writes report the cells they cover and warn on overlap.
- Eleven original characters, Mochi by default, with their own moods, drawings and synthesized voices;
  six chalk handwritings.
- The avatar follows the work by itself: busy while the terminal works, "Done" once it stays quiet,
  "Your turn" when a program needs you, and quiet reactions to files changing on the branch (edits,
  new and deleted files, commits), as git sees them.
- Sound only when it matters: the character's voice speaks when it needs you, question bells, chalk
  as it writes; "Speak on every mood" in the character gallery adds a voice to every mood.
- The command keeps finding its window from long-lived processes (tmux, an agent's background
  server), even across windows and restarts.
- A board per project folder, kept in the app's data folder; a project chooser on open.
- PowerShell on Windows, your login shell on macOS and Linux.
- Builds are not signed yet; see the README for opening them the first time.
