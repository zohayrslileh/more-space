// Runs the command server against a real Board and drives it through the built CLI with Node,
// the way a shell inside the app would. Usage: bun run build && bun agent/laboratory/command-roundtrip.ts
import CommandServer from "@/core/commands/command-server"
import Board from "@/core/board/board"
import { env, command } from "@/libs/identity"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const socket = join(mkdtempSync(join(tmpdir(), "lab-")), "s.sock")
const board = new Board()
const server = await CommandServer.listen(socket, board)
const cli = join(import.meta.dirname, "../../dist/cli.js")

async function run(args: string[], stdin?: string) {
    const child = Bun.spawn(["node", cli, ...args], { env: { ...process.env, [env.socket]: socket }, stdin: stdin ? new Blob([stdin]) : "ignore", stdout: "pipe" })
    const out = await new Response(child.stdout).text()
    console.log(`$ ${command} ${args.join(" ")}  [exit ${await child.exited}]\n${out}`)
}

await run([])
await run(["board"])
await run(["--all"])
await run(["guide"])
await run(["board", "info"])
await run(["board", "write", "0,0", "--size", "l", "--color", "focus", "Refactor", "auth"])
await run(["board", "steps", "9,1", "[x] Split check from session", "[>] Unify token expiry", "[ ] Update tests"])
await run(["board", "flow", "0,2", "Request -> Check -> Session", "--focus", "Check"])
await run(["-"], "avatar move 12,6\navatar mood thinking\navatar say \"Reading session.ts\"\nboard write 0,5 --color problem \"3 tests fail\"\nboard write x\n")
await run(["board", "items"])
await run(["board", "erase", "t1", "zz"])
setTimeout(() => board.answer([...board.liveItems()].find(i => i.kind === "ask")!.id, "Keep them"), 300)
await run(["ask", "6,6", "Delete old sessions?", "Delete them", "Keep them"])
await run(["ask", "6,8", "Ship it?", "Yes", "No", "--wait", "0.3"])
await run(["board", "nope"])
await run(["avatar", "mood", "angry"])
server.close()
process.exit(0)
