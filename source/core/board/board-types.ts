// Shapes shared by the core and the renderer. Positions are board cells.

export const chalkColors = ["white", "yellow", "blue", "green", "pink", "orange"] as const

export type ChalkColor = typeof chalkColors[number]

// Each color has one meaning; agents may use either word.
export const colorMeanings: Record<ChalkColor, string> = {

    white: "text",

    yellow: "focus",

    blue: "info",

    green: "done",

    pink: "problem",

    orange: "question"
}


export const textSizes = ["s", "m", "l"] as const

export type TextSize = typeof textSizes[number]

export type StepState = "done" | "now" | "todo"

export interface Cell {

    col: number

    row: number
}

interface ItemBase extends Cell {

    id: string

    color: ChalkColor

    // When it was written; the view animates only fresh writing.
    createdAt: number

    erasedAt?: number
}

export interface TextItem extends ItemBase {

    kind: "text"

    text: string

    size: TextSize

    width?: number
}

export interface StepsItem extends ItemBase {

    kind: "steps"

    steps: { text: string, state: StepState }[]
}

export interface FlowItem extends ItemBase {

    kind: "flow"

    nodes: string[]

    focus?: number
}

export const askModes = ["choice", "multi", "text", "scale"] as const

// choice: pick one option. multi: pick any number, then send. text: write an answer.
// scale: pick a number from 1 to scale; options, if any, label the low and high ends.
export type AskMode = typeof askModes[number]

export interface AskItem extends ItemBase {

    kind: "ask"

    question: string

    mode: AskMode

    options: string[]

    // choice/multi: also offer "Other…" with a written answer.
    other?: boolean

    scale?: number

    // The user's answer, once given: one value, or several for multi.
    answer?: string[]
}

// A physical photo pinned to the board, not chalk. The image is a copy owned by the instance.
export interface ImageItem extends ItemBase {

    kind: "image"

    // File name inside the instance's asset folder.
    asset: string

    // Width in cells; the height follows the image.
    width: number

    caption?: string
}

// A paper note pinned to the board, written in ink. Its color is the paper's.
export interface NoteItem extends ItemBase {

    kind: "note"

    text: string

    // Width in cells.
    width: number
}

export type Item = TextItem | StepsItem | FlowItem | AskItem | ImageItem | NoteItem

// Things held by a thumbtack rather than written in chalk.
export const pinnedKinds: Item["kind"][] = ["image", "note"]

export const linkStyles = ["thread", "chalk"] as const

export type LinkStyle = typeof linkStyles[number]

// A connection between two items: a thread between pins, or a chalk arrow.
export interface Link {

    id: string

    from: string

    to: string

    style: LinkStyle

    color: ChalkColor

    label?: string

    createdAt: number

    erasedAt?: number
}

export interface Avatar extends Cell {

    // One of the current character's moods (see core/avatar/characters).
    mood: string

    // The character the user picked; the same in every project.
    character: string

    say?: string

    // The current mood came from something that should not make a sound (file changes, for now).
    quiet?: boolean
}

export interface Viewport {

    col: number

    row: number

    cols: number

    rows: number

    // Whether the view keeps framing the whole board by itself.
    auto?: boolean
}

// What the agent asks of the user's view.
// fit: show everything and keep doing so. auto: turn that on or off.
// show: frame these items, or this block of cells (automatic framing pauses until fit or auto on).
export type ViewRequest =
    | { kind: "fit" }
    | { kind: "auto", on: boolean }
    | { kind: "show", items?: string[], cells?: { col: number, row: number, cols: number, rows: number } }

export const markKinds = ["circle", "underline", "cross"] as const

export type MarkKind = typeof markKinds[number]

// Chalk emphasis drawn on top of an item, once: circled, underlined or crossed out.
export interface Mark {

    id: string

    target: string

    kind: MarkKind

    color: ChalkColor

    createdAt: number

    erasedAt?: number
}

// What is kept on disk between sessions: only what is still on the board.
export interface BoardSnapshot {

    version: 1

    items: Item[]

    links: Link[]

    // Missing in boards saved before marks existed.
    marks?: Mark[]

    avatar: Avatar
}

export interface BoardState {

    // Whether an agent has run any command in this session; the first-steps prompt then goes away.
    agentActive: boolean

    items: Item[]

    links: Link[]

    marks: Mark[]

    avatar: Avatar
}

// The page loads pinned images through this scheme; the desktop side serves the asset folder.
export const assetScheme = "board-asset"

// An item's rendered size in board pixels, as the window measured it.
export interface Size {

    width: number

    height: number
}

// Size of one cell in board pixels; the renderer scales the board, not the cell.
export const cellSize = 120

// The avatar figure spans this many cells from its position.
export const avatarSpan = { cols: 2, rows: 2 }
