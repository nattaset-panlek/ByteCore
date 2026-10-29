import { useEffect, useState } from "react";
import { getModel } from "../game/catalog";
import { useGame } from "../game/store";
import { fmt, useT } from "../i18n";
import { Icon } from "../ui";
import { playSound } from "../os/sound";

/** Build stamp shown bottom-right (Figma 03 Boot). */
const BUILD = "2610.27";
const LINE_MS = 280;

/** Boot sequence (GDD 8, Figma 03 Shell): logo, spinner and a boot log read from the save. Click to skip. */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const loaded = useGame((s) => s.loaded);
  const g = useGame((s) => s.game);
  const [shown, setShown] = useState(0);

  const lines: string[] = [t("boot.log.kernel"), t("boot.log.disk")];
  if (loaded) {
    lines.push(t("boot.log.wallet", { amount: fmt.credits(g.wallet.balance) }));
    if (g.wallet.incomeSources.length && g.rig.cpu) lines.push(t("boot.log.miner", { level: getModel(g.rig.cpu.modelId).tier }));
    const hosts = g.net.hosts.filter((h) => h.discovered).length;
    if (hosts) lines.push(t("boot.log.hosts", { count: hosts }));
    if (g.rig.net) lines.push(t("boot.log.net", { name: getModel(g.rig.net.modelId).name }));
  }
  const total = lines.length + 1; // + the pending Chimera Kit line

  useEffect(() => {
    playSound("boot");
  }, []);
  useEffect(() => {
    if (shown < total) {
      const id = window.setTimeout(() => setShown((n) => n + 1), LINE_MS);
      return () => window.clearTimeout(id);
    }
    if (!loaded) return;
    const id = window.setTimeout(onDone, 600);
    return () => window.clearTimeout(id);
  }, [shown, total, loaded, onDone]);

  return (
    <div className="boot" onClick={() => loaded && onDone()}>
      <div className="boot-brand">
        <Icon name="app/XeaLogo" size={112} />
        <div className="boot-title">{t("boot.title")}</div>
      </div>
      <span className="ring boot-ring" />
      <div className="boot-log">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i}>
            <span className="boot-ok">{t("boot.ok")}</span>
            {l}
          </div>
        ))}
        {shown >= total && (
          <div className="boot-pending">
            <span className="boot-wait">{t("boot.wait")}</span>
            {t("boot.log.chimera")}
          </div>
        )}
      </div>
      <div className="boot-version">{t("boot.version", { build: BUILD })}</div>
    </div>
  );
}

/** Lock screen (Figma 03): the clock and date. Any key or click goes on to sign-in. */
export function LockScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    const key = () => onDone();
    window.addEventListener("keydown", key);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", key);
    };
  }, [onDone]);
  return (
    <div className="lock" onClick={onDone}>
      <div className="lock-clock">
        <div className="lock-time">{fmt.time(now)}</div>
        <div className="lock-date">{fmt.longDate(now)}</div>
      </div>
      <div className="lock-hint">{t("lock.hint")}</div>
      <div className="intro-tray">
        <Icon name="icon/wifi_1" size={20} />
        <Icon name="icon/speaker_2" size={20} />
      </div>
    </div>
  );
}

/** Shutting down (Figma 03): shown while the save is written, before the app quits. */
export function ShutdownScreen() {
  const t = useT();
  return (
    <div className="shutdown">
      <span className="ring" />
      <div className="shutdown-text">{t("shutdown.text")}</div>
    </div>
  );
}
