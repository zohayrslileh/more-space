import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import { extname, join, resolve } from "node:path"
import { homedir } from "node:os"
import { name, version } from "@/libs/identity"

export const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".bmp"]

const largestImage = 25 * 1024 * 1024

const downloadTimeout = 15_000

const extensionByType: Record<string, string> = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp",
    "image/svg+xml": ".svg", "image/avif": ".avif", "image/bmp": ".bmp"
}

export class AssetError extends Error { }

// Copies of files the agent put on the board, kept with the board. A copy, so the board
// keeps showing what was pinned even if the original changes or disappears.
export default class AssetStore {

    private counter = 0

    constructor(public readonly directory: string) { }

    // Continues numbering after files already kept from earlier sessions.
    public async init() {

        await mkdir(this.directory, { recursive: true })

        const numbers = (await readdir(this.directory)).map(file => parseInt(file, 10)).filter(Number.isFinite)

        this.counter = Math.max(0, ...numbers)
    }

    // Removes kept files no item uses any more.
    public async prune(used: string[]) {

        for (const file of await readdir(this.directory).catch(() => [] as string[])) {

            if (!used.includes(file)) await rm(join(this.directory, file), { force: true })
        }
    }

    // A local path (relative to cwd, ~ allowed) or an http(s) URL.
    public async importImage(path: string, cwd: string) {

        if (/^https?:\/\//i.test(path)) return this.downloadImage(path)

        const source = resolve(cwd, path.replace(/^~(?=$|\/)/, homedir()))

        const extension = extname(source).toLowerCase()

        if (!imageExtensions.includes(extension)) throw new AssetError(`"${path}" is not an image (${imageExtensions.join(" ")}).`)

        const info = await stat(source).catch(() => undefined)

        if (!info?.isFile()) throw new AssetError(`No file at "${source}".`)

        if (info.size > largestImage) throw new AssetError(`"${path}" is larger than ${largestImage / 1024 / 1024} MB.`)

        await mkdir(this.directory, { recursive: true })

        const file = `${++this.counter}${extension}`

        await copyFile(source, join(this.directory, file))

        return file
    }

    private async downloadImage(url: string) {

        // Some hosts refuse requests that do not say who is asking.
        const headers = { "User-Agent": `${name}/${version}` }

        const response = await fetch(url, { headers, signal: AbortSignal.timeout(downloadTimeout) }).catch(error => {

            throw new AssetError(`Could not download "${url}": ${error instanceof Error ? error.message : error}.`)
        })

        if (!response.ok) throw new AssetError(`Could not download "${url}": HTTP ${response.status}.`)

        const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? ""

        const extension = extensionByType[type]

        if (!extension) throw new AssetError(`"${url}" is not an image (${type || "unknown type"}).`)

        const data = Buffer.from(await response.arrayBuffer())

        if (data.length > largestImage) throw new AssetError(`"${url}" is larger than ${largestImage / 1024 / 1024} MB.`)

        await mkdir(this.directory, { recursive: true })

        const file = `${++this.counter}${extension}`

        await writeFile(join(this.directory, file), data)

        return file
    }

    // The path to serve for a requested asset name, or undefined if it is not ours.
    public resolve(file: string) {

        if (!/^\d+\.[a-z]+$/.test(file)) return undefined

        return join(this.directory, file)
    }
}
