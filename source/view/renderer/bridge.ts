import type { Bridge } from "@/view/desktop/bridge-types"

declare global {

    interface Window { bridge: Bridge }
}

export const bridge = window.bridge
