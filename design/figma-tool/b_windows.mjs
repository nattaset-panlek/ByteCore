import { connect, cmd, close } from "./client.mjs";
import { runSection, state, save } from "./run.mjs";
import * as W from "./windows.mjs";

await runSection({ name: "Chimera OS / 03 Windows", x: 0, y: 0, rowWidth: 2600, items: [
  { key: "profile", node: W.Profile() },
  { key: "mining", node: W.MiningRig() },
  { key: "wallet", node: W.Wallet() },
  { key: "logs", node: W.Logs(), br: true },
  { key: "rigShop", node: W.RigManagerShop() },
  { key: "rigUp", node: W.RigManagerUpgrades() },
  { key: "tasks", node: W.TaskManager(), br: true },
  { key: "terminal", node: W.Terminal() },
  { key: "network", node: W.Network() },
  { key: "contracts", node: W.Contracts() },
]});
