import { compare, parseStatus, watchWorkingTree, type FileChange } from "@/core/project/working-tree"
import Board from "@/core/board/board"
import { $ } from "bun"
import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("working tree", () => {

    test("git status: new, modified, deleted, renamed; a leading space is part of the code", () => {

        const status = parseStatus(" M src/app.ts\0?? notes.md\0D  old.ts\0R  new.ts\0was.ts\0A  added.ts\0")

        expect([...status]).toEqual([["src/app.ts", "modified"], ["notes.md", "added"], ["old.ts", "deleted"], ["new.ts", "renamed"], ["added.ts", "added"]])
    })

    test("a file edited again counts again; a file gone from the status is reverted", () => {

        const before = new Map([["a.ts", "modified" as const], ["b.ts", "modified" as const]])

        const after = new Map([["a.ts", "modified" as const], ["c.ts", "added" as const]])

        expect(compare(before, after, new Set())).toEqual({ changed: [{ path: "c.ts", kind: "added" }], reverted: ["b.ts"] })

        expect(compare(before, after, new Set(["a.ts"])).changed.map(file => file.path)).toEqual(["a.ts", "c.ts"])

        // A new file edited again is an edit; a new file removed is a deletion.
        expect(compare(after, after, new Set(["c.ts"])).changed).toEqual([{ path: "c.ts", kind: "modified" }])

        expect(compare(after, new Map([["a.ts", "modified" as const]]), new Set())).toEqual({ changed: [{ path: "c.ts", kind: "deleted" }], reverted: [] })
    })

    test("a real repository: an edit, then a commit; ignored files never count", async () => {

        const root = mkdtempSync(join(tmpdir(), "tree-"))

        await $`git init -q && git config user.email t@t && git config user.name t && echo one > a.txt && echo "build/" > .gitignore && git add -A && git commit -qm first`.cwd(root).quiet()

        const seen: FileChange[] = []

        const stop = watchWorkingTree(root, change => seen.push(change))

        await Bun.sleep(600)

        await $`mkdir -p build && echo noise > build/out.txt`.cwd(root).quiet()

        await Bun.sleep(1200)

        expect(seen).toEqual([])

        await Bun.write(join(root, "a.txt"), "two\n")

        await Bun.sleep(1200)

        expect(seen.at(-1)).toEqual({ changed: [{ path: "a.txt", kind: "modified" }], reverted: [] })

        await $`git commit -qam "Second take"`.cwd(root).quiet()

        await Bun.sleep(1500)

        expect(seen.at(-1)?.commit).toEqual({ subject: "Second take", files: 1 })

        stop()

        rmSync(root, { recursive: true, force: true })
    }, 10_000)

    test("the terminal speaks only for the moments that matter", () => {

        const board = new Board()

        board.expressFiles({ changed: [{ path: "a.ts", kind: "modified" }], reverted: [] })

        board.expressActivity("working")

        expect(board.state().avatar.quiet).toBe(true)

        board.expressActivity("idle")

        expect(board.state().avatar).toMatchObject({ say: "Done", quiet: undefined })

        board.expressActivity("attention")

        expect(board.state().avatar.quiet).toBeUndefined()
    })

    test("the avatar reacts in the character's own moods, quietly, then settles", () => {

        const board = new Board()

        board.setCharacter("mochi")

        board.expressFiles({ changed: [{ path: "src/auth.ts", kind: "modified" }], reverted: [] })

        expect(board.state().avatar).toMatchObject({ mood: "working", say: "Editing auth.ts", quiet: true })

        board.expressFiles({ changed: [{ path: "x.ts", kind: "added" }, { path: "y.ts", kind: "modified" }], reverted: [] })

        expect(board.state().avatar.say).toBe("2 files changed")

        board.expressFiles({ changed: [], reverted: [], commit: { subject: "Fix the login redirect loop on Safari", files: 2 } })

        expect(board.state().avatar).toMatchObject({ mood: "happy", say: "Committed: Fix the login redirect loop…" })

        board.setMood("thinking")

        expect(board.state().avatar.quiet).toBeUndefined()

        board.expressFiles({ changed: [{ path: "gone.ts", kind: "deleted" }], reverted: [] })

        expect(board.state().avatar.mood).toBe("thinking")
    })
})
