# Vision

## Purpose

A desktop application where any terminal agent gets a body and a place to express itself.
The user opens the app, runs their agent in the app's terminal, and the agent finds a command
that lets it draw on an endless chalkboard and move an avatar that represents it, while it keeps
doing its real work in the terminal.

## Principles

- **Agent-neutral.** Works with any agent that can run shell commands. No agent-specific protocol
  is required to use the board.
- **Bound to the instance.** The command exists only inside the app's terminals (PATH + socket
  variable set per instance). Nothing is installed in the system.
- **Self-discoverable, hierarchical, lazy.** The bare command shows one short level; each level
  explains the next; `--all` shows the whole tree in one call when that is cheaper than exploring.
  Control commands stay as short as possible; several can be sent in one call (batch).
- **Expression must not compete with work.** Commands are cheap, terse, mostly fire-and-forget.
- **Aware of the space.** The agent can ask what the user is looking at (visible cells), where its
  avatar is and what is written, and can move the user's view.
- **Two-way.** The agent can put a question with answer buttons on the board and wait for the click.
- **One visual language.** A black chalkboard: light haze, very faint orderly ruling, colored
  chalk where each color carries one meaning. Only the board is chalk; app text stays crisp.
  The app chrome identity is still to be chosen.
- **One owner per fact.** The project name lives in `package.json`; everything else derives it.

## Long-term capabilities

1. Board and avatar driven from the terminal (built, first version).
2. Avatar customization in settings (shape, colors, name).
3. How the agent learns it is on a board without the user telling it (startup context injection
   per agent, or a fixed instruction location). Open question.
4. More expression tools: images, code snippets, simple charts, sketches, pointing gestures.
5. Several terminals/tabs; one board per instance.
6. Packaging for distribution (signed app, the command working from the packaged app).
