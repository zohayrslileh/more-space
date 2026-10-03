import type { BoardState, Link, Size } from "@/core/board/board-types"
import { bridge } from "../bridge"
import { useEffect, useLayoutEffect, useState } from "react"
import type { Rect } from "./camera"
import { useFresh } from "./writing"
import { sound } from "../sound"

interface Anchor { rect: Rect, pin?: { x: number, y: number } }

// From the photo's top edge to the thumbtack's head center.
const pinDepth = 9

// Where each item sits, measured from layout. Re-measured when the board changes,
// when an image finishes loading, and on every frame while items glide.
// Sizes go back to the core, so commands can tell the agent how big its writing turned out.
export function useAnchors(scene: HTMLElement | null, state: BoardState) {

    const [anchors, setAnchors] = useState<Map<string, Anchor>>(new Map())

    useLayoutEffect(() => {

        if (!scene) return

        let reported = ""

        const measure = () => {

            const next = new Map<string, Anchor>()

            for (const element of scene.querySelectorAll<HTMLElement>("[data-item]")) {

                const rect = { x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight }

                // The thumbtack sits at the photo's top center (see .thumbtack). It is an SVG element,
                // which has no offset box, so its point is taken from the photo's own box.
                const pin = element.querySelector(".thumbtack") ? { x: rect.x + rect.width / 2, y: rect.y + pinDepth } : undefined

                next.set(element.dataset.item!, { rect, pin })
            }

            setAnchors(next)

            const sizes: Record<string, Size> = {}

            for (const element of scene.querySelectorAll<HTMLElement>("[data-item]:not(.ghost)")) {

                // A photo's size is only real once its image has loaded.
                const image = element.querySelector("img")

                if (image && !image.complete) continue

                sizes[element.dataset.item!] = { width: element.offsetWidth, height: element.offsetHeight }
            }

            const key = JSON.stringify(sizes)

            if (key !== reported) { reported = key; bridge.board.reportSizes(sizes) }
        }

        measure()

        let frame = 0, until = 0

        const follow = () => { measure(); if (performance.now() < until) frame = requestAnimationFrame(follow) }

        const gliding = (event: Event) => {

            if (!(event.target as Element).matches?.("[data-item]")) return

            until = performance.now() + 700

            cancelAnimationFrame(frame)

            frame = requestAnimationFrame(follow)
        }

        scene.addEventListener("board-layout", measure)

        scene.addEventListener("transitionrun", gliding)

        return () => { scene.removeEventListener("board-layout", measure); scene.removeEventListener("transitionrun", gliding); cancelAnimationFrame(frame) }
    }, [scene, state])

    return anchors
}

// Chalk links are written under the items; threads run over the photos, pin to pin.
export function Links({ links, anchors, style }: { links: Link[], anchors: Map<string, Anchor>, style: Link["style"] }) {

    return <>{links.filter(link => link.style === style).map(link => {

        const from = anchors.get(link.from), to = anchors.get(link.to)

        return from && to ? <LinkMark key={link.id} link={link} from={from} to={to} /> : null
    })}</>
}

function LinkMark({ link, from, to }: { link: Link, from: Anchor, to: Anchor }) {

    const fresh = useFresh(link.createdAt)

    useEffect(() => { if (fresh) link.style === "thread" ? sound.pin() : sound.write(0.5) }, [])

    const thread = link.style === "thread"

    const start = thread && from.pin ? from.pin : edgePoint(from.rect, center(to.rect))

    const end = thread && to.pin ? to.pin : edgePoint(to.rect, center(from.rect))

    const distance = Math.hypot(end.x - start.x, end.y - start.y)

    // A thread sags under its own weight; a chalk line bows a little, as a hand draws it.
    const bend = thread ? Math.min(90, distance * 0.14) : Math.min(40, distance * 0.08)

    const control = thread
        ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 + bend }
        : { x: (start.x + end.x) / 2 - (end.y - start.y) / distance * bend, y: (start.y + end.y) / 2 + (end.x - start.x) / distance * bend }

    const angle = Math.atan2(end.y - control.y, end.x - control.x)

    const head = (side: number) => `${end.x - 18 * Math.cos(angle + side * 0.45)} ${end.y - 18 * Math.sin(angle + side * 0.45)}`

    const pad = 40

    const left = Math.min(start.x, end.x, control.x) - pad, top = Math.min(start.y, end.y, control.y) - pad

    const width = Math.max(start.x, end.x, control.x) - left + pad, height = Math.max(start.y, end.y, control.y) - top + pad

    const middle = { x: (start.x + 2 * control.x + end.x) / 4, y: (start.y + 2 * control.y + end.y) / 4 }

    return (
        <svg
            className={`link ${thread ? `thread t-${link.color}` : `chalk c-${link.color}`} ${link.erasedAt ? "ghost" : ""}`}
            style={{ left, top, width, height }}
            viewBox={`${left} ${top} ${width} ${height}`}
            fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
            <path className={fresh ? "draw-once" : undefined} pathLength={1} d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} />
            {!thread && <path className={fresh ? "draw-once head" : undefined} pathLength={1} d={`M${head(-1)} L${end.x} ${end.y} L${head(1)}`} />}
            {link.label && <text x={middle.x} y={middle.y - 12} textAnchor="middle" className="link-label">{link.label}</text>}
        </svg>
    )
}

function center(rect: Rect) {

    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

// Where the line from the rect's center toward a point leaves the rect, with a little air.
function edgePoint(rect: Rect, toward: { x: number, y: number }) {

    const c = center(rect), dx = toward.x - c.x, dy = toward.y - c.y

    const scale = Math.min(Math.abs(dx) > 0 ? rect.width / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 0 ? rect.height / 2 / Math.abs(dy) : Infinity)

    const length = Math.hypot(dx, dy) || 1

    return { x: c.x + dx * scale + dx / length * 10, y: c.y + dy * scale + dy / length * 10 }
}
