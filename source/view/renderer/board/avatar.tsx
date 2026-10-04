import { avatarSpan, cellSize, type Avatar as AvatarState } from "@/core/board/board-types"
import { findCharacter } from "@/core/avatar/characters"
import { useEffect, useRef } from "react"
import { sound } from "../sound"
import { CharacterFigure } from "./characters"
import { Chalked, paceFor } from "./writing"

// The agent on the board: the character the user picked, in the mood the agent set.
// While a question waits for the user, it raises a hand, with a "!" beside it.
export function Avatar({ avatar, asking }: { avatar: AvatarState, asking: boolean }) {

    const size = { width: avatarSpan.cols * cellSize, height: avatarSpan.rows * cellSize }

    // The character speaks when its mood changes (not when the board first opens).
    const last = useRef(`${avatar.character}/${avatar.mood}`)

    useEffect(() => {

        const now = `${avatar.character}/${avatar.mood}`, before = last.current

        last.current = now

        // A new character announces itself from the gallery; only mood changes speak here.
        if (now === before || !before.startsWith(`${avatar.character}/`) || avatar.quiet) return

        const expression = findCharacter(avatar.character).moods.find(mood => mood.name === avatar.mood)?.expression

        if (expression) sound.voice(avatar.character, expression)
    }, [avatar.character, avatar.mood, avatar.quiet])

    return (
        <div className={`avatar ${asking ? "asking" : ""}`} style={{ left: avatar.col * cellSize, top: avatar.row * cellSize, ...size }} data-avatar>
            {avatar.say && <div key={avatar.say} className="bubble chalk"><Chalked text={avatar.say} pace={paceFor(avatar.say.length)} animate /></div>}
            <CharacterFigure character={avatar.character} mood={avatar.mood} asking={asking} />
            {asking && <span className="alert-mark chalk">!</span>}
        </div>
    )
}
