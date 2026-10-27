import { useEffect } from "react";
import { Icon } from "../ui";
import { useT } from "../i18n";
import { playSound } from "../os/sound";

/** Boot sequence (GDD 8): Xea logo, progress, then sign-in. Click to skip. */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  useEffect(() => {
    const id = window.setTimeout(onDone, 2000);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div className="boot" onClick={onDone}>
      <Icon name="app/XeaLogo" size={72} className="boot-logo" />
      <div className="boot-bar">
        <span onAnimationStart={() => playSound("boot")} />
      </div>
      <div className="boot-text">{t("boot.starting")}</div>
    </div>
  );
}
