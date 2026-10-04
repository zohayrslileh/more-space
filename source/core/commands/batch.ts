import { command } from "@/libs/identity"

// How to send several commands in one call, in the shell this instance's terminals run.
const windows = process.platform === "win32"

export const batchUsage = windows ? `@'...'@ | ${command} -` : `${command} - <<'EOF' ... EOF`

export function batchExample(lines: string[], indent: string) {

    const block = windows ? ["@'", ...lines, `'@ | ${command} -`] : [`${command} - <<'EOF'`, ...lines, "EOF"]

    return block.map(line => indent + line).join("\n")
}
