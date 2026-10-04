import { writeCommand, type ApplicationOptions } from "@/core/application"
import AssetStore from "@/core/assets/asset-store"
import Board from "@/core/board/board"
import CommandServer from "@/core/commands/command-server"
import { command, env } from "@/libs/identity"
import { expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, delimiter, join } from "node:path"

// The whole way an agent's call travels: the generated command on PATH (sh, or .cmd run by PowerShell
// on Windows), the thin client, the instance's socket or named pipe, the board, and back.
test("the command an agent runs reaches the board and answers", async () => {

    const windows = process.platform === "win32"

    const runtime = mkdtempSync(join(tmpdir(), `${command}-test-`))

    const socket = windows ? `\\\\.\\pipe\\${basename(runtime)}` : join(runtime, "command.sock")

    const board = new Board()

    const server = await CommandServer.listen(socket, board, new AssetStore(join(runtime, "assets")))

    // Bun stands in for Electron-as-Node here: it runs the client's source directly.
    await writeCommand(join(runtime, "bin"), { runtime: process.execPath, cliScript: join(import.meta.dir, "..", "source", "cli", "cli.ts") } as ApplicationOptions)

    // Windows spells it Path: prepend under the existing spelling, as the terminals do.
    const pathKey = Object.keys(process.env).find(key => key.toUpperCase() === "PATH") ?? "PATH"

    const environment = { ...process.env, [env.socket]: socket, [pathKey]: [join(runtime, "bin"), process.env[pathKey]].join(delimiter) }

    const shell = windows ? ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"] : ["sh", "-c"]

    const run = async (line: string) => {

        const child = Bun.spawn([...shell, line], { env: environment, stdout: "pipe", stderr: "pipe" })

        const [code, out, error] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])

        if (code !== 0) console.error(`exit ${code} for: ${line}\n${out}${error}`)

        return { code, out }
    }

    const written = await run(`${command} board write 0,0 "Hello from the shell"`)

    expect(written.code).toBe(0)

    expect(board.liveItems().map(item => item.kind === "text" && item.text)).toEqual(["Hello from the shell"])

    const batch = await run(windows ? `@'\nboard note 3,0 "A note"\navatar say Hi\n'@ | ${command} -` : `${command} - <<'EOF'\nboard note 3,0 "A note"\navatar say Hi\nEOF`)

    expect(batch.code).toBe(0)

    expect(board.state().avatar.say).toBe("Hi")

    expect((await run(`${command} board nope`)).code).toBe(2)

    server.close()

    rmSync(runtime, { recursive: true, force: true })
}, 30_000)
