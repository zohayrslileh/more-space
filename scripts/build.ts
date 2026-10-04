import { copyFile, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"

// Builds the three programs the app is made of into dist/:
// the Electron main process, the window preload, the in-terminal command, and the window page.

// With its trailing separator; fileURLToPath also gives a real path on Windows.
const root = fileURLToPath(new URL("..", import.meta.url))

const dist = `${root}dist`

await rm(dist, { recursive: true, force: true })

const builds = [
    Bun.build({ entrypoints: [`${root}source/main.ts`], outdir: dist, target: "node", format: "esm", external: ["electron", "node-pty"] }),
    Bun.build({ entrypoints: [`${root}source/view/desktop/preload.ts`], outdir: dist, target: "node", format: "cjs", external: ["electron"], naming: "preload.cjs" }),
    Bun.build({ entrypoints: [`${root}source/cli/cli.ts`], outdir: dist, target: "node", format: "esm", naming: "cli.js" }),
    Bun.build({ entrypoints: [`${root}source/view/renderer/index.html`], outdir: `${dist}/renderer`, target: "browser", minify: true, define: { "process.env.NODE_ENV": "\"production\"" } })
]

let failed = false

for (const result of await Promise.all(builds)) {

    if (result.success) continue

    failed = true

    for (const log of result.logs) console.error(log)
}

if (failed) process.exit(1)

// The app icon rides along for the window and the Dock (the source is assets/icon/icon.svg; run "bun run icon").
await copyFile(`${root}assets/icon/icon.png`, `${dist}/icon.png`)

console.log("built dist/")
