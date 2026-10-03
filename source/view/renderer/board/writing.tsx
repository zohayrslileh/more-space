import { useState, type CSSProperties } from "react"

// Writing pace: a hand writes about this many characters per second,
// but no single piece of writing takes longer than the cap.
const charactersPerSecond = 38

const longestWriting = 2.6

// Writing older than this is already on the board when the view sees it: no animation.
const freshFor = 1500

export interface Pace {

    // Seconds per character for this item.
    perCharacter: number
}

export function useFresh(createdAt: number | undefined) {

    const [fresh] = useState(() => !!createdAt && Date.now() - createdAt < freshFor && !reducedMotion())

    return fresh
}

export function paceFor(totalCharacters: number): Pace {

    return { perCharacter: Math.min(1 / charactersPerSecond, longestWriting / Math.max(1, totalCharacters)) }
}

// Text that appears character by character, starting after `delay` seconds.
export function Chalked({ text, delay = 0, pace, animate }: { text: string, delay?: number, pace: Pace, animate: boolean }) {

    if (!animate) return <>{text}</>

    return (
        <>
            {[...text].map((character, index) => (
                <span key={index} className="write-char" style={{ animationDelay: `${delay + index * pace.perCharacter}s` } as CSSProperties}>{character}</span>
            ))}
        </>
    )
}

function reducedMotion() {

    return matchMedia("(prefers-reduced-motion: reduce)").matches
}
