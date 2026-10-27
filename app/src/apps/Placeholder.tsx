import { useState } from "react";
import { APPS, appName } from "../os/apps";
import { useWindow, TabRow } from "../os/Window";
import { notify } from "../os/toasts";
import { Button, Icon, InfoBar, TabViewItem } from "../ui";
import { useT } from "../i18n";

/** Empty app body used until the real app screen is built. */
export function PlaceholderBody() {
  const t = useT();
  const { win } = useWindow();
  const app = APPS[win.appId];
  const name = appName(win.appId);
  const [info, setInfo] = useState(true);
  return (
    <div className="placeholder">
      {info && (
        <InfoBar
          severity="info"
          title={t("placeholder.preview")}
          message={t("placeholder.notAvailable", { app: name })}
          onClose={() => setInfo(false)}
        />
      )}
      <div className="placeholder-center">
        <Icon name={app.icon} size={64} />
        <div className="t-subtitle">{name}</div>
        <div className="t-body c-secondary">{t("placeholder.content")}</div>
        <Button
          onClick={() =>
            notify({
              appId: win.appId,
              title: t("placeholder.testTitle"),
              message: t("placeholder.testMessage"),
              actions: [{ label: t("toast.openApp", { app: name }) }, { label: t("toast.dismiss") }],
            })
          }
        >
          {t("placeholder.sendTest")}
        </Button>
      </div>
    </div>
  );
}

/** Placeholder for tab-row apps (Terminal, Browser, File Explorer). */
export function TabbedPlaceholder() {
  useT();
  const { win } = useWindow();
  const app = APPS[win.appId];
  const name = appName(win.appId);
  const [tabs, setTabs] = useState([1]);
  const [current, setCurrent] = useState(1);
  const next = () => Math.max(0, ...tabs) + 1;
  return (
    <>
      <TabRow
        onNewTab={() => {
          const n = next();
          setTabs([...tabs, n]);
          setCurrent(n);
        }}
      >
        {tabs.map((t) => (
          <TabViewItem
            key={t}
            icon={app.icon}
            label={tabs.length > 1 ? `${name} ${t}` : name}
            selected={t === current}
            onClick={() => setCurrent(t)}
            onClose={
              tabs.length > 1
                ? () => {
                    const rest = tabs.filter((x) => x !== t);
                    setTabs(rest);
                    if (current === t) setCurrent(rest[rest.length - 1]);
                  }
                : undefined
            }
          />
        ))}
      </TabRow>
      <div className="tab-content">
        <PlaceholderBody />
      </div>
    </>
  );
}
