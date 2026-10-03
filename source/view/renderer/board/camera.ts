import { cellSize, type Viewport } from "@/core/board/board-types"

export interface Rect { x: number, y: number, width: number, height: number }

export interface CameraElements {

    stage: HTMLElement

    scene: HTMLElement

    rules: HTMLElement

    grain: HTMLElement
}

const minZoom = 0.2

const maxZoom = 3

const grainTile = 240

// Where the user looks on the endless board. Moves the scene by transform only,
// so panning never re-renders what is written.
export default class Camera {

    public x = 0

    public y = 0

    public k = 1

    private animation = 0

    private readonly listeners = new Set<() => void>()

    constructor(
        private readonly elements: CameraElements,
        // Space at the top and bottom covered by floating controls.
        private readonly insets: () => { top: number, bottom: number }
    ) { }

    public onChange(listener: () => void) {

        this.listeners.add(listener)

        return () => { this.listeners.delete(listener) }
    }

    public apply() {

        const { scene, rules, grain } = this.elements

        scene.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`

        rules.style.backgroundSize = `${cellSize * this.k}px ${cellSize * this.k}px`

        rules.style.backgroundPosition = `${this.x}px ${this.y}px`

        grain.style.backgroundSize = `${grainTile * this.k}px`

        grain.style.backgroundPosition = `${this.x}px ${this.y}px`

        for (const listener of this.listeners) listener()
    }

    // The part of the stage not hidden by the toolbar and the terminal.
    public openArea(): Rect {

        const width = this.elements.stage.clientWidth, height = this.elements.stage.clientHeight

        const { top, bottom } = this.insets()

        return { x: 0, y: top, width, height: Math.max(120, height - top - bottom) }
    }

    public visibleCells(): Viewport {

        const area = this.openArea(), size = cellSize * this.k

        const col = Math.ceil((area.x - this.x) / size), row = Math.ceil((area.y - this.y) / size)

        const lastCol = Math.floor((area.x + area.width - this.x) / size) - 1

        const lastRow = Math.floor((area.y + area.height - this.y) / size) - 1

        return { col, row, cols: Math.max(1, lastCol - col + 1), rows: Math.max(1, lastRow - row + 1) }
    }

    public panBy(dx: number, dy: number) {

        this.stop()

        this.x += dx

        this.y += dy

        this.apply()
    }

    public zoomAt(cx: number, cy: number, factor: number) {

        this.stop()

        const k = clamp(this.k * factor, minZoom, maxZoom)

        this.x = cx - (cx - this.x) * (k / this.k)

        this.y = cy - (cy - this.y) * (k / this.k)

        this.k = k

        this.apply()
    }

    public zoomCenter(factor: number) {

        const area = this.openArea()

        this.zoomAt(area.x + area.width / 2, area.y + area.height / 2, factor)
    }

    // Centers a board point (in board pixels) in the open area.
    public centerOn(px: number, py: number, k = this.k, animate = true) {

        const area = this.openArea()

        k = clamp(k, minZoom, maxZoom)

        this.glide(area.x + area.width / 2 - px * k, area.y + area.height / 2 - py * k, k, animate)
    }

    // The zoom at which a board rect fills the open area, with a little air.
    public scaleToFit(rect: Rect) {

        const area = this.openArea()

        return clamp(Math.min(area.width / rect.width, area.height / rect.height) * 0.9, minZoom, maxZoom)
    }

    // Returns to an exact earlier view.
    public moveTo(x: number, y: number, k: number, animate = true) {

        this.glide(x, y, k, animate)
    }

    // closest: never zoom in further than this while fitting.
    public fit(rect: Rect, animate = true, closest = 1.4) {

        this.centerOn(rect.x + rect.width / 2, rect.y + rect.height / 2, Math.min(this.scaleToFit(rect), closest), animate)
    }

    // The board rect the user currently sees.
    public viewRect(): Rect {

        const area = this.openArea()

        return { x: (area.x - this.x) / this.k, y: (area.y - this.y) / this.k, width: area.width / this.k, height: area.height / this.k }
    }

    // Brings a board rect into view with the least movement: a pan if it fits at this zoom,
    // otherwise zooming out just enough to keep both what was seen and the rect.
    public reveal(rect: Rect, air = 90) {

        const view = this.viewRect()

        // Entirely out of sight: a minimal pan would leave it on the edge, so center it instead.
        const outside = rect.x > view.x + view.width || rect.x + rect.width < view.x || rect.y > view.y + view.height || rect.y + rect.height < view.y

        if (outside && rect.width + air * 2 <= view.width && rect.height + air * 2 <= view.height) return this.centerOn(rect.x + rect.width / 2, rect.y + rect.height / 2)

        const target = { x: rect.x - air, y: rect.y - air, width: rect.width + air * 2, height: rect.height + air * 2 }

        const inside = target.x >= view.x && target.y >= view.y && target.x + target.width <= view.x + view.width && target.y + target.height <= view.y + view.height

        if (inside) return

        if (target.width <= view.width && target.height <= view.height) {

            const shift = (start: number, size: number, viewStart: number, viewSize: number) =>
                start < viewStart ? start - viewStart : start + size > viewStart + viewSize ? start + size - (viewStart + viewSize) : 0

            const dx = shift(target.x, target.width, view.x, view.width), dy = shift(target.y, target.height, view.y, view.height)

            return this.centerOn(view.x + view.width / 2 + dx, view.y + view.height / 2 + dy)
        }

        const left = Math.min(view.x, target.x), top = Math.min(view.y, target.y)

        const union = { x: left, y: top, width: Math.max(view.x + view.width, target.x + target.width) - left, height: Math.max(view.y + view.height, target.y + target.height) - top }

        this.fit(union, true, this.k)
    }

    public stop() {

        cancelAnimationFrame(this.animation)
    }

    private glide(x: number, y: number, k: number, animate: boolean) {

        this.stop()

        if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {

            Object.assign(this, { x, y, k })

            return this.apply()
        }

        const from = { x: this.x, y: this.y, k: this.k }, start = performance.now(), duration = 420

        const step = (now: number) => {

            const t = Math.min(1, (now - start) / duration), e = 1 - Math.pow(1 - t, 3)

            this.x = from.x + (x - from.x) * e

            this.y = from.y + (y - from.y) * e

            this.k = from.k + (k - from.k) * e

            this.apply()

            if (t < 1) this.animation = requestAnimationFrame(step)
        }

        this.animation = requestAnimationFrame(step)
    }
}

function clamp(value: number, min: number, max: number) {

    return Math.max(min, Math.min(max, value))
}
