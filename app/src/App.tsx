import { useEffect, useState } from "react";
import { startGame } from "./game/save";
import { useGame } from "./game/store";
import { applySettings, useSettings } from "./os/settingsStore";
import { playSound } from "./os/sound";
import { BootScreen } from "./screens/BootScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { DesktopScreen } from "./screens/DesktopScreen";

type Phase = "boot" | "signin" | "desktop";

export default function App() {
  const loaded = useGame((s) => s.loaded);
  const accent = useSettings((s) => s.accent);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const [phase, setPhase] = useState<Phase>("boot");

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
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (phase === "boot" || !loaded) return <BootScreen onDone={() => setPhase((p) => (p === "boot" ? "signin" : p))} />;
  if (phase === "signin") return <SignInScreen onSignIn={() => setPhase("desktop")} />;
  return <DesktopScreen />;
}
