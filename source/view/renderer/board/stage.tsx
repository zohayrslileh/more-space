import { avatarSpan, cellSize, chalkColors, colorMeanings, type AskItem, type BoardState } from "@/core/board/board-types"
import { QuestionBeacon, QuestionPointer, useQuestionRect, useWaitingQuestion } from "./attention"
import { Links, useAnchors } from "./links"
import { Marks } from "./marks"
import { CharacterPicker } from "./character-picker"
import { FontPicker, useBoardFont } from "./fonts"
import { defaultFont } from "@/core/settings/defaults"
import { AgentPrompt, ProjectChooser } from "./onboarding"
import type { ProjectInfo } from "@/view/desktop/bridge-types"
import { sound } from "../sound"
import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Camera, { type Rect } from "./camera"
import { BoardItem } from "./items"
import { bridge } from "../bridge"
import { Avatar } from "./avatar"

const toolbarInset = 56

// A question is brought this close (at least) so it can be read and answered.
const questionZoom = 0.8

// After the user moves the board, automatic moves wait this long.
const userHold = 4000

// With nothing written, frame this area so the board opens at a readable scale.
const startArea: Rect = { x: 0, y: 0, width: 13 * cellSize, height: 7 * cellSize }

interface StageProps {

    state: BoardState

    info: ProjectInfo | undefined

    // Height covered at the bottom by the floating terminal.
    bottomInset: () => number
}

// Memoized: the board re-renders when the board, the project or its callbacks change, not when
// unrelated app state (like the terminal's height) does.
export const Stage = memo(function Stage({ state, info, bottomInset }: StageProps) {

    const stageRef = useRef<HTMLDivElement>(null)

    const sceneRef = useRef<HTMLDivElement>(null)

    const rulesRef = useRef<HTMLDivElement>(null)

    const grainRef = useRef<HTMLDivElement>(null)

    const [camera, setCamera] = useState<Camera>()

    const [follow, setFollow] = useState(false)

    // Automatic framing: the view keeps the whole board in sight as it grows and shrinks,
    // so the user never has to zoom to follow. The user moving the view pauses it;
    // the fit button, or the agent ("view fit"), turns it back on.
    const [auto, setAuto] = useState(true)

    const autoRef = useRef(auto)

    autoRef.current = auto

    const [showCells, setShowCells] = useState(false)

    const [showColors, setShowColors] = useState(false)

    const [showCharacters, setShowCharacters] = useState(false)

    const [showFonts, setShowFonts] = useState(false)

    const [font, setFont] = useState(defaultFont)

    useBoardFont()

    useEffect(() => { bridge.font().then(setFont) }, [])

    // An open panel closes on any click outside it (its own toolbar button toggles it), or on Escape.
    useEffect(() => {

        if (!showColors && !showCharacters && !showFonts) return

        const close = () => { setShowColors(false); setShowCharacters(false); setShowFonts(false) }

        const outside = (event: PointerEvent) => {

            if (!(event.target as Element).closest(".legend, .character-picker, .font-picker, [data-panel-toggle]")) close()
        }

        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close() }

        document.addEventListener("pointerdown", outside, true)

        window.addEventListener("keydown", escape)

        return () => { document.removeEventListener("pointerdown", outside, true); window.removeEventListener("keydown", escape) }
    }, [showColors, showCharacters, showFonts])

    const live = state.items.filter(item => !item.erasedAt)

    const questions = live.filter((item): item is AskItem => item.kind === "ask" && !item.answer)

    const waiting = useWaitingQuestion(questions)

    const waitingRect = useQuestionRect(camera ? sceneRef.current : null, waiting)

    const anchors = useAnchors(camera ? sceneRef.current : null, state)

    // When the user last moved the board themselves; their hand wins over automatic moves.
    const lastTouch = useRef(0)

    const revealed = useRef(new Set<string>())

    // The question tour: while questions wait, the camera goes to each in the order asked,
    // moves on as each is answered, and returns to the view it left once none are left.
    const tour = useRef<{ x: number, y: number, k: number } | undefined>(undefined)

    const frameRef = useRef(() => { })

    // The whole board, framed: never closer than the usual starting scale, so a board with
    // little on it looks like the same board, not a close-up.
    const frame = (animate = true) => {

        if (!camera || !sceneRef.current) return

        camera.fit(contentRect(sceneRef.current) ?? startArea, animate, camera.scaleToFit(startArea))
    }

    frameRef.current = frame

    useEffect(() => {

        if (!camera) return

        if (!waiting) {

            if (tour.current) autoRef.current ? frame() : camera.moveTo(tour.current.x, tour.current.y, tour.current.k)

            tour.current = undefined

            return
        }

        if (!waitingRect) return

        tour.current ??= { x: camera.x, y: camera.y, k: camera.k }

        setFollow(false)

        camera.centerOn(waitingRect.x + waitingRect.width / 2, waitingRect.y + waitingRect.height / 2, Math.max(camera.k, questionZoom))
    }, [camera, waiting?.id, waitingRect?.x, waitingRect?.y])

    // As the board changes: with automatic framing, frame it all again (shortly after the
    // change settles); without it, bring new writing into view. A question tour holds the camera.
    useEffect(() => {

        if (!camera || waiting) return

        if (auto) {

            const timer = setTimeout(() => frame(), 350)

            return () => clearTimeout(timer)
        }

        for (const item of live) {

            if (revealed.current.has(item.id)) continue

            const anchor = anchors.get(item.id)

            if (!anchor) continue

            revealed.current.add(item.id)

            const fresh = Date.now() - item.createdAt < 3000

            if (fresh && Date.now() - lastTouch.current > userHold) camera.reveal(anchor.rect)
        }
    }, [camera, anchors, auto, waiting?.id])

    // What the agent asks of the view.
    useEffect(() => {

        if (!camera) return

        return bridge.board.onView(request => {

            setFollow(false)

            if (request.kind === "fit") { setAuto(true); return frame() }

            if (request.kind === "auto") { setAuto(request.on); if (request.on) frame(); return }

            setAuto(false)

            const rects = request.cells
                ? [{ x: request.cells.col * cellSize, y: request.cells.row * cellSize, width: request.cells.cols * cellSize, height: request.cells.rows * cellSize }]
                : (request.items ?? []).flatMap(id => anchors.get(id)?.rect ?? [])

            if (!rects.length) return

            const left = Math.min(...rects.map(rect => rect.x)), top = Math.min(...rects.map(rect => rect.y))

            const right = Math.max(...rects.map(rect => rect.x + rect.width)), bottom = Math.max(...rects.map(rect => rect.y + rect.height))

            camera.fit({ x: left - 40, y: top - 40, width: right - left + 80, height: bottom - top + 80 }, true, 1.2)
        })
    }, [camera, anchors])

    // The agent learns from "board info" whether the view is framing the whole board.
    useEffect(() => { if (camera) bridge.board.setViewport({ ...camera.visibleCells(), auto }) }, [camera, auto])

    const soundOn = useSyncExternalStore(sound.subscribe, () => sound.enabled)

    const grainUrl = useMemo(makeGrain, [])

    useEffect(() => {

        const camera = new Camera(
            { stage: stageRef.current!, scene: sceneRef.current!, rules: rulesRef.current!, grain: grainRef.current! },
            () => ({ top: toolbarInset, bottom: bottomInset() })
        )

        let timer: ReturnType<typeof setTimeout> | undefined

        const report = () => {

            clearTimeout(timer)

            timer = setTimeout(() => bridge.board.setViewport({ ...camera.visibleCells(), auto: autoRef.current }), 120)
        }

        const unsubscribe = camera.onChange(report)

        // Open on the whole board, at the usual starting scale or wider, never closer:
        // a board with little on it should look like the same board, not a close-up.
        const openingFit = () => camera.fit(contentRect(sceneRef.current!) ?? startArea, false, camera.scaleToFit(startArea))

        openingFit()

        document.fonts?.ready.then(openingFit)

        const resize = new ResizeObserver(report)

        resize.observe(stageRef.current!)

        setCamera(camera)

        return () => { unsubscribe(); resize.disconnect(); camera.stop() }
    }, [])

    // Following keeps the avatar in view as the agent moves it.
    useEffect(() => {

        if (!camera || !follow) return

        const { col, row } = state.avatar

        camera.centerOn((col + avatarSpan.cols / 2) * cellSize, (row + avatarSpan.rows / 2) * cellSize, Math.max(camera.k, questionZoom))
    }, [camera, follow, state.avatar.col, state.avatar.row])

    // Drag to move, wheel to scroll, pinch or ctrl/cmd + wheel to zoom.
    useEffect(() => {

        const stage = stageRef.current!

        if (!camera) return

        let drag: { id: number, x: number, y: number } | undefined

        const down = (event: PointerEvent) => {

            if ((event.target as Element).closest(".toolbar, .legend, .character-picker, .font-picker, .question-beacon, button, textarea, input, .onboard") || event.button !== 0) return

            drag = { id: event.pointerId, x: event.clientX, y: event.clientY }

            lastTouch.current = Date.now()

            stage.setPointerCapture(event.pointerId)

            stage.classList.add("panning")

            setFollow(false)

            setAuto(false)
        }

        const move = (event: PointerEvent) => {

            if (!drag || drag.id !== event.pointerId) return

            camera.panBy(event.clientX - drag.x, event.clientY - drag.y)

            lastTouch.current = Date.now()

            drag.x = event.clientX

            drag.y = event.clientY
        }

        const up = () => { drag = undefined; stage.classList.remove("panning") }

        const wheel = (event: WheelEvent) => {

            // Panels over the board scroll themselves; the board only takes what lands on it.
            if ((event.target as Element).closest(".legend, .character-picker, .font-picker")) return

            event.preventDefault()

            lastTouch.current = Date.now()

            setAuto(false)

            const box = stage.getBoundingClientRect()

            if (event.ctrlKey || event.metaKey) camera.zoomAt(event.clientX - box.left, event.clientY - box.top, Math.exp(-event.deltaY * 0.01))

            else { setFollow(false); camera.panBy(-event.deltaX, -event.deltaY) }
        }

        const key = (event: KeyboardEvent) => {

            if (document.activeElement && document.activeElement !== document.body) return

            const manual = () => setAuto(false)

            if (event.key === "+" || event.key === "=") { manual(); camera.zoomCenter(1.2) }

            else if (event.key === "-") { manual(); camera.zoomCenter(1 / 1.2) }

            else if (event.key === "0") { manual(); camera.zoomCenter(1 / camera.k) }

            else if (event.key === "!" || (event.key === "1" && event.shiftKey)) { setAuto(true); frameRef.current() }
        }

        stage.addEventListener("pointerdown", down)

        stage.addEventListener("pointermove", move)

        stage.addEventListener("pointerup", up)

        stage.addEventListener("pointercancel", up)

        stage.addEventListener("wheel", wheel, { passive: false })

        window.addEventListener("keydown", key)

        return () => {

            stage.removeEventListener("pointerdown", down)

            stage.removeEventListener("pointermove", move)

            stage.removeEventListener("pointerup", up)

            stage.removeEventListener("pointercancel", up)

            stage.removeEventListener("wheel", wheel)

            window.removeEventListener("keydown", key)
        }
    }, [camera])

    return (
        <div className={`stage ${showCells ? "show-cells" : ""}`} ref={stageRef} aria-label="Board">
            <div className="grain" ref={grainRef} style={{ backgroundImage: `url(${grainUrl})` }} aria-hidden />
            <div className="rules" ref={rulesRef} aria-hidden />
            {camera && showCells && <CellNumbers camera={camera} />}

            <div className="scene" ref={sceneRef}>
                <div className="haze" aria-hidden />
                {info && !info.open && <ProjectChooser info={info} />}
                {info?.open && !state.items.length && !state.agentActive && <AgentPrompt />}
                <Links links={state.links} anchors={anchors} style="chalk" />
                {state.items.map(item => <BoardItem key={item.id} item={item} focused={item.id === waiting?.id} />)}
                <Links links={state.links} anchors={anchors} style="thread" />
                <Marks marks={state.marks} anchors={anchors} />
                {waitingRect && <QuestionPointer avatar={state.avatar} target={waitingRect} />}
                <Avatar avatar={state.avatar} asking={!!waiting} />
            </div>

            {camera && (
                <div className="toolbar glass" role="toolbar" aria-label="Board controls">
                    <button className="tool" type="button" title="Zoom out (−)" aria-label="Zoom out" onClick={() => { setAuto(false); camera.zoomCenter(1 / 1.2) }}><Icon d="M3.5 8h9" /></button>
                    <ZoomLabel camera={camera} onZoom={() => setAuto(false)} />
                    <button className="tool" type="button" title="Zoom in (+)" aria-label="Zoom in" onClick={() => { setAuto(false); camera.zoomCenter(1.2) }}><Icon d="M3.5 8h9M8 3.5v9" /></button>
                    <span className="separator" />
                    <button className="tool" type="button" aria-pressed={auto} title={auto ? "Keeping the whole board in view (Shift+1)" : "Show the whole board and keep it in view (Shift+1)"} aria-label="Fit everything" onClick={() => { setFollow(false); setAuto(true); frame() }}><Icon d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></button>
                    <button className="tool" type="button" aria-pressed={follow} title="Follow the avatar" aria-label="Follow the avatar" onClick={() => { if (!follow) setAuto(false); setFollow(!follow) }}><Icon d="M8 2.9a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 1 1 0-7.2M5 10.5 4 14M11 10.5l1 3.5" /></button>
                    <span className="separator" />
                    <button className="tool" type="button" aria-pressed={showCells} title="Show cell numbers" aria-label="Show cell numbers" onClick={() => setShowCells(!showCells)}><Icon d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" width={1.4} /></button>
                    <button className="tool" type="button" aria-pressed={soundOn} title={soundOn ? "Sound on" : "Sound off"} aria-label="Sound" onClick={() => sound.setEnabled(!soundOn)}><Icon d={soundOn ? "M2.5 6.2h2.3L8 3.5v9L4.8 9.8H2.5zM10.6 5.6a3.4 3.4 0 0 1 0 4.8M12.4 3.9a5.8 5.8 0 0 1 0 8.2" : "M2.5 6.2h2.3L8 3.5v9L4.8 9.8H2.5zM10.5 6l3.5 4M14 6l-3.5 4"} /></button>
                    <button className="tool font-tool" type="button" data-panel-toggle aria-pressed={showFonts} title="Handwriting" aria-label="Handwriting" onClick={() => { setShowFonts(!showFonts); setShowColors(false); setShowCharacters(false) }}>Aa</button>
                    <button className="tool" type="button" data-panel-toggle aria-pressed={showCharacters} title="Character" aria-label="Character" onClick={() => { setShowCharacters(!showCharacters); setShowColors(false); setShowFonts(false) }}><Icon d="M8 2.6a5.4 5.4 0 1 1 0 10.8a5.4 5.4 0 1 1 0-10.8M6 6.6v.6M10 6.6v.6M5.8 9.6c1.2 1.3 3.2 1.3 4.4 0" /></button>
                    <button className="tool" type="button" data-panel-toggle aria-pressed={showColors} title="Chalk colors" aria-label="Chalk colors" onClick={() => { setShowColors(!showColors); setShowCharacters(false); setShowFonts(false) }}><Icon d="M5.5 3.1a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8M10.5 3.1a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8M8 8.1a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8" /></button>
                </div>
            )}

            {camera && waitingRect && <QuestionBeacon camera={camera} target={waitingRect} />}

            {showFonts && <FontPicker current={font} onChosen={id => { setFont(id); setShowFonts(false) }} />}

            {showCharacters && <CharacterPicker current={state.avatar.character} onChosen={() => setShowCharacters(false)} />}

            {showColors && (
                <div className="legend glass">
                    <h2>Chalk colors</h2>
                    <div className="chips">
                        {chalkColors.map(color => <span key={color} className="chip"><i style={{ background: `var(--chalk-${color})` }} />{color} · {colorMeanings[color]}</span>)}
                    </div>
                    <p className="hint">Drag or scroll to move the board. Pinch or ⌘ + scroll to zoom.</p>
                </div>
            )}
        </div>
    )
})

function useCamera(camera: Camera) {

    return useSyncExternalStore(listener => camera.onChange(listener), () => `${camera.x}|${camera.y}|${camera.k}`)
}

function ZoomLabel({ camera, onZoom }: { camera: Camera, onZoom: () => void }) {

    useCamera(camera)

    return <button className="tool zoom" type="button" title="Back to 100% (0)" onClick={() => { onZoom(); camera.zoomCenter(1 / camera.k) }}>{Math.round(camera.k * 100)}%</button>
}

function CellNumbers({ camera }: { camera: Camera }) {

    useCamera(camera)

    const size = cellSize * camera.k, stage = camera.openArea()

    const width = stage.width, height = stage.y + stage.height + 400

    const cols: number[] = [], rows: number[] = []

    for (let col = Math.floor(-camera.x / size); col <= Math.ceil((width - camera.x) / size); col++) cols.push(col)

    for (let row = Math.floor(-camera.y / size); row <= Math.ceil((height - camera.y) / size); row++) rows.push(row)

    return (
        <div className="cell-numbers" aria-hidden>
            {cols.map(col => <span key={`c${col}`} style={{ left: camera.x + col * size + 5, top: 6 }}>{col}</span>)}
            {rows.map(row => <span key={`r${row}`} style={{ left: 6, top: camera.y + row * size + 5 }}>{row}</span>)}
        </div>
    )
}

function Icon({ d, width = 1.5 }: { d: string, width?: number }) {

    return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}

// The written area in board pixels, measured from layout (unaffected by zoom).
function contentRect(scene: HTMLElement): Rect | undefined {

    const elements = scene.querySelectorAll<HTMLElement>("[data-item]:not(.ghost), [data-avatar]")

    if (scene.querySelectorAll("[data-item]:not(.ghost)").length === 0) return undefined

    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity

    for (const element of elements) {

        left = Math.min(left, element.offsetLeft)

        top = Math.min(top, element.offsetTop)

        right = Math.max(right, element.offsetLeft + element.offsetWidth)

        bottom = Math.max(bottom, element.offsetTop + element.offsetHeight)
    }

    // The speech bubble floats outside the avatar's own box.
    const avatar = scene.querySelector<HTMLElement>("[data-avatar]"), bubble = avatar?.querySelector<HTMLElement>(".bubble")

    if (avatar && bubble) {

        left = Math.min(left, avatar.offsetLeft + bubble.offsetLeft - bubble.offsetWidth * 0.3)

        top = Math.min(top, avatar.offsetTop + bubble.offsetTop)

        right = Math.max(right, avatar.offsetLeft + bubble.offsetLeft + bubble.offsetWidth * 0.7)
    }

    return { x: left - 40, y: top - 40, width: right - left + 80, height: bottom - top + 80 }
}

// Chalk dust: a small random tile that moves and scales with the board.
function makeGrain() {

    const canvas = document.createElement("canvas")

    canvas.width = canvas.height = 240

    const context = canvas.getContext("2d")!

    const image = context.createImageData(240, 240)

    for (let index = 0; index < image.data.length; index += 4) {

        const value = Math.random()

        image.data[index] = image.data[index + 1] = image.data[index + 2] = 236

        image.data[index + 3] = value > 0.985 ? 24 : value > 0.9 ? 9 : 3
    }

    context.putImageData(image, 0, 0)

    return canvas.toDataURL()
}
