import { useEffect } from "react";
import { startGame } from "./game/save";
import { useGame } from "./game/store";
import { DesktopScreen } from "./screens/DesktopScreen";

export default function App() {
  const loaded = useGame((s) => s.loaded);
  useEffect(() => {
    startGame();
  }, []);
  // Plain desktop color while the save loads (a boot screen comes in Phase 8)
  if (!loaded) return <div className="os" />;
  return <DesktopScreen />;
}
