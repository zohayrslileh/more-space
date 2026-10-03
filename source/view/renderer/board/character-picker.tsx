import { characters } from "@/core/avatar/characters"
import { useEffect, useState } from "react"
import { CharacterFigure } from "./characters"
import { bridge } from "../bridge"
import { sound } from "../sound"

// The gallery of characters. Each card plays through its moods so the user sees the whole character.
// Picking one closes the gallery.
export function CharacterPicker({ current, onChosen }: { current: string, onChosen: () => void }) {

    return (
        <div className="character-picker glass" role="dialog" aria-label="Choose a character">
            <h2>Character</h2>
            <p className="hint">Who your agent is on the board. The same in every project.</p>
            <div className="character-grid">
                {characters.map(character => (
                    <button
                        key={character.id}
                        type="button"
                        className={`character-card ${character.id === current ? "chosen" : ""}`}
                        aria-pressed={character.id === current}
                        onClick={() => { bridge.chooseCharacter(character.id); sound.voice(character.id, "happy"); onChosen() }}
                    >
                        <MoodReel id={character.id} moods={character.moods.map(mood => mood.name)} />
                        <span className="name">{character.name}</span>
                        <span className="personality">{character.personality}</span>
                        <span className="moods">{character.moods.map(mood => mood.name).join(" · ")}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

function MoodReel({ id, moods }: { id: string, moods: string[] }) {

    const [index, setIndex] = useState(0)

    useEffect(() => {

        const timer = setInterval(() => setIndex(index => (index + 1) % moods.length), 1300)

        return () => clearInterval(timer)
    }, [moods.length])

    return (
        <span className="reel">
            <CharacterFigure character={id} mood={moods[index]!} asking={false} />
            <span className="reel-mood">{moods[index]}</span>
        </span>
    )
}
