import { watch, type FSWatcher } from "node:fs"
import { execFile } from "node:child_process"

// What changed in the working tree of the current branch, as git sees it: ignored files never count.
export type ChangeKind = "added" | "modified" | "deleted" | "renamed"

export interface FileChange {

    // Files that newly differ from the last commit, or were changed again.
    changed: { path: string, kind: ChangeKind }[]

    // Files that went back to their committed state without a commit (undone edits).
    reverted: string[]

    // A new commit on the same branch.
    commit?: { subject: string, files: number }
}

// Changes are gathered for this long after the last file event, at most for maxWait.
const settle = 500, maxWait = 2000

// Parses `git status --porcelain=v1 -z --untracked-files=all` into path → kind.
export function parseStatus(output: string) {

    const entries = new Map<string, ChangeKind>()

    const fields = output.split("\0")

    for (let index = 0; index < fields.length; index++) {

        const field = fields[index]!

        if (field.length < 4) continue

        const code = field.slice(0, 2), path = field.slice(3)

        // A rename or copy is followed by its old path.
        if (code.includes("R") || code.includes("C")) index++

        entries.set(path, code === "??" || code.includes("A") ? "added" : code.includes("D") ? "deleted" : code.includes("R") ? "renamed" : "modified")
    }

    return entries
}

// Compares two statuses. A file touched on disk counts again even when its status did not change
// (then it is an edit, even for a new file). A new file that disappears was deleted, not undone.
export function compare(before: Map<string, ChangeKind>, after: Map<string, ChangeKind>, touched: Set<string>) {

    const changed = [...after]
        .filter(([path, kind]) => before.get(path) !== kind || touched.has(path))
        .map(([path, kind]) => ({ path, kind: before.get(path) === kind ? "modified" as const : kind }))

    const gone = [...before].filter(([path]) => !after.has(path))

    for (const [path] of gone.filter(([, kind]) => kind === "added")) changed.push({ path, kind: "deleted" })

    const reverted = gone.filter(([, kind]) => kind !== "added").map(([path]) => path)

    return { changed, reverted }
}

// Watches a git working tree and reports what changed. Returns a function that stops watching.
export function watchWorkingTree(root: string, listener: (change: FileChange) => void) {

    let status: Map<string, ChangeKind> | undefined, head: string | undefined, branch: string | undefined

    const touched = new Set<string>()

    let timer: ReturnType<typeof setTimeout> | undefined, firstEvent = 0, running = false, again = false

    const check = async () => {

        if (running) { again = true; return }

        running = true

        const [output, nextHead, nextBranch] = await Promise.all([
            git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all"),
            git(root, "rev-parse", "HEAD").then(value => value?.trim()),
            git(root, "rev-parse", "--abbrev-ref", "HEAD").then(value => value?.trim())
        ])

        const files = new Set(touched)

        touched.clear()

        if (output !== undefined) {

            const next = parseStatus(output)

            // The first look, and a branch switch, set the baseline without reacting.
            if (status && nextBranch === branch) {

                const { changed, reverted } = compare(status, next, files)

                const committed = !!head && !!nextHead && nextHead !== head

                const commit = committed ? { subject: (await git(root, "log", "-1", "--format=%s"))?.trim() ?? "", files: reverted.length } : undefined

                if (changed.length || reverted.length || commit) listener({ changed, reverted: commit ? [] : reverted, commit })
            }

            status = next; head = nextHead; branch = nextBranch
        }

        running = false

        if (again) { again = false; check() }
    }

    const schedule = () => {

        const now = Date.now()

        if (!timer) firstEvent = now

        clearTimeout(timer)

        timer = setTimeout(() => { timer = undefined; check() }, Math.max(0, Math.min(settle, firstEvent + maxWait - now)))
    }

    let watcher: FSWatcher | undefined

    try {

        watcher = watch(root, { recursive: true }, (_, file) => {

            const path = file?.toString().replaceAll("\\", "/")

            if (path && !path.startsWith(".git/")) touched.add(path)

            schedule()
        })
    } catch { }

    check()

    return () => { watcher?.close(); clearTimeout(timer) }
}

// Raw output: `git status -z` starts with a meaningful space, so callers trim only what needs it.
function git(cwd: string, ...args: string[]) {

    return new Promise<string | undefined>(resolve => {

        execFile("git", ["-C", cwd, ...args], { timeout: 5000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => resolve(error ? undefined : stdout))
    })
}
