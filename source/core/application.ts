import { register } from "@/libs/instances"
import TerminalManager, { type TerminalEvents } from "./terminal/terminal-manager"
import CommandServer from "./commands/command-server"
import AssetStore from "./assets/asset-store"
import BoardStore from "./board/board-store"
import Project from "./project/project"
import SettingsStore from "./settings/settings-store"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { command, env, name } from "@/libs/identity"
import { homedir, tmpdir } from "node:os"
import { join, basename } from "node:path"
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

    // The app's data folder: the command lives in a fixed bin folder here, and open windows register
    // here, so a process started from a terminal keeps finding both after that window is gone.
    dataDirectory: string

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

        const binDirectory = join(options.dataDirectory, "bin")

        const instancesDirectory = join(options.dataDirectory, "instances")

        // A Unix socket in the runtime folder; on Windows a named pipe, which lives in its own namespace.
        const socketPath = process.platform === "win32" ? `\\\\.\\pipe\\${basename(runtimeDirectory)}` : join(runtimeDirectory, "command.sock")

        await writeCommand(binDirectory, options, instancesDirectory)

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

        const unregister = await register(instancesDirectory, { pid: process.pid, socket: socketPath, project: project?.path })

        const terminals = new TerminalManager(binDirectory, socketPath, project?.path ?? homedir(), options.terminalEvents)

        const application = new Application(project, board, assets, settings, terminals, commandServer, boardStore, runtimeDirectory)

        // The avatar notices files changing on the branch while the agent works.
        application.stopWatching = project?.watchChanges(change => board.expressFiles(change)) ?? (() => { })

        application.unregister = unregister

        return application
    }

    private stopWatching = () => { }

    private unregister: () => Promise<void> = async () => { }

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

        this.stopWatching()

        await this.unregister()

        this.terminals.closeAll()

        this.commandServer.close()

        this.boardStore?.save(this.board.snapshot())

        await this.boardStore?.flush()

        await rm(this.runtimeDirectory, { recursive: true, force: true })
    }
}

// The command exists only on the PATH of this instance's shells, never in the system.
// On Windows it is a .cmd file, which PowerShell and cmd both run without an execution policy.
export async function writeCommand(binDirectory: string, options: Pick<ApplicationOptions, "runtime" | "cliScript">, instancesDirectory: string) {

    await mkdir(binDirectory, { recursive: true })

    if (process.platform === "win32") {

        const script = ["@echo off", "setlocal", "set ELECTRON_RUN_AS_NODE=1", `set "${env.instances}=${instancesDirectory}"`, `"${options.runtime}" "${options.cliScript}" %*`, "exit /b %ERRORLEVEL%", ""].join("\r\n")

        return writeFile(join(binDirectory, `${command}.cmd`), script)
    }

    const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

    const script = [
        "#!/bin/sh",
        `ELECTRON_RUN_AS_NODE=1 ${env.instances}=${quote(instancesDirectory)} exec ${quote(options.runtime)} ${quote(options.cliScript)} "$@"`,
        ""
    ].join("\n")

    await writeFile(join(binDirectory, command), script, { mode: 0o755 })
}
