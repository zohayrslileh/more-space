import type { TerminalOptions } from "@/core/terminal/terminal-manager"
import type { Size, Viewport } from "@/core/board/board-types"
import { app, BrowserWindow, clipboard, ipcMain } from "electron"
import type Application from "@/core/application"
import { channels, type ProjectInfo } from "./bridge-types"
import { title } from "@/libs/identity"
import { homedir } from "node:os"
import { basename, join } from "node:path"

export interface ProjectActions {

    choose: () => Promise<void>

    open: (path: string) => Promise<boolean>
}

// The desktop boundary: one window, and the IPC that connects its page to the instance.
export function openWindow(application: Application, distDirectory: string, projects: ProjectActions) {

    const window = new BrowserWindow({
        title,
        width: 1360,
        height: 880,
        minWidth: 720,
        minHeight: 480,
        show: false,
        backgroundColor: "#161817",
        icon: join(distDirectory, "icon.png"),
        // macOS: traffic lights inset in the title bar. Windows: its own controls drawn over the bar's right end.
        ...(process.platform === "win32"
            ? { titleBarStyle: "hidden" as const, titleBarOverlay: { color: "#171a19", symbolColor: "#d9ddd9", height: 34 } }
            : { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 11 } }),
        webPreferences: {
            preload: join(distDirectory, "preload.cjs"),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            // Board sounds play as the agent writes, without a click first.
            autoplayPolicy: "no-user-gesture-required"
        }
    })

    const send = (channel: string, ...args: unknown[]) => {

        if (!window.isDestroyed()) window.webContents.send(channel, ...args)
    }

    // A new question while the user looks elsewhere: bounce the Dock icon / flash the taskbar.
    const askedBefore = new Set<string>()

    const unsubscribeState = application.board.subscribe(() => {

        send(channels.boardState, application.board.state())

        for (const item of application.board.liveItems()) {

            if (item.kind !== "ask" || item.answer || askedBefore.has(item.id)) continue

            askedBefore.add(item.id)

            if (window.isDestroyed() || window.isFocused()) continue

            if (process.platform === "darwin") app.dock?.bounce("informational")

            else window.flashFrame(true)
        }
    })

    const unsubscribeView = application.board.onView(request => send(channels.boardView, request))

    const project = application.project

    const home = (path: string) => path.startsWith(homedir()) ? `~${path.slice(homedir().length)}` : path

    const recent = application.settings.get().recentProjects
        .filter(path => path !== project?.path)
        .map(path => ({ path, label: home(path), name: basename(path) }))

    const info: ProjectInfo = { open: !!project, project: project?.name ?? "", path: project ? home(project.path) : "", recent }

    // The branch can change under the window (checkout in the terminal); keep the title current.
    const stopWatching = project?.watchBranch(branch => { info.branch = branch; send(channels.infoChanged, { ...info }) }) ?? (() => { })

    ipcMain.handle(channels.info, () => ({ ...info }))

    ipcMain.handle(channels.boardGet, () => application.board.state())

    ipcMain.handle(channels.font, () => application.settings.get().font)

    ipcMain.handle(channels.chooseFont, async (_, id: string) => { await application.chooseFont(String(id)) })

    ipcMain.handle(channels.voiceMoods, () => application.settings.get().voiceMoods)

    ipcMain.handle(channels.setVoiceMoods, async (_, on: boolean) => { await application.settings.set({ voiceMoods: on === true }) })

    ipcMain.handle(channels.chooseProject, () => projects.choose())

    ipcMain.handle(channels.openProject, (_, path: string) => projects.open(String(path)))

    ipcMain.handle(channels.copyText, (_, text: string) => clipboard.writeText(String(text)))

    ipcMain.handle(channels.chooseCharacter, async (_, id: string) => { await application.chooseCharacter(String(id)) })

    ipcMain.handle(channels.boardAnswer, (_, id: string, values: string[]) => Array.isArray(values) && application.board.answer(id, values.map(String)))

    ipcMain.on(channels.boardViewport, (_, viewport: Viewport) => application.board.setViewport(viewport))

    ipcMain.on(channels.boardSizes, (_, sizes: Record<string, Size>) => application.board.setSizes(sizes))

    ipcMain.handle(channels.terminalOpen, (_, options: TerminalOptions) => application.terminals.open(options))

    ipcMain.on(channels.terminalWrite, (_, id: string, data: string) => application.terminals.write(id, data))

    ipcMain.on(channels.terminalResize, (_, id: string, options: TerminalOptions) => application.terminals.resize(id, options))

    window.once("ready-to-show", () => window.show())

    window.on("focus", () => window.flashFrame(false))

    window.on("closed", () => {

        unsubscribeState()

        stopWatching()

        unsubscribeView()

        for (const channel of [channels.info, channels.boardGet, channels.boardAnswer, channels.chooseCharacter, channels.font, channels.chooseFont, channels.voiceMoods, channels.setVoiceMoods, channels.chooseProject, channels.openProject, channels.copyText, channels.terminalOpen]) ipcMain.removeHandler(channel)

        for (const channel of [channels.boardViewport, channels.boardSizes, channels.terminalWrite, channels.terminalResize]) ipcMain.removeAllListeners(channel)
    })

    window.loadFile(join(distDirectory, "renderer", "index.html"))

    // The program in the terminal wants the user: bounce the Dock icon / flash the taskbar if away.
    const callForAttention = () => {

        if (window.isDestroyed() || window.isFocused()) return

        if (process.platform === "darwin") app.dock?.bounce("informational")

        else window.flashFrame(true)
    }

    return { window, send, callForAttention }
}
