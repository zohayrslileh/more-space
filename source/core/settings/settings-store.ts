import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { defaultCharacter, findCharacter } from "@/core/avatar/characters"
import { dirname } from "node:path"
import { defaultFont } from "./defaults"

// The user's own choices, the same in every project (kept in the app's data folder).
export interface Settings {

    character: string

    // The handwriting the board is written in (a font id the window knows).
    font: string

    // Project folders opened before, most recent first.
    recentProjects: string[]

    // The character speaks on every mood the agent gives it, not only when the user is needed.
    voiceMoods: boolean
}

const keptRecent = 8

export default class SettingsStore {

    private constructor(private readonly file: string, private settings: Settings) { }

    public static async open(file: string) {

        const text = await readFile(file, "utf8").catch(() => undefined)

        let saved: Partial<Settings> = {}

        try { saved = text ? JSON.parse(text) : {} } catch { }

        return new SettingsStore(file, {
            character: findCharacter(saved.character).id ?? defaultCharacter,
            font: typeof saved.font === "string" && /^[a-z-]{1,40}$/.test(saved.font) ? saved.font : defaultFont,
            recentProjects: Array.isArray(saved.recentProjects) ? saved.recentProjects.filter(path => typeof path === "string") : [],
            voiceMoods: saved.voiceMoods === true
        })
    }

    public get() {

        return { ...this.settings }
    }

    public async rememberProject(path: string) {

        return this.set({ recentProjects: [path, ...this.settings.recentProjects.filter(other => other !== path)].slice(0, keptRecent) })
    }

    public async set(change: Partial<Settings>) {

        this.settings = { ...this.settings, ...change }

        await mkdir(dirname(this.file), { recursive: true })

        const temporary = `${this.file}.${process.pid}.tmp`

        await writeFile(temporary, JSON.stringify(this.settings, null, 2))

        await rename(temporary, this.file)

        return this.get()
    }
}
