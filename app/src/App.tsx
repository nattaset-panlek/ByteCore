import { useEffect } from "react";
import { startGame } from "./game/save";
import { useGame } from "./game/store";
import { applySettings, useSettings } from "./os/settingsStore";
import { DesktopScreen } from "./screens/DesktopScreen";

export default function App() {
  const loaded = useGame((s) => s.loaded);
  const accent = useSettings((s) => s.accent);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    startGame();
  }, []);
  useEffect(() => {
    applySettings({ accent, reduceMotion });
  }, [accent, reduceMotion]);
  // Plain desktop color while the save loads (a boot screen comes in Phase 8)
  if (!loaded) return <div className="os" />;
  return <DesktopScreen />;
}
