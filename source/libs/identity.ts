import project from "~/package.json"

// The project's name and version live only in package.json.
// Everything that shows or depends on the name derives it here.

export const name: string = project.name

export const version: string = project.version

export const title = name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(word => word[0]!.toUpperCase() + word.slice(1))
    .join(" ")

export const command = name

const envPrefix = name.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()

export const env = {

    socket: `${envPrefix}_SOCKET`,

    // Where open windows register themselves; set by the command script, not by terminals.
    instances: `${envPrefix}_INSTANCES`
}
