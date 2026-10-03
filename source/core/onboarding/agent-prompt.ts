import { command, title } from "@/libs/identity"

// What the user pastes to an agent so it starts by learning the board. One text, shown on an
// empty board with a copy button.
export function agentPrompt() {

    return [
        `This terminal is inside ${title}: I watch a chalkboard above it while you work, and you have an avatar there.`,
        `Before anything else, run \`${command} guide\` and \`${command} avatar info\`.`,
        `Then use the board as you work: show your plan, your progress and what you find, and ask me there when you need a decision.`
    ].join(" ")
}
