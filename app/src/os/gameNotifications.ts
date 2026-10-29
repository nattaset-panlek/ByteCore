import { useEffect } from "react";
import { getModel } from "../game/catalog";
import { onGameEvent } from "../game/events";
import { notify } from "./toasts";
import { useWindows } from "./windowStore";
import { useGame } from "../game/store";
import { appName } from "./apps";
import { fmt, t } from "../i18n";
import { LEAGUES, rivalById } from "../game/rivals";

const mmss = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

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
          case "skillPoint":
            notify({
              appId: "profile",
              title: t("event.skillPoint.title"),
              message: t("event.skillPoint.message", { count: e.points }),
              actions: [{ label: t("skills.openSkills"), onClick: () => open("profile", { page: "skills" }) }, { label: t("toast.dismiss") }],
            });
            break;
          case "skillUsed":
            notify({ appId: "profile", title: t(`skill.${e.skill}`), message: t(`event.skillUsed.${e.skill}`) });
            break;
          case "jobComplete":
            if (e.outcome.kind === "crack" && e.outcome.manual?.clean)
              notify({ appId: "chimeraKit", title: t("event.cleanCrack.title"), message: t("event.cleanCrack.message", { ip: e.outcome.ip, time: mmss(e.outcome.manual.leftMs) }) });
            break;
          case "thermalThrottle":
            notify({
              appId: "rigManager",
              title: t("event.throttle.title"),
              message: t("event.throttle.message", { temp: e.temp }),
              actions: [{ label: t("toast.openApp", { app: appName("rigManager") }), onClick: () => open("rigManager", { page: "tuning" }) }, { label: t("toast.dismiss") }],
            });
            break;
          case "thermalShutdown":
            notify({
              appId: "rigManager",
              title: t("event.shutdown.title"),
              message: t("event.shutdown.message", { temp: e.temp }),
              actions: [{ label: t("event.shutdown.quiet"), onClick: () => useGame.getState().setProfile("quiet") }, { label: t("toast.dismiss") }],
              duration: 0,
            });
            break;
          case "opStage":
            notify({ appId: "opsBoard", title: t("event.opStage.title", { n: e.stage }), message: t("event.opStage.message", { banked: fmt.credits(e.banked), trace: e.trace }) });
            break;
          case "opWarn":
            notify({
              appId: "opsBoard",
              title: t("event.opWarn.title"),
              message: t("event.opWarn.message", { name: e.name }),
              actions: [{ label: t("ops.exfil"), onClick: () => useGame.getState().exfil() }, { label: t("toast.dismiss") }],
              duration: 0,
            });
            break;
          case "opEnded":
            notify(
              e.result.grade === "blown"
                ? { appId: "opsBoard", title: t("event.opBlown.title", { name: e.result.name }), message: t("event.opBlown.message", { payout: fmt.credits(e.result.payout) }) }
                : {
                    appId: "opsBoard",
                    title: t("event.opEnded.title", { name: e.result.name, grade: e.result.grade }),
                    message: t("event.opEnded.message", { payout: fmt.credits(e.result.payout), xp: e.xp }),
                    actions: [{ label: t("toast.openApp", { app: appName("opHud") }), onClick: () => open("opHud") }, { label: t("toast.dismiss") }],
                  }
            );
            break;
          case "relayMessage":
            notify({
              appId: "relay",
              title: t("event.relay.title", { faction: t(`faction.${e.faction}`) }),
              message: t("event.relay.message"),
              actions: [{ label: t("toast.openApp", { app: appName("relay") }), onClick: () => open("relay", { faction: e.faction }) }, { label: t("toast.dismiss") }],
            });
            break;
          case "glitch": {
            notify({ appId: "relay", title: t("event.glitch.title"), message: t("event.glitch.message") });
            const el = document.querySelector(".desktop") ?? document.body;
            el.classList.remove("static-glitch");
            void (el as HTMLElement).offsetWidth;
            el.classList.add("static-glitch");
            window.setTimeout(() => el.classList.remove("static-glitch"), 2000);
            break;
          }
          case "raceStarted":
            notify({
              appId: "ghostBoard",
              title: t("event.raceStarted.title", { rival: rivalById(e.rival)?.handle ?? e.rival }),
              message: t("event.raceStarted.message", { rival: rivalById(e.rival)?.handle ?? e.rival, ip: e.ip, bounty: fmt.credits(e.bounty) }),
              actions: [{ label: t("toast.openApp", { app: appName("ghostBoard") }), onClick: () => open("ghostBoard", { page: "races" }) }, { label: t("toast.dismiss") }],
              duration: 0,
            });
            break;
          case "raceEnded":
            notify({
              appId: "ghostBoard",
              title: t(e.won ? "event.raceWon.title" : "event.raceLost.title"),
              message: t(e.won ? "event.raceWon.message" : "event.raceLost.message", { rival: rivalById(e.rival)?.handle ?? e.rival, bounty: fmt.credits(e.bounty) }),
            });
            break;
          case "contractSniped":
            notify({ appId: "ghostBoard", title: t("event.snipe.title"), message: t("event.snipe.message", { rival: rivalById(e.rival)?.handle ?? e.rival, tier: e.tier }) });
            break;
          case "weekEnded": {
            const league = t(`ghost.league.${LEAGUES[e.league]}`);
            notify({
              appId: "ghostBoard",
              title: t("event.week.title"),
              message: `${t("event.week.message", { rank: e.rank, reward: fmt.credits(e.reward) })}${e.promoted ? ` ${t("event.week.promoted", { league })}` : e.demoted ? ` ${t("event.week.demoted", { league })}` : ""}`,
              duration: 0,
            });
            break;
          }
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
