import { memo } from "react";
import type { AppId } from "../os/apps";
import { appComponent } from "../apps";
import { Desktop } from "../os/Desktop";
import { useGameNotifications } from "../os/gameNotifications";
import { useTutorial } from "../os/useTutorial";
import { StartMenu } from "../os/StartMenu";
import { Taskbar } from "../os/Taskbar";
import { ToastStack } from "../os/ToastStack";
import { ContextMenu } from "../os/ContextMenuHost";
import { Window } from "../os/Window";
import { useWindows } from "../os/windowStore";
import { useGame } from "../game/store";
import { WarrantScreen } from "./WarrantScreen";
import { PrisonScreen } from "./PrisonScreen";

/** One app's window content. Memoized on the app id: focus, move and resize changes skip it. */
const AppBody = memo(function AppBody({ appId }: { appId: AppId }) {
  const Body = appComponent(appId);
  return <Body />;
});

/** Xea OS desktop: wallpaper + shortcuts, windows, taskbar, Start, toasts. */
export function DesktopScreen() {
  const windows = useWindows((s) => s.windows);
  const legal = useGame((s) => s.game.legal);
  useGameNotifications();
  useTutorial();

  // Risk and consequences (GDD 3.6): the desktop is locked behind a warrant or a prison sentence.
  if (legal.state === "warrant") return <WarrantScreen bail={legal.bail} />;
  if (legal.state === "prison") return <PrisonScreen until={legal.until} jailbreakUsed={legal.jailbreakUsed} jailbreakLocked={legal.jailbreakLocked} />;

  return (
    <div className="os">
      <Desktop />
      {windows.map((w) => (
        <Window key={w.id} win={w}>
          <AppBody appId={w.appId} />
        </Window>
      ))}
      <StartMenu />
      <ToastStack />
      <Taskbar />
      <ContextMenu />
    </div>
  );
}
