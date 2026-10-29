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
import scripteditor from "./scripteditor";
import editors from "./editors";
import profile from "./profile";
import tutorial from "./tutorial";
import boot from "./boot";
import ctx from "./ctx";
import appsdk from "./appsdk";
import gameplay from "./gameplay";

export default { ...game, ...shell, ...apps, ...terminal, ...chimera, ...exchange, ...contracts, ...taskmgr, ...modules, ...legal, ...scripteditor, ...editors, ...profile, ...tutorial, ...boot, ...ctx, ...appsdk, ...gameplay } as const;
