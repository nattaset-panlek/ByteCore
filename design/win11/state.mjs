// Tracks built sub-sections so they stack vertically without overlap.
import fs from "node:fs";
const FILE = new URL("state.json", import.meta.url);
const ORDER = ["01 Foundations", "02 Components", "03 Shell", "04 File Explorer", "05 Settings", "06 Game Apps", "07 Dialogs and Flyouts"];
export const state = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
const TOP = 200, GAP = 200;
// place(name) -> { y } for building; place(name, result) records { id, w, h }.
export function place(name, result) {
  if (result) { state[name] = { id: result.id, w: result.w, h: result.h }; fs.writeFileSync(FILE, JSON.stringify(state, null, 1)); return; }
  let y = TOP;
  for (const n of ORDER) { if (n === name) break; y += (state[n]?.h || 2000) + GAP; }
  return { y, old: state[name]?.id };
}
export { ORDER };
