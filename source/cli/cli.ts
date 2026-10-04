import type { CommandResponse } from "@/core/commands/command-server"
import { command, env, title } from "@/libs/identity"
import { connect, type Socket } from "node:net"
import { candidates } from "@/libs/instances"
import { realpathSync } from "node:fs"

// The command an agent runs inside the app's terminal. It holds no logic:
// it forwards the arguments to the app instance that opened this terminal.

// The window that opened this terminal; or, when that one is gone (a long-lived process started from an
// old terminal), an open window on the project this runs in.
const sockets = candidates(process.env[env.socket], process.env[env.instances], realpathSync(process.cwd()))

if (!sockets.length) {

    process.stderr.write(`${command} only works inside a ${title} terminal.\n`)

    process.exit(1)
}

const argv = process.argv.slice(2)

if (argv[0] === "-") argv.splice(1, Infinity, await readStdin())

const socket = await reach(sockets)

if (!socket) {

    process.stderr.write(`${command}: the ${title} window for this terminal is gone, and no open window shows this project.\n`)

    process.exit(1)
}

let buffer = ""

let exitCode = 1

socket.setEncoding("utf8")

socket.write(JSON.stringify({ argv, cwd: process.cwd() }) + "\n")

socket.on("data", chunk => {

    buffer += chunk

    let end: number

    while ((end = buffer.indexOf("\n")) >= 0) {

        const response = JSON.parse(buffer.slice(0, end)) as CommandResponse

        buffer = buffer.slice(end + 1)

        if ("out" in response) process.stdout.write(response.out + "\n")

        else exitCode = response.exit
    }
})

socket.on("error", () => {

    process.stderr.write(`${command}: the ${title} window closed.\n`)

    process.exit(1)
})

socket.on("close", () => process.exit(exitCode))

// The first socket that answers.
async function reach(paths: string[]) {

    for (const path of paths) {

        const socket = await new Promise<Socket | undefined>(resolve => {

            const attempt = connect(path)

            attempt.once("connect", () => resolve(attempt))

            attempt.once("error", () => resolve(undefined))
        })

        if (socket) return socket
    }

    return undefined
}

async function readStdin() {

    let text = ""

    process.stdin.setEncoding("utf8")

    for await (const chunk of process.stdin) text += chunk

    return text
}
