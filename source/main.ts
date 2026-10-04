import { openWindow } from "@/view/desktop/window"
import { channels } from "@/view/desktop/bridge-types"
import Application from "@/core/application"
import { assetScheme } from "@/core/board/board-types"
import type { Activity } from "@/core/terminal/activity"
import { app, dialog, net, protocol } from "electron"
import { stat } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { homedir } from "node:os"
import { join, sep } from "node:path"

const distDirectory = import.meta.dirname

// The project folder comes from --cwd; without it the window opens on "choose a project".
const project = process.argv.find(arg => arg.startsWith("--cwd="))?.slice("--cwd=".length) || undefined

// Pinned images reach the page through their own scheme, before the app is ready.
protocol.registerSchemesAsPrivileged([{ scheme: assetScheme, privileges: { standard: true, secure: true, supportFetchAPI: true } }])

// No top-level await: Electron holds "ready" until an ESM main module finishes evaluating.
app.whenReady().then(start)

async function start() {

    // The app's own icon in the Dock, also when running from a development build.
    if (process.platform === "darwin") app.dock?.setIcon(join(distDirectory, "icon.png"))

    let send: (channel: string, ...args: unknown[]) => void = () => { }

    let onActivity: (activity: Activity) => void = () => { }

    const application = await Application.initialize({
        runtime: process.execPath,
        // Packaged, the command runs from outside the app archive (see scripts/package.ts).
        cliScript: join(distDirectory, "cli.js").replace(`app.asar${sep}`, `app.asar.unpacked${sep}`),
        project,
        boardsDirectory: join(app.getPath("userData"), "boards"),
        dataDirectory: app.getPath("userData"),
        settingsFile: join(app.getPath("userData"), "settings.json"),
        terminalEvents: {
            data: (id, data) => send(channels.terminalData, id, data),
            exit: (id, code) => send(channels.terminalExit, id, code),
            activity: (id, activity, detail) => { onActivity(activity); send(channels.terminalActivity, id, activity, detail) }
        }
    })

    protocol.handle(assetScheme, request => {

        // board-asset://<file>: a standard scheme, so the file name is the host.
        const file = application.assets.resolve(new URL(request.url).hostname)

        return file ? net.fetch(pathToFileURL(file).toString()) : new Response("Not found", { status: 404 })
    })

    const opened = openWindow(application, distDirectory, { choose: chooseProject, open: openProject })

    send = opened.send

    onActivity = activity => {

        application.board.expressActivity(activity)

        if (activity === "attention") opened.callForAttention()
    }

    let disposed = false

    app.on("will-quit", event => {

        if (disposed) return

        event.preventDefault()

        disposed = true

        application.dispose().finally(() => app.quit())
    })
}

app.on("window-all-closed", () => app.quit())

async function chooseProject() {

    const result = await dialog.showOpenDialog({ title: "Open a project", defaultPath: project ?? homedir(), properties: ["openDirectory", "createDirectory"] })

    if (!result.canceled && result.filePaths[0]) await openProject(result.filePaths[0])
}

// Every board and shell belongs to one project, so another project means a fresh start on it.
async function openProject(path: string) {

    if (!(await stat(path).catch(() => undefined))?.isDirectory()) return false

    const args = process.argv.slice(1).filter(arg => !arg.startsWith("--cwd="))

    app.relaunch({ args: [...args, `--cwd=${path}`] })

    app.quit()

    return true
}
