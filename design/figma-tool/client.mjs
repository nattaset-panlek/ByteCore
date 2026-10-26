// Minimal Talk-To-Figma socket client: join a channel and send plugin commands.
const PORT = process.env.TTF_PORT || 3055;
const CHANNEL = process.env.TTF_CHANNEL || "flowux";

let ws;
const pending = new Map();
let seq = 0;

export function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${PORT}`);
    ws.onopen = () => ws.send(JSON.stringify({ type: "join", channel: CHANNEL }));
    ws.onerror = (e) => reject(new Error("socket error " + (e.message || "")));
    ws.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      if (data.type === "system" && data.message && data.message.result) return resolve();
      if (data.type === "error") return reject(new Error(String(data.message)));
      const m = data.message;
      if (!m || !m.id || !pending.has(m.id)) return;
      if (!("result" in m) && !("error" in m)) return;
      const { res, rej, timer, command } = pending.get(m.id);
      clearTimeout(timer);
      pending.delete(m.id);
      if (m.error) rej(new Error(`${command}: ${m.error}`));
      else res(m.result);
    };
  });
}

export function cmd(command, params = {}, timeoutMs = 60000) {
  const id = `cc${Date.now().toString(36)}${(seq++).toString(36)}`;
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rej(new Error(`${command}: timed out`));
    }, timeoutMs);
    pending.set(id, { res, rej, timer, command });
    ws.send(JSON.stringify({ id, type: "message", channel: CHANNEL, message: { id, command, params: { ...params, commandId: id } } }));
  });
}

export function close() {
  ws && ws.close();
}
