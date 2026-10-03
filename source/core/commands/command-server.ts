import { createServer, type Server, type Socket } from "node:net"
import { dispatch } from "./dispatcher"
import type AssetStore from "@/core/assets/asset-store"
import type Board from "@/core/board/board"

// Wire format, one JSON object per line.
// Client sends:   { "argv": [...], "cwd": "/caller/working/dir" }
// Server answers: { "out": "..." } lines, then { "exit": code }
export interface CommandRequest {

    argv: string[]

    cwd: string
}

export type CommandResponse = { out: string } | { exit: number }

// Listens on this instance's socket; only terminals of this instance know its path.
export default class CommandServer {

    private constructor(private readonly server: Server) { }

    public static async listen(path: string, board: Board, assets: AssetStore) {

        const server = createServer(socket => serve(socket, board, assets))

        await new Promise<void>((resolve, reject) => {

            server.once("error", reject)

            server.listen(path, () => resolve())
        })

        return new CommandServer(server)
    }

    public close() {

        this.server.close()
    }
}

function serve(socket: Socket, board: Board, assets: AssetStore) {

    let buffer = ""

    const send = (response: CommandResponse) => {

        if (socket.writable) socket.write(JSON.stringify(response) + "\n")
    }

    socket.setEncoding("utf8")

    socket.on("error", () => socket.destroy())

    socket.on("data", async chunk => {

        buffer += chunk

        const end = buffer.indexOf("\n")

        if (end < 0) return

        socket.removeAllListeners("data")

        try {

            const request = JSON.parse(buffer.slice(0, end)) as CommandRequest

            board.markAgentActive()

            const code = await dispatch(request.argv, { board, assets, cwd: request.cwd || process.cwd(), out: out => send({ out }) })

            send({ exit: code })
        }

        catch (error) {

            send({ out: `error: ${error instanceof Error ? error.message : String(error)}` })

            send({ exit: 1 })
        }

        socket.end()
    })
}
