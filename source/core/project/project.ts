import { mkdir, realpath, writeFile } from "node:fs/promises"
import { watch, type FSWatcher } from "node:fs"
import { basename, join } from "node:path"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { watchWorkingTree, type FileChange } from "./working-tree"

// How often the branch is re-read in case a change was not seen by the watcher.
const branchPoll = 10_000

// The folder the window was opened on: its name, its git branch, and where its board is kept.
// The board lives in the app's own cache, keyed by the folder's path, never inside the project.
export default class Project {

    private constructor(
        public readonly path: string,
        public readonly name: string,
        public readonly boardDirectory: string,
        private readonly gitDirectory: string | undefined
    ) { }

    public static async open(cwd: string, boardsRoot: string) {

        const path = await realpath(cwd).catch(() => cwd)

        const top = await git(path, "rev-parse", "--show-toplevel")

        const gitDirectory = await git(path, "rev-parse", "--absolute-git-dir")

        const name = basename(top ?? path) || path

        const key = createHash("sha256").update(path).digest("hex").slice(0, 12)

        const slug = basename(path).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 40) || "root"

        const boardDirectory = join(boardsRoot, `${slug}-${key}`)

        await mkdir(boardDirectory, { recursive: true })

        // For anyone browsing the cache: which folder this board belongs to.
        await writeFile(join(boardDirectory, "project.json"), JSON.stringify({ path }, null, 2))

        return new Project(path, name, boardDirectory, gitDirectory)
    }

    public async branch() {

        if (!this.gitDirectory) return undefined

        const branch = await git(this.path, "rev-parse", "--abbrev-ref", "HEAD")

        // Detached HEAD: show the commit instead.
        return branch === "HEAD" ? await git(this.path, "rev-parse", "--short", "HEAD") : branch
    }

    // Calls back with what changed in the working tree (git projects only). Returns a function that stops.
    public watchChanges(listener: (change: FileChange) => void) {

        return this.gitDirectory ? watchWorkingTree(this.path, listener) : () => { }
    }

    // Calls back whenever the branch changes. Returns a function that stops watching.
    public watchBranch(listener: (branch: string | undefined) => void) {

        if (!this.gitDirectory) return () => { }

        let last: string | undefined

        const check = async () => {

            const branch = await this.branch()

            if (branch !== last) listener(last = branch)
        }

        let watcher: FSWatcher | undefined

        try { watcher = watch(this.gitDirectory, (_, file) => { if (file === "HEAD") check() }) } catch { }

        const timer = setInterval(check, branchPoll)

        check()

        return () => { watcher?.close(); clearInterval(timer) }
    }
}

function git(cwd: string, ...args: string[]) {

    return new Promise<string | undefined>(resolve => {

        execFile("git", ["-C", cwd, ...args], { timeout: 3000 }, (error, stdout) => resolve(error ? undefined : stdout.trim() || undefined))
    })
}
