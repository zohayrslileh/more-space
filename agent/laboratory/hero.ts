// Records docs/hero.gif: the board alone (no window chrome, toolbar or terminal) while the agent
// command draws a small scene on it, with the avatar. Uses a throwaway project so no real board changes.
//   bun agent/laboratory/hero.ts
import { $ } from "bun"
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..")

const port = 9335

const width = 1120, height = 600

const project = mkdtempSync(join(tmpdir(), "hero-board-"))

const frames = mkdtempSync(join(tmpdir(), "hero-frames-"))

const before = new Set(readdirSync(tmpdir()))

const app = Bun.spawn([join(root, "node_modules/.bin/electron"), root, `--cwd=${project}`, `--remote-debugging-port=${port}`], { stdout: "ignore", stderr: "ignore" })

await Bun.sleep(5000)

// The instance's runtime folder holds its command and socket.
const runtime = readdirSync(tmpdir()).filter(entry => entry.startsWith("more-space-") && !before.has(entry)).map(entry => join(tmpdir(), entry)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]!

async function run(line: string) {

    const output = await $`sh -c ${`${join(runtime, "bin/more-space")} ${line}`}`.env({ ...process.env, MORE_SPACE_SOCKET: join(runtime, "command.sock") }).nothrow().text()

    return output.split(/\s/)[0]!
}

const pages = await (await fetch(`http://localhost:${port}/json`)).json() as { type: string, webSocketDebuggerUrl: string }[]

const socket = new WebSocket(pages.find(page => page.type === "page")!.webSocketDebuggerUrl)

let counter = 0

const pending = new Map<number, (value: any) => void>()

const shots: { file: string, time: number }[] = []

socket.onmessage = async event => {

    const message = JSON.parse(String(event.data))

    if (message.id && pending.has(message.id)) { pending.get(message.id)!(message.result); pending.delete(message.id) }

    else if (message.method === "Page.screencastFrame") {

        const { data, metadata, sessionId } = message.params

        const file = join(frames, `${String(shots.length).padStart(5, "0")}.png`)

        shots.push({ file, time: metadata.timestamp })

        call("Page.screencastFrameAck", { sessionId })

        await Bun.write(file, Buffer.from(data, "base64"))
    }
}

await new Promise(resolve => socket.onopen = resolve)

function call(method: string, params: object = {}) {

    const id = ++counter

    socket.send(JSON.stringify({ id, method, params }))

    return new Promise<any>(resolve => pending.set(id, resolve))
}

await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false })

await call("Runtime.evaluate", {
    expression: `document.head.insertAdjacentHTML("beforeend", "<style>.titlebar,.toolbar,.terminal-panel,.terminal-reveal-zone,.onboard{display:none!important}.window{display:block!important;height:100vh}.workspace{height:100vh}</style>")`
})

// A fixed frame for the whole scene, so the camera holds still while the chalk goes on.
await run(`avatar move 7,2`)

await run(`view show 0,0 8,4`)

await Bun.sleep(1200)

await call("Page.startScreencast", { format: "png", everyNthFrame: 1 })

const beat = (seconds: number) => Bun.sleep(seconds * 1000)

await beat(0.8)

await run(`avatar mood thinking`)

await run(`avatar say "Let me sketch the plan"`)

await beat(1.6)

await run(`avatar mood working`)

await run(`avatar say`)

const title = await run(`board write 0,0 "Refactor the login" --size l --color focus`)

await beat(1.6)

await run(`board mark ${title} underline --color focus`)

await beat(1)

await run(`board steps 0,1 "[x] Read the code" "[>] Write the tests" "[ ] Ship it"`)

await beat(2.4)

const flow = await run(`board flow 0,3 "Form -> Auth -> Session" --focus Auth --color info`)

await beat(2.2)

const note = await run(`board note 4,1 "Tokens expire after an hour" --color question`)

await beat(1.4)

await run(`board link ${note} ${flow} --label why --color question`)

await beat(1.4)

const old = await run(`board write 4,4 "Cookie sessions" --color problem`)

await beat(1.2)

await run(`board mark ${old} cross --color problem`)

await beat(1.2)

await run(`avatar mood surprised`)

await run(`board mark ${note} circle --color focus`)

await beat(1.4)

await run(`avatar mood happy`)

await run(`avatar say "Tests next!"`)

await beat(3.2)

await call("Page.stopScreencast")

await beat(0.5)

app.kill()

// Each frame lasts until the next one; the last holds before the loop starts over.
const list = shots.map((shot, index) => `file '${shot.file}'\nduration ${((shots[index + 1]?.time ?? shot.time + 2.5) - shot.time).toFixed(3)}`).join("\n") + `\nfile '${shots.at(-1)!.file}'\n`

await Bun.write(join(frames, "list.txt"), list)

const output = join(root, "docs", "hero.gif")

await $`ffmpeg -y -loglevel error -f concat -safe 0 -i ${join(frames, "list.txt")} -vf "fps=20,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 ${output}`

rmSync(frames, { recursive: true, force: true })

rmSync(project, { recursive: true, force: true })

console.log(`${shots.length} frames → ${output} (${(statSync(output).size / 1024 / 1024).toFixed(1)} MB)`)
