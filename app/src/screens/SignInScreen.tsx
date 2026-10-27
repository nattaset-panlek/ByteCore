import { useEffect } from "react";
import { useGame } from "../game/store";
import { useT } from "../i18n";
import { playSound, unlockAudio } from "../os/sound";

/** Sign-in screen (GDD 8): click or press Enter to log in. */
export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  const t = useT();
  const name = useGame((s) => s.game.player.name);
  const go = () => {
    unlockAudio();
    playSound("success");
    onSignIn();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && go();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div className="signin" onClick={go}>
      <div className="signin-user">
        <span className="signin-avatar">{name.slice(0, 2).toUpperCase()}</span>
        <div className="t-subtitle">{name}</div>
        <button type="button" className="signin-enter" onClick={go}>
          {t("signin.enter")}
        </button>
      </div>
      <div className="signin-hint">{t("signin.hint")}</div>
    </div>
  );
}
