import { useEffect } from "react";
import { useGame } from "../game/store";
import { t } from "../i18n";
import { useWindows } from "./windowStore";
import { useSettings } from "./settingsStore";
import { notify } from "./toasts";
import { GUIDE_PATH } from "../game/vfs";

// First-run tutorial (GDD 7): a short sequence of guiding toasts, shown once per device.

const STEPS: { title: string; message: string; app?: Parameters<typeof notify>[0]["appId"]; action?: string; open?: string; guide?: boolean }[] = [
  { title: "tutorial.welcome.title", message: "tutorial.welcome.msg", app: "profile", action: "tutorial.openGuide", guide: true },
  { title: "tutorial.contracts.title", message: "tutorial.contracts.msg", app: "contracts", action: "tutorial.open", open: "contracts" },
  { title: "tutorial.terminal.title", message: "tutorial.terminal.msg", app: "terminal", action: "tutorial.open", open: "terminal" },
  { title: "tutorial.sell.title", message: "tutorial.sell.msg", app: "browser" },
  { title: "tutorial.readme.title", message: "tutorial.readme.msg", app: "explorer", action: "tutorial.openGuide", guide: true },
];

// Module guard: run at most once per page load, surviving React StrictMode's double-invoke.
let fired = false;

export function useTutorial() {
  const loaded = useGame((s) => s.loaded);
  const seen = useSettings((s) => s.tutorialSeen);
  const setSetting = useSettings((s) => s.set);

  useEffect(() => {
    if (!loaded || seen || fired) return;
    fired = true;
    setSetting("tutorialSeen", true);
    // Only tutorialize a genuinely fresh game (no activity yet).
    const g = useGame.getState().game;
    if (g.player.xp > 0 || g.player.stats.cracks > 0 || g.txns.length > 0) return;
    const open = useWindows.getState().open;
    STEPS.forEach((s, i) =>
      window.setTimeout(() => {
        notify({
          appId: s.app,
          title: t(s.title),
          message: t(s.message, { name: useGame.getState().game.player.name }),
          actions: s.guide
            ? [{ label: t(s.action!), onClick: () => open("pdfReader", { path: GUIDE_PATH }) }, { label: t("toast.dismiss") }]
            : s.action && s.open
              ? [{ label: t(s.action), onClick: () => open(s.open as Parameters<typeof open>[0]) }, { label: t("toast.dismiss") }]
              : undefined,
          duration: 0,
        });
      }, 1200 + i * 1400)
    );
  }, [loaded, seen, setSetting]);
}
