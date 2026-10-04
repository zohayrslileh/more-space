import { spawn, type IPty } from "node-pty"
import { delimiter, join } from "node:path"
import { existsSync } from "node:fs"
import ActivityTracker, { type Activity } from "./activity"
import { env } from "@/libs/identity"

export interface TerminalOptions {

    cols: number

    rows: number
}

export interface TerminalEvents {

    data: (id: string, data: string) => void

    exit: (id: string, code: number) => void

    // What the program in a terminal seems to be doing (see activity.ts).
    activity: (id: string, activity: Activity, detail?: string) => void
}

// Owns the shells of this instance. Every shell gets this instance's command
// on its PATH and the socket that binds the command to this instance.
export default class TerminalManager {

    private readonly terminals = new Map<string, IPty>()

    private readonly trackers = new Map<string, ActivityTracker>()

    private counter = 0

    constructor(
        private readonly binDirectory: string,
        private readonly socketPath: string,
        private readonly cwd: string,
        private readonly events: TerminalEvents
    ) { }

    public open(options: TerminalOptions) {

        const id = `term-${++this.counter}`

        const [shell, args] = process.platform === "win32" ? [powershell(), ["-NoLogo"]] : [process.env.SHELL || "/bin/zsh", ["-l"]]

        const terminal = spawn(shell, args, {
            name: "xterm-256color",
            cols: options.cols,
            rows: options.rows,
            cwd: this.cwd,
            env: this.environment()
        })

        const tracker = new ActivityTracker((activity, detail) => this.events.activity(id, activity, detail))

        this.trackers.set(id, tracker)

        terminal.onData(data => { tracker.output(data); this.events.data(id, data) })

        terminal.onExit(({ exitCode }) => {

            this.terminals.delete(id)

            tracker.dispose()

            this.trackers.delete(id)

            this.events.exit(id, exitCode)
        })

        this.terminals.set(id, terminal)

        return id
    }

    public write(id: string, data: string) {

        this.trackers.get(id)?.input()

        this.terminals.get(id)?.write(data)
    }

    public resize(id: string, options: TerminalOptions) {

        if (options.cols > 0 && options.rows > 0) this.terminals.get(id)?.resize(options.cols, options.rows)
    }

    public close(id: string) {

        this.terminals.get(id)?.kill()
    }

    public closeAll() {

        for (const terminal of this.terminals.values()) terminal.kill()

        this.terminals.clear()
    }

    private environment() {

        const environment: Record<string, string> = {}

        for (const [key, value] of Object.entries(process.env)) if (value !== undefined) environment[key] = value

        // Electron may leave these behind; a shell must not inherit them.
        delete environment.ELECTRON_RUN_AS_NODE

        delete environment.ELECTRON_NO_ATTACH_CONSOLE

        // If the app was started from inside an agent session, its session markers would make an
        // agent in this terminal believe it is a child of that session. A new terminal starts clean.
        for (const key of ["CLAUDECODE", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SSE_PORT"]) delete environment[key]

        environment.TERM = "xterm-256color"

        environment.COLORTERM = "truecolor"

        // Windows spells it Path; keep its own spelling so there is only one.
        const path = Object.keys(environment).find(key => key.toUpperCase() === "PATH") ?? "PATH"

        environment[path] = [this.binDirectory, environment[path]].filter(Boolean).join(delimiter)

        environment[env.socket] = this.socketPath

        return environment
    }
}

// PowerShell 7 when it is installed, otherwise the Windows PowerShell every Windows has.
function powershell() {

    const path = Object.entries(process.env).find(([key]) => key.toUpperCase() === "PATH")?.[1] ?? ""

    return path.split(delimiter).some(folder => folder && existsSync(join(folder, "pwsh.exe"))) ? "pwsh.exe" : "powershell.exe"
}
