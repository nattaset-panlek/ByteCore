import { APP_COMPONENTS } from "../apps";
import { Desktop } from "../os/Desktop";
import { useGameNotifications } from "../os/gameNotifications";
import { StartMenu } from "../os/StartMenu";
import { Taskbar } from "../os/Taskbar";
import { ToastStack } from "../os/ToastStack";
import { Window } from "../os/Window";
import { useShell } from "../os/shellStore";
import { useWindows } from "../os/windowStore";
import { useT } from "../i18n";

/** Xea OS desktop: wallpaper + shortcuts, windows, taskbar, Start, toasts. */
export function DesktopScreen() {
  const t = useT();
  const windows = useWindows((s) => s.windows);
  const { poweredOff, powerOn } = useShell();
  useGameNotifications();

  if (poweredOff) {
    return (
      <div className="powered-off" onClick={powerOn}>
        <span className="t-caption c-tertiary">{t("desktop.powerOn")}</span>
      </div>
    );
  }

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
