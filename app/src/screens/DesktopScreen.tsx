import { APP_COMPONENTS } from "../apps";
import { Desktop } from "../os/Desktop";
import { useGameNotifications } from "../os/gameNotifications";
import { StartMenu } from "../os/StartMenu";
import { Taskbar } from "../os/Taskbar";
import { ToastStack } from "../os/ToastStack";
import { Window } from "../os/Window";
import { useShell } from "../os/shellStore";
import { useWindows } from "../os/windowStore";
import { useGame } from "../game/store";
import { useT } from "../i18n";
import { WarrantScreen } from "./WarrantScreen";
import { PrisonScreen } from "./PrisonScreen";

/** Xea OS desktop: wallpaper + shortcuts, windows, taskbar, Start, toasts. */
export function DesktopScreen() {
  const t = useT();
  const windows = useWindows((s) => s.windows);
  const { poweredOff, powerOn } = useShell();
  const legal = useGame((s) => s.game.legal);
  useGameNotifications();

  if (poweredOff) {
    return (
      <div className="powered-off" onClick={powerOn}>
        <span className="t-caption c-tertiary">{t("desktop.powerOn")}</span>
      </div>
    );
  }

  // Risk and consequences (GDD 3.6): the desktop is locked behind a warrant or a prison sentence.
  if (legal.state === "warrant") return <WarrantScreen bail={legal.bail} />;
  if (legal.state === "prison") return <PrisonScreen until={legal.until} jailbreakUsed={legal.jailbreakUsed} jailbreakLocked={legal.jailbreakLocked} />;

  return (
    <div className="os">
      <Desktop />
      {windows.map((w) => {
        const Body = APP_COMPONENTS[w.appId];
        return (
          <Window key={w.id} win={w}>
            <Body />
          </Window>
        );
      })}
      <StartMenu />
      <ToastStack />
      <Taskbar />
    </div>
  );
}
