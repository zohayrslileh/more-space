import AssetStore from "@/core/assets/asset-store"
import { dispatch } from "@/core/commands/dispatcher"
import Board from "@/core/board/board"
import { command } from "@/libs/identity"
import { describe, expect, test } from "bun:test"
import { tmpdir } from "node:os"

// A board whose items get a size as soon as they appear, the way the window would report them.
function setup() {

    const board = new Board()

    board.subscribe(() => board.setSizes(Object.fromEntries(board.liveItems().filter(item => !board.size(item.id)).map(item => [item.id, { width: 250, height: 100 }]))))

    const lines: string[] = []

    const context = { board, assets: new AssetStore(tmpdir()), cwd: tmpdir(), out: (text: string) => { lines.push(text) } }

    const run = async (...argv: string[]) => { lines.length = 0; const code = await dispatch(argv, context); return { code, text: lines.join("\n") } }

    return { board, run }
}

describe("commands", () => {

    test("each level explains the next; --all shows everything", async () => {

        const { run } = setup()

        expect((await run()).text).toContain("board")

        expect((await run("board")).text).toContain("board write")

        expect((await run("--all")).text).toContain("ask wait")

        expect((await run("guide")).text).toContain(`${command} board info`)
    })

    test("a write answers with the cells it covers, and warns about overlaps", async () => {

        const { run } = setup()

        const first = await run("board", "write", "0,0", "Hello")

        expect(first.text).toMatch(/^t1 3x1 cells: cols 0\.\.2, rows 0\.\.0$/)

        const second = await run("board", "write", "1,0", "On top")

        expect(second.text).toContain("warning: overlaps t1")
    })

    test("usage errors exit 2 with a clear message", async () => {

        const { run } = setup()

        const wrong = await run("board", "nope")

        expect(wrong.code).toBe(2)

        expect(wrong.text).toContain("Unknown command")

        expect((await run("avatar", "mood", "angry")).text).toContain("has no mood")

        expect((await run("ask", "0,0", "Q", "A", "--text")).text).toContain("takes no options")
    })

    test("a batch runs every line and reports each", async () => {

        const { board, run } = setup()

        const result = await run("-", "board write 0,0 Title\nboard note 3,0 'A note'\nboard write x")

        expect(result.code).toBe(1)

        expect(board.liveItems().map(item => item.kind)).toEqual(["text", "note"])

        expect(result.text).toContain("error:")
    })

    test("ask --no-wait returns at once; ask wait collects the answer", async () => {

        const { board, run } = setup()

        await run("ask", "0,0", "Ship it?", "Yes", "No", "--no-wait")

        const waiting = run("ask", "wait", "a1", "--wait", "2")

        board.answer("a1", ["Yes"])

        expect((await waiting).text).toBe("answer: Yes")
    })
})
