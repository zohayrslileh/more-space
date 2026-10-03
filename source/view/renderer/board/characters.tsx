import { findCharacter, type Expression } from "@/core/avatar/characters"
import type { ReactNode } from "react"

// The drawings of the characters listed in core/avatar/characters. Each draws itself for a mood,
// in chalk, on a 120×120 canvas; `asking` raises a hand (or a flipper, a wing, a paw).
// Motion classes (sway, flap, blink…) are styled in styles.css.

const white = "var(--chalk-white)", yellow = "var(--chalk-yellow)", orange = "var(--chalk-orange)"

const blue = "var(--chalk-blue)", green = "var(--chalk-green)", pink = "var(--chalk-pink)"

interface Drawing { mood: string, asking: boolean }

export function CharacterFigure({ character, mood, asking }: { character: string, mood: string, asking: boolean }) {

    const Draw = drawings[character] ?? Chalky

    return (
        <svg className={`figure chalk character-${character} mood-${mood}`} viewBox="0 0 120 120" fill="none" stroke={white} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <Draw mood={mood} asking={asking} />
        </svg>
    )
}

function Dots() {

    return (
        <g className="dots" fill={yellow} stroke="none">
            <circle cx="102" cy="30" r="2.6" /><circle cx="110" cy="22" r="3.2" /><circle cx="118" cy="12" r="3.8" />
        </g>
    )
}

function Z() {

    return <text className="snore" x="94" y="30" fontSize="22" fill={blue} stroke="none" fontFamily="Caveat">z</text>
}

function pick(mood: string, table: Record<string, ReactNode>) {

    return table[mood] ?? table.idle
}

// ---------- Chalky: the plain chalk figure ----------

function Chalky({ mood, asking }: Drawing) {

    const eyes = mood === "happy"
        ? <><path d="M42 54 C45 49 50 49 53 54" /><path d="M68 53 C71 48 76 48 79 53" /></>
        : mood === "surprised"
            ? <><circle cx="47" cy="52" r="5" /><circle cx="73" cy="51" r="5" /></>
            : <><ellipse cx="47" cy="53" rx="3.2" ry="4.2" fill={white} /><ellipse cx="73" cy="52" rx="3.2" ry="4.2" fill={white} /></>

    const brows = pick(mood, {
        idle: <><path d="M40 43 C44 40 50 40 53 42" /><path d="M67 41 C71 39 77 39 80 42" /></>,
        thinking: <><path d="M40 44 C44 40 50 40 53 43" /><path d="M67 39 C71 35 77 36 80 40" /></>,
        working: <><path d="M40 41 C45 43 50 44 54 45" /><path d="M66 44 C70 43 75 42 80 40" /></>,
        happy: <><path d="M40 40 C44 37 50 37 53 39" /><path d="M67 38 C71 36 77 36 80 39" /></>,
        confused: <><path d="M40 45 C44 43 50 41 53 40" /><path d="M67 37 C71 39 76 41 80 44" /></>,
        surprised: <><path d="M40 39 C44 34 50 34 54 37" /><path d="M66 36 C70 33 76 33 80 37" /></>
    })

    const mouth = pick(mood, {
        idle: <path d="M52 70 C57 73 63 73 69 69" />,
        thinking: <path d="M53 71 C58 70 63 71 67 70" />,
        working: <path d="M54 71 C58 72 62 72 66 71" />,
        happy: <path d="M48 67 C54 77 66 77 72 66" />,
        confused: <path d="M51 72 C55 69 58 74 62 71 C65 69 68 72 70 70" />,
        surprised: <ellipse cx="60" cy="72" rx="4.5" ry="5.5" />
    })

    return (
        <g>
            <path d="M60 14 C86 13 98 32 97 54 C96 76 82 88 60 88 C37 88 23 75 23 53 C24 31 36 15 60 14 Z" />
            <path d="M58 14 C56 8 60 4 64 6" />
            <circle cx="66" cy="5" r="2.5" fill={yellow} stroke={yellow} />
            {brows}{eyes}{mouth}
            <path d="M36 88 C30 98 28 108 30 116 M84 88 C90 98 92 108 90 116" />
            {mood === "thinking" && <Dots />}
            {mood === "confused" && <text x="98" y="30" fontSize="26" fill={orange} stroke="none" fontFamily="Caveat">?</text>}
            {mood === "working" && <path d="M92 40 C95 46 95 50 92 52 C89 50 89 46 92 40 Z" stroke={blue} />}
            {asking && (
                <g className="raised-hand">
                    <path d="M86 92 C96 86 104 74 106 60" />
                    <path d="M100 58 C101 50 104 47 106 47 C109 47 112 51 112 58 C112 63 108 66 105 65 C102 65 100 62 100 58 Z" />
                </g>
            )}
        </g>
    )
}

// ---------- Penguin ----------

function Penguin({ mood, asking }: Drawing) {

    const up = mood === "happy" || mood === "excited"

    const eyes = pick(mood, {
        idle: <><circle cx="50" cy="46" r="2.8" fill={white} /><circle cx="70" cy="46" r="2.8" fill={white} /></>,
        thinking: <><circle cx="51" cy="42" r="2.8" fill={white} /><circle cx="71" cy="42" r="2.8" fill={white} /></>,
        working: <><path d="M45 42 L55 45" /><path d="M75 42 L65 45" /><circle cx="50" cy="48" r="2.4" fill={white} /><circle cx="70" cy="48" r="2.4" fill={white} /></>,
        happy: <><path d="M45 47 C48 42 52 42 55 47" /><path d="M65 47 C68 42 72 42 75 47" /></>,
        sad: <><path d="M45 44 C48 48 52 48 55 44" /><path d="M65 44 C68 48 72 48 75 44" /><path d="M48 52 C47 56 49 58 50 58" stroke={blue} /></>,
        excited: <><circle cx="50" cy="45" r="5" /><circle cx="70" cy="45" r="5" /><circle cx="50" cy="45" r="1.6" fill={white} /><circle cx="70" cy="45" r="1.6" fill={white} /></>
    })

    return (
        <g className="penguin-body">
            {/* body and belly */}
            <path d="M60 22 C82 22 92 44 92 70 C92 96 80 108 60 108 C40 108 28 96 28 70 C28 44 38 22 60 22 Z" />
            <path d="M60 50 C74 50 80 64 80 80 C80 96 72 104 60 104 C48 104 40 96 40 80 C40 64 46 50 60 50 Z" stroke="rgba(236,235,228,.6)" />
            {eyes}
            {/* beak */}
            <path d="M54 54 L60 61 L66 54 C62 52 58 52 54 54 Z" stroke={orange} />
            {/* flippers */}
            <path className="flipper left" d={up ? "M30 62 C20 54 14 44 16 38" : "M30 62 C20 72 20 86 26 94"} />
            {!asking && <path className="flipper right" d={up ? "M90 62 C100 54 106 44 104 38" : "M90 62 C100 72 100 86 94 94"} />}
            {asking && <path className="raised-hand" d="M90 62 C102 52 106 38 102 24" />}
            {/* feet */}
            <path d="M46 108 L40 113 L54 113 Z M74 108 L80 113 L66 113 Z" stroke={orange} />
            {mood === "thinking" && <Dots />}
        </g>
    )
}

// ---------- Owl ----------

function Owl({ mood, asking }: Drawing) {

    const startled = mood === "startled"

    const eyes = pick(mood, {
        idle: <><circle cx="47" cy="56" r="11" /><circle cx="73" cy="56" r="11" /><circle cx="47" cy="57" r="3.4" fill={white} /><circle cx="73" cy="57" r="3.4" fill={white} /></>,
        pondering: <><circle cx="47" cy="56" r="11" /><path d="M64 57 C69 54 77 54 82 57" /><circle cx="48" cy="52" r="3.4" fill={white} /></>,
        watching: <><circle cx="47" cy="56" r="13" /><circle cx="73" cy="56" r="13" /><circle cx="47" cy="56" r="5.5" fill={white} /><circle cx="73" cy="56" r="5.5" fill={white} /></>,
        wise: <><circle cx="47" cy="56" r="11" /><circle cx="73" cy="56" r="11" /><path d="M37 55 C42 50 52 50 57 55" /><path d="M63 55 C68 50 78 50 83 55" /><circle cx="47" cy="59" r="2.6" fill={white} /><circle cx="73" cy="59" r="2.6" fill={white} /></>,
        startled: <><circle cx="47" cy="55" r="14" /><circle cx="73" cy="55" r="14" /><circle cx="47" cy="55" r="1.8" fill={white} /><circle cx="73" cy="55" r="1.8" fill={white} /></>,
        sleepy: <><circle cx="47" cy="56" r="11" /><circle cx="73" cy="56" r="11" /><path d="M39 57 C43 60 51 60 55 57" /><path d="M65 57 C69 60 77 60 81 57" /></>
    })

    return (
        <g className="owl-body">
            {/* body */}
            <path d="M60 30 C86 30 94 52 94 72 C94 96 80 108 60 108 C40 108 26 96 26 72 C26 52 34 30 60 30 Z" />
            {/* ear tufts */}
            <path d={startled ? "M36 40 L28 16 L48 33" : "M36 40 L32 24 L47 34"} />
            <path d={startled ? "M84 40 L92 16 L72 33" : "M84 40 L88 24 L73 34"} />
            {eyes}
            {/* beak */}
            <path d="M56 66 L60 75 L64 66 C62 64 58 64 56 66 Z" stroke={yellow} />
            {/* chest feathers */}
            <path d="M50 86 l3 3 l3 -3 M64 86 l3 3 l3 -3 M57 95 l3 3 l3 -3" stroke="rgba(236,235,228,.55)" />
            {/* wings */}
            <path d="M28 66 C22 80 28 96 38 102" />
            {!asking && <path d="M92 66 C98 80 92 96 82 102" />}
            {asking && <path className="raised-hand" d="M92 66 C104 58 110 44 106 30" />}
            {/* feet */}
            <path d="M50 108 l-3 5 M54 108 v5 M66 108 v5 M70 108 l3 5" stroke={yellow} />
            {mood === "sleepy" && <Z />}
            {startled && <path d="M18 34 l-6 -4 M16 46 l-8 0 M102 34 l6 -4 M104 46 l8 0" stroke={orange} />}
        </g>
    )
}

// ---------- Robot ----------

function Robot({ mood, asking }: Drawing) {

    const light = pick(mood, { idle: white, processing: yellow, working: blue, success: green, error: pink, alert: orange }) as string

    const eyes = pick(mood, {
        idle: <><rect x="44" y="40" width="8" height="8" /><rect x="68" y="40" width="8" height="8" /></>,
        processing: <><path d="M43 45 h10" /><path d="M67 45 h10" /></>,
        working: <><rect x="44" y="40" width="8" height="8" fill={blue} stroke={blue} /><rect x="68" y="40" width="8" height="8" fill={blue} stroke={blue} /></>,
        success: <><path d="M43 47 L48 41 L53 47" stroke={green} /><path d="M67 47 L72 41 L77 47" stroke={green} /></>,
        error: <><path d="M43 39 l9 9 M52 39 l-9 9" stroke={pink} /><path d="M67 39 l9 9 M76 39 l-9 9" stroke={pink} /></>,
        alert: <><circle cx="48" cy="44" r="6" /><circle cx="72" cy="44" r="6" /><circle cx="48" cy="44" r="1.6" fill={orange} stroke={orange} /><circle cx="72" cy="44" r="1.6" fill={orange} stroke={orange} /></>
    })

    const mouth = pick(mood, {
        idle: <path d="M50 58 h20" />,
        processing: <path d="M50 58 h2 M57 58 h2 M64 58 h2 M70 58 h1" />,
        working: <path d="M50 58 h20 M50 58 v-2 M60 58 v-2 M70 58 v-2" />,
        success: <path d="M50 56 C55 62 65 62 70 56" stroke={green} />,
        error: <path d="M48 59 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3" stroke={pink} />,
        alert: <ellipse cx="60" cy="58" rx="4" ry="3" />
    })

    return (
        <g className="robot-body">
            {/* antenna */}
            <path d="M60 28 V16" />
            <circle className="antenna" cx="60" cy="12" r="4" fill={light} stroke={light} />
            {/* head */}
            <path d="M38 28 H82 C86 28 88 30 88 34 V62 C88 66 86 68 82 68 H38 C34 68 32 66 32 62 V34 C32 30 34 28 38 28 Z" />
            <path d="M32 44 h-5 M88 44 h5" />
            {eyes}{mouth}
            {/* neck and body */}
            <path d="M54 68 v6 M66 68 v6" />
            <path d="M42 74 H78 C81 74 82 75 82 78 V104 C82 107 81 108 78 108 H42 C39 108 38 107 38 104 V78 C38 75 39 74 42 74 Z" />
            <circle className="chest" cx="60" cy="90" r="6" stroke={light} />
            {mood === "success" && <path d="M56 90 l3 3 l6 -6" stroke={green} />}
            {/* arms */}
            <path d="M38 80 C30 84 28 94 30 102" />
            {!asking && <path d="M82 80 C90 84 92 94 90 102" />}
            {asking && <path className="raised-hand" d="M82 80 C94 72 98 58 96 46 M92 46 h8" />}
            {/* legs */}
            <path d="M50 108 v6 h-4 M70 108 v6 h4" />
        </g>
    )
}

// ---------- Cat ----------

function Cat({ mood, asking }: Drawing) {

    const flat = mood === "annoyed"

    const eyes = pick(mood, {
        idle: <><ellipse cx="51" cy="48" rx="3" ry="4.5" fill={white} /><ellipse cx="69" cy="48" rx="3" ry="4.5" fill={white} /></>,
        curious: <><circle cx="51" cy="47" r="5" /><circle cx="69" cy="47" r="5" /><circle cx="51" cy="47" r="2" fill={white} /><circle cx="69" cy="47" r="2" fill={white} /></>,
        focused: <><path d="M45 48 C49 46 53 46 56 48" /><path d="M64 48 C67 46 71 46 75 48" /><path d="M51 46 v4 M69 46 v4" /></>,
        content: <><path d="M45 49 C48 44 53 44 56 49" /><path d="M64 49 C67 44 72 44 75 49" /></>,
        annoyed: <><path d="M45 47 h11" /><path d="M64 47 h11" /><ellipse cx="51" cy="50" rx="2.6" ry="2" fill={white} /><ellipse cx="69" cy="50" rx="2.6" ry="2" fill={white} /></>,
        sleepy: <><path d="M45 49 C48 52 53 52 56 49" /><path d="M64 49 C67 52 72 52 75 49" /></>
    })

    const mouth = mood === "annoyed"
        ? <path d="M55 62 h10" />
        : <path d="M54 60 C56 63 59 63 60 60 C61 63 64 63 66 60" />

    return (
        <g className="cat-body">
            {/* tail, behind */}
            <path className="tail" d="M78 102 C98 104 106 88 98 74 C96 70 92 70 92 74" />
            {/* body */}
            <path d="M46 68 C36 82 36 102 46 108 H74 C84 102 84 82 74 68" />
            <g className={mood === "curious" ? "tilt" : undefined}>
                {/* head and ears */}
                <circle cx="60" cy="50" r="22" />
                <path d={flat ? "M42 40 L30 30 L46 32" : "M43 36 L40 16 L55 30"} />
                <path d={flat ? "M78 40 L90 30 L74 32" : "M77 36 L80 16 L65 30"} />
                {eyes}
                <path d="M58 55 L62 55 L60 58 Z" stroke={pink} fill={pink} />
                {mouth}
                {/* whiskers */}
                <path d="M40 56 L28 54 M40 60 L28 62 M80 56 L92 54 M80 60 L92 62" stroke="rgba(236,235,228,.6)" />
            </g>
            {/* front paws */}
            <path d="M52 108 v-14 M68 108 v-14" stroke="rgba(236,235,228,.75)" />
            {asking && <g className="raised-hand"><path d="M76 74 C88 66 92 54 90 44" /><circle cx="90" cy="41" r="4" /></g>}
            {mood === "sleepy" && <Z />}
            {mood === "annoyed" && <path d="M92 24 l6 -6 M96 30 l8 -2 M88 20 l2 -8" stroke={orange} />}
        </g>
    )
}

// ---------- People: caricatures, each with their own build and face ----------
// Every person has their own head, body and features; only the way a face reacts to a mood is shared
// (a face takes its geometry from the person and its expression from the mood, see the catalog).

function expressionOf(character: string, mood: string): Expression {

    return findCharacter(character).moods.find(entry => entry.name === mood)?.expression ?? "neutral"
}

interface FaceShape {

    // Eye centers and how the eyes are drawn when nothing special happens.
    eyes: { y: number, left: number, right: number, style: "round" | "narrow" | "small" | "squint" }

    // Brows: height above the eyes, half-length, stroke weight.
    brows: { lift: number, half: number, weight: number }

    // Mouth center and half-width; hidden by a beard unless the mood opens it wide.
    mouth: { x: number, y: number, half: number, hidden?: boolean }
}

function PersonFace({ shape, expression }: { shape: FaceShape, expression: Expression }) {

    const { eyes, brows, mouth } = shape

    const by = eyes.y - brows.lift

    // Inner and outer ends of each brow move with the feeling.
    const tilt: Record<Expression, [number, number]> = {
        neutral: [0, 0], thinking: [0, -4], working: [3, -1], happy: [-2, -2], excited: [-4, -4],
        sad: [-3, 3], confused: [4, -3], surprised: [-5, -5], calm: [0, 0], alert: [2, 0]
    }

    const [inner, outer] = tilt[expression]

    const brow = (x: number, side: number) => `M${x - side * brows.half} ${by + outer} Q${x} ${by - 3 + (inner + outer) / 2} ${x + side * brows.half} ${by + inner}`

    const eye = (x: number) => {

        if (expression === "happy" || expression === "excited") return <path d={`M${x - 5} ${eyes.y + 2} Q${x} ${eyes.y - 5} ${x + 5} ${eyes.y + 2}`} />

        if (expression === "calm") return <path d={`M${x - 5} ${eyes.y} Q${x} ${eyes.y + 4} ${x + 5} ${eyes.y}`} />

        if (expression === "surprised" || expression === "alert") return <><circle cx={x} cy={eyes.y} r="5" /><circle cx={x} cy={eyes.y} r="1.5" fill={white} /></>

        if (eyes.style === "narrow") return <><path d={`M${x - 6} ${eyes.y} Q${x} ${eyes.y - 3} ${x + 6} ${eyes.y}`} /><circle cx={x} cy={eyes.y} r="1.6" fill={white} /></>

        if (eyes.style === "squint") return <><path d={`M${x - 5} ${eyes.y} H${x + 5}`} /><circle cx={x} cy={eyes.y + 1.5} r="1.4" fill={white} /></>

        if (eyes.style === "small") return <circle cx={x} cy={eyes.y} r="2.2" fill={white} />

        return <ellipse cx={x} cy={eyes.y} rx="3" ry="4" fill={white} />
    }

    const { x: mx, y: my, half } = mouth

    const open = expression === "excited" || expression === "surprised"

    const mouths: Record<Expression, string> = {
        neutral: `M${mx - half} ${my} Q${mx} ${my + 3} ${mx + half} ${my}`,
        thinking: `M${mx - half * 0.7} ${my + 1} H${mx + half * 0.6}`,
        working: `M${mx - half * 0.6} ${my} H${mx + half * 0.6}`,
        happy: `M${mx - half} ${my - 2} Q${mx} ${my + 8} ${mx + half} ${my - 2}`,
        excited: `M${mx - half} ${my - 3} Q${mx} ${my + 12} ${mx + half} ${my - 3} Z`,
        sad: `M${mx - half} ${my + 3} Q${mx} ${my - 4} ${mx + half} ${my + 3}`,
        confused: `M${mx - half} ${my + 1} Q${mx - half / 2} ${my - 3} ${mx} ${my + 1} Q${mx + half / 2} ${my + 4} ${mx + half} ${my}`,
        surprised: `M${mx - 4} ${my} a4 5 0 1 0 8 0 a4 5 0 1 0 -8 0`,
        calm: `M${mx - half * 0.7} ${my} Q${mx} ${my + 2} ${mx + half * 0.7} ${my}`,
        alert: `M${mx - half * 0.6} ${my + 1} H${mx + half * 0.6}`
    }

    return (
        <g>
            <path d={`${brow(eyes.left, -1)} ${brow(eyes.right, 1)}`} strokeWidth={brows.weight} />
            {eye(eyes.left)}{eye(eyes.right)}
            {(!mouth.hidden || open) && <path d={mouths[expression]} />}
        </g>
    )
}

function Signs({ expression }: { expression: Expression }) {

    return <>
        {expression === "thinking" && <Dots />}
        {expression === "confused" && <text x="100" y="34" fontSize="26" fill={orange} stroke="none" fontFamily="Caveat">?</text>}
    </>
}

// A cowboy as people picture him: pinched-crown hat with a brim curled up at the sides, bandana,
// vest, a big belt buckle, thumbs by the belt, boots with heels, a lasso coiled at the hip.
// Lanky, with a long face, a squint and a drooping mustache.
function Cowboy({ mood, asking }: Drawing) {

    const expression = expressionOf("cowboy", mood), tipped = mood === "proud" || mood === "yeehaw"

    return (
        <g className="person-body">
            {/* jeans and boots */}
            <path d="M50 100 L48 112 M70 100 L72 112" />
            <path d="M42 112 H54 L56 118 H40 Z M66 112 H78 L80 118 H64 Z" />
            {/* shirt, vest, belt and buckle */}
            <path d="M46 70 C44 80 44 90 46 98 H74 C76 90 76 80 74 70" />
            <path d="M48 70 L54 98 M72 70 L66 98" stroke="rgba(236,235,228,.6)" />
            <path d="M45 98 H75" />
            <rect x="55" y="95" width="10" height="7" rx="1.5" stroke={yellow} />
            {/* arms, thumbs by the belt */}
            {!asking && <path d="M74 72 C82 78 82 90 76 96" />}
            <path d="M46 72 C38 78 38 90 44 96" />
            {/* lasso, coiled at the hip */}
            <ellipse cx="86" cy="96" rx="7" ry="9" stroke={orange} />
            <ellipse cx="86" cy="96" rx="4" ry="6" stroke={orange} />
            {/* long face */}
            <path d="M44 24 C44 16 76 16 76 24 L76 46 C76 58 70 64 60 64 C50 64 44 58 44 46 Z" />
            <path d="M59 37 L57 46 H61" />
            <PersonFace expression={expression} shape={{ eyes: { y: 34, left: 52, right: 68, style: "squint" }, brows: { lift: 5, half: 6, weight: 3 }, mouth: { x: 60, y: 56, half: 6 } }} />
            <path d="M60 49 C54 47 48 49 47 55 M60 49 C66 47 72 49 73 55" stroke={orange} strokeWidth={3.2} />
            <g fill={white} stroke="none" opacity=".45"><circle cx="53" cy="60" r=".9" /><circle cx="57" cy="62" r=".9" /><circle cx="63" cy="62" r=".9" /><circle cx="67" cy="60" r=".9" /></g>
            {/* bandana */}
            <path d="M48 64 L60 76 L72 64" stroke={pink} />
            <path d="M58 66 l2 3 l2 -3" stroke={pink} />
            <g className={tipped ? "hat tipped" : "hat"}>
                {/* brim curled up at the sides */}
                <path d="M12 18 C18 26 30 27 38 22 H82 C90 27 102 26 108 18 C104 30 16 30 12 18 Z" />
                {/* crown pinched at the top */}
                <path d="M38 22 C38 8 42 2 50 4 C54 1 58 6 60 6 C62 6 66 1 70 4 C78 2 82 8 82 22" />
                <path d="M39 18 H81" stroke={orange} />
            </g>
            {mood === "pondering" && <path d="M66 56 L90 48" stroke={yellow} />}
            {asking && <g className="raised-hand"><path d="M74 72 C84 62 90 48 88 34" /><circle cx="88" cy="30" r="4" /></g>}
            <Signs expression={expression} />
        </g>
    )
}

// Compact and broad: an angular face, square jaw, narrow sharp eyes, thick slanted brows.
function Samurai({ mood, asking }: Drawing) {

    const expression = expressionOf("samurai", mood), band = mood === "training" ? pink : white

    return (
        <g className="person-body">
            {/* winged shoulders (kataginu) over the robe */}
            <path d="M20 80 C34 74 48 76 60 82 C72 76 86 74 100 80 L96 90 C84 86 74 88 68 94 L52 94 C46 88 36 86 24 90 Z" />
            <path d="M50 82 L60 94 L70 82" stroke="rgba(236,235,228,.7)" />
            {/* the hakama, flaring out in pleats */}
            <path d="M46 94 C42 104 38 112 34 120 M74 94 C78 104 82 112 86 120 M46 94 H74" />
            <path d="M55 96 L52 120 M65 96 L68 120" stroke="rgba(236,235,228,.55)" />
            {/* angular head, square jaw */}
            <path d="M36 30 L84 30 L88 54 L78 72 L42 72 L32 54 Z" />
            <path d="M58 46 L56 54 H61" />
            <PersonFace expression={expression} shape={{ eyes: { y: 44, left: 48, right: 72, style: "narrow" }, brows: { lift: 7, half: 8, weight: 4 }, mouth: { x: 60, y: 62, half: 7 } }} />
            {/* topknot and headband */}
            <path d="M54 30 C52 18 68 18 66 30" />
            <path d="M58 20 L56 12 M62 20 L64 12" />
            <path d="M33 36 C50 32 70 32 87 36" stroke={band} />
            <path d="M87 36 L100 30 M87 36 L98 44" stroke={band} />
            {asking && <g className="raised-hand"><path d="M96 84 C104 72 106 58 102 46" /><circle cx="102" cy="42" r="4" /></g>}
            <Signs expression={expression} />
        </g>
    )
}

// A Viking as he really looked: a rounded helmet with the spectacle guard around the eyes (no horns),
// braids from under it, a full beard, a belted tunic with a cloak brooch, a round shield with an iron
// boss on one arm and an axe in the other hand. Burly, small eyes, a big nose.
function Viking({ mood, asking }: Drawing) {

    const expression = expressionOf("viking", mood)

    return (
        <g className="person-body">
            {/* broad tunic, belt, cloak brooch */}
            <path d="M26 120 L30 84 C36 74 84 74 90 84 L94 120" />
            <path d="M30 104 H90" />
            <rect x="55" y="101" width="10" height="7" rx="1.5" stroke={yellow} />
            <circle cx="40" cy="84" r="3.5" stroke={yellow} />
            {/* axe in the right hand */}
            {!asking && <>
                <path d="M90 86 C98 92 100 100 98 106" />
                <path d="M100 80 L94 118" stroke={orange} />
                <path d="M98 82 C108 80 112 88 108 96 C106 92 102 90 97 92" />
            </>}
            {/* round shield with its boss, on the left arm */}
            <circle cx="24" cy="98" r="17" />
            <circle cx="24" cy="98" r="5" fill="rgba(241,216,128,.25)" stroke={yellow} />
            <path d="M14 84 L14 112 M34 84 L34 112" stroke="rgba(236,235,228,.45)" />
            {/* head */}
            <path d="M44 38 C44 28 76 28 76 38 V52 C76 62 70 68 60 68 C50 68 44 62 44 52 Z" />
            {/* braids from under the helmet */}
            <path d="M43 40 C40 52 42 62 40 72 M77 40 C80 52 78 62 80 72" stroke={orange} />
            <path d="M39 50 h4 M40 58 h4 M39 66 h4 M77 50 h4 M76 58 h4 M77 66 h4" stroke={orange} />
            {/* big nose */}
            <path d="M56 44 C52 51 56 55 60 54 C64 55 68 51 64 44" />
            <PersonFace expression={expression} shape={{ eyes: { y: 41, left: 51, right: 69, style: "small" }, brows: { lift: 6, half: 6, weight: 4.2 }, mouth: { x: 60, y: 61, half: 6, hidden: true } }} />
            {/* full beard and mustache, braided at the tip */}
            <path d="M44 50 C42 70 50 84 60 88 C70 84 78 70 76 50" stroke={orange} />
            <path d="M50 57 C54 54 66 54 70 57" stroke={orange} strokeWidth={3.2} />
            <path d="M58 87 L57 98 M62 87 L63 98" stroke={orange} />
            <circle cx="57" cy="100" r="1.6" fill={yellow} stroke="none" /><circle cx="63" cy="100" r="1.6" fill={yellow} stroke="none" />
            {/* rounded helmet: crest, brow band, spectacle guard around the eyes */}
            <path d="M40 38 C40 14 80 14 80 38 Z" />
            <path d="M60 15 V38" stroke="rgba(236,235,228,.55)" />
            <path d="M44 38 C44 46 58 46 58 38 M62 38 C62 46 76 46 76 38 M60 38 V47" />
            {asking && <g className="raised-hand"><path d="M90 84 C100 72 104 58 100 44" /><circle cx="100" cy="40" r="5" /></g>}
            <Signs expression={expression} />
        </g>
    )
}

// An elderly, slender scholar: a long face, kind wrinkled eyes, a long pointed beard, a long robe.
function Astronomer({ mood, asking }: Drawing) {

    const expression = expressionOf("astronomer", mood), raised = mood === "eureka"

    return (
        <g className="person-body">
            {/* long robe */}
            <path d="M46 80 C42 96 38 108 34 120 M74 80 C78 96 82 108 86 120 M60 96 V120" />
            <path d="M46 80 C40 84 34 92 32 100 M74 80 C80 84 84 90 86 96" />
            {/* long narrow face */}
            <path d="M44 34 C44 20 76 20 76 34 L76 56 C76 70 68 78 60 78 C52 78 44 70 44 56 Z" />
            <path d="M59 46 L57 56 H61" />
            <PersonFace expression={expression} shape={{ eyes: { y: 43, left: 52, right: 68, style: "small" }, brows: { lift: 6, half: 5, weight: 2.4 }, mouth: { x: 60, y: 62, half: 5 } }} />
            {/* the lines of age beside the eyes */}
            <path d="M44 41 l-3 -2 M44 45 l-3 2 M76 41 l3 -2 M76 45 l3 2" stroke="rgba(236,235,228,.5)" />
            {/* long pointed beard */}
            <path d="M48 64 C50 84 56 98 60 106 C64 98 70 84 72 64 C68 70 52 70 48 64 Z" stroke={blue} />
            {/* a large turban */}
            <path d="M36 32 C30 8 90 8 84 32 C72 26 48 26 36 32 Z" />
            <path d="M40 22 C52 16 68 16 80 22 M46 13 C54 10 66 10 74 13" stroke="rgba(236,235,228,.6)" />
            <circle cx="60" cy="24" r="3" stroke={blue} />
            {/* the astrolabe: held while observing and calculating, raised high at a discovery */}
            {(raised || mood === "calculating" || mood === "stargazing") && (
                <g transform={raised ? "translate(70 -82)" : "translate(2 -6)"} stroke={yellow}>
                    <circle cx="28" cy="104" r="11" />
                    <circle cx="28" cy="104" r="5" />
                    <path d="M17 104 H39 M28 93 V115 M28 104 L35 97" />
                </g>
            )}
            {raised && <path d="M84 92 C92 72 96 46 98 34" />}
            {asking && !raised && <g className="raised-hand"><path d="M86 96 C96 80 100 62 98 46" /><circle cx="98" cy="42" r="4" /></g>}
            <Signs expression={expression} />
        </g>
    )
}

// ---------- Clawd ----------
// Claude Code's mascot as pixel art, colored in with chalk: a wide body, two slit eyes, short arms
// sticking out, four little legs. Drawn on an 8-unit pixel grid; the eyes change with the mood.

const clawdOrange = "#d97757"

function Clawd({ mood, asking }: Drawing) {

    // Proportions measured from the mascot: a body about 12 × 10 pixels, arms in the lower half of
    // the sides, thin legs two at each end, eyes as tall slits.
    const u = 7, x0 = 4, y0 = 22

    const px = (col: number, row: number, w = 1, h = 1) => ({ x: x0 + col * u, y: y0 + row * u, width: w * u, height: h * u })

    const board = "var(--board)"

    const dark = (col: number, row: number, w: number, h: number) => <rect {...px(col, row, w, h)} fill={board} stroke="none" />

    const eyes = {
        idle: <>{dark(4, 2, 1, 3)}{dark(11, 2, 1, 3)}</>,
        thinking: <>{dark(4, 1, 1, 2.5)}{dark(11, 1, 1, 2.5)}</>,
        working: <>{dark(4, 2, 1, 3)}{dark(11, 2, 1, 3)}</>,
        happy: <>{dark(3, 3, 1, 1)}{dark(4, 2, 1, 1)}{dark(5, 3, 1, 1)}{dark(10, 3, 1, 1)}{dark(11, 2, 1, 1)}{dark(12, 3, 1, 1)}</>,
        confused: <>{dark(4, 3, 1, 3)}{dark(11, 1, 1, 3)}</>,
        surprised: <>{dark(3.5, 2, 2, 2)}{dark(10.5, 2, 2, 2)}</>,
        sleepy: <>{dark(3.5, 3.5, 2, 0.7)}{dark(10.5, 3.5, 2, 0.7)}</>
    }[mood] ?? <>{dark(4, 2, 1, 3)}{dark(11, 2, 1, 3)}</>

    return (
        <g className="clawd-body" stroke="none" fill={clawdOrange}>
            {/* body */}
            <rect {...px(2, 0, 12, 10)} />
            {/* arms: the right one goes up while asking */}
            <rect {...px(0, 5, 2, 3)} />
            {asking ? <g className="raised-hand"><rect {...px(14, 0, 2, 3)} /><rect {...px(14.5, -2, 1.5, 2)} /></g> : <rect {...px(14, 5, 2, 3)} />}
            {/* four thin legs */}
            <g className="legs left"><rect {...px(2, 10, 1, 3)} /><rect {...px(4, 10, 1, 3)} /></g>
            <g className="legs right"><rect {...px(11, 10, 1, 3)} /><rect {...px(13, 10, 1, 3)} /></g>
            {eyes}
            {mood === "thinking" && <Dots />}
            {mood === "confused" && <text x="104" y="18" fontSize="26" fill={orange} fontFamily="Caveat">?</text>}
            {mood === "sleepy" && <Z />}
        </g>
    )
}

// ---------- Anime Hero ----------
// A big head on a small body, spiky hair, huge eyes with highlights, a small mouth, a hero's scarf,
// and the genre's emotion symbols: sparkles, a sweat drop, blush, streams of tears, determination flames.

function Sparkle({ x, y, size }: { x: number, y: number, size: number }) {

    return <path className="sparkle" d={`M${x} ${y - size} Q${x} ${y} ${x + size} ${y} Q${x} ${y} ${x} ${y + size} Q${x} ${y} ${x - size} ${y} Q${x} ${y} ${x} ${y - size} Z`} stroke={yellow} />
}

function AnimeHero({ mood, asking }: Drawing) {

    const board = "var(--board)"

    // Huge eyes: tall outline, big pupil, two highlights in the board's color.
    const bigEye = (x: number, look = { x: 0, y: 0 }, size = 1) => (
        <g>
            <ellipse cx={x} cy={50} rx={7 * size} ry={10 * size} />
            <ellipse cx={x + look.x} cy={52 + look.y} rx={4.6 * size} ry={6.6 * size} fill={white} />
            <circle cx={x + look.x - 1.8} cy={48.5 + look.y} r={2} fill={board} stroke="none" />
            <circle cx={x + look.x + 2} cy={55 + look.y} r={1} fill={board} stroke="none" />
        </g>
    )

    const eyes = {
        idle: <>{bigEye(48)}{bigEye(72)}</>,
        pondering: <>{bigEye(48, { x: 1.5, y: -2.5 })}{bigEye(72, { x: 1.5, y: -2.5 })}</>,
        determined: <><path d="M40 46 L56 50 M80 46 L64 50" strokeWidth={3.6} />{bigEye(48, { x: 0, y: 1 }, 0.85)}{bigEye(72, { x: 0, y: 1 }, 0.85)}</>,
        sparkling: <><path d="M40 54 Q48 42 56 54" strokeWidth={3} /><path d="M64 54 Q72 42 80 54" strokeWidth={3} /></>,
        flustered: <><path d="M41 50 L55 50 M41 55 Q48 51 55 55" /><path d="M65 50 L79 50 M65 55 Q72 51 79 55" /></>,
        tearful: <><path d="M40 50 Q48 56 56 50" strokeWidth={3} /><path d="M64 50 Q72 56 80 50" strokeWidth={3} /></>,
        shocked: <><ellipse cx="48" cy="50" rx="7" ry="10" /><ellipse cx="72" cy="50" rx="7" ry="10" /><circle cx="48" cy="50" r="1.6" fill={white} /><circle cx="72" cy="50" r="1.6" fill={white} /></>
    }[mood] ?? <>{bigEye(48)}{bigEye(72)}</>

    const mouth = {
        idle: <path d="M56 70 Q60 73 64 70" />,
        pondering: <path d="M57 71 H63" />,
        determined: <><path d="M53 68 H67 V74 H53 Z" /><path d="M53 71 H67" stroke="rgba(236,235,228,.6)" /></>,
        sparkling: <path d="M51 67 Q60 80 69 67 Z" />,
        flustered: <path d="M53 71 Q56 68 59 71 Q62 74 65 71 Q67 69 68 70" />,
        tearful: <path d="M53 73 Q56 66 60 70 Q64 66 67 73 Q60 77 53 73 Z" />,
        shocked: <ellipse cx="60" cy="73" rx="4" ry="6" />
    }[mood] ?? <path d="M56 70 Q60 73 64 70" />

    return (
        <g className="anime-body">
            {/* small body and a scarf that flutters behind */}
            <path className="scarf" d="M50 84 C64 88 74 86 84 82 C94 86 104 84 110 78 C104 92 92 96 80 92" stroke={orange} />
            <path d="M46 84 C42 96 42 108 42 120 M74 84 C78 96 78 108 78 120" />
            <path d="M42 102 H78" stroke="rgba(236,235,228,.5)" />
            <path d="M46 86 C38 92 34 100 34 108" />
            {!asking && <path d="M74 86 C82 92 86 100 86 108" />}
            <path d="M48 82 C54 88 66 88 72 82" stroke={orange} />
            {/* big head */}
            <path d="M60 18 C88 18 96 38 94 56 C92 74 78 84 60 84 C42 84 28 74 26 56 C24 38 32 18 60 18 Z" />
            {/* spiky hair */}
            <path d="M26 48 L18 30 L32 32 L28 12 L44 22 L46 4 L58 18 L66 2 L72 18 L86 8 L86 24 L102 22 L94 36 L104 48 C92 34 80 30 72 34 C62 26 50 28 44 34 C36 30 30 38 26 48 Z" />
            {eyes}
            <path d="M60 62 L59 64" />
            {mouth}
            {/* the genre's emotion symbols */}
            {mood === "sparkling" && <><Sparkle x={16} y={40} size={7} /><Sparkle x={104} y={56} size={6} /><Sparkle x={98} y={20} size={4} /></>}
            {mood === "flustered" && <>
                <path d="M36 64 l4 -4 M40 66 l4 -4 M44 68 l4 -4 M72 64 l4 -4 M76 66 l4 -4 M80 68 l4 -4" stroke={pink} />
                <path className="sweat" d="M96 30 C90 40 92 46 96 46 C100 46 102 40 96 30 Z" stroke={blue} />
            </>}
            {mood === "tearful" && <path className="tears" d="M44 54 C42 66 44 76 42 86 M76 54 C78 66 76 76 78 86" stroke={blue} strokeWidth={3.4} />}
            {mood === "determined" && <path className="flame" d="M100 40 C94 32 98 24 102 18 C102 26 108 28 106 36 C110 32 112 38 108 44 C104 48 98 46 100 40 Z" stroke={orange} />}
            {mood === "shocked" && <path d="M44 22 V30 M52 20 V28 M60 19 V27 M68 20 V28 M76 22 V30" stroke={blue} />}
            {mood === "pondering" && <Dots />}
            {asking && <g className="raised-hand"><path d="M74 86 C86 76 92 62 90 48" /><circle cx="90" cy="44" r="4" /></g>}
        </g>
    )
}

const drawings: Record<string, (props: Drawing) => ReactNode> = {
    clawd: Clawd,
    anime: AnimeHero,
    chalky: Chalky, penguin: Penguin, owl: Owl, robot: Robot, cat: Cat,
    cowboy: Cowboy, samurai: Samurai, viking: Viking, astronomer: Astronomer
}
