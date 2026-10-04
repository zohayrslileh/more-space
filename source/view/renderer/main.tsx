import "@fontsource/caveat/latin-500.css"
import "@fontsource/caveat/latin-700.css"
import "@fontsource/schoolbell/latin-400.css"
import "@fontsource/patrick-hand/latin-400.css"
import "@fontsource/kalam/latin-400.css"
import "@fontsource/kalam/latin-700.css"
import "@fontsource/gochi-hand/latin-400.css"
import "@fontsource/architects-daughter/latin-400.css"
import "@fontsource/ibm-plex-sans/latin-400.css"
import "@fontsource/ibm-plex-sans/latin-500.css"
import "@fontsource/ibm-plex-sans/latin-600.css"
import "@fontsource/jetbrains-mono/latin-400.css"
import "@fontsource/jetbrains-mono/latin-600.css"
import "@xterm/xterm/css/xterm.css"
import { createRoot } from "react-dom/client"
import { title } from "@/libs/identity"
import App from "./app"

document.documentElement.dataset.platform = navigator.userAgent.includes("Windows") ? "windows" : navigator.userAgent.includes("Mac") ? "mac" : "linux"

document.title = title

createRoot(document.getElementById("root")!).render(<App />)
