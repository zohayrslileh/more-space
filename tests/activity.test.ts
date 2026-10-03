import ActivityTracker, { type Activity } from "@/core/terminal/activity"
import { describe, expect, test } from "bun:test"

function track() {

    const seen: Activity[] = []

    return { seen, tracker: new ActivityTracker(activity => seen.push(activity)) }
}

describe("terminal activity", () => {

    test("steady output is working; quiet after it is idle", async () => {

        const { seen, tracker } = track()

        for (let line = 0; line < 12; line++) { tracker.output(`line ${line}\r\n`); await Bun.sleep(100) }

        expect(seen).toEqual(["working"])

        await Bun.sleep(2700)

        expect(seen).toEqual(["working", "idle"])

        tracker.dispose()
    }, 6000)

    test("the echo of typing is not work", () => {

        const { seen, tracker } = track()

        tracker.input()

        tracker.output("x".repeat(400))

        expect(seen).toEqual([])
    })

    test("a notification or a late bell asks for the user, until the user types", () => {

        const { seen, tracker } = track()

        tracker.output("\x1b]9;Build finished\x07")

        tracker.output("prompt redraw ".repeat(30))

        expect(seen).toEqual(["attention"])

        tracker.input()

        expect(seen).toEqual(["attention", "idle"])
    })

    test("a bell right after a keystroke (Tab completion) is ignored", () => {

        const { seen, tracker } = track()

        tracker.input()

        tracker.output("\x07")

        expect(seen).toEqual([])
    })
})
