import TerminalManager, { type TerminalEvents } from "./terminal/terminal-manager"
import CommandServer from "./commands/command-server"
import AssetStore from "./assets/asset-store"
import BoardStore from "./board/board-store"
import Project from "./project/project"
import SettingsStore from "./settings/settings-store"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { command, name } from "@/libs/identity"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import Board from "./board/board"

export interface ApplicationOptions {

    // Executable that can run the command script as plain Node (Electron itself).
    runtime: string

    // The built command script.
    cliScript: string

    // The project folder; without one the window asks the user to choose.
    project?: string

    // Where boards are cached, one folder per project path (the app's data folder, not the project).
    boardsDirectory: string

    // The user's settings file (the app's data folder).
    settingsFile: string

    terminalEvents: TerminalEvents
}

// One open instance: its project, its board and pinned files (kept per project), its command socket, its shells.
// Opened without a project, nothing is kept and no shell starts until the user picks one.
export default class Application {

    private constructor(
        public readonly project: Project | undefined,
        public readonly board: Board,
        public readonly assets: AssetStore,
        public readonly settings: SettingsStore,
        public readonly terminals: TerminalManager,
        private readonly commandServer: CommandServer,
        private readonly boardStore: BoardStore | undefined,
        private readonly runtimeDirectory: string
    ) { }

    public static async initialize(options: ApplicationOptions) {

        const runtimeDirectory = await mkdtemp(join(tmpdir(), `${name}-`))

        const binDirectory = join(runtimeDirectory, "bin")

        const socketPath = join(runtimeDirectory, "command.sock")

        await writeCommand(binDirectory, options)

        const project = options.project ? await Project.open(options.project, options.boardsDirectory) : undefined

        const board = new Board()

        const settings = await SettingsStore.open(options.settingsFile)

        board.setCharacter(settings.get().character)

        if (project) await settings.rememberProject(project.path)

        const assets = new AssetStore(join(project?.boardDirectory ?? runtimeDirectory, "assets"))

        await assets.init()

        const boardStore = project ? new BoardStore(project.boardDirectory) : undefined

        const saved = await boardStore?.load()

        if (saved) board.restore(saved)

        // Erased photos keep their trace, so their image stays too.
        await assets.prune(board.snapshot().items.flatMap(item => item.kind === "image" ? [item.asset] : []))

        if (boardStore) board.subscribe(() => boardStore.save(board.snapshot()))

        const commandServer = await CommandServer.listen(socketPath, board, assets)

        const terminals = new TerminalManager(binDirectory, socketPath, project?.path ?? homedir(), options.terminalEvents)

        return new Application(project, board, assets, settings, terminals, commandServer, boardStore, runtimeDirectory)
    }

    public async chooseFont(id: string) {

        if (!/^[a-z-]{1,40}$/.test(id)) return this.settings.get()

        return this.settings.set({ font: id })
    }

    public async chooseCharacter(id: string) {

        const settings = await this.settings.set({ character: id })

        this.board.setCharacter(settings.character)

        return settings
    }

    public async dispose() {

        this.terminals.closeAll()

        this.commandServer.close()

        this.boardStore?.save(this.board.snapshot())

        await this.boardStore?.flush()

        await rm(this.runtimeDirectory, { recursive: true, force: true })
    }
}

// The command exists only on the PATH of this instance's shells, never in the system.
async function writeCommand(binDirectory: string, options: ApplicationOptions) {

    const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

    const script = [
        "#!/bin/sh",
        `ELECTRON_RUN_AS_NODE=1 exec ${quote(options.runtime)} ${quote(options.cliScript)} "$@"`,
        ""
    ].join("\n")

    await mkdir(binDirectory, { recursive: true })

    await writeFile(join(binDirectory, command), script, { mode: 0o755 })
}
