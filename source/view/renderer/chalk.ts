// Hand-drawn geometry. Shapes wobble a little, the same way every time for the same seed.

export function seeded(seed: string) {

    let state = 0

    for (const char of seed) state = (state * 31 + char.charCodeAt(0)) | 0

    return () => {

        state = (state + 0x6D2B79F5) | 0

        let value = Math.imul(state ^ (state >>> 15), 1 | state)

        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value

        return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
}

export function roughRect(x: number, y: number, width: number, height: number, random: () => number) {

    const j = (amount: number) => (random() - 0.5) * 2 * amount

    const r = Math.min(16, height / 4)

    const x2 = x + width, y2 = y + height

    return [
        `M${x + r + j(2)} ${y + j(2)}`,
        `L${x2 - r + j(2)} ${y + j(2.5)}`,
        `Q${x2 + j(1.5)} ${y + j(1.5)} ${x2 + j(2)} ${y + r + j(2)}`,
        `L${x2 + j(2.5)} ${y2 - r + j(2)}`,
        `Q${x2 + j(1.5)} ${y2 + j(1.5)} ${x2 - r + j(2)} ${y2 + j(2)}`,
        `L${x + r + j(2)} ${y2 + j(2.5)}`,
        `Q${x + j(1.5)} ${y2 + j(1.5)} ${x + j(2)} ${y2 - r + j(2)}`,
        `L${x + j(2.5)} ${y + r + j(2)}`,
        `Q${x + j(1.5)} ${y + j(1.5)} ${x + r + j(3)} ${y + j(2)}`
    ].join(" ")
}

export function roughArrow(x1: number, y: number, x2: number, random: () => number) {

    const j = (amount: number) => (random() - 0.5) * 2 * amount

    const mid = (x1 + x2) / 2

    return [
        `M${x1} ${y + j(2)} C${mid} ${y + j(4)} ${mid} ${y + j(4)} ${x2} ${y + j(1.5)}`,
        `M${x2 - 12 + j(1.5)} ${y - 10 + j(1.5)} L${x2 + 1} ${y} L${x2 - 12 + j(1.5)} ${y + 10 + j(1.5)}`
    ].join(" ")
}

// A loose loop around a box, the way a hand circles something on a board: it overshoots its start.
export function roughLoop(width: number, height: number, random: () => number) {

    const j = (amount: number) => (random() - 0.5) * 2 * amount

    const cx = width / 2, cy = height / 2, rx = width / 2, ry = height / 2

    const points: string[] = []

    const turns = 1.12, steps = 40, start = -0.6 + j(0.2)

    for (let index = 0; index <= steps; index++) {

        const angle = start + (index / steps) * turns * Math.PI * 2

        const drift = 1 + (index / steps) * 0.05

        points.push(`${(cx + Math.cos(angle) * rx * drift + j(1.5)).toFixed(1)} ${(cy + Math.sin(angle) * ry * drift + j(1.5)).toFixed(1)}`)
    }

    return `M${points.join(" L")}`
}

// A hand-drawn straight stroke: it bows a little and does not quite end where aimed.
export function roughLine(x1: number, y1: number, x2: number, y2: number, random: () => number) {

    const j = (amount: number) => (random() - 0.5) * 2 * amount

    const length = Math.hypot(x2 - x1, y2 - y1) || 1

    const bow = Math.min(10, length * 0.02)

    const nx = -(y2 - y1) / length, ny = (x2 - x1) / length

    const mx = (x1 + x2) / 2 + nx * bow * (random() > 0.5 ? 1 : -1), my = (y1 + y2) / 2 + ny * bow * (random() > 0.5 ? 1 : -1)

    return `M${x1 + j(3)} ${y1 + j(3)} Q${mx} ${my} ${x2 + j(4)} ${y2 + j(4)}`
}

// Scribbled out: a hand going back and forth across the box, left to right,
// turning in soft curves at the top and bottom instead of sharp corners.
export function roughZigzag(width: number, height: number, random: () => number) {

    const j = (amount: number) => (random() - 0.5) * 2 * amount

    // Distance covered by one stroke from bottom to top: about the height, so strokes sit close.
    const step = Math.max(22, Math.min(60, height * 0.75))

    const points: { x: number, y: number }[] = [{ x: j(3), y: height * 0.5 + j(4) }]

    for (let x = step / 2, down = true; x < width + step / 2; x += step / 2, down = !down) {

        points.push({ x: Math.min(width, x) + j(3), y: (down ? height * 0.88 : height * 0.12) + j(3) })
    }

    // Through every point with smooth curves (Catmull-Rom as cubic Béziers).
    let path = `M${points[0]!.x} ${points[0]!.y}`

    for (let index = 0; index < points.length - 1; index++) {

        const p0 = points[index - 1] ?? points[index]!, p1 = points[index]!, p2 = points[index + 1]!, p3 = points[index + 2] ?? p2

        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }

        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }

        path += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }

    return path
}
