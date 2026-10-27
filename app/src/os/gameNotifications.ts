import { useEffect } from "react";
import { getModel } from "../game/catalog";
import { onGameEvent } from "../game/events";
import { notify } from "./toasts";
import { useWindows } from "./windowStore";
import { useGame } from "../game/store";
import { appName } from "./apps";
import { fmt, t } from "../i18n";

/** Level that unlocks each tier (mirrors TIER_UNLOCK_LEVEL). */
const UNLOCK_AT: Record<number, number> = { 3: 2, 6: 3, 10: 4 };

/** Turn game events into toasts. */
export function useGameNotifications() {
  useEffect(
    () =>
      onGameEvent((e) => {
        const open = useWindows.getState().open;
        switch (e.type) {
          case "orderDelivered":
            notify({
              appId: "rigManager",
              title: t("event.delivered.title"),
              message: t("event.delivered.message", { name: getModel(e.order.modelId).name }),
              actions: [
                { label: t("toast.openApp", { app: appName("rigManager") }), onClick: () => open("rigManager", { page: "deliveries" }) },
                { label: t("toast.dismiss") },
              ],
              duration: 0,
              sound: "delivery",
            });
            break;
          case "levelUp": {
            notify({ appId: "profile", title: t("event.levelUp.title"), message: t("event.levelUp.message", { level: e.level }) });
            const tier = UNLOCK_AT[e.level];
            if (tier)
              notify({
                appId: "browser",
                title: t("event.unlock.title"),
                message: t("event.unlock.message", { tier }),
                actions: [{ label: t("toast.openApp", { app: appName("contracts") }), onClick: () => open("contracts") }, { label: t("toast.dismiss") }],
                duration: 0,
              });
            break;
          }
          case "released":
            notify({ icon: "icon/checkmark_circle", title: t("event.released.title"), message: t("event.released.message") });
            break;
          case "interestCharged":
            notify({ appId: "wallet", title: t("event.interest.title"), message: t("event.interest.message", { amount: fmt.credits(e.amount) }) });
            break;
          case "contractComplete":
            notify({
              appId: "contracts",
              title: t("event.contract.title"),
              message: t("event.contract.message"),
              actions: [{ label: t("toast.openApp", { app: appName("contracts") }), onClick: () => open("contracts") }, { label: t("toast.dismiss") }],
            });
            break;
          case "traceWarning":
            notify({
              appId: "chimeraKit",
              title: t("chimera.warnTitle"),
              message: t("chimera.traceWarn", { ip: e.ip }),
              actions: [
                { label: t("toast.openApp", { app: appName("chimeraKit") }), onClick: () => open("chimeraKit") },
                { label: t("chimera.disconnect"), onClick: () => useGame.getState().disconnect() },
              ],
              duration: 0,
            });
            break;
        }
      }),
    []
  );
}
