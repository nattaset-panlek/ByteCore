// English dictionary, split by area. Keys are flat and dotted: "area.thing".
// Plurals: "key_one" / "key_other", called as t("key", { count }).
import game from "./game";
import shell from "./shell";
import apps from "./apps";
import terminal from "./terminal";
import chimera from "./chimera";
import exchange from "./exchange";
import contracts from "./contracts";
import taskmgr from "./taskmgr";
import modules from "./modules";
import legal from "./legal";

export default { ...game, ...shell, ...apps, ...terminal, ...chimera, ...exchange, ...contracts, ...taskmgr, ...modules, ...legal } as const;
