import type { ProjectInfo } from "@/view/desktop/bridge-types"
import { agentPrompt } from "@/core/onboarding/agent-prompt"
import { cellSize } from "@/core/board/board-types"

// The middle of the area a clean board opens on (13 × 7 cells, see stage.tsx).
const center = { x: 6.5 * cellSize, y: 3.5 * cellSize }
import { roughRect, seeded } from "../chalk"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { bridge } from "../bridge"

// What a clean board offers: without a project, a place to choose one; with a project,
// the words to give the agent so it starts by learning the board.

// A chalk frame around a short message. "centered": dashed, in the middle of the board, text centered
// (the project chooser). Otherwise a plain frame at the board's start, text to the left (the agent prompt).
function ChalkCard({ id, centered = false, children }: { id: string, centered?: boolean, children: ReactNode }) {

    const [size, setSize] = useState<{ width: number, height: number }>()

    const box = useRef<HTMLDivElement>(null)

    // The frame follows the card's real size: it changes when the chalk font finishes loading.
    useLayoutEffect(() => {

        const element = box.current!

        const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight })

        measure()

        const observer = new ResizeObserver(measure)

        observer.observe(element)

        return () => observer.disconnect()
    }, [])

    return (
        <div className={`onboard chalk ${centered ? "centered" : ""}`} style={centered ? { left: center.x, top: center.y } : { left: 0, top: cellSize, width: cellSize * 10 }} ref={box}>
            {size && (
                <svg className="onboard-frame" width={size.width} height={size.height} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
                    <path d={roughRect(6, 6, size.width - 12, size.height - 12, seeded(id))} strokeDasharray={centered ? "16 12" : undefined} />
                </svg>
            )}
            {children}
        </div>
    )
}

export function ProjectChooser({ info }: { info: ProjectInfo }) {

    return (
        <ChalkCard id="choose" centered>
            <button type="button" className="onboard-main" onClick={() => bridge.chooseProject()}>
                <span className="onboard-title">Open a project</span>
                <span className="onboard-note">Choose the folder you and your agent will work in.</span>
            </button>
            {info.recent.length > 0 && (
                <div className="onboard-recent">
                    <span className="onboard-label">Recent</span>
                    {info.recent.map(project => (
                        <button key={project.path} type="button" className="onboard-link" title={project.label} onClick={() => bridge.openProject(project.path)}>
                            <span className="name">{project.name}</span>
                            <span className="path">{project.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </ChalkCard>
    )
}

export function AgentPrompt() {

    const [copied, setCopied] = useState(false)

    const text = agentPrompt()

    const copy = () => bridge.copyText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })

    return (
        <ChalkCard id="prompt">
            <span className="onboard-title">Give this to your agent</span>
            <span className="onboard-note">Paste it into the agent in the terminal below, and it will start by learning the board.</span>
            <p className="onboard-prompt">{text}</p>
            <button type="button" className="option onboard-copy" onClick={copy}>{copied ? "✓ Copied: paste it to your agent" : "Copy"}</button>
        </ChalkCard>
    )
}
