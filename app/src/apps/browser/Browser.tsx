import { useEffect, useRef, useState } from "react";
import { TabRow, useWindow } from "../../os/Window";
import { Icon, IconButton, TabViewItem } from "../../ui";
import { HOME_URL, NEW_TAB_URL, pageTitle } from "./routes";
import { WebPage } from "./shop";
import { useT } from "../../i18n";

interface Tab {
  id: number;
  history: string[];
  index: number;
}

let tabSeq = 0;
const newTab = (url: string): Tab => ({ id: ++tabSeq, history: [url], index: 0 });

/** Browser (Core html): tabs, address row, simulated sites. Launch arg `url` opens that address. */
export function Browser() {
  const tr = useT();
  const { win } = useWindow();
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab(win.args?.url ?? HOME_URL)]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [reloadKey, setReloadKey] = useState(0);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const url = active.history[active.index];
  const [address, setAddress] = useState(url);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAddress(url);
  }, [url]);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [url, activeId]);

  const updateActive = (fn: (t: Tab) => Tab) => setTabs((ts) => ts.map((t) => (t.id === active.id ? fn(t) : t)));

  const navigate = (to: string) => {
    if (to === url) return;
    updateActive((t) => ({ ...t, history: [...t.history.slice(0, t.index + 1), to], index: t.index + 1 }));
  };

  // Re-opening the Browser with a url (e.g. Track from Rig Manager) navigates the active tab.
  const nonce = win.args?.nonce;
  const argUrl = win.args?.url;
  const seenNonce = useRef(nonce);
  useEffect(() => {
    if (nonce === seenNonce.current || !argUrl) return;
    seenNonce.current = nonce;
    navigate(argUrl);
  });

  const addTab = () => {
    const t = newTab(NEW_TAB_URL);
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
  };

  const closeTab = (id: number) => {
    const i = tabs.findIndex((t) => t.id === id);
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    if (id === activeId) setActiveId(rest[Math.max(0, i - 1)].id);
  };

  return (
    <>
      <TabRow onNewTab={addTab}>
        {tabs.map((t) => (
          <TabViewItem
            key={t.id}
            icon="icon/globe"
            label={pageTitle(t.history[t.index])}
            selected={t.id === active.id}
            onClick={() => setActiveId(t.id)}
            onClose={tabs.length > 1 ? () => closeTab(t.id) : undefined}
          />
        ))}
      </TabRow>
      <div className="browser-bar">
        <IconButton
          icon="icon/arrow_left"
          label={tr("browser.back")}
          disabled={active.index === 0}
          onClick={() => updateActive((t) => ({ ...t, index: t.index - 1 }))}
        />
        <IconButton icon="icon/arrow_clockwise" label={tr("browser.refresh")} onClick={() => setReloadKey((k) => k + 1)} />
        <IconButton icon="icon/home" label={tr("browser.home")} onClick={() => navigate(HOME_URL)} />
        <form
          className="browser-address"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(address.trim() || HOME_URL);
          }}
        >
          <Icon name="icon/lock_closed" size={12} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} onFocus={(e) => e.target.select()} spellCheck={false} />
        </form>
        <IconButton icon="icon/more_horizontal" label={tr("browser.more")} />
      </div>
      <div className="browser-view" ref={scrollRef}>
        <WebPage key={`${active.id}-${reloadKey}`} url={url} navigate={navigate} />
      </div>
    </>
  );
}
