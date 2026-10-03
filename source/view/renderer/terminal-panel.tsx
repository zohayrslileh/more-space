import { forwardRef, useEffect, useRef } from "react"
import { WebglAddon } from "@xterm/addon-webgl"
import { FitAddon } from "@xterm/addon-fit"
import { Terminal } from "@xterm/xterm"
import { bridge } from "./bridge"

const theme = {
    // Nearly transparent, in the glass color: the WebGL renderer bakes dim text onto this color,
    // and fully transparent black would come out as black boxes behind it.
    background: "rgba(26, 29, 28, 0.01)",
    foreground: "#d6dbd6",
    cursor: "#f1d880",
    cursorAccent: "#161817",
    selectionBackground: "rgba(241, 216, 128, 0.25)",
    black: "#2a2f2d",
    red: "#f0a5b6",
    green: "#a9dca2",
    yellow: "#f1d880",
    blue: "#9fcbec",
    magenta: "#d7b4f0",
    cyan: "#9fe0d8",
    white: "#d6dbd6",
    brightBlack: "#6f7672",
    brightRed: "#f6bfcc",
    brightGreen: "#c2eabc",
    brightYellow: "#f7e6a8",
    brightBlue: "#c0dcf3",
    brightMagenta: "#e6cdf7",
    brightCyan: "#c0ece6",
    brightWhite: "#f3f4f0"
}

// Space between the glass edge and the text, the same on every side.
const gutter = 20

// The real shell, floating over the board as glass.
interface TerminalPanelProps {

    height: number

    pinned: boolean

    // An unpinned panel is shown only while revealed.
    shown: boolean

    onTogglePinned: () => void

    onPointerEnter: () => void

    onPointerLeave: () => void

    onResizeStart: (event: React.PointerEvent) => void
}

export const TerminalPanel = forwardRef<HTMLElement, TerminalPanelProps>(
    function TerminalPanel(props, ref) {

        const { height, pinned, shown, onResizeStart } = props

        const hostRef = useRef<HTMLDivElement>(null)

        useEffect(() => {

            const terminal = new Terminal({
                allowTransparency: true,
                fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
                fontSize: 13,
                lineHeight: 1.25,
                cursorBlink: true,
                macOptionIsMeta: true,
                scrollback: 5000,
                theme
            })

            const fit = new FitAddon()

            terminal.loadAddon(fit)

            let id: string | undefined

            let disposed = false

            let ended = false

            const start = async () => {

                layout()

                ended = false

                id = await bridge.terminal.open({ cols: terminal.cols, rows: terminal.rows })
            }

            const offData = bridge.terminal.onData((from, data) => { if (from === id) terminal.write(data) })

            const offExit = bridge.terminal.onExit(from => {

                if (from !== id) return

                ended = true

                terminal.write("\r\n\x1b[2m[shell ended — press any key for a new one]\x1b[0m\r\n")
            })

            terminal.onData(data => {

                if (ended) { terminal.reset(); start(); return }

                if (id) bridge.terminal.write(id, data)
            })

            terminal.onResize(size => { if (id) bridge.terminal.resize(id, size) })

            // Rows and columns come in whole cells, so some space is always left over.
            // Size the grid to the space inside the gutter, then split the leftover evenly
            // so all four sides match. The scrollbar floats inside the right gutter.
            const layout = () => {

                const element = terminal.element, host = hostRef.current

                const screen = element?.querySelector<HTMLElement>(".xterm-screen")

                if (disposed || !element || !host || !screen) return

                if (!screen.offsetWidth) { element.style.padding = `${gutter}px`; fit.fit() }

                const cellWidth = screen.offsetWidth / terminal.cols, cellHeight = screen.offsetHeight / terminal.rows

                const width = host.clientWidth - gutter * 2, height = host.clientHeight - gutter * 2

                const cols = Math.max(2, Math.floor(width / cellWidth)), rows = Math.max(1, Math.floor(height / cellHeight))

                if (cols !== terminal.cols || rows !== terminal.rows) terminal.resize(cols, rows)

                const extraX = Math.max(0, width - cols * cellWidth), extraY = Math.max(0, height - rows * cellHeight)

                element.style.padding = `${gutter + extraY / 2}px ${gutter + extraX / 2}px`
            }

            // At most one re-layout per frame, however fast the panel is being resized.
            let pending = 0

            const resize = new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(layout) })

            document.fonts.load("13px 'JetBrains Mono'").finally(() => {

                if (disposed) return

                terminal.open(hostRef.current!)

                // Draw with WebGL instead of DOM rows; fall back to the DOM renderer if the context is lost.
                try {

                    const webgl = new WebglAddon()

                    webgl.onContextLoss(() => webgl.dispose())

                    terminal.loadAddon(webgl)
                }

                catch { }

                resize.observe(hostRef.current!)

                start().then(() => terminal.focus())
            })

            return () => { disposed = true; resize.disconnect(); offData(); offExit(); terminal.dispose() }
        }, [])

        return (
            <section
                className={`terminal-panel glass ${shown ? "" : "hidden"}`}
                ref={ref}
                style={{ height }}
                aria-label="Terminal"
                onPointerEnter={props.onPointerEnter}
                onPointerLeave={props.onPointerLeave}
            >
                <div className="terminal-grip" onPointerDown={onResizeStart} title="Drag to resize" />
                <div className="terminal-actions">
                    <button className="terminal-action" type="button" aria-pressed={pinned} title={pinned ? "Unpin: hide until the pointer reaches the bottom" : "Pin: keep the terminal in view"} aria-label="Pin terminal" onClick={props.onTogglePinned}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 2.5h4M6.6 2.5v3.6L4.5 9h7l-2.1-2.9V2.5M8 9v4.5" /></svg>
                    </button>
                </div>
                <div className="terminal-host" ref={hostRef} />
            </section>
        )
    }
)
