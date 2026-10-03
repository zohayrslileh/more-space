import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"
import { channels, type Bridge } from "./bridge-types"

function listen<T extends unknown[]>(channel: string, listener: (...args: T) => void) {

    const handler = (_: IpcRendererEvent, ...args: unknown[]) => listener(...args as T)

    ipcRenderer.on(channel, handler)

    return () => { ipcRenderer.off(channel, handler) }
}

const bridge: Bridge = {

    info: () => ipcRenderer.invoke(channels.info),

    onInfo: listener => listen(channels.infoChanged, listener),

    chooseCharacter: id => ipcRenderer.invoke(channels.chooseCharacter, id),

    font: () => ipcRenderer.invoke(channels.font),

    chooseFont: id => ipcRenderer.invoke(channels.chooseFont, id),

    chooseProject: () => ipcRenderer.invoke(channels.chooseProject),

    openProject: path => ipcRenderer.invoke(channels.openProject, path),

    copyText: text => ipcRenderer.invoke(channels.copyText, text),

    terminal: {

        open: options => ipcRenderer.invoke(channels.terminalOpen, options),

        write: (id, data) => ipcRenderer.send(channels.terminalWrite, id, data),

        resize: (id, options) => ipcRenderer.send(channels.terminalResize, id, options),

        onData: listener => listen(channels.terminalData, listener),

        onExit: listener => listen(channels.terminalExit, listener),

        onActivity: listener => listen(channels.terminalActivity, listener)
    },

    board: {

        state: () => ipcRenderer.invoke(channels.boardGet),

        answer: (id, values) => ipcRenderer.invoke(channels.boardAnswer, id, values),

        setViewport: viewport => ipcRenderer.send(channels.boardViewport, viewport),

        reportSizes: sizes => ipcRenderer.send(channels.boardSizes, sizes),

        onState: listener => listen(channels.boardState, listener),

        onView: listener => listen(channels.boardView, listener)
    }
}

contextBridge.exposeInMainWorld("bridge", bridge)
