import { useEffect, useState, type ReactNode } from "react";
import type { PartKind } from "../game/types";
import { SettingsLayout, TitleBar } from "../os/Window";
import { Icon, NavigationViewItem, TextBox } from "../ui";
import { fmt, t, useT } from "../i18n";

// Helpers shared by the app windows.

export const credits = (n: number) => fmt.credits(n);
export const signedCredits = (n: number) => fmt.signedCredits(n);

const pad = (n: number) => String(n).padStart(2, "0");

/** "00:01:23" */
export function duration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "27 Oct 2026" (locale-aware) */
export const date = (ts: number) => fmt.date(ts);

/** "27 Oct 2026 14:32" (locale-aware) */
export const dateTime = (ts: number) => fmt.dateTime(ts);

/** Size in MB -> "3.1 MB" / "1.2 GB" / "12 KB" */
export function fileSize(mb: number): string {
  if (mb >= 1024) return t("common.sizeGB", { size: fmt.number(mb / 1024, 1) });
  if (mb >= 1) return t("common.sizeMB", { size: fmt.number(mb, 1) });
  return t("common.sizeKB", { size: fmt.number(Math.max(1, Math.round(mb * 1024))) });
}

/** Order stage name (0 Ordered .. 3 Delivered). */
export const stageLabel = (stage: number) => t(`common.stage.${stage}`);

/** Rig slot name (Processor, Memory, ...). */
export const slotLabel = (kind: PartKind) => t(`rig.slot.${kind}`);

/** Re-render every `ms` and return the current time (for countdowns). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

export const PART_ICON: Record<PartKind, string> = {
  cpu: "icon/developer_board",
  ram: "icon/table",
  net: "icon/globe",
  disk: "icon/database",
};

/** Page state with back history (for the back button in the TitleBar). */
export function usePages<T extends string>(initial: T) {
  const [page, setPage] = useState<T>(initial);
  const [history, setHistory] = useState<T[]>([]);
  return {
    page,
    go: (p: T) => {
      if (p === page) return;
      setHistory((h) => [...h, page]);
      setPage(p);
    },
    back: history.length
      ? () => {
          setPage(history[history.length - 1]);
          setHistory(history.slice(0, -1));
        }
      : undefined,
  };
}

export interface NavEntry<T extends string> {
  id: T;
  label: string;
  icon: string;
}

/** Settings-style app frame: back TitleBar, 320px nav (header, search, items, Settings at the bottom), page. */
export function NavApp<T extends string>({
  header,
  search,
  items,
  pages,
  title,
  children,
}: {
  header: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  items: NavEntry<T>[];
  pages: ReturnType<typeof usePages<T>>;
  title?: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <>
      <TitleBar onBack={pages.back} />
      <SettingsLayout
        title={title}
        nav={
          <>
            {header}
            {search && <TextBox value={search.value} onChange={search.onChange} placeholder={search.placeholder} icon="icon/search" />}
            <div className="settings-nav-items">
              {items.map((it) => (
                <NavigationViewItem key={it.id} icon={it.icon} label={it.label} selected={it.id === pages.page} onClick={() => pages.go(it.id)} />
              ))}
            </div>
            <span className="spacer" />
            <NavigationViewItem icon="icon/settings" label={t("common.settings")} />
          </>
        }
      >
        {children}
      </SettingsLayout>
    </>
  );
}

/** Header block in the nav: icon tile or initials + name + caption. */
export function NavHeader({ icon, initials, title, caption }: { icon?: string; initials?: string; title: string; caption: string }) {
  return (
    <div className="settings-user">
      {icon ? (
        <span className="nav-tile">
          <Icon name={icon} size={24} />
        </span>
      ) : (
        <span className="person large">{initials}</span>
      )}
      <div>
        <div className="t-body-strong">{title}</div>
        <div className="t-caption c-secondary">{caption}</div>
      </div>
    </div>
  );
}

/** Section header row: title left, optional link right. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="app-section">
      <div className="app-section-head">
        <span className="t-body-strong">{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="link-btn t-caption" onClick={onClick}>
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={32} />
      <div className="t-body-strong">{title}</div>
      {text && <div className="t-caption c-secondary">{text}</div>}
    </div>
  );
}
