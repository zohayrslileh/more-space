import type { Expression } from "@/core/avatar/characters"
import { name } from "@/libs/identity"

// Every sound is synthesized: no audio files. Quiet by design; the board should
// sound like a room with a chalkboard, not like an app.

const storageKey = `${name}:sound`

let context: AudioContext | undefined

let noise: AudioBuffer | undefined

let scratchUntil = 0

const listeners = new Set<() => void>()

let enabled = readEnabled()

export const sound = {

    get enabled() { return enabled },

    setEnabled(value: boolean) {

        enabled = value

        try { localStorage.setItem(storageKey, value ? "on" : "off") } catch { }

        for (const listener of listeners) listener()
    },

    subscribe(listener: () => void) {

        listeners.add(listener)

        return () => { listeners.delete(listener) }
    },

    // Chalk on slate for as long as the writing lasts: short scratchy strokes.
    write(seconds: number) {

        const audio = ready()

        if (!audio) return

        const start = Math.max(audio.currentTime, scratchUntil)

        const end = audio.currentTime + seconds

        if (end <= start) return

        scratchUntil = end

        for (let time = start; time < end;) {

            const stroke = 0.05 + Math.random() * 0.09

            scratch(audio, time, Math.min(stroke, end - time), 1800 + Math.random() * 2600, 0.035 + Math.random() * 0.03)

            time += stroke + Math.random() * 0.03
        }
    },

    // A question arrived: two soft bell notes, the second higher.
    question() {

        const audio = ready()

        if (!audio) return

        bell(audio, audio.currentTime, 659.25, 0.12)

        bell(audio, audio.currentTime + 0.16, 880, 0.1)
    },

    // A gentler single note while a question is still waiting.
    reminder() {

        const audio = ready()

        if (audio) bell(audio, audio.currentTime, 880, 0.06)
    },

    // An answer was chosen.
    answer() {

        const audio = ready()

        if (!audio) return

        bell(audio, audio.currentTime, 987.77, 0.07, 0.25)

        bell(audio, audio.currentTime + 0.07, 1318.5, 0.06, 0.3)
    },

    // A thumbtack pushed into the board: a short knock.
    pin() {

        const audio = ready()

        if (!audio) return

        const now = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain()

        oscillator.type = "triangle"

        oscillator.frequency.setValueAtTime(320, now)

        oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.08)

        gain.gain.setValueAtTime(0.0001, now)

        gain.gain.linearRampToValueAtTime(0.16, now + 0.004)

        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

        oscillator.connect(gain).connect(audio.destination)

        oscillator.start(now)

        oscillator.stop(now + 0.15)

        scratch(audio, now, 0.03, 3200, 0.05)
    },

    // The avatar's voice when its mood changes: the character's own voice, the mood's shape.
    voice(character: string, expression: Expression) {

        const audio = ready()

        if (!audio) return

        speak(audio, voices[character] ?? voices.chalky!, expression)
    },

    // The eraser passing over the slate.
    erase() {

        const audio = ready()

        if (!audio) return

        const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain(), now = audio.currentTime

        source.buffer = noiseBuffer(audio)

        filter.type = "lowpass"

        filter.frequency.setValueAtTime(700, now)

        filter.frequency.linearRampToValueAtTime(1600, now + 0.35)

        gain.gain.setValueAtTime(0.0001, now)

        gain.gain.linearRampToValueAtTime(0.09, now + 0.08)

        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)

        source.connect(filter).connect(gain).connect(audio.destination)

        source.start(now)

        source.stop(now + 0.5)
    }
}

function ready() {

    if (!enabled) return undefined

    context ??= new AudioContext()

    if (context.state === "suspended") context.resume()

    return context
}

function noiseBuffer(audio: AudioContext) {

    if (noise) return noise

    noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)

    const data = noise.getChannelData(0)

    for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1

    return noise
}

function scratch(audio: AudioContext, time: number, duration: number, frequency: number, volume: number) {

    const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain()

    source.buffer = noiseBuffer(audio)

    filter.type = "bandpass"

    filter.frequency.value = frequency

    filter.Q.value = 1.4

    gain.gain.setValueAtTime(0.0001, time)

    gain.gain.linearRampToValueAtTime(volume, time + duration * 0.25)

    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    source.connect(filter).connect(gain).connect(audio.destination)

    source.start(time, Math.random() * 0.8)

    source.stop(time + duration + 0.02)
}

function bell(audio: AudioContext, time: number, frequency: number, volume: number, length = 0.9) {

    for (const [ratio, share] of [[1, 1], [2.01, 0.25]] as const) {

        const oscillator = audio.createOscillator(), gain = audio.createGain()

        oscillator.type = "sine"

        oscillator.frequency.value = frequency * ratio

        gain.gain.setValueAtTime(0.0001, time)

        gain.gain.linearRampToValueAtTime(volume * share, time + 0.01)

        gain.gain.exponentialRampToValueAtTime(0.0001, time + length)

        oscillator.connect(gain).connect(audio.destination)

        oscillator.start(time)

        oscillator.stop(time + length + 0.05)
    }
}

function readEnabled() {

    try { return localStorage.getItem(storageKey) !== "off" } catch { return true }
}

// ---------- voices ----------
// Each character plays its own instrument, each built a different way so they sound clearly apart.
// The instrument gives the timbre; the voice below gives the scale, rhythm and opening phrase.

type Instrument = (audio: AudioContext, out: AudioNode, time: number, frequency: number, length: number, index: number) => void

// A character's musical identity: its instrument, its scale, its pace and swing, and the little
// phrase it always opens with. The mood decides the melody's direction (contours below), told in
// the character's own scale and rhythm, so no two characters play the same tune.
interface Voice {

    instrument: Instrument

    base: number

    gain: number

    // Semitones of one octave of the scale.
    scale: number[]

    // Seconds per beat.
    beat: number

    // 0: even. Above 0, every other note is longer (a lazy swing).
    swing?: number

    // Silence after each note, in beats.
    rest?: number

    // Played first, every time: [semitones, beats].
    entrance?: [number, number][]

    // At most this many notes of the mood's melody (slow, spare characters say less).
    most?: number
}

// Each mood as a melody in scale steps: [step, beats]. Step 0 is the base note; "top" is the octave.
const top = 99

const contours: Record<Expression, [number, number][]> = {
    neutral: [],
    thinking: [[0, 1.5], [-1, 2]],
    working: [[0, 0.5], [0, 0.5], [1, 0.5], [0, 0.5]],
    happy: [[0, 1], [2, 1], [4, 2]],
    excited: [[0, 0.5], [2, 0.5], [4, 0.5], [top, 2]],
    sad: [[2, 1.5], [1, 1.5], [0, 3]],
    confused: [[0, 1], [2, 1], [-1, 2]],
    surprised: [[0, 0.5], [4, 2]],
    calm: [[-2, 4]],
    alert: [[3, 0.5], [0, 0.5], [3, 0.5], [0, 0.5]]
}

function semitones(scale: number[], step: number) {

    if (step === top) return 12

    const octave = Math.floor(step / scale.length), index = ((step % scale.length) + scale.length) % scale.length

    return scale[index]! + 12 * octave
}

function speak(audio: AudioContext, voice: Voice, expression: Expression) {

    const melody = contours[expression]

    if (!melody.length) return

    const out = audio.createGain()

    out.gain.value = voice.gain

    out.connect(audio.destination)

    const notes: [number, number][] = [
        ...(voice.entrance ?? []),
        ...melody.slice(0, voice.most ?? melody.length).map(([step, beats]): [number, number] => [semitones(voice.scale, step), beats])
    ]

    let time = audio.currentTime + 0.02

    notes.forEach(([shift, beats], index) => {

        const swung = voice.swing ? (index % 2 ? 1 - voice.swing / 2 : 1 + voice.swing / 2) : 1

        const length = beats * voice.beat * swung

        voice.instrument(audio, out, time, voice.base * Math.pow(2, shift / 12), length, index)

        time += length + (voice.rest ?? 0.15) * voice.beat
    })
}

// An envelope: rise, hold, fall.
function envelope(audio: AudioContext, time: number, length: number, attack = 0.01, release = 0.08) {

    const gain = audio.createGain()

    gain.gain.setValueAtTime(0.0001, time)

    gain.gain.linearRampToValueAtTime(1, time + attack)

    gain.gain.setValueAtTime(1, time + Math.max(attack, length - release / 2))

    gain.gain.exponentialRampToValueAtTime(0.0001, time + length + release)

    return gain
}

function tone(audio: AudioContext, type: OscillatorType, frequency: number, time: number, length: number) {

    const oscillator = audio.createOscillator()

    oscillator.type = type

    oscillator.frequency.setValueAtTime(frequency, time)

    oscillator.start(time)

    oscillator.stop(time + length + 0.3)

    return oscillator
}

function noiseSource(audio: AudioContext, time: number, length: number) {

    const source = audio.createBufferSource()

    source.buffer = noiseBuffer(audio)

    source.loop = true

    source.start(time, Math.random() * 0.5)

    source.stop(time + length + 0.3)

    return source
}

// A voice through two vowel formants.
function vowel(audio: AudioContext, input: AudioNode, output: AudioNode, time: number, f1: [number, number], f2: [number, number], length: number) {

    for (const [from, to] of [f1, f2]) {

        const band = audio.createBiquadFilter()

        band.type = "bandpass"

        band.Q.value = 6

        band.frequency.setValueAtTime(from, time)

        band.frequency.linearRampToValueAtTime(to, time + length)

        input.connect(band).connect(output)
    }
}

// Chalky: a soft human hum, "oo".
const hum: Instrument = (audio, out, time, frequency, length) => {

    const source = tone(audio, "sawtooth", frequency / 2, time, length), shaped = envelope(audio, time, length, 0.04, 0.12)

    source.frequency.linearRampToValueAtTime(frequency / 2 * 0.97, time + length)

    vowel(audio, source, shaped, time, [320, 300], [800, 760], length)

    shaped.connect(out)
}

// Penguin: a nasal squawk, frequency-modulated.
const squawk: Instrument = (audio, out, time, frequency, length) => {

    const carrier = tone(audio, "square", frequency, time, length), modulator = tone(audio, "sine", frequency * 1.5, time, length), depth = audio.createGain()

    depth.gain.setValueAtTime(frequency * 1.2, time)

    depth.gain.exponentialRampToValueAtTime(frequency * 0.2, time + length)

    modulator.connect(depth).connect(carrier.frequency)

    const band = audio.createBiquadFilter()

    band.type = "bandpass"; band.frequency.value = 1400; band.Q.value = 1.5

    carrier.connect(band).connect(envelope(audio, time, length * 0.8, 0.005, 0.04)).connect(out)
}

// Owl: a low "hoo", rising softly then falling, with a tremble and breath.
const hoot: Instrument = (audio, out, time, frequency, length) => {

    const source = tone(audio, "sine", frequency * 0.94, time, length), shaped = envelope(audio, time, length, length * 0.35, 0.18)

    source.frequency.linearRampToValueAtTime(frequency, time + length * 0.4)

    source.frequency.linearRampToValueAtTime(frequency * 0.9, time + length)

    const tremble = tone(audio, "sine", 7, time, length), depth = audio.createGain()

    depth.gain.value = 0.25

    tremble.connect(depth).connect(shaped.gain)

    source.connect(shaped).connect(out)

    const breath = noiseSource(audio, time, length), band = audio.createBiquadFilter(), quiet = envelope(audio, time, length, 0.05, 0.1)

    band.type = "bandpass"; band.frequency.value = frequency * 2; band.Q.value = 3

    quiet.gain.value = 0.2

    breath.connect(band).connect(quiet).connect(out)
}

// Robot: droid chatter, the pitch jumping inside every note.
const droid: Instrument = (audio, out, time, frequency, length, index) => {

    const source = tone(audio, "square", frequency, time, length)

    const random = seededRandom(index + Math.round(frequency))

    for (let at = time; at < time + length; at += 0.035) source.frequency.setValueAtTime(frequency * (0.7 + random() * 0.9), at)

    const band = audio.createBiquadFilter()

    band.type = "lowpass"; band.frequency.value = 3200

    source.connect(band).connect(envelope(audio, time, length, 0.005, 0.03)).connect(out)
}

// Cat: "mee-ow", the vowel sweeping from ee to ow while the pitch bends.
const meow: Instrument = (audio, out, time, frequency, length) => {

    const source = tone(audio, "sawtooth", frequency, time, length), shaped = envelope(audio, time, length, 0.03, 0.1)

    source.frequency.setValueAtTime(frequency * 0.85, time)

    source.frequency.linearRampToValueAtTime(frequency * 1.12, time + length * 0.4)

    source.frequency.linearRampToValueAtTime(frequency * 0.8, time + length)

    vowel(audio, source, shaped, time, [300, 750], [2300, 900], length)

    shaped.connect(out)
}

// Cowboy: a whistle, sliding, with vibrato and a little air.
const whistle: Instrument = (audio, out, time, frequency, length) => {

    const source = tone(audio, "sine", frequency * 0.96, time, length)

    source.frequency.linearRampToValueAtTime(frequency, time + 0.05)

    const wobble = tone(audio, "sine", 6, time, length), depth = audio.createGain()

    depth.gain.value = frequency * 0.015

    wobble.connect(depth).connect(source.frequency)

    source.connect(envelope(audio, time, length, 0.03, 0.08)).connect(out)

    scratch(audio, time, Math.min(0.08, length), 4000, 0.04)
}

// Samurai: a shakuhachi, mostly breath, its vibrato arriving late.
const flute: Instrument = (audio, out, time, frequency, length) => {

    const source = tone(audio, "sine", frequency, time, length), shaped = envelope(audio, time, length, 0.08, 0.15)

    const wobble = tone(audio, "sine", 5, time, length), depth = audio.createGain()

    depth.gain.setValueAtTime(0, time)

    depth.gain.linearRampToValueAtTime(frequency * 0.02, time + length)

    wobble.connect(depth).connect(source.frequency)

    source.connect(shaped).connect(out)

    const breath = noiseSource(audio, time, length), band = audio.createBiquadFilter(), airy = envelope(audio, time, length, 0.02, 0.12)

    band.type = "bandpass"; band.frequency.value = frequency * 2.5; band.Q.value = 2

    airy.gain.value = 0.6

    breath.connect(band).connect(airy).connect(out)
}

// Viking: a war horn swelling, and a drum on the first note.
const horn: Instrument = (audio, out, time, frequency, length, index) => {

    const low = audio.createBiquadFilter(), shaped = envelope(audio, time, length, 0.12, 0.15)

    low.type = "lowpass"

    low.frequency.setValueAtTime(250, time)

    low.frequency.linearRampToValueAtTime(1600, time + Math.min(0.25, length))

    for (const detune of [0, 7]) {

        const source = tone(audio, "sawtooth", frequency, time, length)

        source.detune.value = detune

        source.connect(low)
    }

    low.connect(shaped).connect(out)

    if (index === 0) {

        const drum = tone(audio, "sine", 90, time, 0.3), hit = audio.createGain()

        drum.frequency.exponentialRampToValueAtTime(45, time + 0.25)

        hit.gain.setValueAtTime(1.6, time)

        hit.gain.exponentialRampToValueAtTime(0.0001, time + 0.3)

        drum.connect(hit).connect(out)
    }
}

// Astronomer: an oud, a plucked string (Karplus-Strong).
const pluck: Instrument = (audio, out, time, frequency, length) => {

    const rate = audio.sampleRate, duration = length + 0.6, samples = Math.floor(rate * duration)

    const buffer = audio.createBuffer(1, samples, rate), data = buffer.getChannelData(0)

    const period = Math.max(2, Math.round(rate / frequency))

    for (let index = 0; index < period; index++) data[index] = Math.random() * 2 - 1

    for (let index = period; index < samples; index++) data[index] = 0.497 * (data[index - period]! + data[index - period + 1]!)

    const source = audio.createBufferSource()

    source.buffer = buffer

    source.connect(out)

    source.start(time)
}

// Anime Hero: a bright sparkling bell.
const chime: Instrument = (audio, out, time, frequency, length) => {

    const carrier = tone(audio, "sine", frequency * 2, time, length), modulator = tone(audio, "sine", frequency * 7, time, length), depth = audio.createGain()

    depth.gain.setValueAtTime(frequency * 3, time)

    depth.gain.exponentialRampToValueAtTime(1, time + length + 0.3)

    modulator.connect(depth).connect(carrier.frequency)

    const ring = audio.createGain()

    ring.gain.setValueAtTime(1, time)

    ring.gain.exponentialRampToValueAtTime(0.0001, time + length + 0.4)

    carrier.connect(ring).connect(out)
}

// Mochi: 8-bit chiptune, a fast arpeggio and a noise click.
const chip: Instrument = (audio, out, time, frequency, length) => {

    const source = tone(audio, "square", frequency, time, length)

    const steps = [1, 1.26, 1.5]

    for (let at = time, step = 0; at < time + length; at += 0.045, step++) source.frequency.setValueAtTime(frequency * steps[step % 3]!, at)

    source.connect(envelope(audio, time, length, 0.002, 0.02)).connect(out)

    const click = noiseSource(audio, time, 0.03), high = audio.createBiquadFilter(), snap = envelope(audio, time, 0.02, 0.001, 0.02)

    high.type = "highpass"; high.frequency.value = 5000

    snap.gain.value = 0.5

    click.connect(high).connect(snap).connect(out)
}

function seededRandom(seed: number) {

    let state = seed | 0

    return () => {

        state = (state * 1664525 + 1013904223) | 0

        return ((state >>> 0) % 10000) / 10000
    }
}

const voices: Record<string, Voice> = {
    // plain major, even, nothing special: the neutral voice
    chalky: { instrument: hum, base: 440, gain: 0.5, scale: [0, 2, 4, 5, 7, 9, 11], beat: 0.15 },
    // bright pentatonic, quick, stuttering in
    penguin: { instrument: squawk, base: 760, gain: 0.09, scale: [0, 2, 4, 7, 9], beat: 0.075, rest: 0.4, entrance: [[0, 0.6], [0, 0.6], [0, 0.6]] },
    // always "hoo-hoo" first; minor, slow, says little
    owl: { instrument: hoot, base: 310, gain: 0.22, scale: [0, 3, 5, 7, 10], beat: 0.3, entrance: [[0, 1], [-3, 1.6]], most: 2 },
    // every semitone, fast and even, "bip-bip" first
    robot: { instrument: droid, base: 880, gain: 0.05, scale: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], beat: 0.06, rest: 0.6, entrance: [[12, 0.6], [7, 0.6]] },
    // minor, long sliding notes, says little
    cat: { instrument: meow, base: 560, gain: 0.45, scale: [0, 2, 3, 5, 7, 8, 10], beat: 0.28, most: 2 },
    // blues, lazy swing, slides up into the first note
    cowboy: { instrument: whistle, base: 1250, gain: 0.09, scale: [0, 3, 5, 6, 7, 10], beat: 0.17, swing: 0.6, entrance: [[-2, 0.4]] },
    // the Japanese miyako-bushi scale, slow, a long first note, pauses between notes
    samurai: { instrument: flute, base: 587, gain: 0.12, scale: [0, 1, 5, 7, 8], beat: 0.3, rest: 0.8, entrance: [[0, 2.4]] },
    // low Aeolian, heavy, a low call first
    viking: { instrument: horn, base: 110, gain: 0.07, scale: [0, 2, 3, 5, 7, 8, 10], beat: 0.26, entrance: [[-5, 2]] },
    // the hijaz maqam, opening with an oud ornament (a trill)
    astronomer: { instrument: pluck, base: 196, gain: 0.35, scale: [0, 1, 4, 5, 7, 8, 10], beat: 0.13, entrance: [[0, 0.5], [1, 0.5], [0, 0.5], [1, 0.5]] },
    // high pentatonic, bouncy, a sparkle run first
    anime: { instrument: chime, base: 660, gain: 0.08, scale: [0, 2, 4, 7, 9], beat: 0.09, entrance: [[7, 0.4], [9, 0.4], [12, 0.4], [16, 0.8]] },
    // high pentatonic game notes, quick, a bouncy octave "boing" first
    mochi: { instrument: chip, base: 659, gain: 0.04, scale: [0, 2, 4, 7, 9], beat: 0.08, entrance: [[0, 0.6], [12, 1.8]] }
}
