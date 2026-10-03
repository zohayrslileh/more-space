import { avatarSpan, cellSize, type AskItem, type Avatar } from "@/core/board/board-types"
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react"
import type Camera from "./camera"
import type { Rect } from "./camera"
import { sound } from "../sound"

// A waiting question must not go unnoticed: the avatar points at it,
// a pill appears when it is out of view, and a soft bell repeats while it waits.

const reminderEvery = 45_000

// The question to answer now: the oldest still waiting, in the order they were asked.
export function useWaitingQuestion(questions: AskItem[]) {

    const waiting = [...questions].sort((a, b) => a.createdAt - b.createdAt)[0]

    const ids = questions.map(question => question.id).join(" ")

    useEffect(() => {

        if (!ids) return

        const timer = setInterval(() => sound.reminder(), reminderEvery)

        return () => clearInterval(timer)
    }, [ids])

    return waiting
}

// The question's box in board pixels, measured from layout.
export function useQuestionRect(scene: HTMLElement | null, question: AskItem | undefined) {

    const [rect, setRect] = useState<Rect>()

    useLayoutEffect(() => {

        const element = question && scene?.querySelector<HTMLElement>(`[data-item="${question.id}"]`)

        if (!element) return setRect(undefined)

        const measure = () => setRect({ x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight })

        measure()

        const observer = new ResizeObserver(measure)

        observer.observe(element)

        return () => observer.disconnect()
    }, [scene, question?.id, question?.col, question?.row])

    return rect
}

// A chalk arrow from the avatar's raised hand to the question, drawn once.
export function QuestionPointer({ avatar, target }: { avatar: Avatar, target: Rect }) {

    const box = { x: avatar.col * cellSize, y: avatar.row * cellSize, width: avatarSpan.cols * cellSize, height: avatarSpan.rows * cellSize }

    const fromRight = target.x + target.width / 2 > box.x + box.width / 2

    const start = { x: fromRight ? box.x + box.width * 0.9 : box.x + box.width * 0.1, y: box.y + box.height * 0.32 }

    const end = {
        x: fromRight ? target.x - 14 : target.x + target.width + 14,
        y: Math.min(Math.max(start.y, target.y + 18), target.y + target.height - 18)
    }

    // Nothing to point across when the question sits right next to the avatar.
    if (Math.hypot(end.x - start.x, end.y - start.y) < 90) return null

    const control = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 90 }

    const angle = Math.atan2(end.y - control.y, end.x - control.x)

    const head = (side: number) => `${end.x - 18 * Math.cos(angle + side * 0.45)} ${end.y - 18 * Math.sin(angle + side * 0.45)}`

    const left = Math.min(start.x, end.x, control.x) - 30, top = Math.min(start.y, end.y, control.y) - 30

    const width = Math.max(start.x, end.x, control.x) - left + 30, height = Math.max(start.y, end.y, control.y) - top + 30

    return (
        <svg className="question-pointer chalk" style={{ left, top, width, height }} viewBox={`${left} ${top} ${width} ${height}`} fill="none" stroke="var(--chalk-orange)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="draw-once" pathLength={1} d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} />
            <path className="draw-once head" pathLength={1} d={`M${head(-1)} L${end.x} ${end.y} L${head(1)}`} />
        </svg>
    )
}

// Shown when the waiting question is outside the part of the board the user can see.
export function QuestionBeacon({ camera, target }: { camera: Camera, target: Rect }) {

    useSyncExternalStore(listener => camera.onChange(listener), () => `${camera.x}|${camera.y}|${camera.k}`)

    const area = camera.openArea()

    const screen = { x: camera.x + target.x * camera.k, y: camera.y + target.y * camera.k, width: target.width * camera.k, height: target.height * camera.k }

    const inView = screen.x + screen.width * 0.6 > area.x && screen.x + screen.width * 0.4 < area.x + area.width
        && screen.y + screen.height * 0.6 > area.y && screen.y + screen.height * 0.4 < area.y + area.height

    if (inView) return null

    const dx = screen.x + screen.width / 2 - (area.x + area.width / 2), dy = screen.y + screen.height / 2 - (area.y + area.height / 2)

    const rotation = Math.atan2(dy, dx) * 180 / Math.PI

    return (
        <button
            type="button"
            className="question-beacon glass"
            onClick={() => camera.centerOn(target.x + target.width / 2, target.y + target.height / 2, Math.max(camera.k, 0.8))}
        >
            <span className="dot" />
            A question is waiting for you
            <svg viewBox="0 0 16 16" style={{ transform: `rotate(${rotation}deg)` }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" /></svg>
        </button>
    )
}
