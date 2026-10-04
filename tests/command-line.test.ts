import { writeCommand } from "@/core/application"
import { register } from "@/libs/instances"
import AssetStore from "@/core/assets/asset-store"
import Board from "@/core/board/board"
import CommandServer from "@/core/commands/command-server"
import { command, env } from "@/libs/identity"
import { expect, test } from "bun:test"
import { mkdtempSync, realpathSync, rmSync } from "node:fs"
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
    await writeCommand(join(runtime, "bin"), { runtime: process.execPath, cliScript: join(import.meta.dir, "..", "source", "cli", "cli.ts") }, join(runtime, "instances"))

    // Windows spells it Path: prepend under the existing spelling, as the terminals do.
    const pathKey = Object.keys(process.env).find(key => key.toUpperCase() === "PATH") ?? "PATH"

    const environment = { ...process.env, [env.socket]: socket, [pathKey]: [join(runtime, "bin"), process.env[pathKey]].join(delimiter) }

    const shell = windows ? ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"] : ["sh", "-c"]

    const run = async (line: string) => {

        // powershell -Command turns any failing exit into 1; $LASTEXITCODE holds what the command returned.
        const child = Bun.spawn([...shell, windows ? `${line}; exit $LASTEXITCODE` : line], { env: environment, cwd: runtime, stdout: "pipe", stderr: "pipe" })

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

    // A stale environment (a long-lived process from a terminal that is gone): the command finds the
    // open window registered for the project it runs in.
    const stale = windows ? `\\\\.\\pipe\\gone-${basename(runtime)}` : join(runtime, "gone.sock")

    // Another open window on another project is there too, so only matching the project picks ours.
    await register(join(runtime, "instances"), { pid: process.ppid, socket: stale, project: tmpdir() + "-elsewhere" })

    const unregister = await register(join(runtime, "instances"), { pid: process.pid, socket, project: realpathSync(runtime) })

    environment[env.socket] = stale

    expect((await run(`${command} avatar say Found`)).code).toBe(0)

    expect(board.state().avatar.say).toBe("Found")

    await unregister()

    expect((await run(`${command} avatar say Lost`)).code).toBe(1)

    server.close()

    rmSync(runtime, { recursive: true, force: true })
}, 30_000)
