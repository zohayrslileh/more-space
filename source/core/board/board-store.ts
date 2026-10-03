import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import type { BoardSnapshot } from "./board-types"
import { join } from "node:path"

const saveDelay = 400

// Keeps one board on disk: loads it at start, saves shortly after each change.
export default class BoardStore {

    private timer: ReturnType<typeof setTimeout> | undefined

    private pending: BoardSnapshot | undefined

    constructor(private readonly directory: string) { }

    private get file() { return join(this.directory, "board.json") }

    public async load(): Promise<BoardSnapshot | undefined> {

        const text = await readFile(this.file, "utf8").catch(() => undefined)

        if (!text) return undefined

        try {

            const snapshot = JSON.parse(text) as BoardSnapshot

            return snapshot.version === 1 ? snapshot : undefined
        }

        catch { return undefined }
    }

    public save(snapshot: BoardSnapshot) {

        this.pending = snapshot

        clearTimeout(this.timer)

        this.timer = setTimeout(() => this.flush(), saveDelay)
    }

    // Writes whatever is pending now; used on change and before quitting.
    public async flush() {

        clearTimeout(this.timer)

        const snapshot = this.pending

        this.pending = undefined

        if (!snapshot) return

        await mkdir(this.directory, { recursive: true })

        const temporary = `${this.file}.${process.pid}.tmp`

        await writeFile(temporary, JSON.stringify(snapshot))

        await rename(temporary, this.file)
    }
}
