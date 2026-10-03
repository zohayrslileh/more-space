import { command, env, name, title } from "@/libs/identity"
import project from "~/package.json"
import { expect, test } from "bun:test"

test("everything named derives from package.json", () => {

    expect(name).toBe(project.name)

    expect(command).toBe(project.name)

    expect(title).toBe(project.name.split("-").map(word => word[0]!.toUpperCase() + word.slice(1)).join(" "))

    expect(env.socket).toBe(`${project.name.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_SOCKET`)
})
