import type { BoardState, Size, Viewport, ViewRequest } from "@/core/board/board-types"
import type { TerminalOptions } from "@/core/terminal/terminal-manager"
import type { Activity } from "@/core/terminal/activity"

// What the window's page may ask of the app. The preload exposes exactly this.
export interface Bridge {

    info(): Promise<ProjectInfo>

    onInfo(listener: (info: ProjectInfo) => void): () => void

    // The user picks the avatar's character; the choice holds in every project.
    chooseCharacter(id: string): Promise<void>

    // The board's handwriting: the user's choice, the same in every project.
    font(): Promise<string>

    chooseFont(id: string): Promise<void>

    // Whether the character speaks on every mood the agent gives it (off: only when the user is needed).
    voiceMoods(): Promise<boolean>

    setVoiceMoods(on: boolean): Promise<void>

    // A folder picker, then the app restarts on the chosen project.
    chooseProject(): Promise<void>

    // Restarts the app on a known project folder; false if it is gone.
    openProject(path: string): Promise<boolean>

    copyText(text: string): Promise<void>

    terminal: {

        open(options: TerminalOptions): Promise<string>

        write(id: string, data: string): void

        resize(id: string, options: TerminalOptions): void

        onData(listener: (id: string, data: string) => void): () => void

        onExit(listener: (id: string, code: number) => void): () => void

        // working / idle / attention, read from the terminal's output (core/terminal/activity.ts).
        onActivity(listener: (id: string, activity: Activity, detail?: string) => void): () => void
    }

    board: {

        state(): Promise<BoardState>

        answer(id: string, values: string[]): Promise<boolean>

        setViewport(viewport: Viewport): void

        // Rendered item sizes in board pixels, by item id.
        reportSizes(sizes: Record<string, Size>): void

        onState(listener: (state: BoardState) => void): () => void

        onView(listener: (request: ViewRequest) => void): () => void
    }
}

// What the title bar shows. path uses ~ for the home folder.
export interface ProjectInfo {

    // false: no project yet; the window asks the user to choose one.
    open: boolean

    project: string

    path: string

    branch?: string

    // Recent project folders, most recent first, with ~ for the home folder.
    recent: { path: string, label: string, name: string }[]
}

export const channels = {

    info: "app:info",

    infoChanged: "app:info-changed",

    chooseCharacter: "settings:character",

    font: "settings:font",

    chooseFont: "settings:choose-font",

    voiceMoods: "settings:voice-moods",

    setVoiceMoods: "settings:set-voice-moods",

    chooseProject: "project:choose",

    openProject: "project:open",

    copyText: "clipboard:write",

    terminalOpen: "terminal:open",

    terminalWrite: "terminal:write",

    terminalResize: "terminal:resize",

    terminalData: "terminal:data",

    terminalExit: "terminal:exit",

    terminalActivity: "terminal:activity",

    boardState: "board:state",

    boardGet: "board:get",

    boardAnswer: "board:answer",

    boardViewport: "board:viewport",

    boardSizes: "board:sizes",

    boardView: "board:view"
} as const
