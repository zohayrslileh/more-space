import Board from "@/core/board/board"
import { describe, expect, test } from "bun:test"

const text = (board: Board, col = 0, row = 0) => board.add({ kind: "text", col, row, text: "hello", size: "m", color: "white" })

describe("board", () => {

    test("erasing leaves a trace, takes the item's links and marks with it, and wash cleans traces", () => {

        const board = new Board()

        const a = text(board), b = text(board, 4)

        const link = board.link({ from: a.id, to: b.id, style: "chalk", color: "white" })

        const mark = board.mark({ target: a.id, kind: "circle", color: "yellow" })

        const erased = board.erase([a.id])

        expect(erased.items.map(item => item.id)).toEqual([a.id])

        expect(erased.links.map(entry => entry.id)).toEqual([link.id])

        expect(erased.marks.map(entry => entry.id)).toEqual([mark.id])

        expect(board.liveItems().map(item => item.id)).toEqual([b.id])

        expect(board.state().items.find(item => item.id === a.id)?.erasedAt).toBeNumber()

        expect(board.wash()).toBe(3)

        expect(board.state().items.map(item => item.id)).toEqual([b.id])
    })

    test("a snapshot restores ids after the highest one", () => {

        const board = new Board()

        text(board); text(board)

        const restored = new Board()

        restored.restore(board.snapshot())

        expect(text(restored).id).toBe("t3")
    })

    test("answers must fit the question", async () => {

        const board = new Board()

        const choice = board.add({ kind: "ask", col: 0, row: 0, question: "Pick", mode: "choice", options: ["A", "B"], color: "orange" })

        const scale = board.add({ kind: "ask", col: 0, row: 2, question: "Rate", mode: "scale", options: [], scale: 5, color: "orange" })

        const multi = board.add({ kind: "ask", col: 0, row: 4, question: "Any", mode: "multi", options: ["A", "B"], other: true, color: "orange" })

        expect(board.answer(choice.id, ["C"])).toBe(false)

        expect(board.answer(scale.id, ["6"])).toBe(false)

        const waiting = board.waitForAnswer(multi.id, 1000)

        expect(board.answer(multi.id, ["A", "Something else"])).toBe(true)

        expect(await waiting).toEqual(["A", "Something else"])

        expect(board.answer(choice.id, ["B"])).toBe(true)

        expect(board.answer(choice.id, ["A"])).toBe(false)
    })

    test("the avatar shows terminal activity, but the agent's own posing comes first", async () => {

        const board = new Board()

        board.timing = { doneAfter: 60, minWork: 40 }

        board.setCharacter("chalky")

        board.expressActivity("working")

        expect(board.state().avatar.mood).toBe("working")

        await Bun.sleep(50)

        board.expressActivity("idle")

        // Through the gap it still looks busy; "Done" comes only once the quiet lasts.
        expect(board.state().avatar.mood).toBe("working")

        await Bun.sleep(90)

        expect(board.state().avatar.say).toBe("Done")

        board.setMood("thinking")

        board.expressActivity("attention")

        expect(board.state().avatar.mood).toBe("thinking")
    })

    test("a pause shorter than the gap is not Done, and short work never is", async () => {

        const board = new Board()

        board.timing = { doneAfter: 60, minWork: 1000 }

        board.expressActivity("working")

        board.expressActivity("idle")

        await Bun.sleep(20)

        // Output again within the gap: the same work goes on.
        board.expressActivity("working")

        board.expressActivity("idle")

        await Bun.sleep(90)

        expect(board.state().avatar.say).toBeUndefined()

        expect(board.state().avatar.mood).toBe("idle")
    })

    test("switching character keeps a mood it has, and falls back to idle otherwise", () => {

        const board = new Board()

        board.setCharacter("chalky")

        board.setMood("confused")

        board.setCharacter("owl")

        expect(board.state().avatar.mood).toBe("idle")

        board.setMood("watching")

        board.setCharacter("robot")

        expect(board.state().avatar.mood).toBe("idle")
    })
})
