import { build } from "electron-builder"
import { name, title } from "@/libs/identity"
import project from "~/package.json"

// Packages the built app (dist/) for the current platform into release/.
// With --publish, uploads to a GitHub release for the version in package.json (needs GH_TOKEN).
// Names come from package.json through identity, like everything else.

const publish = process.argv.includes("--publish")

// --dir: just the unpacked app for this machine, to try it quickly.
const quick = process.argv.includes("--dir")

const [, owner, repo] = project.repository.url.match(/github\.com\/([^/]+)\/([^/.]+)/) ?? []

if (!owner || !repo) throw new Error("package.json repository must point at github.com/<owner>/<repo>")

await build({
    publish: publish ? "always" : "never",
    config: {
        appId: `app.${name.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
        productName: title,
        copyright: `Copyright © ${new Date().getFullYear()} ${project.author.replace(/\s*<.*>/, "")}`,
        directories: { output: "release" },
        files: ["dist/**", "package.json"],
        // Run from outside the archive: the native terminal, and the command agents run in the shell.
        asarUnpack: ["dist/cli.js", "node_modules/node-pty/**"],
        mac: {
            category: "public.app-category.developer-tools",
            icon: "assets/icon/icon.icns",
            target: quick ? [{ target: "dir", arch: [process.arch as "arm64" | "x64"] }] : [{ target: "dmg", arch: ["arm64", "x64"] }, { target: "zip", arch: ["arm64", "x64"] }],
            // Not signed with a Developer ID yet; see README ("Unsigned builds").
            identity: null
        },
        linux: {
            icon: "assets/icon/icon.png",
            category: "Development",
            target: quick ? ["dir"] : ["AppImage", "deb"],
            maintainer: project.author,
            // A lowercase command name on Linux; macOS keeps the product name for the app bundle.
            executableName: name
        },
        win: {
            // Ready-made (bun run icon): converting at packaging time hung on Windows.
            icon: "assets/icon/icon.ico",
            target: quick ? ["dir"] : [{ target: "nsis", arch: ["x64"] }, { target: "zip", arch: ["x64"] }],
            // Not signed with a code-signing certificate yet; see README ("Unsigned builds").
            signAndEditExecutable: false
        },
        nsis: { oneClick: false, allowToChangeInstallationDirectory: true, artifactName: "${productName}-Setup-${version}.${ext}" },
        publish: { provider: "github", owner, repo, releaseType: "draft" }
    }
})
