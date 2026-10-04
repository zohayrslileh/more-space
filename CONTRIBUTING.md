# Contributing

Thanks for wanting to help. Issues and pull requests are welcome.

## Setup

```sh
bun install
bun start
```

Before opening a pull request, run `bun run check` (typecheck, tests, build). CI runs the same on
macOS, Windows and Linux.

## A few rules the code follows

- **One owner per fact.** The project name lives only in `package.json`; read it through
  `source/libs/identity.ts`. The command tree lives only in the core; the CLI is a thin client.
- **Chalk stays still.** Writing on the board is drawn once and never glows, pulses or loops. Emphasis
  is new chalk (a mark) or the avatar's motion; continuous motion belongs to characters and app UI.
- **Agents read sizes, not guesses.** Anything an agent writes must report the cells it covers.
- **Characters live in one catalog** (`source/core/avatar/characters.ts`): moods with their meaning and
  expression. Drawings (`board/characters.tsx`) and voices (`sound.ts`) follow it.
- **Class names collide easily.** xterm owns `.terminal`; prefer specific names for new layers.

## Trying things by hand

`agent/laboratory/` holds small scripts used while building:

- `command-roundtrip.ts` drives the command against a real board without the window.
- `hero.ts` records `docs/hero.gif` (the README animation) in a throwaway project.
- `cdp.ts` drives a running window through DevTools: start it with
  `bun start -- --remote-debugging-port=9333`, then `bun agent/laboratory/cdp.ts shot out.png`,
  `type "<text>"`, `eval "<js>"`, `wheel`, `fill`, `enter`.

## Releases

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. Commit, then tag the same version and push the tag:
   ```sh
   git tag v0.2.0 && git push origin v0.2.0
   ```
3. The release workflow builds macOS (`.dmg`, Apple silicon and Intel), Windows (`Setup .exe`,
   `.zip`) and Linux (`.AppImage`, `.deb`) and attaches them to a **draft** release. Review it on GitHub and publish.
