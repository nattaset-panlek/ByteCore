import { useState } from "react";
import { SettingsLayout, TitleBar } from "../os/Window";
import { resetGame } from "../game/save";
import { useWindows } from "../os/windowStore";
import { ACCENTS, useSettings, type AccentId } from "../os/settingsStore";
import { DEFAULT_RESOLUTION, RESOLUTIONS, type Aspect } from "../os/stage";
import { Button, ComboBox, ContentDialog, InfoBar, NavigationViewItem, SettingsCard, TextBox, ToggleSwitch } from "../ui";
import { LOCALES, useI18n, useT, type Locale } from "../i18n";

const PAGES = [
  { id: "home", label: "settings.page.home", icon: "icon/home" },
  { id: "system", label: "settings.page.system", icon: "icon/desktop" },
  { id: "personalization", label: "settings.page.personalization", icon: "icon/paint_brush" },
  { id: "network", label: "settings.page.network", icon: "icon/wifi_1" },
  { id: "apps", label: "settings.page.apps", icon: "icon/grid" },
  { id: "privacy", label: "settings.page.privacy", icon: "icon/lock_closed" },
] as const;

type PageId = (typeof PAGES)[number]["id"];

/** Settings (GDD 5.1): language, theme accent, motion and sound; New game. */
export function SettingsApp() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const setLocale = useI18n((s) => s.setLocale);
  const settings = useSettings();
  const [page, setPage] = useState<PageId>("home");
  const [history, setHistory] = useState<PageId[]>([]);
  const [find, setFind] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const go = (id: PageId) => {
    if (id === page) return;
    setHistory([...history, page]);
    setPage(id);
  };
  const back = history.length
    ? () => {
        setPage(history[history.length - 1]);
        setHistory(history.slice(0, -1));
      }
    : undefined;

  const current = PAGES.find((p) => p.id === page)!;

  const languageCard = (
    <SettingsCard icon="icon/globe" title={t("settings.language")} description={t("settings.languageDesc")}>
      <ComboBox value={locale} onChange={setLocale} options={(Object.keys(LOCALES) as Locale[]).map((l) => ({ value: l, label: LOCALES[l].label }))} />
    </SettingsCard>
  );
  const accentCard = (
    <SettingsCard icon="icon/color" title={t("settings.accent")} description={t("settings.accentDesc")}>
      <ComboBox
        value={settings.accent}
        onChange={(v) => settings.set("accent", v)}
        width={180}
        options={(Object.keys(ACCENTS) as AccentId[]).map((a) => ({ value: a, label: ACCENTS[a].label }))}
      />
    </SettingsCard>
  );

  return (
    <>
      <TitleBar onBack={back} />
      <SettingsLayout
        title={t(current.label)}
        nav={
          <>
            <div className="settings-user">
              <span className="person large">GU</span>
              <div>
                <div className="t-body-strong">ghost_user</div>
                <div className="t-caption c-secondary">ghost_user@xea.local</div>
              </div>
            </div>
            <TextBox value={find} onChange={setFind} placeholder={t("settings.find")} icon="icon/search" />
            <div className="settings-nav-items">
              {PAGES.map((p) => (
                <NavigationViewItem key={p.id} icon={p.icon} label={t(p.label)} selected={p.id === page} onClick={() => go(p.id)} />
              ))}
            </div>
          </>
        }
      >
        {page === "home" && (
          <>
            {languageCard}
            {accentCard}
            <SettingsCard icon="icon/paint_brush" title={t("settings.page.personalization")} onClick={() => go("personalization")} />
            <SettingsCard icon="icon/desktop" title={t("settings.page.system")} onClick={() => go("system")} />
          </>
        )}

        {page === "personalization" && (
          <>
            {accentCard}
            <SettingsCard icon="icon/arrow_clockwise" title={t("settings.reduceMotion")} description={t("settings.reduceMotionDesc")}>
              <ToggleSwitch checked={settings.reduceMotion} onChange={(v) => settings.set("reduceMotion", v)} />
            </SettingsCard>
            {languageCard}
          </>
        )}

        {page === "system" && (
          <>
            <SettingsCard icon="icon/desktop" title={t("settings.aspect")} description={t("settings.aspectDesc")}>
              <ComboBox
                value={settings.aspect}
                onChange={(v: Aspect) => {
                  settings.set("aspect", v);
                  settings.set("resolution", DEFAULT_RESOLUTION[v]);
                }}
                width={180}
                options={(Object.keys(RESOLUTIONS) as Aspect[]).map((a) => ({ value: a, label: a }))}
              />
            </SettingsCard>
            <SettingsCard icon="icon/desktop" title={t("settings.resolution")} description={t("settings.resolutionDesc")}>
              <ComboBox
                value={settings.resolution}
                onChange={(v) => settings.set("resolution", v)}
                width={180}
                options={(RESOLUTIONS[settings.aspect] ?? RESOLUTIONS["16:9"]).map((r) => ({ value: r, label: r.replace("x", " × ") }))}
              />
            </SettingsCard>
            <SettingsCard icon="icon/speaker_2" title={t("settings.sound")} description={t("settings.soundDesc")}>
              <ToggleSwitch checked={settings.sound} onChange={(v) => settings.set("sound", v)} />
            </SettingsCard>
            <SettingsCard icon="icon/arrow_clockwise" title={t("settings.newGame")} description={t("settings.newGameDesc")}>
              <Button onClick={() => setConfirmReset(true)}>{t("settings.reset")}</Button>
            </SettingsCard>
          </>
        )}

        {(page === "network" || page === "apps" || page === "privacy") && (
          <InfoBar severity="info" title={t(current.label)} message={t("settings.comingSoon")} />
        )}

        <ContentDialog
          open={confirmReset}
          title={t("settings.resetConfirmTitle")}
          primary={t("settings.reset")}
          onPrimary={() => {
            setConfirmReset(false);
            useWindows.getState().windows.forEach((w) => useWindows.getState().close(w.id));
            resetGame();
          }}
          onClose={() => setConfirmReset(false)}
        >
          {t("settings.resetConfirmText")}
        </ContentDialog>
      </SettingsLayout>
    </>
  );
}
