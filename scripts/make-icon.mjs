// Renders assets/icon/icon.svg with Chromium (so the chalk filters look exactly as designed) into
// assets/icon/icon.png (1024) and, on macOS, assets/icon/icon.icns. Run: bun run icon
// To preview another SVG without touching the icon: electron scripts/make-icon.mjs <in.svg> <out.png>
import { app, BrowserWindow } from "electron"
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const folder = join(import.meta.dirname, "..", "assets", "icon")

const [preview, previewOut] = process.argv.slice(2).filter(argument => argument.endsWith(".svg") || argument.endsWith(".png"))

app.whenReady().then(async () => {

    const window = new BrowserWindow({ width: 400, height: 400, show: false })

    const svg = readFileSync(preview ?? join(folder, "icon.svg"), "utf8")

    await window.loadURL("data:text/html,<body></body>")

    // Drawn onto a canvas and exported there, so the corners stay transparent.
    const base64 = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = canvas.height = 1024
            canvas.getContext("2d").drawImage(image, 0, 0, 1024, 1024)
            resolve(canvas.toDataURL("image/png").split(",")[1])
        }
        image.onerror = reject
        image.src = "data:image/svg+xml;base64," + ${JSON.stringify(Buffer.from(svg).toString("base64"))}
    })`)

    const png = previewOut ?? join(folder, "icon.png")

    writeFileSync(png, Buffer.from(base64, "base64"))

    if (preview) { app.quit(); return }

    if (process.platform === "darwin") {

        const set = join(folder, "icon.iconset")

        rmSync(set, { recursive: true, force: true })

        mkdirSync(set)

        for (const size of [16, 32, 128, 256, 512]) {

            execFileSync("sips", ["-z", `${size}`, `${size}`, png, "--out", join(set, `icon_${size}x${size}.png`)], { stdio: "ignore" })

            execFileSync("sips", ["-z", `${size * 2}`, `${size * 2}`, png, "--out", join(set, `icon_${size}x${size}@2x.png`)], { stdio: "ignore" })
        }

        execFileSync("iconutil", ["-c", "icns", set, "-o", join(folder, "icon.icns")])

        rmSync(set, { recursive: true, force: true })
    }

    console.log("icon written to assets/icon/")

    app.quit()
})
