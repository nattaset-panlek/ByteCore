import { useState } from "react";
import { SettingsLayout, TitleBar } from "../os/Window";
import { resetGame } from "../game/save";
import { useWindows } from "../os/windowStore";
import { Button, CheckBox, ComboBox, ContentDialog, NavigationViewItem, SettingsCard, TextBox, ToggleSwitch } from "../ui";
import { LOCALES, useI18n, useT, type Locale } from "../i18n";

const PAGES = [
  { id: "home", label: "settings.page.home", icon: "icon/home" },
  { id: "system", label: "settings.page.system", icon: "icon/desktop" },
  { id: "rig", label: "settings.page.rig", icon: "icon/developer_board" },
  { id: "network", label: "settings.page.network", icon: "icon/wifi_1" },
  { id: "personalization", label: "settings.page.personalization", icon: "icon/paint_brush" },
  { id: "apps", label: "settings.page.apps", icon: "icon/grid" },
  { id: "privacy", label: "settings.page.privacy", icon: "icon/lock_closed" },
] as const;

type PageId = (typeof PAGES)[number]["id"];

/** Settings placeholder: shows the Settings layout with placeholder rows. Real settings come in Phase 7. */
export function SettingsApp() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const setLocale = useI18n((s) => s.setLocale);
  const [page, setPage] = useState<PageId>("home");
  const [history, setHistory] = useState<PageId[]>([]);
  const [find, setFind] = useState("");
  const [toggle, setToggle] = useState(true);
  const [check, setCheck] = useState(false);
  const [mode, setMode] = useState<"dark" | "light">("dark");
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
          <SettingsCard icon="icon/globe" title={t("settings.language")} description={t("settings.languageDesc")}>
            <ComboBox
              value={locale}
              onChange={setLocale}
              options={(Object.keys(LOCALES) as Locale[]).map((l) => ({ value: l, label: LOCALES[l].label }))}
            />
          </SettingsCard>
        )}
        {page === "system" && (
          <SettingsCard icon="icon/arrow_clockwise" title={t("settings.newGame")} description={t("settings.newGameDesc")}>
            <Button onClick={() => setConfirmReset(true)}>{t("settings.reset")}</Button>
          </SettingsCard>
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
        <SettingsCard icon="icon/settings" title={t("settings.placeholderSetting")} description={t("settings.placeholderDesc")}>
          <ToggleSwitch checked={toggle} onChange={setToggle} />
        </SettingsCard>
        <SettingsCard icon="icon/color" title={t("settings.colorMode")} description={t("settings.placeholderOption")}>
          <ComboBox
            value={mode}
            onChange={setMode}
            options={[
              { value: "dark", label: t("settings.dark") },
              { value: "light", label: t("settings.light") },
            ]}
          />
        </SettingsCard>
        <SettingsCard icon="icon/info" title={t("settings.anotherSetting")}>
          <CheckBox checked={check} onChange={setCheck} label={t("settings.enabled")} />
        </SettingsCard>
        <SettingsCard icon="icon/folder" title={t("settings.openSubPage")} description={t("settings.placeholderLink")} onClick={() => go("system")} />
      </SettingsLayout>
    </>
  );
}
