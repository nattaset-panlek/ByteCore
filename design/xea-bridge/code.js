// Xea Bridge: runs Plugin API scripts sent from the local build socket.
figma.showUI(__html__, { width: 280, height: 120 });

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

figma.ui.onmessage = async (msg) => {
  if (msg.type !== "exec") return;
  try {
    const fn = new AsyncFunction("figma", msg.code);
    const result = await fn(figma);
    figma.ui.postMessage({ type: "result", id: msg.id, result: result === undefined ? null : result });
  } catch (e) {
    figma.ui.postMessage({ type: "result", id: msg.id, error: String((e && e.stack) || e) });
  }
};
