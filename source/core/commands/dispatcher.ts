import { batchUsage } from "./batch"
import { root, type CommandContext, type CommandNode } from "./command-tree"
import { parseArguments, tokenize, UsageError } from "./arguments"
import { command } from "@/libs/identity"

// Runs one command line. Returns the exit code; output goes through the context.
export async function dispatch(tokens: string[], context: CommandContext): Promise<number> {

    try {

        if (tokens[0] === "--all") return context.out(everything()), 0

        if (tokens[0] === "-") return await batch(context, tokens.slice(1))

        const path: CommandNode[] = [root]

        let rest = tokens

        while (rest.length) {

            const child = path.at(-1)!.children?.find(child => child.name === rest[0])

            if (!child) break

            path.push(child)

            rest = rest.slice(1)
        }

        const node = path.at(-1)!

        const args = parseArguments(rest)

        if (args.flags.has("help") || (!node.run && !rest.length)) return context.out(explain(node, path)), 0

        if (!node.run) {

            const where = path.slice(1).map(node => node.name).join(" ")

            throw new UsageError(`Unknown command "${rest[0]}". See: ${[command, where].filter(Boolean).join(" ")}`)
        }

        await node.run(args, context)

        return 0
    }

    catch (error) {

        if (!(error instanceof UsageError)) throw error

        context.out(`error: ${error.message}`)

        return 2
    }
}

// The batch text arrives as the token after "-": one command per line.
async function batch(context: CommandContext, input: string[]) {

    const lines = (input[0] ?? "").split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#"))

    if (!lines.length) throw new UsageError(`Nothing to run. Use: ${batchUsage}`)

    let failed = 0

    for (const line of lines) {

        const tokens = tokenize(line)

        if (tokens[0] === command) tokens.shift()

        if (tokens[0] === "-") throw new UsageError("A batch cannot contain another batch.")

        const outputs: string[] = []

        const code = await dispatch(tokens, { ...context, out: text => outputs.push(text) })

        if (code) failed++

        context.out(`${line.length > 40 ? `${line.slice(0, 39)}…` : line} → ${outputs.join(" ")}`)
    }

    return failed ? 1 : 0
}

function line(node: CommandNode, path: string[]) {

    const usage = node.usage ?? [...path, node.name].join(" ")

    return { usage, summary: node.summary }
}

function table(rows: { usage: string, summary: string }[]) {

    const width = Math.min(Math.max(...rows.map(row => row.usage.length)), 44)

    return rows.map(row => row.usage.length > width
        ? `  ${row.usage}\n  ${" ".repeat(width)}  ${row.summary}`
        : `  ${row.usage.padEnd(width)}  ${row.summary}`).join("\n")
}

function explain(node: CommandNode, path: CommandNode[]) {

    const names = path.slice(1).map(node => node.name)

    if (node === root) {

        return [
            `${command}: ${root.summary}.`,
            table(root.children!.map(child => ({ usage: child.name, summary: child.summary }))),
            `More: ${command} <group> for its commands, ${command} --all for everything at once.`
        ].join("\n")
    }

    const parts = [`${command} ${names.join(" ")}: ${node.summary}.`]

    if (node.run && node.usage) parts.push(`  ${command} ${node.usage}`)

    if (node.details) parts.push(node.details)

    if (node.children) parts.push(table(node.children.map(child => line(child, names))))

    return parts.join("\n")
}

function everything() {

    const rows: { usage: string, summary: string }[] = []

    const walk = (node: CommandNode, names: string[]) => {

        if (node.run && node !== root) rows.push(line(node, names.slice(0, -1)))

        for (const child of node.children ?? []) walk(child, [...names, child.name])
    }

    walk(root, [])

    return [`${command}: ${root.summary}. Every command:`, table(rows), `Batch: ${batchUsage} (one command per line)`].join("\n")
}
