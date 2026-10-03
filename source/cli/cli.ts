import type { CommandResponse } from "@/core/commands/command-server"
import { command, env, title } from "@/libs/identity"
import { connect } from "node:net"

// The command an agent runs inside the app's terminal. It holds no logic:
// it forwards the arguments to the app instance that opened this terminal.

const socketPath = process.env[env.socket]

if (!socketPath) {

    process.stderr.write(`${command} only works inside a ${title} terminal.\n`)

    process.exit(1)
}

const argv = process.argv.slice(2)

if (argv[0] === "-") argv.splice(1, Infinity, await readStdin())

const socket = connect(socketPath)

let buffer = ""

let exitCode = 1

socket.setEncoding("utf8")

socket.on("connect", () => socket.write(JSON.stringify({ argv, cwd: process.cwd() }) + "\n"))

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

    process.stderr.write(`${command}: the ${title} window for this terminal is gone.\n`)

    process.exit(1)
})

socket.on("close", () => process.exit(exitCode))

async function readStdin() {

    let text = ""

    process.stdin.setEncoding("utf8")

    for await (const chunk of process.stdin) text += chunk

    return text
}
