import { assetScheme, cellSize, pinnedKinds, type AskItem, type FlowItem, type ImageItem, type Item, type NoteItem, type StepsItem, type TextItem } from "@/core/board/board-types"
import { Chalked, paceFor, useFresh } from "./writing"
import { roughArrow, roughLoop, roughRect, seeded } from "../chalk"
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { bridge } from "../bridge"
import { sound } from "../sound"

// focused: the waiting question the avatar points at; only it gets circled.
export function BoardItem({ item, focused = false }: { item: Item, focused?: boolean }) {

    const fresh = useFresh(item.createdAt)

    const wasErased = useRef(!!item.erasedAt)

    const element = useRef<HTMLDivElement>(null)

    // The moment of erasing: chalk dust flies off, then only a faint trace remains.
    const [dust, setDust] = useState<{ width: number, height: number }>()

    useEffect(() => {

        if (!fresh) return

        if (pinnedKinds.includes(item.kind)) return sound.pin()

        sound.write(writingSeconds(item))

        if (item.kind === "ask") sound.question()
    }, [])

    useEffect(() => {

        if (item.erasedAt && !wasErased.current) {

            sound.erase()

            const box = element.current

            if (box) setDust({ width: box.offsetWidth, height: box.offsetHeight })

            const timer = setTimeout(() => setDust(undefined), 1600)

            wasErased.current = true

            return () => clearTimeout(timer)
        }

        wasErased.current = !!item.erasedAt
    }, [item.erasedAt])

    const style = { left: item.col * cellSize, top: item.row * cellSize }

    // Photos and notes are physical things pinned to the board, not chalk.
    const material = pinnedKinds.includes(item.kind) ? `pinned-item ${fresh ? "pinning" : ""}` : `chalk c-${item.color}`

    const className = `item ${material} ${item.erasedAt ? "ghost" : ""}`

    return (
        <>
        {dust && <Dust id={item.id} color={item.color} style={{ ...style, ...dust }} />}
        <div className={className} style={style} data-item={item.id} ref={element}>
            {item.kind === "text" && <Text item={item} animate={fresh} />}
            {item.kind === "steps" && <Steps item={item} animate={fresh} />}
            {item.kind === "flow" && <Flow item={item} animate={fresh} />}
            {item.kind === "ask" && <Ask item={item} animate={fresh} focused={focused} />}
            {item.kind === "image" && <Photo item={item} />}
            {item.kind === "note" && <Note item={item} />}
        </div>
        </>
    )
}

// Specks of chalk knocked off by the eraser, drifting the way it moved.
function Dust({ id, color, style }: { id: string, color: string, style: CSSProperties }) {

    const random = seeded(`${id}-dust`)

    const specks = Array.from({ length: 22 }, () => ({
        left: `${random() * 100}%`,
        top: `${random() * 100}%`,
        size: 2 + random() * 4,
        dx: 30 + random() * 90,
        dy: (random() - 0.5) * 70,
        delay: random() * 0.35
    }))

    return (
        <div className={`dust c-${color}`} style={style} aria-hidden>
            {specks.map((speck, index) => (
                <i key={index} style={{ left: speck.left, top: speck.top, width: speck.size, height: speck.size, animationDelay: `${speck.delay}s`, "--dx": `${speck.dx}px`, "--dy": `${speck.dy}px` } as CSSProperties} />
            ))}
        </div>
    )
}

function Text({ item, animate }: { item: TextItem, animate: boolean }) {

    // --width is where the text wraps at most; the box still shrinks to the words.
    const maxWidth = (item.width ?? 8) * cellSize

    return (
        <div className={`text size-${item.size}`} style={{ maxWidth }}>
            <Chalked text={item.text} pace={paceFor(item.text.length)} animate={animate} />
        </div>
    )
}

const stepMarks = { done: "✓", now: "→", todo: "○" }

// Steps are written top to bottom, mark first, then the words.
function Steps({ item, animate }: { item: StepsItem, animate: boolean }) {

    const pace = paceFor(item.steps.reduce((sum, step) => sum + step.text.length + 2, 0))

    let delay = 0

    return (
        <ol className="steps">
            {item.steps.map((step, index) => {

                const start = delay

                delay += (step.text.length + 2) * pace.perCharacter

                return (
                    <li key={index} className={step.state}>
                        <span className="mark"><Chalked text={stepMarks[step.state]} delay={start} pace={pace} animate={animate} /></span>
                        <span className={`label ${animate ? "strike-later" : ""}`} style={{ "--strike-delay": `${delay}s` } as CSSProperties}>
                            <Chalked text={step.text} delay={start + pace.perCharacter * 2} pace={pace} animate={animate} />
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}

// How long the hand is busy writing this item, for the chalk sound.
function writingSeconds(item: Item) {

    if (item.kind === "flow") return item.nodes.length * (boxSeconds + labelSeconds + arrowSeconds) - arrowSeconds

    if (item.kind === "image" || item.kind === "note") return 0

    const characters = item.kind === "text" ? item.text.length
        : item.kind === "steps" ? item.steps.reduce((sum, step) => sum + step.text.length + 2, 0)
        : item.question.length

    return characters * paceFor(characters).perCharacter
}

const flowFont = 30

const flowHeight = 84

const flowGap = 76

// Each box is outlined, then labeled, then the arrow to the next one is drawn.
const boxSeconds = 0.42

const labelSeconds = 0.3

const arrowSeconds = 0.25

function Flow({ item, animate }: { item: FlowItem, animate: boolean }) {

    const random = seeded(item.id)

    const widths = item.nodes.map(node => Math.max(110, node.length * flowFont * 0.46 + 52))

    const xs = widths.reduce<number[]>((positions, _, index) => [...positions, index ? positions[index - 1]! + widths[index - 1]! + flowGap : 6], [])

    const total = xs.at(-1)! + widths.at(-1)! + 6

    const y = 6, middle = y + flowHeight / 2

    const step = boxSeconds + labelSeconds + arrowSeconds

    const timing = (delay: number, duration: number) => animate ? { animationDelay: `${delay}s`, animationDuration: `${duration}s` } : undefined

    return (
        <svg className={`flow ${animate ? "drawing" : ""}`} width={total} height={flowHeight + 12} viewBox={`0 0 ${total} ${flowHeight + 12}`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            {item.nodes.map((node, index) => {

                const focused = index === item.focus

                const x = xs[index]!, width = widths[index]!, start = index * step

                return (
                    <g key={index} className={focused ? "c-yellow" : undefined}>
                        <path className="stroke" pathLength={1} d={roughRect(x, y, width, flowHeight, random)} style={timing(start, boxSeconds)} />
                        <text className="label" x={x + width / 2} y={middle + flowFont * 0.33} fontSize={flowFont} textAnchor="middle" fill="currentColor" stroke="none" style={timing(start + boxSeconds, labelSeconds)}>{node}</text>
                        {index < item.nodes.length - 1 && <path className="stroke arrow" pathLength={1} d={roughArrow(x + width + 10, middle, x + width + flowGap - 10, random)} style={timing(start + boxSeconds + labelSeconds, arrowSeconds)} />}
                    </g>
                )
            })}
        </svg>
    )
}

function Ask({ item, animate, focused }: { item: AskItem, animate: boolean, focused: boolean }) {

    const pace = paceFor(item.question.length)

    const optionsAt = item.question.length * pace.perCharacter

    const box = useRef<HTMLDivElement>(null)

    const [size, setSize] = useState<{ width: number, height: number }>()

    useLayoutEffect(() => {

        const element = box.current!

        const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight })

        measure()

        const observer = new ResizeObserver(measure)

        observer.observe(element)

        return () => observer.disconnect()
    }, [])

    // Several waiting questions would crowd the board with circles: only the one in focus is circled.
    const waiting = focused && !item.answer && !item.erasedAt

    // Circled once, after the choices are written, and left as it is: chalk does not move.
    const circleAt = animate ? optionsAt + item.options.length * 0.18 + 0.3 : 0

    // An ellipse must be wider than the box it encloses or its curve cuts the corners.
    const marginX = size ? size.width * 0.12 + 18 : 0, marginY = size ? size.height * 0.35 + 16 : 0

    const send = (values: string[]) => bridge.board.answer(item.id, values).then(accepted => { if (accepted) sound.answer() })

    const appear = (index: number) => animate ? { className: "appear", style: { animationDelay: `${optionsAt + index * 0.18}s` } } : { className: "", style: undefined }

    return (
        <div className="ask" ref={box} onPointerDown={event => event.stopPropagation()}>
            {waiting && size && (
                <svg className="circled" style={{ left: -marginX, top: -marginY }} width={size.width + marginX * 2} height={size.height + marginY * 2} fill="none" stroke="var(--chalk-orange)" strokeWidth={3} strokeLinecap="round" aria-hidden>
                    <path pathLength={1} className={animate ? "draw-once" : undefined} style={animate ? { animationDelay: `${circleAt}s` } : undefined} d={roughLoop(size.width + marginX * 2 - 8, size.height + marginY * 2 - 8, seeded(item.id))} transform="translate(4 4)" />
                </svg>
            )}
            <div className="question"><Chalked text={item.question} pace={pace} animate={animate} /></div>
            {item.answer
                ? <div className="answer"><Chalked text={`✓ ${item.answer.join(", ")}`} pace={paceFor(item.answer.join(", ").length + 2)} animate={!item.erasedAt} /></div>
                : !item.erasedAt && <AskInput item={item} send={send} appear={appear} />}
        </div>
    )
}

type Appear = (index: number) => { className: string, style: CSSProperties | undefined }

// How the user answers, by kind of question. Everything is drawn as chalk on the board.
function AskInput({ item, send, appear }: { item: AskItem, send: (values: string[]) => void, appear: Appear }) {

    const [picked, setPicked] = useState<string[]>([])

    const [writing, setWriting] = useState(item.mode === "text")

    const [text, setText] = useState("")

    const field = useRef<HTMLTextAreaElement>(null)

    useEffect(() => { if (writing && item.mode !== "text") field.current?.focus() }, [writing])

    const submitText = () => {

        const value = text.trim()

        if (!value) return field.current?.focus()

        send(item.mode === "multi" ? [...picked, value] : [value])
    }

    const writtenField = (
        <div className="written">
            <textarea
                ref={field}
                className="chalk-field"
                rows={1}
                value={text}
                placeholder={item.mode === "text" ? "Write your answer…" : "Write your own…"}
                onChange={event => { setText(event.target.value); event.target.style.height = "auto"; event.target.style.height = `${event.target.scrollHeight}px` }}
                onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitText() } if (event.key === "Escape" && item.mode !== "text") setWriting(false) }}
            />
            <button type="button" className="option send" onClick={submitText}>Send</button>
        </div>
    )

    if (item.mode === "text") return writtenField

    if (item.mode === "scale") {

        const steps = Array.from({ length: item.scale ?? 5 }, (_, index) => String(index + 1))

        return (
            <div className="scale">
                {item.options[0] && <span className="scale-label">{item.options[0]}</span>}
                <div className="options">
                    {steps.map((step, index) => {

                        const { className, style } = appear(index)

                        return <button key={step} type="button" className={`option round ${className}`} style={style} onClick={() => send([step])}>{step}</button>
                    })}
                </div>
                {item.options[1] && <span className="scale-label">{item.options[1]}</span>}
            </div>
        )
    }

    const multi = item.mode === "multi"

    const toggle = (option: string) => setPicked(picked.includes(option) ? picked.filter(value => value !== option) : [...picked, option])

    return (
        <>
            <div className="options">
                {item.options.map((option, index) => {

                    const { className, style } = appear(index)

                    return (
                        <button
                            key={option}
                            type="button"
                            className={`option ${picked.includes(option) ? "picked" : ""} ${className}`}
                            style={style}
                            aria-pressed={multi ? picked.includes(option) : undefined}
                            onClick={() => multi ? toggle(option) : send([option])}
                        >
                            {multi && <span className="tick">{picked.includes(option) ? "✓" : "○"}</span>}{option}
                        </button>
                    )
                })}
                {item.other && !writing && (
                    <button type="button" className={`option other ${appear(item.options.length).className}`} style={appear(item.options.length).style} onClick={() => setWriting(true)}>Other…</button>
                )}
                {multi && !writing && (
                    <button type="button" className={`option send ${appear(item.options.length + 1).className}`} style={appear(item.options.length + 1).style} disabled={!picked.length} onClick={() => send(picked)}>Send</button>
                )}
            </div>
            {writing && writtenField}
        </>
    )
}

// Hangs from its pin: the photo turns a little around the pin point.
function Photo({ item }: { item: ImageItem }) {

    const tilt = (seeded(item.id)() - 0.5) * 7

    return (
        <div className="pinned-frame" style={{ width: item.width * cellSize }}>
            <figure className="pinned-body photo" style={{ transform: `rotate(${tilt}deg)` }}>
                <img src={`${assetScheme}://${item.asset}`} alt={item.caption ?? ""} draggable={false} onLoad={event => event.currentTarget.dispatchEvent(new Event("board-layout", { bubbles: true }))} />
                {item.caption && <figcaption>{item.caption}</figcaption>}
            </figure>
            <Thumbtack />
        </div>
    )
}

// A paper note in ink; the item's color is the paper's.
function Note({ item }: { item: NoteItem }) {

    const tilt = (seeded(item.id)() - 0.5) * 6

    return (
        <div className="pinned-frame" style={{ width: item.width * cellSize }}>
            <div className={`pinned-body note paper-${item.color}`} style={{ transform: `rotate(${tilt}deg)` }}>{item.text}</div>
            <Thumbtack />
        </div>
    )
}

export function Thumbtack() {

    return (
        <svg className="thumbtack" viewBox="0 0 24 24" aria-hidden>
            <ellipse cx="13" cy="15" rx="7" ry="3" fill="rgba(0,0,0,.35)" />
            <circle cx="12" cy="11" r="7.5" fill="#c9555a" />
            <circle cx="9.5" cy="8.5" r="2.2" fill="rgba(255,255,255,.55)" />
        </svg>
    )
}
