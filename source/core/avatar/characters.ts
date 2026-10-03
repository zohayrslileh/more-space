// The characters an agent can be on the board. One list, read by the agent (avatar info)
// and by the window (drawing, the picker). Each character has its own moods, and each mood
// says when to use it, so the agent can choose well.

// The kind of feeling a mood expresses; drives the face of drawn people and the tone of every voice.
export type Expression = "neutral" | "thinking" | "working" | "happy" | "sad" | "confused" | "surprised" | "excited" | "calm" | "alert"

export interface CharacterMood {

    name: string

    // When the agent should show this mood.
    meaning: string

    expression: Expression
}

export interface Character {

    id: string

    name: string

    personality: string

    moods: CharacterMood[]
}

export const characters: Character[] = [
    {
        id: "mochi",
        name: "Mochi",
        personality: "a round little pixel spirit, soft and plump; cheerful, bouncy, easily amazed",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on; breathes softly", expression: "neutral" },
            { name: "thinking", meaning: "reading, planning; eyes up", expression: "thinking" },
            { name: "working", meaning: "making changes, running things; bounces along", expression: "working" },
            { name: "happy", meaning: "something worked or is done; hops", expression: "happy" },
            { name: "confused", meaning: "something unexpected; not sure yet", expression: "confused" },
            { name: "surprised", meaning: "found something notable", expression: "surprised" },
            { name: "sad", meaning: "something failed or went wrong", expression: "sad" },
            { name: "sleepy", meaning: "a long wait: builds, installs, slow tests", expression: "calm" }
        ]
    },
    {
        id: "chalky",
        name: "Chalky",
        personality: "a plain chalk figure; calm, friendly, a little curious",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "thinking", meaning: "reading, planning, weighing options", expression: "thinking" },
            { name: "working", meaning: "making changes, running things", expression: "working" },
            { name: "happy", meaning: "something worked or is done", expression: "happy" },
            { name: "confused", meaning: "something unexpected; not sure yet", expression: "confused" },
            { name: "surprised", meaning: "found something notable", expression: "surprised" }
        ]
    },
    {
        id: "penguin",
        name: "Penguin",
        personality: "cheerful and earnest; waddles while it works, flaps when things go well",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "thinking", meaning: "reading, planning; head tilted", expression: "thinking" },
            { name: "working", meaning: "busy making changes; sways side to side", expression: "working" },
            { name: "happy", meaning: "something worked; flaps its flippers", expression: "happy" },
            { name: "sad", meaning: "a failure or a dead end", expression: "sad" },
            { name: "excited", meaning: "a breakthrough, or a big step done; hops", expression: "excited" }
        ]
    },
    {
        id: "owl",
        name: "Owl",
        personality: "quiet and wise; watches closely, explains patiently",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "pondering", meaning: "thinking something through; one eye narrowed", expression: "thinking" },
            { name: "watching", meaning: "reading code or output closely; eyes wide", expression: "working" },
            { name: "wise", meaning: "explaining, or content with an answer", expression: "calm" },
            { name: "startled", meaning: "a problem or a surprise; feathers up", expression: "surprised" },
            { name: "sleepy", meaning: "a long wait: builds, installs, slow tests", expression: "calm" }
        ]
    },
    {
        id: "robot",
        name: "Robot",
        personality: "precise and literal; its antenna light shows its state",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "processing", meaning: "reading, planning; antenna blinks", expression: "thinking" },
            { name: "working", meaning: "making changes; chest light pulses", expression: "working" },
            { name: "success", meaning: "a task done, tests passing", expression: "happy" },
            { name: "error", meaning: "a failure: errors, failing tests", expression: "sad" },
            { name: "alert", meaning: "something needs the user's attention", expression: "alert" }
        ]
    },
    {
        id: "cat",
        name: "Cat",
        personality: "independent and curious; focused when hunting a bug",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "curious", meaning: "investigating, exploring; head tilted", expression: "thinking" },
            { name: "focused", meaning: "deep in the work; eyes narrowed", expression: "working" },
            { name: "content", meaning: "something worked or is done", expression: "happy" },
            { name: "annoyed", meaning: "a problem, a flaky test, a bad surprise", expression: "confused" },
            { name: "sleepy", meaning: "a long wait", expression: "calm" }
        ]
    },
    {
        id: "cowboy",
        name: "Cowboy",
        personality: "easygoing and steady, from the American West; whistles while he works",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "pondering", meaning: "thinking it over, a straw in his mouth", expression: "thinking" },
            { name: "working", meaning: "busy making changes", expression: "working" },
            { name: "proud", meaning: "a job well done; tips his hat", expression: "happy" },
            { name: "puzzled", meaning: "something does not add up", expression: "confused" },
            { name: "yeehaw", meaning: "a big win or a breakthrough", expression: "excited" }
        ]
    },
    {
        id: "samurai",
        name: "Samurai",
        personality: "disciplined and calm, from Japan; precise in every move",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "meditating", meaning: "thinking deeply; eyes closed", expression: "calm" },
            { name: "training", meaning: "working steadily, step by step", expression: "working" },
            { name: "honored", meaning: "a task done well", expression: "happy" },
            { name: "troubled", meaning: "a failure or a hard problem", expression: "sad" },
            { name: "alert", meaning: "something needs attention now", expression: "alert" }
        ]
    },
    {
        id: "viking",
        name: "Viking",
        personality: "bold and hearty, from Scandinavia; loud when things go well",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "scheming", meaning: "planning the next move", expression: "thinking" },
            { name: "forging", meaning: "hard at work, making changes", expression: "working" },
            { name: "triumphant", meaning: "victory: tests pass, task done", expression: "happy" },
            { name: "grim", meaning: "a setback or a failure", expression: "sad" },
            { name: "roaring", meaning: "a big breakthrough", expression: "excited" }
        ]
    },
    {
        id: "astronomer",
        name: "Astronomer",
        personality: "a patient scholar of the golden age, with an astrolabe; measures before deciding",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "stargazing", meaning: "reading and observing closely", expression: "thinking" },
            { name: "calculating", meaning: "working it out, making changes", expression: "working" },
            { name: "delighted", meaning: "something worked or is done", expression: "happy" },
            { name: "perplexed", meaning: "the results do not fit; not sure yet", expression: "confused" },
            { name: "eureka", meaning: "a discovery; raises the astrolabe", expression: "excited" }
        ]
    },
    {
        id: "anime",
        name: "Anime Hero",
        personality: "an energetic anime hero; huge eyes, big reactions, never gives up",
        moods: [
            { name: "idle", meaning: "waiting, nothing going on", expression: "neutral" },
            { name: "pondering", meaning: "reading, planning, thinking it through", expression: "thinking" },
            { name: "determined", meaning: "hard at work; fired up", expression: "working" },
            { name: "sparkling", meaning: "something worked; pure joy", expression: "happy" },
            { name: "flustered", meaning: "unsure or caught off guard; a sweat drop", expression: "confused" },
            { name: "tearful", meaning: "a failure or bad news; streams of tears", expression: "sad" },
            { name: "shocked", meaning: "found something surprising or alarming", expression: "surprised" }
        ]
    }
]

export const defaultCharacter = "mochi"

export function findCharacter(id: string | undefined) {

    return characters.find(character => character.id === id) ?? characters.find(character => character.id === defaultCharacter)!
}
