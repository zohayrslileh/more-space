import { useEffect } from "react"
import { defaultFont } from "@/core/settings/defaults"
import { bridge } from "../bridge"

// The handwritings the board can be written in. All stay close to chalk; all ship with the app.
export const fonts = [
    { id: "patrick-hand", name: "Patrick Hand", family: "\"Patrick Hand\"" },
    { id: "caveat", name: "Caveat", family: "\"Caveat\"" },
    { id: "schoolbell", name: "Schoolbell", family: "\"Schoolbell\"" },
    { id: "kalam", name: "Kalam", family: "\"Kalam\"" },
    { id: "gochi-hand", name: "Gochi Hand", family: "\"Gochi Hand\"" },
    { id: "architects-daughter", name: "Architects Daughter", family: "\"Architects Daughter\"" }
]

const fallback = "\"Bradley Hand\", cursive"

// Writes the board in a font: sets the chalk font token, then lets the board re-measure its items
// once the font has loaded, since every piece of writing changes size.
export function applyFont(id: string) {

    const font = fonts.find(font => font.id === id) ?? fonts.find(font => font.id === defaultFont)!

    document.documentElement.style.setProperty("--f-chalk", `${font.family}, ${fallback}`)

    document.fonts.load(`36px ${font.family}`).finally(() => {

        document.querySelector(".scene")?.dispatchEvent(new Event("board-layout"))
    })
}

export function useBoardFont() {

    useEffect(() => { bridge.font().then(applyFont) }, [])
}

export function FontPicker({ current, onChosen }: { current: string, onChosen: (id: string) => void }) {

    return (
        <div className="font-picker glass" role="dialog" aria-label="Choose the handwriting">
            <h2>Handwriting</h2>
            {fonts.map(font => (
                <button
                    key={font.id}
                    type="button"
                    className={`font-option ${font.id === current ? "chosen" : ""}`}
                    aria-pressed={font.id === current}
                    onClick={() => { applyFont(font.id); bridge.chooseFont(font.id); onChosen(font.id) }}
                >
                    <span className="sample" style={{ fontFamily: `${font.family}, ${fallback}` }}>Refactor the auth flow</span>
                    <span className="label">{font.name}</span>
                </button>
            ))}
        </div>
    )
}
