import { useEffect, useState } from "react";
import { startGame } from "./game/save";
import { useGame } from "./game/store";
import { applySettings, useSettings } from "./os/settingsStore";
import { playSound } from "./os/sound";
import { Stage } from "./os/stage";
import { BootScreen, LockScreen, ShutdownScreen } from "./screens/BootScreen";
import { useShell } from "./os/shellStore";
import { useT } from "./i18n";
import { SignInScreen } from "./screens/SignInScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { DesktopScreen } from "./screens/DesktopScreen";
import "./game/appsdk/jobs"; // download / compile job handlers, before the save's offline tick
import "./os/userApps";

type Phase = "boot" | "lock" | "signin" | "desktop";

export default function App() {
  const loaded = useGame((s) => s.loaded);
  /** A new game goes through first-run setup instead of the lock and sign-in screens. */
  const needsSetup = useGame((s) => s.loaded && s.game.setupDone === false);
  const accent = useSettings((s) => s.accent);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const [phase, setPhase] = useState<Phase>("boot");
  const { shuttingDown, poweredOff, powerOn } = useShell();
  const t = useT();

  useEffect(() => {
    startGame();
  }, []);
  useEffect(() => {
    applySettings({ accent, reduceMotion });
  }, [accent, reduceMotion]);

  // A click anywhere on a button plays the UI click sound (GDD 8).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, .nav-item, .desktop-icon, .tab-item, .fe-item, .web-cat, .web-slot"))
        playSound("click");
    };
    document.addEventListener("click", onClick);
    const onCtx = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("input, textarea, [contenteditable='true']")) e.preventDefault();
    };
    document.addEventListener("contextmenu", onCtx);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("contextmenu", onCtx);
    };
  }, []);

  return (
    <Stage>
      {shuttingDown ? (
        <ShutdownScreen />
      ) : poweredOff ? (
        <div
          className="powered-off"
          onClick={() => {
            powerOn();
            setPhase("boot");
          }}
        >
          <span className="t-caption c-tertiary">{t("desktop.powerOn")}</span>
        </div>
      ) : phase === "boot" || !loaded ? (
        <BootScreen onDone={() => setPhase((p) => (p === "boot" ? "lock" : p))} />
      ) : needsSetup ? (
        <SetupScreen onDone={() => setPhase("desktop")} />
      ) : phase === "lock" ? (
        <LockScreen onDone={() => setPhase("signin")} />
      ) : phase === "signin" ? (
        <SignInScreen onSignIn={() => setPhase("desktop")} />
      ) : (
        <DesktopScreen />
      )}
    </Stage>
  );
}
