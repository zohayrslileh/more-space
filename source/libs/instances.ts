import { readdirSync, readFileSync } from "node:fs"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join, relative, isAbsolute } from "node:path"

// The open windows, one small file each in the app's data folder: where their command socket is and
// which project they show. The command finds its window here when its environment is stale, as in
// a long-lived process (tmux, an agent's background server) started from a terminal that is gone.

export interface Instance {

    pid: number

    socket: string

    project?: string
}

export async function register(directory: string, instance: Instance) {

    await mkdir(directory, { recursive: true })

    await writeFile(join(directory, `${instance.pid}.json`), JSON.stringify(instance))

    return () => rm(join(directory, `${instance.pid}.json`), { force: true })
}

// Sockets to try, best first: the one in the environment, then open windows whose project holds the
// working folder (the deepest project first), or the only open window if there is just one.
export function candidates(environment: string | undefined, directory: string | undefined, cwd: string) {

    const open = directory ? readInstances(directory).filter(instance => alive(instance.pid) && instance.socket !== environment) : []

    const inside = (project: string) => { const path = relative(project, cwd); return !path.startsWith("..") && !isAbsolute(path) }

    const matching = open.filter(instance => instance.project && inside(instance.project)).sort((a, b) => b.project!.length - a.project!.length)

    const fallback = matching.length ? matching : open.length === 1 ? open : []

    return [...(environment ? [environment] : []), ...fallback.map(instance => instance.socket)]
}

function readInstances(directory: string) {

    try {

        return readdirSync(directory).filter(file => file.endsWith(".json")).flatMap(file => {

            try { return [JSON.parse(readFileSync(join(directory, file), "utf8")) as Instance] } catch { return [] }
        })
    }

    catch { return [] }
}

function alive(pid: number) {

    try { process.kill(pid, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM" }
}
