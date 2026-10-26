// Minimal relay client for the local Talk To Figma plugin.
// Usage:
//   bun scripts/fig.mjs run <file.js>            -> execute_code with the file's contents
//   bun scripts/fig.mjs <command> '<json params>'  -> any plugin command
// Env: FIGMA_CHANNEL (default "flowux"), FIGMA_PORT (default 3055)
import { readFileSync } from "fs";
import WebSocket from "ws";
import { randomUUID } from "crypto";

const channel = process.env.FIGMA_CHANNEL || "egyletps";
const port = process.env.FIGMA_PORT || 3055;
const [, , cmd, arg] = process.argv;

let command = cmd;
let params = {};
if (cmd === "run") {
  command = "execute_code";
  params = { code: readFileSync(arg, "utf8") };
} else if (arg) {
  params = JSON.parse(arg);
}

const ws = new WebSocket(`ws://localhost:${port}`);
const joinId = randomUUID();
const cmdId = randomUUID();
const timer = setTimeout(() => {
  console.error("Timed out waiting for Figma");
  process.exit(2);
}, Number(process.env.FIGMA_TIMEOUT || 180000));

ws.on("open", () => {
  ws.send(JSON.stringify({ id: joinId, type: "join", channel }));
  setTimeout(() => {
    ws.send(
      JSON.stringify({
        id: cmdId,
        type: "message",
        channel,
        message: { id: cmdId, command, params: { ...params, commandId: cmdId } },
      })
    );
  }, 300);
});

ws.on("message", (data) => {
  let json;
  try {
    json = JSON.parse(data.toString());
  } catch {
    return;
  }
  const msg = json.message;
  if (!msg || msg.id !== cmdId || (!("result" in msg) && !("error" in msg))) return;
  clearTimeout(timer);
  if (msg.error) {
    console.error("ERROR:", msg.error);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(msg.result, null, 1));
  }
  ws.close();
});

ws.on("error", (e) => {
  console.error("Socket error:", e.message);
  process.exit(1);
});
