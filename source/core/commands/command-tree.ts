import { avatarSpan, cellSize, linkStyles, markKinds, pinnedKinds, textSizes, type AskItem, type AskMode, type Item, type Link, type Mark, type StepState } from "@/core/board/board-types"
import AssetStore, { AssetError } from "@/core/assets/asset-store"
import { findCharacter } from "@/core/avatar/characters"
import { describeColors, isCell, parseCell, parseChoice, parseColor, parseNumber, UsageError, type Arguments } from "./arguments"
import type Board from "@/core/board/board"
import { command, title } from "@/libs/identity"

export interface CommandContext {

    board: Board

    assets: AssetStore

    // The caller's working directory, for relative paths.
    cwd: string

    out: (text: string) => void
}

// A node either explains the level below it, runs, or both.
export interface CommandNode {

    name: string

    summary: string

    usage?: string

    details?: string

    children?: CommandNode[]

    run?: (args: Arguments, context: CommandContext) => Promise<void> | void
}

const defaultAskWait = 240

// How long a write waits for the window to report how big the writing turned out.
const sizeWait = 1500

// The cells an item really covers, so the next thing can be placed beside it, not on it.
function spanText(item: Item, size: { width: number, height: number } | undefined) {

    if (!size) return "size unknown (no window drew it yet)"

    const cols = Math.max(1, Math.ceil(size.width / cellSize)), rows = Math.max(1, Math.ceil(size.height / cellSize))

    return `${cols}x${rows} cells: cols ${item.col}..${item.col + cols - 1}, rows ${item.row}..${item.row + rows - 1}`
}

// The cells an item covers, from its measured size.
function cellsOf(item: Item, size: { width: number, height: number }) {

    const cols = Math.max(1, Math.ceil(size.width / cellSize)), rows = Math.max(1, Math.ceil(size.height / cellSize))

    return { left: item.col, top: item.row, right: item.col + cols - 1, bottom: item.row + rows - 1 }
}

async function report(board: Board, item: Item, out: (text: string) => void) {

    const size = await board.waitForSize(item.id, sizeWait)

    let text = `${item.id} ${spanText(item, size)}`

    // Say plainly when the new writing landed on something already there, so it can be moved.
    if (size) {

        const mine = cellsOf(item, size)

        const hit = board.liveItems().flatMap(other => {

            const otherSize = other.id === item.id ? undefined : board.size(other.id)

            if (!otherSize) return []

            const theirs = cellsOf(other, otherSize)

            const overlaps = mine.left <= theirs.right && theirs.left <= mine.right && mine.top <= theirs.bottom && theirs.top <= mine.bottom

            return overlaps ? [`${other.id} (cols ${theirs.left}..${theirs.right}, rows ${theirs.top}..${theirs.bottom})`] : []
        })

        if (hit.length) text += `\nwarning: overlaps ${hit.join(", ")}. Move one with: ${command} board move <id> <col,row>`
    }

    out(text)
}

const guide = `${title} shows the user a chalkboard above this terminal. You have an avatar on it.
Use it to show what you are doing and thinking while you work: the plan, progress,
small diagrams, problems, questions. Keep it light, a few commands per step of work.

Board   An endless grid of cells. A position is col,row (integers, may be negative).
        "${command} board info" tells you which cells the user sees right now.
View    By default the user's view frames the whole board by itself, so the user never has to
        zoom. Keep the board to a few things: erase what is done rather than piling up, so
        nothing has to shrink to fit. "view show" frames what you are explaining; "view fit"
        goes back to the whole board. Questions are shown to the user one by one by themselves.
Space   One cell holds about 8 characters of size-m text; a row fits one m line plus room.
        Text sizes: s, m (default), l (titles). --width <cells>: wrap at most that wide (default 8).
        Every write answers with the cells it really covers, and warns if it overlaps something;
        place the next thing outside them.
Colors  Each color means one thing: ${describeColors()}.
        Pass either word: --color problem is the same as --color pink.
Avatar  You, as a character the user picked. "${command} avatar info" tells you which one and its
        moods, each with when to use it. Run it first, and again if a mood is refused: the user
        may switch characters while you work. It takes ${avatarSpan.cols}x${avatarSpan.rows} cells from its position.
        It also reacts by itself to the terminal and to files changing on the branch (edits, new
        and deleted files, commits); posing it yourself takes over for a while.
Ask     "${command} ask" puts a question on the board and waits for the user: one choice,
        several (--multi), their own words (--other, --text), or a 1..N scale (--scale N).
        Several questions are fine: the user's view visits them in the order asked.
Pin     "board pin" pins a real image (a path or an https URL) like a photo, with a thumbtack.
        "board note" pins a paper note; its color is the paper's.
Link    "board link <id> <id>" connects two things: a thread between two pinned things,
        a chalk arrow otherwise. Use it to plan: pin, write, then link what belongs together.
Mark    "board mark <id> circle|underline|cross" emphasizes anything already on the board.
        Chalk stays still once written: emphasize by drawing a mark, never by rewriting.
Kept    The board is kept for this project folder and comes back next time it is opened.
Erase   Erased writing scatters and leaves a faint trace that stays, like a real board.
        "board wash" cleans the traces away when a fresh, clean board matters.
Batch   Send several commands in one call, one per line, without the "${command}" word:
          ${command} - <<'EOF'
          board write 0,0 --size l --color focus "Refactor auth"
          avatar move 10,4
          avatar mood thinking
          EOF

Start   "${command} board info", then write a title and your plan where the user is looking.`

function words(args: Arguments, from: number) {

    return args.positionals.slice(from).join(" ").trim()
}

function describe(item: Item) {

    const text = item.kind === "text" ? item.text
        : item.kind === "steps" ? item.steps.map(step => step.text).join(" / ")
        : item.kind === "flow" ? item.nodes.join(" -> ")
        : item.kind === "image" ? `${item.asset}${item.caption ? ` "${item.caption}"` : ""}`
        : item.kind === "note" ? item.text
        : `${item.question}${item.answer ? ` -> ${item.answer.join(", ")}` : ""}`

    const flat = text.replace(/\s*\n\s*/g, " / ")

    const short = flat.length > 48 ? `${flat.slice(0, 47)}…` : flat

    return `${item.id.padEnd(5)}${item.kind.padEnd(7)}${`${item.col},${item.row}`.padEnd(9)}${item.color.padEnd(8)}"${short}"`
}

function describeLink(link: Link) {

    return `${link.id.padEnd(5)}${"link".padEnd(7)}${`${link.from} -> ${link.to}`.padEnd(17)}${link.style.padEnd(8)}${link.label ? `"${link.label}"` : ""}`
}

function describeMark(mark: Mark) {

    return `${mark.id.padEnd(5)}${"mark".padEnd(7)}${mark.target.padEnd(9)}${mark.color.padEnd(8)}${mark.kind}`
}

function parseStep(text: string): { text: string, state: StepState } {

    const match = text.match(/^\s*\[([ x>])\]\s*(.*)$/i)

    if (!match) return { text: text.trim(), state: "todo" }

    const state: StepState = match[1] === ">" ? "now" : match[1]!.toLowerCase() === "x" ? "done" : "todo"

    return { text: match[2]!.trim(), state }
}

async function waitAndReport(board: Board, item: AskItem, args: Arguments, out: (text: string) => void) {

    const seconds = parseNumber("wait", args.flags.get("wait"), defaultAskWait)!

    const answer = await board.waitForAnswer(item.id, seconds * 1000)

    if (answer !== undefined) return out(answer.map(value => `answer: ${describeAnswer(item, value)}`).join("\n"))

    if (!board.find(item.id)) return out(`${item.id} was erased before an answer.`)

    out(`No answer yet. Wait again with: ${command} ask wait ${item.id}`)
}

// What the agent reads back: written answers are marked, a scale says its range.
function describeAnswer(item: AskItem, value: string) {

    if (item.mode === "scale") return `${value} of ${item.scale}`

    if (item.mode !== "text" && !item.options.includes(value)) return `other: ${value}`

    return value
}

function parseAsk(args: Arguments) {

    const multi = args.flags.has("multi"), text = args.flags.has("text"), scaleFlag = args.flags.get("scale")

    if ([multi, text, scaleFlag !== undefined].filter(Boolean).length > 1) throw new UsageError("Use only one of --multi, --text, --scale.")

    const mode: AskMode = text ? "text" : scaleFlag !== undefined ? "scale" : multi ? "multi" : "choice"

    const [question, ...options] = args.positionals.slice(1).map(value => value.trim()).filter(Boolean)

    if (!question) throw new UsageError("Give the question.")

    const other = args.flags.has("other")

    if (other && (mode === "text" || mode === "scale")) throw new UsageError("--other only goes with choices.")

    if (mode === "choice" && options.length + (other ? 1 : 0) < 2) throw new UsageError("Give at least two options (or one with --other).")

    if (mode === "multi" && options.length < 2) throw new UsageError("Give at least two options to pick from.")

    if (mode === "text" && options.length) throw new UsageError("A --text question takes no options.")

    const scale = mode === "scale" ? parseNumber("scale", scaleFlag, 5)! : undefined

    if (scale !== undefined && (!Number.isInteger(scale) || scale < 2 || scale > 10)) throw new UsageError("--scale must be a whole number from 2 to 10.")

    if (mode === "scale" && options.length > 2) throw new UsageError("A scale takes at most two labels: low and high.")

    return { question, options, mode, other: other || undefined, scale }
}

export const root: CommandNode = {

    name: command,

    summary: `a chalkboard the user watches while you work; you have an avatar on it`,

    children: [
        {
            name: "guide",

            summary: "read this first: how the board works, in one screen",

            run: (_, { out }) => out(guide)
        },
        {
            name: "board",

            summary: "see what is there; write, steps, flows, pin images and notes, link, mark, erase",

            children: [
                {
                    name: "info",

                    summary: "what the user sees now, where your avatar is, what is written",

                    usage: "board info",

                    run: (_, { board, out }) => {

                        const view = board.visible()

                        const live = board.liveItems()

                        const avatar = board.state().avatar

                        out([
                            `View    cols ${view.col}..${view.col + view.cols - 1}, rows ${view.row}..${view.row + view.rows - 1} (${view.cols}x${view.rows} cells of ${cellSize}px)${view.auto === false ? ", held" : ", framing the whole board"}`,
                            `Avatar  ${findCharacter(avatar.character).name} at ${avatar.col},${avatar.row}, ${avatar.mood}${avatar.say ? `, saying "${avatar.say}"` : ""}`,
                            `Items   ${live.length ? live.map(item => item.id).join(" ") : "none"}`,
                            ...(board.liveLinks().length ? [`Links   ${board.liveLinks().map(link => `${link.id}(${link.from}->${link.to})`).join(" ")}`] : []),
                            ...(board.liveMarks().length ? [`Marks   ${board.liveMarks().map(mark => `${mark.id}(${mark.kind} ${mark.target})`).join(" ")}`] : [])
                        ].join("\n"))
                    }
                },
                {
                    name: "items",

                    summary: "everything written, with ids and positions",

                    usage: "board items",

                    run: (_, { board, out }) => {

                        const rows = [...board.liveItems().map(item => `${describe(item)}  ${spanText(item, board.size(item.id))}`), ...board.liveLinks().map(describeLink), ...board.liveMarks().map(describeMark)]

                        out(rows.length ? rows.join("\n") : "The board is empty.")
                    }
                },
                {
                    name: "write",

                    summary: "write text",

                    usage: "board write <col,row> <text> [--color c] [--size s|m|l] [--width cells]",

                    details: "Text may span several words without quotes. Use \\n for a line break.",

                    run: async (args, { board, out }) => {

                        const cell = parseCell(args.positionals[0])

                        const text = words(args, 1).replace(/\\n/g, "\n")

                        if (!text) throw new UsageError("Nothing to write.")

                        const item = board.add({
                            kind: "text",
                            ...cell,
                            text,
                            color: parseColor(args.flags.get("color"), "white"),
                            size: parseChoice("size", args.flags.get("size"), textSizes, "m"),
                            width: parseNumber("width", args.flags.get("width"))
                        })

                        await report(board, item, out)
                    }
                },
                {
                    name: "steps",

                    summary: "a checklist; mark steps [x] done, [>] current, [ ] todo",

                    usage: "board steps <col,row> \"[x] first\" \"[>] second\" \"[ ] third\" [--color c]",

                    details: "Each quoted argument is one step. Rewrite the list with board erase + board steps as work moves on.",

                    run: async (args, { board, out }) => {

                        const cell = parseCell(args.positionals[0])

                        const steps = args.positionals.slice(1).map(parseStep).filter(step => step.text)

                        if (!steps.length) throw new UsageError("Give at least one step.")

                        const item = board.add({ kind: "steps", ...cell, steps, color: parseColor(args.flags.get("color"), "white") })

                        await report(board, item, out)
                    }
                },
                {
                    name: "flow",

                    summary: "boxes joined by arrows, left to right",

                    usage: "board flow <col,row> \"A -> B -> C\" [--focus B] [--color c]",

                    details: "--focus highlights one box in the focus color.",

                    run: async (args, { board, out }) => {

                        const cell = parseCell(args.positionals[0])

                        const nodes = words(args, 1).split(/\s*->\s*/).map(node => node.trim()).filter(Boolean)

                        if (nodes.length < 2) throw new UsageError("A flow needs at least two boxes: \"A -> B\".")

                        const focusName = args.flags.get("focus")

                        const focus = typeof focusName === "string" ? nodes.indexOf(focusName) : -1

                        if (typeof focusName === "string" && focus < 0) throw new UsageError(`--focus "${focusName}" is not one of the boxes.`)

                        const item = board.add({ kind: "flow", ...cell, nodes, focus: focus < 0 ? undefined : focus, color: parseColor(args.flags.get("color"), "blue") })

                        await report(board, item, out)
                    }
                },
                {
                    name: "pin",

                    summary: "pin an image (file path or https URL) to the board like a photo",

                    usage: "board pin <col,row> <image path|url> [--width cells] [--caption text]",

                    details: "A path may be relative to your working directory. The board keeps its own copy. Default width: 3 cells.",

                    run: async (args, { board, assets, cwd, out }) => {

                        const cell = parseCell(args.positionals[0])

                        const path = words(args, 1)

                        if (!path) throw new UsageError("Give the image path.")

                        const caption = args.flags.get("caption")

                        const asset = await assets.importImage(path, cwd).catch(error => {

                            throw error instanceof AssetError ? new UsageError(error.message) : error
                        })

                        const item = board.add({
                            kind: "image",
                            ...cell,
                            asset,
                            width: parseNumber("width", args.flags.get("width"), 3)!,
                            caption: typeof caption === "string" ? caption : undefined,
                            color: "white"
                        })

                        await report(board, item, out)
                    }
                },
                {
                    name: "note",

                    summary: "pin a paper note with a thumbtack",

                    usage: "board note <col,row> <text> [--color c] [--width cells]",

                    details: "The color is the paper's (default yellow). Use \\n for a line break. Default width: 2 cells.",

                    run: async (args, { board, out }) => {

                        const cell = parseCell(args.positionals[0])

                        const text = words(args, 1).replace(/\\n/g, "\n")

                        if (!text) throw new UsageError("Nothing to write on the note.")

                        const item = board.add({
                            kind: "note",
                            ...cell,
                            text,
                            width: parseNumber("width", args.flags.get("width"), 2)!,
                            color: parseColor(args.flags.get("color"), "yellow")
                        })

                        await report(board, item, out)
                    }
                },
                {
                    name: "link",

                    summary: "connect two items: a thread between pinned things, a chalk arrow otherwise",

                    usage: "board link <from-id> <to-id> [--label text] [--style thread|chalk] [--color c]",

                    run: (args, { board, out }) => {

                        const [fromId, toId] = args.positionals

                        const from = fromId ? board.find(fromId) : undefined, to = toId ? board.find(toId) : undefined

                        if (!from || !to) throw new UsageError(`Give two item ids. See: ${command} board items`)

                        if (from === to) throw new UsageError("An item cannot link to itself.")

                        const pinned = pinnedKinds.includes(from.kind) && pinnedKinds.includes(to.kind)

                        const style = parseChoice("style", args.flags.get("style"), linkStyles, pinned ? "thread" : "chalk")

                        const label = args.flags.get("label")

                        const link = board.link({
                            from: from.id,
                            to: to.id,
                            style,
                            color: parseColor(args.flags.get("color"), style === "thread" ? "pink" : "white"),
                            label: typeof label === "string" ? label : undefined
                        })

                        out(link.id)
                    }
                },
                {
                    name: "wash",

                    summary: "clean the board of the faint traces erasing leaves behind",

                    usage: "board wash",

                    run: (_, { board, out }) => out(`washed away ${board.wash()} traces`)
                },
                {
                    name: "mark",

                    summary: "circle, underline or cross out something on the board",

                    usage: `board mark <id> <${markKinds.join("|")}> [--color c]`,

                    details: "Drawn once in chalk on top of the item. Default color: focus for circle and underline, problem for cross.",

                    run: (args, { board, out }) => {

                        const [id, kindName] = args.positionals

                        const item = id ? board.find(id) : undefined

                        if (!item) throw new UsageError(`No item "${id ?? ""}". See: ${command} board items`)

                        const kind = markKinds.find(kind => kind === kindName)

                        if (!kind) throw new UsageError(`Mark must be one of: ${markKinds.join(", ")}.`)

                        const mark = board.mark({ target: item.id, kind, color: parseColor(args.flags.get("color"), kind === "cross" ? "pink" : "yellow") })

                        out(mark.id)
                    }
                },
                {
                    name: "move",

                    summary: "move something already written",

                    usage: "board move <id> <col,row>",

                    run: (args, { board, out }) => {

                        const id = args.positionals[0]

                        if (!id || !board.find(id)) throw new UsageError(`No item "${id ?? ""}". See: ${command} board items`)

                        board.move(id, parseCell(args.positionals[1]))

                        out("ok")
                    }
                },
                {
                    name: "erase",

                    summary: "erase items, links or marks by id, or all (an item's links and marks go with it)",

                    usage: "board erase <id>... | board erase all",

                    run: (args, { board, out }) => {

                        if (!args.positionals.length) throw new UsageError("Name what to erase, or \"all\".")

                        const erased = args.positionals[0] === "all" ? board.eraseAll() : board.erase(args.positionals)

                        const found = [...erased.items, ...erased.links, ...erased.marks].map(entry => entry.id)

                        const missing = args.positionals.filter(id => id !== "all" && !found.includes(id))

                        const plural = (count: number, word: string) => count ? ` + ${count} ${word}${count > 1 ? "s" : ""}` : ""

                        const count = `erased ${erased.items.length}${plural(erased.links.length, "link")}${plural(erased.marks.length, "mark")}`

                        out(missing.length ? `${count}; not found: ${missing.join(" ")}` : count)
                    }
                }
            ]
        },
        {
            name: "avatar",

            summary: "who you are on the board; move, set a mood, say one line",

            children: [
                {
                    name: "move",

                    summary: "move next to what you are talking about",

                    usage: "avatar move <col,row>",

                    run: (args, { board, out }) => {

                        board.moveAvatar(parseCell(args.positionals[0]))

                        out("ok")
                    }
                },
                {
                    name: "info",

                    summary: "who you are: your character, its personality and its moods",

                    usage: "avatar info",

                    run: (_, { board, out }) => {

                        const avatar = board.state().avatar, character = findCharacter(avatar.character)

                        const width = Math.max(...character.moods.map(mood => mood.name.length))

                        out([
                            `You are ${character.name}: ${character.personality}.`,
                            `At ${avatar.col},${avatar.row}, mood ${avatar.mood}. Moods:`,
                            ...character.moods.map(mood => `  ${mood.name.padEnd(width)}  ${mood.meaning}`)
                        ].join("\n"))
                    }
                },
                {
                    name: "mood",

                    summary: "show how the work feels; the moods depend on your character (avatar info)",

                    usage: "avatar mood <mood>",

                    run: (args, { board, out }) => {

                        const character = findCharacter(board.state().avatar.character)

                        const mood = character.moods.find(mood => mood.name === args.positionals[0])

                        if (!mood) throw new UsageError(`${character.name} has no mood "${args.positionals[0] ?? ""}". Its moods: ${character.moods.map(mood => mood.name).join(", ")}.`)

                        board.setMood(mood.name)

                        out("ok")
                    }
                },
                {
                    name: "say",

                    summary: "a short line in a speech bubble; no text clears it",

                    usage: "avatar say [text]",

                    run: (args, { board, out }) => {

                        board.say(words(args, 0))

                        out("ok")
                    }
                }
            ]
        },
        {
            name: "view",

            summary: "steer what the user sees: the whole board, or what you are explaining",

            children: [
                {
                    name: "fit",

                    summary: "show the whole board and keep framing it as it changes (the default)",

                    usage: "view fit",

                    run: (_, { board, out }) => { board.requestView({ kind: "fit" }); out("ok") }
                },
                {
                    name: "show",

                    summary: "frame some items, or a block of cells; automatic framing pauses",

                    usage: "view show <id>... | view show <col,row> <col,row>",

                    details: "Two positions are opposite corners of the block. \"view fit\" returns to the whole board.",

                    run: (args, { board, out }) => {

                        const [first, second] = args.positionals

                        if (isCell(first) && isCell(second)) {

                            const a = parseCell(first), b = parseCell(second)

                            const cells = { col: Math.min(a.col, b.col), row: Math.min(a.row, b.row), cols: Math.abs(a.col - b.col) + 1, rows: Math.abs(a.row - b.row) + 1 }

                            board.requestView({ kind: "show", cells })

                            return out("ok")
                        }

                        if (isCell(first)) {

                            const cell = parseCell(first)

                            board.requestView({ kind: "show", cells: { col: cell.col - 3, row: cell.row - 2, cols: 7, rows: 5 } })

                            return out("ok")
                        }

                        const missing = args.positionals.filter(id => !board.find(id))

                        if (!args.positionals.length || missing.length) throw new UsageError(`No item ${missing.join(" ")}. See: ${command} board items`)

                        board.requestView({ kind: "show", items: args.positionals })

                        out("ok")
                    }
                },
                {
                    name: "auto",

                    summary: "turn automatic framing of the whole board on or off",

                    usage: "view auto <on|off>",

                    run: (args, { board, out }) => {

                        const value = args.positionals[0]

                        if (value !== "on" && value !== "off") throw new UsageError("Say on or off.")

                        board.requestView({ kind: "auto", on: value === "on" })

                        out("ok")
                    }
                }
            ]
        },
        {
            name: "ask",

            summary: "put a question on the board and wait: choices, several, written, or a scale",

            usage: `ask <col,row> "<question>" ["<option>"...] [--multi] [--other] [--text] [--scale N] [--wait seconds] [--no-wait]`,

            details: [
                `One option clicked by default. --multi: any number, then Send. --other: adds "Other…" with a written answer.`,
                `--text: a written answer, no options. --scale N: a number 1..N; up to two options label the low and high ends.`,
                `Prints one "answer:" line per value (written ones as "other: ..."). Waits ${defaultAskWait}s by default; with --no-wait collect later with "ask wait <id>".`
            ].join("\n"),

            run: async (args, { board, out }) => {

                const cell = parseCell(args.positionals[0])

                const item = board.add({ kind: "ask", ...cell, ...parseAsk(args), color: "orange" }) as AskItem

                await report(board, item, out)

                if (args.flags.has("no-wait")) return

                await waitAndReport(board, item, args, out)
            },

            children: [
                {
                    name: "wait",

                    summary: "wait for the answer to an earlier question",

                    usage: "ask wait <id> [--wait seconds]",

                    run: async (args, { board, out }) => {

                        const id = args.positionals[0]

                        const item = id ? board.find(id) : undefined

                        if (!item || item.kind !== "ask") throw new UsageError(`No question "${id ?? ""}".`)

                        await waitAndReport(board, item, args, out)
                    }
                }
            ]
        }
    ]
}
