import { runSection, state } from "./run.mjs";
import { Kit } from "./kit.mjs";
import * as M from "./modals.mjs";
const yK = state["Chimera OS / 03 Windows"].bounds.y + state["Chimera OS / 03 Windows"].bounds.h + 200;
await runSection({ name: "Chimera OS / 04 Chimera Kit states", x: 0, y: yK, rowWidth: 3400, items: ["idle", "encrypting", "connected", "critical"].map((s) => ({ key: s, node: Kit(s) })) });
const yM = state["Chimera OS / 04 Chimera Kit states"].bounds.y + state["Chimera OS / 04 Chimera Kit states"].bounds.h + 200;
await runSection({ name: "Chimera OS / 05 Modals & Overlays", x: 0, y: yM, rowWidth: 2400, items: [
  { key: "startMenu", node: M.StartMenu() }, { key: "contextMenu", node: M.ContextMenu() }, { key: "toasts", node: M.Toasts() }, { key: "tooltip", node: M.Tooltip() },
  { key: "shutdown", node: M.ShutdownDialog(), br: true }, { key: "reset", node: M.ResetDialog() }, { key: "funds", node: M.FundsAlert() }, { key: "ram", node: M.RamAlert() }, { key: "ip", node: M.IpAlert(), br: true },
  { key: "success", node: M.HackSuccess() }, { key: "failed", node: M.HackFailed() }, { key: "levelup", node: M.LevelUp() }, { key: "offline", node: M.OfflineEarnings() },
]});
