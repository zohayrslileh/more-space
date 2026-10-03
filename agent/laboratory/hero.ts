// Records docs/hero.gif: a finished board scene, still, with only the avatar moving in a seamless loop.
// The agent command draws the scene in a throwaway project (no real board changes); then the avatar's
// looping animations are paused and stepped through exactly one cycle, frame by frame, and each frame
// is cropped to the drawings.
//   bun agent/laboratory/hero.ts
import { $ } from "bun"
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..")

const port = 9335

const width = 1500, height = 860, scale = 2, fps = 30, margin = 44

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


socket.onmessage = event => {

    const message = JSON.parse(String(event.data))

    if (message.id && pending.has(message.id)) { pending.get(message.id)!(message.result); pending.delete(message.id) }
}
await new Promise(resolve => socket.onopen = resolve)

function call(method: string, params: object = {}) {

    const id = ++counter

    socket.send(JSON.stringify({ id, method, params }))

    return new Promise<any>(resolve => pending.set(id, resolve))
}

await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false })

await call("Runtime.evaluate", {
    expression: `document.head.insertAdjacentHTML("beforeend", "<style>.titlebar,.toolbar,.terminal-panel,.terminal-reveal-zone,.onboard{display:none!important}.window{display:block!important;height:100vh}.workspace{height:100vh}</style>")`
})

// A fixed frame for the whole scene, so the camera holds still while the chalk goes on.
await run(`avatar move 7,2`)

await run(`view show 0,0 8,4`)

await Bun.sleep(1200)

// Spaced like an agent would, so each piece finishes drawing before the next.
const beat = (seconds: number) => Bun.sleep(seconds * 700)

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

// Let every stroke finish.
await beat(4)

const evaluate = async (expression: string) => (await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value

// The drawings' bounds, with an even margin, and one full cycle of every looping animation.
const { box, period } = await evaluate(`(() => {
    const rects = [...document.querySelectorAll("[data-item]:not(.ghost), [data-avatar], .bubble, .emphasis")].map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height)
    const left = Math.min(...rects.map(rect => rect.left)) - ${margin}, top = Math.min(...rects.map(rect => rect.top)) - ${margin}
    const right = Math.max(...rects.map(rect => rect.right)) + ${margin}, bottom = Math.max(...rects.map(rect => rect.bottom)) + ${margin}
    const loops = document.getAnimations().filter(animation => animation.effect.getTiming().iterations === Infinity)
    const gcd = (a, b) => b ? gcd(b, a % b) : a
    const period = loops.map(animation => Math.round(animation.effect.getTiming().duration)).reduce((a, b) => a * b / gcd(a, b), 1)
    loops.forEach(animation => animation.pause())
    return { box: { x: left, y: top, width: right - left, height: bottom - top }, period }
})()`)

const count = Math.round(period / 1000 * fps)

for (let frame = 0; frame < count; frame++) {

    await evaluate(`new Promise(resolve => {
        document.getAnimations().filter(animation => animation.effect.getTiming().iterations === Infinity).forEach(animation => animation.currentTime = ${frame * period / count})
        requestAnimationFrame(() => requestAnimationFrame(resolve))
    })`)

    const shot = await call("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 } })

    await Bun.write(join(frames, `${String(frame).padStart(4, "0")}.png`), Buffer.from(shot.data, "base64"))
}

app.kill()

const output = join(root, "docs", "hero.gif")

await $`ffmpeg -y -loglevel error -framerate ${fps} -i ${join(frames, "%04d.png")} -vf "scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 ${output}`

rmSync(frames, { recursive: true, force: true })

rmSync(project, { recursive: true, force: true })

console.log(`${count} frames over ${period}ms, ${Math.round(box.width)}x${Math.round(box.height)} → ${output} (${(statSync(output).size / 1024).toFixed(0)} KB)`)
