import type { AskItem, Avatar, BoardSnapshot, BoardState, Cell, Item, Link, Mark, Size, Viewport, ViewRequest } from "./board-types"
import { defaultCharacter, findCharacter, type Expression } from "@/core/avatar/characters"
import type { Activity } from "@/core/terminal/activity"
import type { FileChange } from "@/core/project/working-tree"

type ItemInput = Item extends infer I ? I extends Item ? Omit<I, "id" | "createdAt" | "erasedAt"> : never : never

type LinkInput = Omit<Link, "id" | "createdAt" | "erasedAt">

type MarkInput = Omit<Mark, "id" | "createdAt" | "erasedAt">

type Listener = () => void

type ViewListener = (request: ViewRequest) => void

// After the agent poses its avatar itself, automatic expression waits this long.
const agentPrecedence = 15_000

// An automatic "Done" rests after this long.
const calmAfter = 6000

// Erased writing leaves a faint trace that stays, like on a real board. Only this many of the
// most recent traces are kept; "wash" removes them all.
const keptTraces = 80

// The single owner of what is on the board. Views and commands only call it.
export default class Board {

    private items: Item[] = []

    private links: Link[] = []

    private marks: Mark[] = []

    private agentActive = false

    // When the agent last moved, posed or voiced its avatar itself; automatic expression yields to it.
    private agentTouchedAvatar = 0

    // Whether the current mood and line came from the terminal's activity rather than the agent.
    private automatic = { mood: false, say: false }

    private calmTimer: ReturnType<typeof setTimeout> | undefined

    // What the terminal last seemed to be doing; a reaction settles back to it.
    private terminal: Activity = "idle"

    private avatar: Avatar = { col: 10, row: 4, mood: "idle", character: defaultCharacter }

    private viewport: Viewport = { col: 0, row: 0, cols: 13, rows: 7 }

    private counter = 0

    private readonly listeners = new Set<Listener>()

    private readonly viewListeners = new Set<ViewListener>()

    // Rendered sizes reported by the window. Only the view knows how big writing turned out.
    private readonly sizes = new Map<string, Size>()

    private readonly sizeWaiters = new Map<string, Set<() => void>>()

    private readonly answerWaiters = new Map<string, Set<(answer: string[] | undefined) => void>>()

    public state(): BoardState {

        return { agentActive: this.agentActive, items: this.items, links: this.links, marks: this.marks, avatar: this.avatar }
    }

    public snapshot(): BoardSnapshot {

        // Traces of erased writing are kept too.
        return { version: 1, items: this.items, links: this.links, marks: this.marks, avatar: this.avatar }
    }

    // Puts a saved board back. Ids continue after the highest one restored.
    public restore(snapshot: BoardSnapshot) {

        // Boards saved before richer questions stored one answer string and no mode.
        this.items = snapshot.items.map(item => item.kind === "ask" ? {
            ...item,
            mode: item.mode ?? "choice",
            answer: typeof item.answer === "string" ? [item.answer] : item.answer
        } : item)

        this.links = snapshot.links

        this.marks = snapshot.marks ?? []

        // The character is the user's setting, not the board's: keep the current one.
        this.avatar = { ...snapshot.avatar, say: undefined, character: this.avatar.character }

        this.avatar.mood = this.validMood(this.avatar.mood)

        const numbers = [...this.items, ...this.links, ...this.marks].map(entry => Number(entry.id.slice(1))).filter(Number.isFinite)

        this.counter = Math.max(0, ...numbers)

        this.changed()
    }

    public visible(): Viewport {

        return this.viewport
    }

    public liveItems() {

        return this.items.filter(item => !item.erasedAt)
    }

    public find(id: string) {

        return this.liveItems().find(item => item.id === id)
    }

    public liveLinks() {

        return this.links.filter(link => !link.erasedAt)
    }

    public liveMarks() {

        return this.marks.filter(mark => !mark.erasedAt)
    }

    public mark(input: MarkInput) {

        const mark: Mark = { ...input, id: `m${++this.counter}`, createdAt: Date.now() }

        this.marks = [...this.marks, mark]

        this.changed()

        return mark
    }

    public link(input: LinkInput) {

        const link: Link = { ...input, id: `l${++this.counter}`, createdAt: Date.now() }

        this.links = [...this.links, link]

        this.changed()

        return link
    }

    public add(input: ItemInput) {

        const item = { ...input, id: `${input.kind[0]}${++this.counter}`, createdAt: Date.now() } as Item

        this.items = [...this.items, item]

        this.changed()

        return item
    }

    public move(id: string, cell: Cell) {

        const item = this.find(id)

        if (!item) return

        this.items = this.items.map(other => other === item ? { ...other, ...cell } : other)

        this.changed()

        return this.find(id)
    }

    // Erases items, links and marks by id. Links and marks attached to an erased item go with it.
    public erase(ids: string[]) {

        const now = Date.now()

        const erased = this.liveItems().filter(item => ids.includes(item.id))

        const erasedIds = new Set(erased.map(item => item.id))

        const erasedLinks = this.liveLinks().filter(link => ids.includes(link.id) || erasedIds.has(link.from) || erasedIds.has(link.to))

        const erasedMarks = this.liveMarks().filter(mark => ids.includes(mark.id) || erasedIds.has(mark.target))

        const result = { items: erased, links: erasedLinks, marks: erasedMarks }

        if (!erased.length && !erasedLinks.length && !erasedMarks.length) return result

        const stamp = <T extends { erasedAt?: number }>(list: T[], gone: T[]) => list.map(entry => gone.includes(entry) ? { ...entry, erasedAt: now } : entry)

        this.items = stamp(this.items, erased)

        this.links = stamp(this.links, erasedLinks)

        this.marks = stamp(this.marks, erasedMarks)

        for (const item of erased) this.release(item.id, undefined)

        this.changed()

        this.trimTraces()

        return result
    }

    public eraseAll() {

        return this.erase([...this.liveItems(), ...this.liveLinks(), ...this.liveMarks()].map(entry => entry.id))
    }

    public moveAvatar(cell: Cell) {

        this.agentTouchedAvatar = Date.now()

        this.avatar = { ...this.avatar, ...cell }

        this.changed()
    }

    // Switches the avatar to another character; a mood it does not have falls back to idle.
    public setCharacter(id: string) {

        this.avatar = { ...this.avatar, character: findCharacter(id).id }

        this.avatar.mood = this.validMood(this.avatar.mood)

        this.changed()
    }

    private validMood(mood: string) {

        return findCharacter(this.avatar.character).moods.some(entry => entry.name === mood) ? mood : "idle"
    }

    public setMood(mood: string) {

        this.agentTouchedAvatar = Date.now()

        this.automatic.mood = false

        this.avatar = { ...this.avatar, mood, quiet: undefined }

        this.changed()
    }

    public say(text: string | undefined) {

        this.agentTouchedAvatar = Date.now()

        this.automatic.say = false

        this.avatar = { ...this.avatar, say: text || undefined }

        this.changed()
    }

    // Accepts an answer only if it fits the question; returns whether it did.
    public answer(id: string, values: string[]) {

        const item = this.find(id)

        if (!item || item.kind !== "ask" || item.answer) return false

        const answer = values.map(value => value.trim()).filter(Boolean)

        if (!fits(item, answer)) return false

        this.items = this.items.map(other => other === item ? { ...item, answer } : other)

        this.changed()

        this.release(id, answer)

        return true
    }

    private release(id: string, answer: string[] | undefined) {

        for (const resolve of this.answerWaiters.get(id) ?? []) resolve(answer)

        this.answerWaiters.delete(id)
    }

    // Resolves with the answer, or undefined when the wait runs out or the question is erased.
    public waitForAnswer(id: string, timeoutMs: number) {

        const item = this.find(id) as AskItem | undefined

        if (!item) return Promise.resolve(undefined)

        if (item.answer) return Promise.resolve(item.answer)

        return new Promise<string[] | undefined>(resolve => {

            const waiters = this.answerWaiters.get(id) ?? new Set()

            const done = (answer: string[] | undefined) => {

                clearTimeout(timer)

                waiters.delete(done)

                resolve(answer)
            }

            const timer = setTimeout(() => done(undefined), timeoutMs)

            waiters.add(done)

            this.answerWaiters.set(id, waiters)
        })
    }

    public setSizes(sizes: Record<string, Size>) {

        for (const [id, size] of Object.entries(sizes)) {

            this.sizes.set(id, size)

            for (const resolve of this.sizeWaiters.get(id) ?? []) resolve()

            this.sizeWaiters.delete(id)
        }
    }

    public size(id: string) {

        return this.sizes.get(id)
    }

    // The item's rendered size once the window has drawn it, or undefined if no window answers in time.
    public async waitForSize(id: string, timeoutMs: number) {

        if (this.sizes.has(id)) return this.sizes.get(id)

        await new Promise<void>(resolve => {

            const waiters = this.sizeWaiters.get(id) ?? new Set()

            waiters.add(resolve)

            this.sizeWaiters.set(id, waiters)

            setTimeout(resolve, timeoutMs)
        })

        return this.sizes.get(id)
    }

    public setViewport(viewport: Viewport) {

        this.viewport = viewport
    }

    // The avatar shows what the terminal shows: working, done, or waiting for the user. It uses the
    // current character's own moods (by expression), and yields while the agent is posing it itself.
    public expressActivity(activity: Activity) {

        const was = this.terminal

        this.terminal = activity

        const line = activity === "attention" ? "Your turn in the terminal" : activity === "idle" && was === "working" ? "Done" : undefined

        const mood = activity === "working" ? this.moodFor(["working"]) : activity === "attention" ? this.moodFor(["alert", "surprised", "confused"]) : line ? this.moodFor(["happy", "calm"]) : "idle"

        // Only the moments that matter speak ("Done", "Your turn"); working, which comes and goes with
        // every burst of output, stays quiet. "Done" settles back to rest after a moment.
        this.express(mood, line, activity === "idle" && !!line, !line)
    }

    // The avatar notices files changing on the branch: edits, new and deleted files, undone edits, commits.
    public expressFiles(change: FileChange) {

        const name = (path: string) => path.split("/").pop() ?? path

        const { changed, reverted, commit } = change

        const kinds = new Set(changed.map(file => file.kind))

        const only = (kind: string) => kinds.size === 1 && kinds.has(kind as never)

        const [mood, line] = commit ? [this.moodFor(["excited", "happy"]), commit.subject ? `Committed: ${clip(commit.subject, 28)}` : "Committed!"]
            : changed.length > 1 ? [this.moodFor(["working"]), `${changed.length} files changed`]
            : only("added") ? [this.moodFor(["excited", "happy"]), `New: ${clip(name(changed[0]!.path), 24)}`]
            : only("deleted") ? [this.moodFor(["surprised", "confused"]), `Deleted ${clip(name(changed[0]!.path), 24)}`]
            : changed.length ? [this.moodFor(["working"]), `Editing ${clip(name(changed[0]!.path), 24)}`]
            : reverted.length ? [this.moodFor(["thinking", "neutral"]), reverted.length > 1 ? `Undid ${reverted.length} files` : `Undid ${clip(name(reverted[0]!), 24)}`]
            : ["idle", undefined]

        // Silent for now: files change often, and the voice is for moments that matter.
        this.express(mood, line, true, true)
    }

    // The character's first mood with one of these expressions.
    private moodFor(expressions: Expression[]) {

        const character = findCharacter(this.avatar.character)

        return expressions.map(expression => character.moods.find(mood => mood.expression === expression)).find(Boolean)?.name ?? "idle"
    }

    // An automatic mood and line; with settle, it goes back to what the terminal shows after a moment.
    // A quiet one changes the mood without the character's voice. Settling back to rest is always quiet.
    private express(mood: string, line: string | undefined, settle: boolean, quiet = false) {

        if (Date.now() - this.agentTouchedAvatar < agentPrecedence) return

        clearTimeout(this.calmTimer)

        // A line the agent wrote stays; an automatic one is replaced or cleared.
        const say = this.avatar.say && !this.automatic.say ? this.avatar.say : line

        this.avatar = { ...this.avatar, mood, say, quiet: quiet || undefined }

        this.automatic = { mood: true, say: !!line && say === line }

        this.changed()

        if (settle) this.calmTimer = setTimeout(() => {

            if (!this.automatic.mood) return

            this.avatar = { ...this.avatar, mood: this.terminal === "working" ? this.moodFor(["working"]) : "idle", say: this.automatic.say ? undefined : this.avatar.say, quiet: true }

            this.automatic = { mood: true, say: false }

            this.changed()
        }, calmAfter)
    }

    // Called for every command an agent runs.
    public markAgentActive() {

        if (this.agentActive) return

        this.agentActive = true

        this.changed()
    }

    public requestView(request: ViewRequest) {

        for (const listener of this.viewListeners) listener(request)
    }

    public subscribe(listener: Listener) {

        this.listeners.add(listener)

        return () => { this.listeners.delete(listener) }
    }

    public onView(listener: ViewListener) {

        this.viewListeners.add(listener)

        return () => { this.viewListeners.delete(listener) }
    }

    // Keeps only the most recent traces, so the board does not fill with them.
    private trimTraces() {

        const traces = [...this.items, ...this.links, ...this.marks].filter(entry => entry.erasedAt).sort((a, b) => b.erasedAt! - a.erasedAt!)

        if (traces.length <= keptTraces) return

        const dropped = new Set(traces.slice(keptTraces))

        this.items = this.items.filter(entry => !dropped.has(entry))

        this.links = this.links.filter(entry => !dropped.has(entry))

        this.marks = this.marks.filter(entry => !dropped.has(entry))
    }

    // A wet cloth: removes every trace of erased writing. What is still written stays.
    public wash() {

        const count = [...this.items, ...this.links, ...this.marks].filter(entry => entry.erasedAt).length

        this.items = this.liveItems()

        this.links = this.liveLinks()

        this.marks = this.liveMarks()

        if (count) this.changed()

        return count
    }

    private changed() {

        for (const listener of this.listeners) listener()
    }
}

function fits(item: AskItem, answer: string[]) {

    const known = (value: string) => item.options.includes(value)

    const chosenOther = answer.filter(value => !known(value))

    if (item.mode === "text") return answer.length === 1

    if (item.mode === "scale") {

        const value = Number(answer[0])

        return answer.length === 1 && Number.isInteger(value) && value >= 1 && value <= (item.scale ?? 5)
    }

    if (item.mode === "choice") return answer.length === 1 && (known(answer[0]!) || !!item.other)

    return answer.length >= 1 && (chosenOther.length === 0 || (!!item.other && chosenOther.length === 1))
}

function clip(text: string, length: number) {

    return text.length > length ? `${text.slice(0, length - 1)}…` : text
}
