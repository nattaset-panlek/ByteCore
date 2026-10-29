import { useEffect, useState } from "react";
import { useGame } from "../game/store";
import { SettingsLayout, TitleBar, useWindow } from "../os/Window";
import { exportSave, resetGame } from "../game/save";
import { useWindows } from "../os/windowStore";
import { ACCENTS, useSettings, type AccentId, type TaskbarPrefs } from "../os/settingsStore";
import { DEFAULT_RESOLUTION, RESOLUTIONS, type Aspect } from "../os/stage";
import { Button, ComboBox, ContentDialog, Icon, InfoBar, NavigationViewItem, SettingsCard, SettingsExpander, SettingsRow, TextBox, ToggleSwitch } from "../ui";
import { LOCALES, useI18n, useT, type Locale } from "../i18n";
import { AppsPage } from "./userApp/AppsPage";

const PAGES = [
  { id: "home", label: "settings.page.home", icon: "icon/home" },
  { id: "system", label: "settings.page.system", icon: "icon/desktop" },
  { id: "personalization", label: "settings.page.personalization", icon: "icon/paint_brush" },
  { id: "network", label: "settings.page.network", icon: "icon/wifi_1" },
  { id: "apps", label: "settings.page.apps", icon: "icon/grid" },
  { id: "privacy", label: "settings.page.privacy", icon: "icon/lock_closed" },
] as const;

/** Sub-pages are reached from a card; the nav keeps their parent selected. */
const SUB_PAGES = { taskbar: { parent: "personalization", label: "settings.page.taskbar" } } as const;

type PageId = (typeof PAGES)[number]["id"] | keyof typeof SUB_PAGES;

/** Settings (GDD 5.1): language, theme accent, motion and sound; New game. */
export function SettingsApp() {
  const t = useT();
  const playerName = useGame((s) => s.game.player.name);
  const locale = useI18n((s) => s.locale);
  const setLocale = useI18n((s) => s.setLocale);
  const settings = useSettings();
  const [page, setPage] = useState<PageId>("home");
  const [history, setHistory] = useState<PageId[]>([]);
  const [find, setFind] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const { win } = useWindow();

  // Opened with { page }, e.g. taskbar right-click -> Taskbar settings.
  useEffect(() => {
    const target = win.args?.page as PageId | undefined;
    if (target && target !== page) {
      setHistory((h) => [...h, page]);
      setPage(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.args?.nonce]);

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

  const sub = page in SUB_PAGES ? SUB_PAGES[page as keyof typeof SUB_PAGES] : null;
  const current = PAGES.find((p) => p.id === (sub ? sub.parent : page))!;
  const title = sub ? (
    <span className="settings-crumb">
      <button type="button" className="settings-crumb-link" onClick={() => go(current.id)}>
        {t(current.label)}
      </button>
      <Icon name="icon/chevron_right" size={12} />
      <span>{t(sub.label)}</span>
    </span>
  ) : (
    t(current.label)
  );
  const tb = settings.taskbar;
  const setTb = <K extends keyof TaskbarPrefs>(k: K, v: TaskbarPrefs[K]) => settings.set("taskbar", { ...useSettings.getState().taskbar, [k]: v });

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
        title={title}
        nav={
          <>
            <div className="settings-user">
              <span className="person large">{playerName.slice(0, 2).toUpperCase()}</span>
              <div>
                <div className="t-body-strong">{playerName}</div>
                <div className="t-caption c-secondary">{playerName.toLowerCase()}@xea.local</div>
              </div>
            </div>
            <TextBox value={find} onChange={setFind} placeholder={t("settings.find")} icon="icon/search" />
            <div className="settings-nav-items">
              {PAGES.map((p) => (
                <NavigationViewItem key={p.id} icon={p.icon} label={t(p.label)} selected={p.id === current.id} onClick={() => go(p.id)} />
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
            <SettingsCard icon="icon/grid" title={t("settings.page.taskbar")} description={t("settings.tb.cardDesc")} onClick={() => go("taskbar")} />
            <SettingsCard icon="icon/arrow_clockwise" title={t("settings.reduceMotion")} description={t("settings.reduceMotionDesc")}>
              <ToggleSwitch checked={settings.reduceMotion} onChange={(v) => settings.set("reduceMotion", v)} />
            </SettingsCard>
            {languageCard}
          </>
        )}

        {page === "taskbar" && (
          <>
            <SettingsExpander title={t("settings.tb.items")} description={t("settings.tb.itemsDesc")}>
              <SettingsRow icon="icon/search" title={t("settings.tb.search")}>
                <ComboBox
                  value={tb.search}
                  onChange={(v) => setTb("search", v)}
                  width={180}
                  options={[
                    { value: "hide", label: t("settings.tb.searchHide") },
                    { value: "icon", label: t("settings.tb.searchIcon") },
                    { value: "box", label: t("settings.tb.searchBox") },
                  ]}
                />
              </SettingsRow>
              <SettingsRow icon="icon/wallet" title={t("settings.tb.widgets")} description={t("settings.tb.widgetsDesc")}>
                <ToggleSwitch checked={tb.widgets} onChange={(v) => setTb("widgets", v)} />
              </SettingsRow>
            </SettingsExpander>

            <SettingsExpander title={t("settings.tb.tray")} description={t("settings.tb.trayDesc")}>
              <SettingsRow icon="icon/warning" title={t("settings.tb.heat")} description={t("settings.tb.heatDesc")}>
                <ToggleSwitch checked={tb.heat} onChange={(v) => setTb("heat", v)} />
              </SettingsRow>
              <SettingsRow icon="icon/wifi_1" title={t("settings.tb.networkSound")} description={t("settings.tb.networkSoundDesc")}>
                <ToggleSwitch checked={tb.networkSound} onChange={(v) => setTb("networkSound", v)} />
              </SettingsRow>
              <SettingsRow icon="icon/chevron_up" title={t("settings.tb.hiddenIcons")} description={t("settings.tb.hiddenIconsDesc")}>
                <ToggleSwitch checked={tb.hiddenIcons} onChange={(v) => setTb("hiddenIcons", v)} />
              </SettingsRow>
            </SettingsExpander>

            <SettingsExpander title={t("settings.tb.behaviors")} description={t("settings.tb.behaviorsDesc")} defaultOpen={false}>
              <SettingsRow title={t("settings.tb.align")}>
                <ComboBox
                  value={tb.align}
                  onChange={(v) => setTb("align", v)}
                  width={180}
                  options={[
                    { value: "center", label: t("settings.tb.alignCenter") },
                    { value: "left", label: t("settings.tb.alignLeft") },
                  ]}
                />
              </SettingsRow>
              <SettingsRow title={t("settings.tb.autoHide")}>
                <ToggleSwitch checked={tb.autoHide} onChange={(v) => setTb("autoHide", v)} />
              </SettingsRow>
              <SettingsRow title={t("settings.tb.badges")}>
                <ToggleSwitch checked={tb.badges} onChange={(v) => setTb("badges", v)} />
              </SettingsRow>
              <SettingsRow title={t("settings.tb.seconds")}>
                <ToggleSwitch checked={tb.seconds} onChange={(v) => setTb("seconds", v)} />
              </SettingsRow>
            </SettingsExpander>

            <div className="t-body-strong settings-section">{t("settings.related")}</div>
            <SettingsCard icon="icon/desktop" title={t("settings.page.system")} description={t("settings.tb.relatedSystem")} onClick={() => go("system")} />
            <SettingsCard icon="icon/paint_brush" title={t("settings.page.personalization")} description={t("settings.tb.relatedPersonalization")} onClick={() => go("personalization")} />
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
            <SettingsCard icon="icon/save" title={t("settings.backup")} description={t("settings.backupDesc")}>
              <Button onClick={exportSave}>{t("settings.backupButton")}</Button>
            </SettingsCard>
            <SettingsCard icon="icon/arrow_clockwise" title={t("settings.newGame")} description={t("settings.newGameDesc")}>
              <Button onClick={() => setConfirmReset(true)}>{t("settings.reset")}</Button>
            </SettingsCard>
          </>
        )}

        {page === "apps" && <AppsPage uninstall={win.args?.uninstall} nonce={win.args?.nonce} />}

        {(page === "network" || page === "privacy") && (
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
