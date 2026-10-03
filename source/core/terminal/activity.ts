// Reads what any terminal program shows about its state, without knowing which program it is.
// working: it keeps producing output (spinners, streaming text), not just echoing the user's typing.
// idle: the output went quiet after working ("done").
// attention: it rang the bell or sent a terminal notification (OSC 9 / OSC 777): it wants the user.

export type Activity = "working" | "idle" | "attention"

// Output this soon after a keystroke is the echo of typing, not the program working.
const echoWindow = 150

// Quiet this long after working means the program is done.
const quietAfter = 2500

// Output must keep coming for this long before it counts as working.
const workingAfter = 900

// A bell sooner than this after a keystroke answers the typing, not a request for the user.
const bellAfterInput = 500

// Operating System Commands: ESC ] ... ended by BEL or ESC \.
const osc = /\x1b\](\d+);([^\x07\x1b]*)(?:\x07|\x1b\\)/g

export default class ActivityTracker {

    private state: Activity = "idle"

    private lastInput = 0

    private burstStart = 0

    private lastOutput = 0

    private quietTimer: ReturnType<typeof setTimeout> | undefined

    constructor(private readonly changed: (activity: Activity, detail?: string) => void) { }

    public input() {

        this.lastInput = Date.now()

        // Typing breaks any run of output: working must be the program going on by itself.
        this.burstStart = 0

        // The user answered: whatever was asked is being handled.
        if (this.state === "attention") this.set("idle")
    }

    public output(data: string) {

        const now = Date.now()

        let notification: string | undefined

        const rest = data.replace(osc, (_, code: string, text: string) => {

            if (code === "9" || (code === "777" && text.startsWith("notify"))) notification = text.replace(/^notify;/, "")

            return ""
        })

        // A bell right after a keystroke is the shell answering the typing (a failed Tab completion).
        if (notification !== undefined || (rest.includes("\x07") && now - this.lastInput > bellAfterInput)) return this.set("attention", notification)

        // The echo of what was just typed, however long (a paste), is not the program working.
        if (now - this.lastInput < echoWindow) return

        if (!this.burstStart || now - this.lastOutput > quietAfter) this.burstStart = now

        this.lastOutput = now

        // Waiting for the user lasts until the user answers; output (a prompt redraw) does not end it.
        if (this.state === "idle" && now - this.burstStart >= workingAfter) this.set("working")

        clearTimeout(this.quietTimer)

        this.quietTimer = setTimeout(() => { if (this.state === "working") this.set("idle") }, quietAfter)
    }

    public dispose() {

        clearTimeout(this.quietTimer)
    }

    private set(activity: Activity, detail?: string) {

        if (activity === this.state && activity !== "attention") return

        this.state = activity

        this.changed(activity, detail)
    }
}
