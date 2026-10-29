import { useEffect, useRef, useState } from "react";
import { importSave, lastPlayedAt, resetGame } from "../game/save";
import { useGame } from "../game/store";
import { fmt, useT } from "../i18n";
import { useShell } from "../os/shellStore";
import { playSound, unlockAudio } from "../os/sound";
import { ContentDialog, Icon } from "../ui";

const initials = (name: string) => name.slice(0, 2).toUpperCase();

/** Sign-in screen (GDD 8, Figma 03 Shell): the profile, Continue / New game / Load save file. */
export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  const t = useT();
  const player = useGame((s) => s.game.player);
  const balance = useGame((s) => s.game.wallet.balance);
  const shutDown = useShell((s) => s.shutDown);
  const [confirmNew, setConfirmNew] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const go = () => {
    unlockAudio();
    playSound("success");
    onSignIn();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Enter" && !confirmNew && go();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const played = (() => {
    if (lastPlayedAt === null) return t("signin.firstRun");
    const min = Math.floor((Date.now() - lastPlayedAt) / 60_000);
    if (min < 1) return t("signin.playedJustNow");
    if (min < 60) return t("signin.playedMin", { n: min });
    if (min < 60 * 24) return t("signin.playedHours", { n: Math.floor(min / 60) });
    return t("signin.playedDays", { n: Math.floor(min / 1440) });
  })();

  const load = async (f: File | undefined) => {
    if (!f) return;
    setError((await importSave(await f.text())) ? "" : t("signin.loadFailed"));
  };

  return (
    <div className="signin">
      <div className="signin-account">
        <span className="person-picture signin-avatar">{initials(player.name)}</span>
        <div className="signin-name">{player.name}</div>
        <div className="signin-summary">{t("signin.summary", { level: player.level, credits: fmt.credits(balance), played })}</div>
        <button type="button" className="signin-btn accent" onClick={go} autoFocus>
          {t("signin.continue")}
        </button>
        <button type="button" className="signin-btn" onClick={() => setConfirmNew(true)}>
          {t("signin.newGame")}
        </button>
        <button type="button" className="signin-link" onClick={() => fileRef.current?.click()}>
          {t("signin.load")}
        </button>
        {error && <div className="signin-error">{error}</div>}
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => load(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
      </div>

      <div className="signin-profiles">
        <button type="button" className="signin-profile on" onClick={go}>
          <span className="person-picture">{initials(player.name)}</span>
          {player.name}
        </button>
        <button type="button" className="signin-profile" onClick={() => setConfirmNew(true)}>
          <span className="person-picture">+</span>
          {t("signin.newProfile")}
        </button>
      </div>

      <div className="intro-tray">
        <span className="intro-tray-btn">
          <Icon name="icon/wifi_1" size={20} />
        </span>
        <span className="intro-tray-btn">
          <Icon name="icon/speaker_2" size={20} />
        </span>
        <button type="button" className="intro-tray-btn" aria-label={t("start.shutDown")} onClick={shutDown}>
          <Icon name="icon/power" size={20} />
        </button>
      </div>

      <ContentDialog
        open={confirmNew}
        title={t("signin.newConfirmTitle")}
        primary={t("signin.newGame")}
        onPrimary={async () => {
          setConfirmNew(false);
          await resetGame();
          go();
        }}
        onClose={() => setConfirmNew(false)}
      >
        {t("signin.newConfirmText")}
      </ContentDialog>
    </div>
  );
}
