import { chalkColors, colorMeanings, type Cell, type ChalkColor } from "@/core/board/board-types"

export interface Arguments {

    positionals: string[]

    flags: Map<string, string | true>
}

const booleanFlags = new Set(["help", "no-wait", "all", "multi", "text", "other"])

export function parseArguments(tokens: string[]): Arguments {

    const positionals: string[] = []

    const flags = new Map<string, string | true>()

    for (let index = 0; index < tokens.length; index++) {

        const token = tokens[index]!

        if (!token.startsWith("--") || token === "--") {

            positionals.push(token)

            continue
        }

        const [key, inline] = token.slice(2).split(/=(.*)/s) as [string, string | undefined]

        if (inline !== undefined) flags.set(key, inline)

        else if (booleanFlags.has(key) || index + 1 >= tokens.length) flags.set(key, true)

        else flags.set(key, tokens[++index]!)
    }

    return { positionals, flags }
}

// Splits one line of a batch the way a shell would: spaces separate, quotes group.
export function tokenize(line: string) {

    const tokens: string[] = []

    let current = ""

    let quote: string | undefined

    let started = false

    for (let index = 0; index < line.length; index++) {

        const char = line[index]!

        if (quote) {

            if (char === quote) quote = undefined

            else if (char === "\\" && quote === "\"" && index + 1 < line.length) current += line[++index]

            else current += char
        }

        else if (char === "\"" || char === "'") { quote = char; started = true }

        else if (/\s/.test(char)) { if (started) tokens.push(current); current = ""; started = false }

        else if (char === "\\" && index + 1 < line.length) { current += line[++index]; started = true }

        else { current += char; started = true }
    }

    if (quote) throw new UsageError("A quote is not closed.")

    if (started) tokens.push(current)

    return tokens
}

export class UsageError extends Error { }

export function parseCell(value: string | undefined): Cell {

    const match = value?.match(/^\s*(-?\d+)\s*,\s*(-?\d+)\s*$/)

    if (!match) throw new UsageError(`Expected a position like 4,2 but got "${value ?? ""}".`)

    return { col: Number(match[1]), row: Number(match[2]) }
}

export function isCell(value: string | undefined) {

    return !!value && /^\s*-?\d+\s*,\s*-?\d+\s*$/.test(value)
}

export function parseColor(value: string | true | undefined, fallback: ChalkColor): ChalkColor {

    if (value === undefined) return fallback

    if (value === true) throw new UsageError(`--color needs a value: ${describeColors()}.`)

    const word = value.toLowerCase()

    const color = chalkColors.find(color => color === word || colorMeanings[color] === word)

    if (!color) throw new UsageError(`Unknown color "${value}". Use ${describeColors()}.`)

    return color
}

export function describeColors() {

    return chalkColors.map(color => `${color} (${colorMeanings[color]})`).join(", ")
}

export function parseChoice<T extends string>(flag: string, value: string | true | undefined, choices: readonly T[], fallback: T): T {

    if (value === undefined) return fallback

    const choice = choices.find(choice => choice === value)

    if (!choice) throw new UsageError(`--${flag} must be one of: ${choices.join(", ")}.`)

    return choice
}

export function parseNumber(flag: string, value: string | true | undefined, fallback?: number) {

    if (value === undefined) return fallback

    const number = Number(value)

    if (value === true || !Number.isFinite(number) || number <= 0) throw new UsageError(`--${flag} needs a positive number.`)

    return number
}
