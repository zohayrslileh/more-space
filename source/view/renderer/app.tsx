import type { BoardState } from "@/core/board/board-types"
import { useCallback, useEffect, useRef, useState } from "react"
import { TerminalPanel } from "./terminal-panel"
import { Stage } from "./board/stage"
import { title } from "@/libs/identity"
import type { ProjectInfo } from "@/view/desktop/bridge-types"
import { bridge } from "./bridge"

// Gap between floating elements and between them and the window edge (matches --float-gap).
const floatGap = 16

// An unpinned terminal hides this long after the pointer leaves it.
const hideDelay = 500

export default function App() {

    const [state, setState] = useState<BoardState>()

    const [info, setInfo] = useState<ProjectInfo>()

    const [terminalHeight, setTerminalHeight] = useState(() => Math.round(Math.min(window.innerHeight * 0.36, 320)))

    const [pinned, setPinned] = useState(true)

    const [revealed, setRevealed] = useState(false)


    const terminalRef = useRef<HTMLElement>(null)

    const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

    const shown = pinned || revealed

    useEffect(() => {

        bridge.board.state().then(setState)

        bridge.info().then(setInfo)

        const offInfo = bridge.onInfo(setInfo)

        const offState = bridge.board.onState(setState)

        // The terminal's program wants the user: show the terminal even when it is tucked away.
        // (The character is what tells the state; the terminal itself shows no indicator.)
        const offActivity = bridge.terminal.onActivity((_, next) => {

            if (next === "attention") { clearTimeout(hideTimer.current); setRevealed(true) }
        })

        return () => { offInfo(); offState(); offActivity() }
    }, [])

    // What the board must keep clear at the bottom: the terminal only while it is pinned.
    const layout = useRef({ pinned })

    layout.current.pinned = pinned

    const bottomInset = useCallback(() => layout.current.pinned && terminalRef.current ? terminalRef.current.offsetHeight + floatGap * 2 : floatGap, [])

    const reveal = () => { clearTimeout(hideTimer.current); setRevealed(true) }

    const hideSoon = () => {

        if (pinned) return

        clearTimeout(hideTimer.current)

        hideTimer.current = setTimeout(() => setRevealed(false), hideDelay)
    }

    // The terminal may grow up to the toolbar, keeping the same gap as everything floating.
    const tallest = () => {

        const workspace = terminalRef.current?.parentElement, styles = getComputedStyle(document.documentElement)

        const value = (name: string) => parseFloat(styles.getPropertyValue(name)) || 0

        return (workspace?.clientHeight ?? window.innerHeight) - value("--toolbar-top") - value("--toolbar-height") - value("--float-gap") * 2
    }

    // Dragging the grip moves the panel's edge directly, frame by frame, without re-rendering the app;
    // the height is stored once, on release. No height animation while dragging.
    const startResize = (event: React.PointerEvent) => {

        const panel = terminalRef.current

        if (!panel) return

        const grip = event.currentTarget as HTMLElement, startY = event.clientY, startHeight = panel.offsetHeight

        let height = startHeight, frame = 0

        panel.classList.add("resizing")

        panel.style.height = `${startHeight}px`

        grip.setPointerCapture(event.pointerId)

        const move = (moveEvent: PointerEvent) => {

            height = Math.round(Math.max(120, Math.min(tallest(), startHeight + startY - moveEvent.clientY)))

            cancelAnimationFrame(frame)

            frame = requestAnimationFrame(() => { panel.style.height = `${height}px` })
        }

        const up = () => {

            cancelAnimationFrame(frame)

            panel.style.height = `${height}px`

            panel.classList.remove("resizing")

            grip.removeEventListener("pointermove", move)

            grip.removeEventListener("pointerup", up)

            grip.removeEventListener("pointercancel", up)

            setTerminalHeight(height)
        }

        grip.addEventListener("pointermove", move)

        grip.addEventListener("pointerup", up)

        grip.addEventListener("pointercancel", up)
    }

    const togglePinned = () => {

        setPinned(!pinned)

        setRevealed(pinned)
    }

    return (
        <div className="window">
            <header className="titlebar">
                <span className="title" title={info?.path}>
                    <b>{title}</b>
                    {info && <><span className="divider">/</span><button type="button" className="project" title="Open another project" onClick={() => bridge.chooseProject()}>{info.open ? info.project : "Choose a project"}</button></>}
                    {info?.branch && <><span className="divider">/</span><span className="branch"><BranchIcon />{info.branch}</span></>}
                </span>
            </header>
            <main className="workspace">
                {state && <Stage state={state} info={info} bottomInset={bottomInset} />}
                {info?.open && !pinned && <div className="terminal-reveal-zone" onPointerEnter={reveal} aria-hidden />}
                {/* No shell until there is a project to open it in. */}
                {info?.open && <TerminalPanel
                    ref={terminalRef}
                    height={terminalHeight}
                    pinned={pinned}
                    shown={shown}
                    onTogglePinned={togglePinned}
                    onPointerEnter={reveal}
                    onPointerLeave={hideSoon}
                    onResizeStart={startResize}
                />}
            </main>
        </div>
    )
}

function BranchIcon() {

    return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden><circle cx="4.5" cy="3.5" r="1.6" /><circle cx="4.5" cy="12.5" r="1.6" /><circle cx="11.5" cy="5.5" r="1.6" /><path d="M4.5 5.1v5.8M11.5 7.1c0 2.6-2.4 3-7 3.8" /></svg>
}
