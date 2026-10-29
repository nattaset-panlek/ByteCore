import { useEffect, useState } from "react";
import { getApp, installPackage, userAppId } from "../../game/appsdk/installed";
import { decodePackage } from "../../game/appsdk/xjs";
import { useGame } from "../../game/store";
import * as vfs from "../../game/vfs";
import { tm, useT } from "../../i18n";
import { TitleBar, useWindow } from "../../os/Window";
import { useWindows } from "../../os/windowStore";
import { userAppIcon } from "../../os/userApps";
import { Button, CheckBox, Icon, InfoBar, Meter } from "../../ui";
import "./userApp.css";

type Step = "welcome" | "options" | "installing" | "finish";
const STEPS: Step[] = ["welcome", "options", "installing", "finish"];

/** Setup wizard for an .install_<id>.exe built by the IDE: welcome → licence & options → progress → finish. */
export function Installer() {
  const t = useT();
  const { win } = useWindow();
  const path = win.args?.path ?? "";
  const content = useGame((s) => {
    const n = vfs.getNode(s.game.fs, path);
    return n?.type === "file" ? n.content : undefined;
  });
  const [pkg] = useState(() => decodePackage(content));
  const [step, setStep] = useState<Step>("welcome");
  const [accepted, setAccepted] = useState(false);
  const [opts, setOpts] = useState({ desktop: true, startMenu: true, pinned: false });
  const [launch, setLaunch] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const close = () => useWindows.getState().close(win.id);

  // Fake but size-aware progress; the real install happens at 100%.
  useEffect(() => {
    if (step !== "installing" || !pkg) return;
    const total = Math.min(9000, 2200 + pkg.source.length / 6);
    const started = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / total);
      setProgress(p);
      if (p < 1) return;
      window.clearInterval(id);
      const r = installPackage(pkg, opts);
      if (r.ok) setStep("finish");
      else {
        setError(tm(r.error));
        setStep("options");
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [step, pkg, opts]);

  if (!pkg) {
    return (
      <>
        <TitleBar title={t("sdk.setup.title")} />
        <div className="setup">
          <div className="setup-body">
            <InfoBar severity="error" title={t("sdk.setup.badTitle")} message={t("sdk.setup.badMsg", { path })} />
          </div>
          <div className="setup-footer">
            <span className="spacer" />
            <Button onClick={close}>{t("sdk.setup.close")}</Button>
          </div>
        </div>
      </>
    );
  }

  const m = pkg.manifest;
  const prev = getApp(m.id);
  const dir = prev?.dir ?? `C:/Program Files/${m.name}`;
  const stepIndex = STEPS.indexOf(step);
  const next = () => setStep(STEPS[stepIndex + 1]);
  const back = () => setStep(STEPS[stepIndex - 1]);
  const finish = () => {
    if (launch) useWindows.getState().open(userAppId(m.id));
    close();
  };

  return (
    <>
      <TitleBar title={t("sdk.setup.titleFor", { name: m.name })} />
      <div className="setup">
        <div className="setup-main">
          <aside className="setup-banner">
            <Icon name={userAppIcon(m)} size={64} />
            <div className="t-body-strong">{m.name}</div>
            <div className="t-caption c-secondary">{t("sdk.setup.version", { version: m.version })}</div>
            <ol className="setup-steps t-caption">
              {STEPS.map((s, i) => (
                <li key={s} className={i === stepIndex ? "on" : i < stepIndex ? "done" : ""}>
                  {t(`sdk.setup.step.${s}`)}
                </li>
              ))}
            </ol>
          </aside>
          <div className="setup-body">
            {step === "welcome" && (
              <>
                <h2 className="t-subtitle">{t("sdk.setup.welcome", { name: m.name })}</h2>
                <p className="c-secondary">{m.description || t("sdk.setup.noDescription")}</p>
                <div className="setup-facts t-caption">
                  <span className="c-tertiary">{t("sdk.setup.publisher")}</span>
                  <span>{m.author}</span>
                  <span className="c-tertiary">{t("sdk.setup.version.label")}</span>
                  <span>{m.version}</span>
                  <span className="c-tertiary">{t("sdk.setup.location")}</span>
                  <span>{dir}</span>
                </div>
                {prev && <InfoBar severity="info" title={t("sdk.setup.upgradeTitle")} message={t("sdk.setup.upgradeMsg", { from: prev.version, to: m.version })} />}
                <p className="t-caption c-tertiary">{t("sdk.setup.welcomeHint")}</p>
              </>
            )}
            {step === "options" && (
              <>
                <h2 className="t-subtitle">{t("sdk.setup.licenseTitle")}</h2>
                <div className="setup-license t-caption">{t("sdk.setup.license", { name: m.name, author: m.author })}</div>
                <CheckBox checked={accepted} onChange={setAccepted} label={t("sdk.setup.accept")} />
                <div className="setup-options">
                  <div className="t-body-strong">{t("sdk.setup.options")}</div>
                  <CheckBox checked={opts.desktop} onChange={(v) => setOpts({ ...opts, desktop: v })} label={t("sdk.setup.optDesktop")} />
                  <CheckBox checked={opts.startMenu} onChange={(v) => setOpts({ ...opts, startMenu: v })} label={t("sdk.setup.optStart")} />
                  <CheckBox checked={opts.pinned} onChange={(v) => setOpts({ ...opts, pinned: v })} label={t("sdk.setup.optPin")} />
                </div>
                {error && <InfoBar severity="error" title={t("sdk.setup.failed")} message={error} />}
              </>
            )}
            {step === "installing" && (
              <>
                <h2 className="t-subtitle">{t("sdk.setup.installing", { name: m.name })}</h2>
                <Meter value={progress} text={`${Math.round(progress * 100)}%`} />
                <p className="t-caption c-secondary setup-log">
                  {progress < 0.3 ? t("sdk.setup.log.extract") : progress < 0.7 ? t("sdk.setup.log.copy", { dir }) : t("sdk.setup.log.register")}
                </p>
              </>
            )}
            {step === "finish" && (
              <>
                <h2 className="t-subtitle">{t("sdk.setup.done", { name: m.name })}</h2>
                <p className="c-secondary">{t("sdk.setup.doneMsg")}</p>
                <CheckBox checked={launch} onChange={setLaunch} label={t("sdk.setup.launch", { name: m.name })} />
              </>
            )}
          </div>
        </div>
        <div className="setup-footer">
          <span className="spacer" />
          {step === "finish" ? (
            <Button variant="accent" onClick={finish}>
              {t("sdk.setup.finish")}
            </Button>
          ) : (
            <>
              <Button disabled={stepIndex === 0 || step === "installing"} onClick={back}>
                {t("sdk.setup.back")}
              </Button>
              <Button variant="accent" disabled={step === "installing" || (step === "options" && !accepted)} onClick={next}>
                {step === "options" ? t("sdk.setup.install") : t("sdk.setup.next")}
              </Button>
              <Button disabled={step === "installing"} onClick={close}>
                {t("sdk.setup.cancel")}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
