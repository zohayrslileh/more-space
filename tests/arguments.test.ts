import { isCell, parseArguments, parseCell, parseColor, tokenize, UsageError } from "@/core/commands/arguments"
import { describe, expect, test } from "bun:test"

describe("arguments", () => {

    test("positionals and flags, with and without values", () => {

        const args = parseArguments(["4,2", "hello", "--color", "focus", "--size=l", "--no-wait"])

        expect(args.positionals).toEqual(["4,2", "hello"])

        expect(args.flags.get("color")).toBe("focus")

        expect(args.flags.get("size")).toBe("l")

        expect(args.flags.get("no-wait")).toBe(true)
    })

    test("cells, including negative ones", () => {

        expect(parseCell("-3, 7")).toEqual({ col: -3, row: 7 })

        expect(isCell("1,1")).toBe(true)

        expect(isCell("t12")).toBe(false)

        expect(() => parseCell("x")).toThrow(UsageError)
    })

    test("colors by name or by meaning", () => {

        expect(parseColor("problem", "white")).toBe("pink")

        expect(parseColor("yellow", "white")).toBe("yellow")

        expect(parseColor(undefined, "blue")).toBe("blue")

        expect(() => parseColor("purple", "white")).toThrow(UsageError)
    })

    test("a batch line splits like a shell would", () => {

        expect(tokenize(`board write 0,0 --color focus "Refactor auth" 'single quoted' "say \\"hi\\""`)).toEqual(["board", "write", "0,0", "--color", "focus", "Refactor auth", "single quoted", `say "hi"`])

        expect(() => tokenize(`say "unclosed`)).toThrow(UsageError)
    })
})
