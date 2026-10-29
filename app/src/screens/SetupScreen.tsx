import { useEffect, useRef, useState } from "react";
import { saveGame } from "../game/save";
import { useGame } from "../game/store";
import { useT } from "../i18n";
import { ACCENTS, useSettings, type AccentId } from "../os/settingsStore";
import { playSound, unlockAudio } from "../os/sound";
import { Icon, ToggleSwitch } from "../ui";

// First-run setup (Xea OS out-of-box experience): pick a handle, the look, then start.
// Shown after boot on a new game (GameState.setupDone === false).

const NAME_RE = /^[A-Za-z0-9_.-]{3,16}$/;
const HANDLES = ["nyx_rider", "null_fox", "byte_wraith", "echo_null", "zero_kite", "static_owl", "cipher_moth", "ghost_user"];
const randomHandle = () => `${HANDLES[Math.floor(Math.random() * HANDLES.length)]}${Math.floor(Math.random() * 90 + 10)}`;
const STEPS = 3;

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const current = useGame((s) => s.game.player.name);
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(current);
  const [touched, setTouched] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const nameOk = NAME_RE.test(name);
  useEffect(() => {
    if (step === 0) input.current?.select();
  }, [step]);

  const next = () => {
    unlockAudio();
    if (step === 0 && !nameOk) return setTouched(true);
    if (step < STEPS - 1) return setStep(step + 1);
    setFinishing(true);
    useGame.getState().completeSetup(name);
    playSound("success");
    Promise.all([saveGame().catch(() => {}), new Promise((r) => setTimeout(r, 1400))]).then(onDone);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Enter" && !finishing && next();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (finishing)
    return (
      <div className="setup">
        <div className="setup-finishing">
          <span className="ring" />
          <div className="setup-finishing-text">{t("setup.finishing")}</div>
        </div>
      </div>
    );

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="setup-art">
          <Icon name={step === 0 ? "app/XeaLogo" : step === 1 ? "app/Settings" : "app/ChimeraKit"} size={160} />
        </div>
        <div className="setup-body">
          <div className="setup-step">{t("setup.step", { n: step + 1, total: STEPS })}</div>

          {step === 0 && (
            <>
              <h1 className="setup-title">{t("setup.name.title")}</h1>
              <p className="setup-desc">{t("setup.name.desc")}</p>
              <input
                ref={input}
                className={`setup-input ${touched && !nameOk ? "bad" : ""}`}
                value={name}
                maxLength={16}
                spellCheck={false}
                autoFocus
                onChange={(e) => setName(e.target.value.replace(/\s/g, "_"))}
                onBlur={() => setTouched(true)}
                aria-label={t("setup.name.label")}
              />
              <div className={`setup-hint ${touched && !nameOk ? "bad" : ""}`}>{t(touched && !nameOk ? "setup.name.invalid" : "setup.name.rules")}</div>
              <button type="button" className="signin-link setup-suggest" onClick={() => (setName(randomHandle()), setTouched(false))}>
                {t("setup.name.suggest")}
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="setup-title">{t("setup.look.title")}</h1>
              <p className="setup-desc">{t("setup.look.desc")}</p>
              <div className="setup-label">{t("setup.look.accent")}</div>
              <div className="setup-swatches">
                {(Object.keys(ACCENTS) as AccentId[]).map((id) => (
                  <button
                    type="button"
                    key={id}
                    className={`setup-swatch ${settings.accent === id ? "on" : ""}`}
                    onClick={() => settings.set("accent", id)}
                    aria-pressed={settings.accent === id}
                  >
                    <span style={{ background: ACCENTS[id].color }} />
                    {ACCENTS[id].label}
                  </button>
                ))}
              </div>
              <div className="setup-row">
                <div>
                  <div>{t("setup.look.sound")}</div>
                  <div className="setup-row-desc">{t("setup.look.soundDesc")}</div>
                </div>
                <ToggleSwitch checked={settings.sound} onChange={(v) => settings.set("sound", v)} />
              </div>
              <div className="setup-row">
                <div>
                  <div>{t("setup.look.tips")}</div>
                  <div className="setup-row-desc">{t("setup.look.tipsDesc")}</div>
                </div>
                <ToggleSwitch checked={!settings.tutorialSeen} onChange={(v) => settings.set("tutorialSeen", !v)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="setup-title">{t("setup.ready.title", { name })}</h1>
              <p className="setup-desc">{t("setup.ready.desc")}</p>
              <div className="setup-summary">
                <div>
                  <span>{t("setup.ready.handle")}</span>
                  {name}
                </div>
                <div>
                  <span>{t("setup.look.accent")}</span>
                  {ACCENTS[settings.accent].label}
                </div>
                <div>
                  <span>{t("setup.look.tips")}</span>
                  {t(settings.tutorialSeen ? "setup.off" : "setup.on")}
                </div>
              </div>
            </>
          )}

          <div className="setup-footer">
            {step > 0 && (
              <button type="button" className="signin-btn setup-back" onClick={() => setStep(step - 1)}>
                {t("setup.back")}
              </button>
            )}
            <button type="button" className="signin-btn accent setup-next" disabled={step === 0 && touched && !nameOk} onClick={next}>
              {t(step === STEPS - 1 ? "setup.start" : "setup.next")}
            </button>
          </div>
        </div>
      </div>
      <div className="setup-dots">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i === step ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}
