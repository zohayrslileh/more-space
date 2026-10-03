import type { Mark } from "@/core/board/board-types"
import { roughLine, roughLoop, roughZigzag, seeded } from "../chalk"
import { useEffect } from "react"
import type { Rect } from "./camera"
import { useFresh } from "./writing"
import { sound } from "../sound"

// Chalk emphasis over items, drawn once and then left alone.
export function Marks({ marks, anchors }: { marks: Mark[], anchors: Map<string, { rect: Rect }> }) {

    return <>{marks.map(mark => {

        const target = anchors.get(mark.target)

        return target ? <MarkStroke key={mark.id} mark={mark} rect={target.rect} /> : null
    })}</>
}

function MarkStroke({ mark, rect }: { mark: Mark, rect: Rect }) {

    const fresh = useFresh(mark.createdAt)

    useEffect(() => { if (fresh) sound.write(0.45) }, [])

    const random = seeded(mark.id)

    // An ellipse must be wider than the box it encloses or its curve cuts the corners.
    const margin = mark.kind === "circle" ? { x: rect.width * 0.12 + 18, y: rect.height * 0.35 + 16 }
        // Inside the item's own padding, so the scribble stays on the writing itself.
        : mark.kind === "cross" ? { x: -14, y: -12 }
        : { x: 14, y: 16 }

    const box = { x: rect.x - margin.x, y: rect.y - margin.y, width: rect.width + margin.x * 2, height: rect.height + margin.y * 2 }

    const paths = mark.kind === "circle"
        ? [roughLoop(box.width - 8, box.height - 8, random)]
        : mark.kind === "underline"
            // Items keep some inner space below their text; the underline sits up into it.
            ? [roughLine(margin.x, box.height - margin.y - 4, box.width - margin.x, box.height - margin.y - 6, random),
               roughLine(margin.x + 18, box.height - margin.y + 6, box.width - margin.x - 10, box.height - margin.y + 3, random)]
            : [roughZigzag(box.width - margin.x * 2, box.height - margin.y * 2, random)]

    return (
        <svg
            className={`emphasis chalk c-${mark.color} ${mark.erasedAt ? "ghost" : ""}`}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" aria-hidden
        >
            <g transform={mark.kind === "circle" ? "translate(4 4)" : mark.kind === "cross" ? `translate(${margin.x} ${margin.y})` : undefined}>
                {paths.map((d, index) => (
                    <path key={index} d={d} pathLength={1} className={fresh ? "draw-once" : undefined} style={fresh ? { animationDelay: `${index * 0.35}s`, animationDuration: mark.kind === "circle" ? ".6s" : mark.kind === "cross" ? `${0.5 + box.width / 900}s` : ".35s" } : undefined} />
                ))}
            </g>
        </svg>
    )
}
