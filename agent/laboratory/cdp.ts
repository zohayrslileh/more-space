// Drives a running window through the DevTools protocol.
// Start the app with --remote-debugging-port=9333, then:
//   bun agent/laboratory/cdp.ts shot <file.png>
//   bun agent/laboratory/cdp.ts type "<text>"        (types into the focused terminal, then Enter)
//   bun agent/laboratory/cdp.ts eval "<expression>"
//   bun agent/laboratory/cdp.ts mouse <x> <y>         (moves the pointer, CSS pixels)
//   bun agent/laboratory/cdp.ts fill "<selector>" "<text>"  (focuses an element and types into it)
//   bun agent/laboratory/cdp.ts enter                 (presses Enter in the focused element)
//   bun agent/laboratory/cdp.ts wheel <x> <y> <dy>     (a real mouse wheel at a point)
//   bun agent/laboratory/cdp.ts errors              (console errors since the page loaded are not kept; listens 2s)

const [action, argument] = process.argv.slice(2)

const pages = await (await fetch("http://localhost:9333/json")).json() as { type: string, webSocketDebuggerUrl: string }[]

const socket = new WebSocket(pages.find(page => page.type === "page")!.webSocketDebuggerUrl)

let counter = 0

const pending = new Map<number, (value: any) => void>()

socket.onmessage = event => {

    const message = JSON.parse(String(event.data))

    if (message.id && pending.has(message.id)) { pending.get(message.id)!(message.result ?? message.error); pending.delete(message.id) }

    else if (message.method === "Runtime.consoleAPICalled" || message.method === "Runtime.exceptionThrown") console.log(JSON.stringify(message.params).slice(0, 400))
}

await new Promise(resolve => socket.onopen = resolve)

function call(method: string, params: object = {}) {

    const id = ++counter

    socket.send(JSON.stringify({ id, method, params }))

    return new Promise<any>(resolve => pending.set(id, resolve))
}

if (action === "shot") {

    const result = await call("Page.captureScreenshot", { format: "png" })

    await Bun.write(argument!, Buffer.from(result.data, "base64"))

    console.log(`saved ${argument}`)
}

else if (action === "type") {

    await call("Runtime.evaluate", { expression: "document.querySelector('.xterm-helper-textarea')?.focus()" })

    await call("Input.insertText", { text: argument })

    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" })

    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })

    console.log("typed")
}

else if (action === "eval") {

    const result = await call("Runtime.evaluate", { expression: argument, returnByValue: true, awaitPromise: true })

    console.log(JSON.stringify(result.result?.value ?? result, null, 1))
}

else if (action === "mouse") {

    await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: Number(argument), y: Number(process.argv[4]) })

    console.log("moved")
}

else if (action === "fill") {

    await call("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(argument)})?.focus()` })

    await call("Input.insertText", { text: process.argv[4] })

    console.log("filled")
}

else if (action === "enter") {

    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" })

    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })

    console.log("entered")
}

else if (action === "wheel") {

    await call("Input.dispatchMouseEvent", { type: "mouseWheel", x: Number(argument), y: Number(process.argv[4]), deltaX: 0, deltaY: Number(process.argv[5]) })

    console.log("wheeled")
}

else if (action === "errors") {

    await call("Runtime.enable")

    await new Promise(resolve => setTimeout(resolve, Number(argument ?? 2) * 1000))
}

socket.close()

process.exit(0)
