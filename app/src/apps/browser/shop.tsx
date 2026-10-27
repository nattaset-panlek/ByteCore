import { useMemo, useState, type ReactNode } from "react";
import { TIER_UNLOCK_LEVEL } from "../../game/balance";
import { getModel, SHOP_PARTS } from "../../game/catalog";
import { orderStage } from "../../game/loop";
import { useGame } from "../../game/store";
import type { Order, PartKind, PartModel } from "../../game/types";
import { notify } from "../../os/toasts";
import { useWindows } from "../../os/windowStore";
import { Icon } from "../../ui";
import { credits, dateTime, duration, PART_ICON, slotLabel, stageLabel, useNow } from "../common";
import { appName } from "../../os/apps";
import { tm, useT } from "../../i18n";
import { CATEGORIES, categoryLabel, marketName, NEW_TAB_URL, parseUrl, urls, type Route } from "./routes";
import { useShop } from "./shopStore";
import { Exchange } from "./exchange";

// The shop site. Its own light brand (Web/Market tokens); it does not use the Fluent controls (STYLE_NOTES).

type Nav = (url: string) => void;

export function WebPage({ url, navigate }: { url: string; navigate: Nav }) {
  const route = parseUrl(url);
  if (route.page === "newtab") return <NewTab navigate={navigate} />;
  if (route.page === "exchange") return <Exchange navigate={navigate} />;
  if (route.page === "notfound") return <NotFound url={route.url} navigate={navigate} />;
  return (
    <div className="web">
      <SiteHeader route={route} navigate={navigate} />
      <main className="web-main">
        {route.page === "category" && <CategoryPage kind={route.kind} q={route.q} navigate={navigate} />}
        {route.page === "builder" && <PcBuilder slot={route.slot} navigate={navigate} />}
        {route.page === "orders" && <MyOrders navigate={navigate} />}
      </main>
    </div>
  );
}

/* ---------- Header and category bar ---------- */

function SiteHeader({ route, navigate }: { route: Route; navigate: Nav }) {
  const t = useT();
  const [q, setQ] = useState(route.page === "category" ? route.q : "");
  const count = Object.keys(useShop((s) => s.build)).length;
  const current = route.page === "builder" ? "builder" : route.page === "category" ? route.kind : "";
  return (
    <>
      <header className="web-header">
        <button type="button" className="web-logo" onClick={() => navigate(urls.category("all"))}>
          <span className="web-logo-mark">C</span>
          {marketName()}
        </button>
        <form
          className="web-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(urls.search(q.trim()));
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("shop.searchPlaceholder")} spellCheck={false} />
          <button type="submit" className="web-btn web-btn-primary">
            <Icon name="icon/search" size={14} /> {t("shop.search")}
          </button>
        </form>
        <button type="button" className="web-header-link" onClick={() => navigate(urls.orders())}>
          <Icon name="icon/home" size={16} /> {t("shop.account")}
        </button>
        <button type="button" className="web-header-link" onClick={() => navigate(urls.builder())}>
          <Icon name="icon/developer_board" size={16} /> {t("shop.build")}
          <span className="web-count">{count}</span>
        </button>
      </header>
      <nav className="web-cats">
        <button type="button" className="web-btn web-btn-outline" onClick={() => navigate(urls.category("all"))}>
          <Icon name="icon/grid" size={14} className="wi-brand" /> {t("shop.allCategories")}
        </button>
        <button type="button" className={`web-cat ${current === "builder" ? "on" : ""}`} onClick={() => navigate(urls.builder())}>
          {t("shop.pcBuilder")}
        </button>
        {CATEGORIES.map((c) => (
          <button type="button" key={c.id} className={`web-cat ${current === c.id ? "on" : ""}`} onClick={() => navigate(urls.category(c.id))}>
            {categoryLabel(c.id)}
          </button>
        ))}
        <span className="spacer" />
        <button type="button" className="web-cat" onClick={() => navigate(urls.orders())}>
          {t("shop.trackOrder")}
        </button>
      </nav>
    </>
  );
}

function Crumbs({ items, navigate }: { items: { label: string; url?: string }[]; navigate: Nav }) {
  return (
    <div className="web-crumbs">
      {items.map((it, i) => (
        <span key={it.label}>
          {i > 0 && <span className="web-crumb-sep">/</span>}
          {it.url ? (
            <button type="button" onClick={() => navigate(it.url!)}>
              {it.label}
            </button>
          ) : (
            it.label
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- Product grid ---------- */

type Sort = "price-asc" | "price-desc" | "tier" | "eta";

function useLocked() {
  const level = useGame((s) => s.game.player.level);
  return (m: PartModel) => level < (TIER_UNLOCK_LEVEL[m.tier] ?? 1);
}

function ProductGrid({ kind, q, title, scope, caption }: { kind: PartKind | "all"; q: string; title: string; scope: string; caption?: ReactNode }) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState<Sort>("price-asc");

  const base = SHOP_PARTS.filter((p) => kind === "all" || p.kind === kind);
  const brands = [...new Set(base.map((p) => p.brand))].sort();
  const text = (search || q).toLowerCase();
  const items = useMemo(() => {
    const list = base.filter(
      (p) =>
        (brand === "all" || p.brand === brand) &&
        (tier === "all" || p.tier === Number(tier)) &&
        (!text || `${p.name} ${p.brand} ${p.spec}`.toLowerCase().includes(text))
    );
    const by: Record<Sort, (a: PartModel, b: PartModel) => number> = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      tier: (a, b) => a.tier - b.tier || a.price - b.price,
      eta: (a, b) => a.eta - b.eta,
    };
    return list.sort(by[sort]);
  }, [base, brand, tier, text, sort]);

  return (
    <div className="web-panel">
      <div className="web-panel-head">
        <div>
          <div className="web-h2">{title}</div>
          <div className="web-muted">{caption ?? t("shop.items", { count: items.length })}</div>
        </div>
        <div className="web-input web-input-search">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("shop.searchIn", { scope })} />
          <Icon name="icon/search" size={14} className="wi-muted" />
        </div>
      </div>
      <div className="web-filters">
        <label>
          {t("shop.brand")}
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="all">{t("shop.allBrands")}</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          {t("shop.tierLabel")}
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">{t("shop.allTiers")}</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {t("shop.tier", { tier: n })}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("shop.sortBy")}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="price-asc">{t("shop.sort.priceAsc")}</option>
            <option value="price-desc">{t("shop.sort.priceDesc")}</option>
            <option value="tier">{t("shop.tierLabel")}</option>
            <option value="eta">{t("shop.sort.eta")}</option>
          </select>
        </label>
        <button
          type="button"
          className="web-btn web-btn-ghost"
          onClick={() => {
            setSearch("");
            setBrand("all");
            setTier("all");
            setSort("price-asc");
          }}
        >
          <Icon name="icon/arrow_clockwise" size={14} className="wi-dark" /> {t("shop.reset")}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="web-empty">{t("shop.noProducts")}</div>
      ) : (
        <div className="web-grid">
          {items.map((p) => (
            <ProductCard key={p.id} model={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ model }: { model: PartModel }) {
  const t = useT();
  const { build, add } = useShop();
  const locked = useLocked()(model);
  const inBuild = build[model.kind] === model.id;
  return (
    <div className="web-card">
      <div className="web-card-img">
        <Icon name={PART_ICON[model.kind]} size={40} className="wi-muted" />
      </div>
      <div className="web-card-meta">
        <span>{model.brand.toUpperCase()}</span>
        <span className={`web-rarity r-${model.rarity.toLowerCase()}`}>{t(`ui.rarity.${model.rarity}`)}</span>
      </div>
      <div className="web-card-name">
        {model.name}
        <div className="web-muted">
          {t("shop.specTier", { spec: model.spec, tier: model.tier })}
        </div>
      </div>
      <div className="web-price">{credits(model.price)}</div>
      {locked ? (
        <div className="web-eta warn">{t("shop.preorder", { level: TIER_UNLOCK_LEVEL[model.tier] ?? 1 })}</div>
      ) : (
        <div className="web-eta">{t("shop.deliveryIn", { time: duration(model.eta * 1000) })}</div>
      )}
      {locked ? (
        <button
          type="button"
          className="web-btn web-btn-outline"
          onClick={() => notify({ appId: "browser", title: marketName(), message: t("shop.notifyText", { name: model.name }) })}
        >
          {t("shop.notifyMe")}
        </button>
      ) : (
        <button type="button" className={`web-btn ${inBuild ? "web-btn-outline" : "web-btn-primary"}`} onClick={() => add(model.id)} disabled={inBuild}>
          {inBuild ? t("shop.inBuild") : t("shop.addToBuild")}
        </button>
      )}
    </div>
  );
}

function CategoryPage({ kind, q, navigate }: { kind: PartKind | "all"; q: string; navigate: Nav }) {
  const t = useT();
  const label = q ? t("shop.resultsFor", { q }) : categoryLabel(kind);
  return (
    <>
      <Crumbs items={[{ label: t("shop.home"), url: urls.category("all") }, { label }]} navigate={navigate} />
      <h1 className="web-h1">{label}</h1>
      <ProductGrid key={`${kind}-${q}`} kind={kind} q={q} title={label} scope={label} />
    </>
  );
}

/* ---------- PC Builder ---------- */

function PcBuilder({ slot, navigate }: { slot: PartKind; navigate: Nav }) {
  const t = useT();
  const { build, remove, clear } = useShop();
  const placeOrder = useGame((s) => s.placeOrder);
  const balance = useGame((s) => s.game.wallet.balance);
  const [error, setError] = useState("");
  const models = Object.values(build).map((id) => getModel(id!));
  const total = models.reduce((s, m) => s + m.price, 0);
  const eta = Math.max(0, ...models.map((m) => m.eta));

  const order = () => {
    const r = placeOrder(models.map((m) => m.id));
    if (!r.ok) {
      setError(tm(r.error));
      return;
    }
    clear();
    setError("");
    navigate(urls.orders());
  };

  return (
    <>
      <Crumbs items={[{ label: t("shop.home"), url: urls.category("all") }, { label: t("shop.pcBuilder") }]} navigate={navigate} />
      <h1 className="web-h1">{t("shop.pcBuilder")}</h1>
      <div className="web-builder">
        <aside className="web-builder-side">
          <div className="web-panel">
            <div className="web-summary-head">
              <span className="web-strong">{t("shop.summary")}</span>
              <span className="web-price large">{credits(total)}</span>
            </div>
            <div className="web-muted">
              {t("shop.partsSelected", { n: models.length, total: 4, time: duration(eta * 1000) })}
            </div>
            <div className="web-muted">{t("shop.walletBalance", { amount: credits(balance) })}</div>
            {error && <div className="web-error">{error}</div>}
            <button type="button" className="web-btn web-btn-primary web-btn-block" disabled={models.length === 0} onClick={order}>
              {t("shop.placeOrder")}
            </button>
          </div>
          <div className="web-panel">
            <div className="web-summary-head">
              <span className="web-strong">{t("shop.yourBuild")}</span>
              <button type="button" className="web-link" onClick={clear}>
                {t("shop.reset")}
              </button>
            </div>
            {CATEGORIES.map((c) => {
              const id = build[c.id];
              return (
                <div
                  key={c.id}
                  className={`web-slot ${c.id === slot ? "on" : ""}`}
                  onClick={() => navigate(urls.builder(c.id))}
                  role="button"
                >
                  <span className="web-slot-icon">
                    <Icon name={PART_ICON[c.id]} size={18} className="wi-muted" />
                  </span>
                  <span className="web-slot-text">
                    <span className="web-strong">{slotLabel(c.id)}</span>
                    <span className="web-muted">{id ? getModel(id).name : t(`shop.choose.${c.id}`)}</span>
                  </span>
                  {id ? (
                    <button
                      type="button"
                      className="web-x"
                      aria-label={t("shop.remove")}
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(c.id);
                      }}
                    >
                      ×
                    </button>
                  ) : (
                    <span className="web-muted">0/1</span>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
        <ProductGrid key={slot} kind={slot} q="" title={t("shop.chooseTitle", { slot: slotLabel(slot) })} scope={slotLabel(slot)} />
      </div>
    </>
  );
}

/* ---------- My orders ---------- */

type OrderFilter = "all" | "toShip" | "onTheWay" | "delivered";

export function orderNumber(o: Order): string {
  const n = String(parseInt(o.id.slice(-5), 36) * 97 + (o.placedAt % 10000)).padStart(8, "0").slice(-8);
  return `#${n.slice(0, 4)}-${n.slice(4)}`;
}

function MyOrders({ navigate }: { navigate: Nav }) {
  const t = useT();
  const orders = useGame((s) => s.game.orders);
  const name = useGame((s) => s.game.player.name);
  const now = useNow();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const shown = orders.filter((o) => {
    if (filter === "all") return true;
    if (o.cancelled) return false;
    const st = orderStage(o, now);
    return filter === "toShip" ? st < 2 : filter === "onTheWay" ? st === 2 : st === 3;
  });
  return (
    <div className="web-account">
      <aside className="web-panel web-account-nav">
        <div className="web-account-user">
          <span className="web-avatar">{name.slice(0, 2).toUpperCase()}</span>
          <div>
            <div className="web-strong">{name}</div>
            <div className="web-muted">{t("shop.member")}</div>
          </div>
        </div>
        <button type="button" className="web-account-item on">
          <Icon name="icon/document" size={16} className="wi-brand" /> {t("shop.myOrders")}
        </button>
        <button type="button" className="web-account-item" onClick={() => navigate(urls.builder())}>
          <Icon name="icon/developer_board" size={16} className="wi-muted" /> {t("shop.pcBuilder")}
        </button>
      </aside>
      <div className="web-orders">
        <div className="web-orders-head">
          <h1 className="web-h1">{t("shop.myOrders")}</h1>
          <div className="web-segments">
            {(
              [
                ["all", "shop.filter.all"],
                ["toShip", "shop.filter.toShip"],
                ["onTheWay", "shop.filter.onTheWay"],
                ["delivered", "shop.filter.delivered"],
              ] as const
            ).map(([id, label]) => (
              <button type="button" key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 && <div className="web-panel web-empty">{t("shop.noOrders")}</div>}
        {shown.map((o) => (
          <OrderCard key={o.id} order={o} now={now} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

const STAGE_BADGE = ["ordered", "ordered", "onway", "delivered"];

function OrderCard({ order: o, now, navigate }: { order: Order; now: number; navigate: Nav }) {
  const t = useT();
  const m = getModel(o.modelId);
  const cancelOrder = useGame((s) => s.cancelOrder);
  const add = useShop((s) => s.add);
  const stage = orderStage(o, now);
  const buyAgain = () => {
    add(m.id);
    navigate(urls.builder(m.kind));
  };
  return (
    <div className="web-panel web-order">
      <div className="web-order-head">
        <span className="web-strong">{t("shop.orderNumber", { n: orderNumber(o) })}</span>
        <span className="web-muted">{t("shop.placed", { date: dateTime(o.placedAt) })}</span>
        <span className="spacer" />
        {o.cancelled ? (
          <span className="web-badge cancelled">{t("shop.cancelled")}</span>
        ) : (
          <span className={`web-badge ${STAGE_BADGE[stage]}`}>{stageLabel(stage)}</span>
        )}
      </div>
      <div className="web-order-body">
        <span className="web-slot-icon large">
          <Icon name={PART_ICON[m.kind]} size={22} className="wi-muted" />
        </span>
        <div className="web-order-item">
          <span className="web-strong">{m.name}</span>
          <span className="web-muted">{t("shop.qtyTier", { qty: 1, tier: m.tier })}</span>
          <span className="web-price">{credits(o.price)}</span>
        </div>
        <div className="web-track">
          <div className="web-steps">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`web-step ${!o.cancelled && i <= stage ? "done" : ""}`}>
                <span className="web-step-dot">{!o.cancelled && i <= stage ? "✓" : ""}</span>
                <span className="web-step-label">{stageLabel(i)}</span>
              </div>
            ))}
          </div>
          {o.cancelled ? (
            <span className="web-muted">{t("shop.refunded", { amount: credits(o.price) })}</span>
          ) : stage === 3 ? (
            <span className="web-ok">{t("shop.deliveredAt", { date: dateTime(o.arrivesAt) })}</span>
          ) : (
            <span className={stage === 2 ? "web-warn" : "web-brand"}>{t("shop.arrivesIn", { time: duration(o.arrivesAt - now) })}</span>
          )}
        </div>
        <div className="web-order-actions">
          {!o.cancelled && stage === 3 && !o.claimed && (
            <button type="button" className="web-btn web-btn-primary" onClick={() => useWindows.getState().open("rigManager", { page: "deliveries" })}>
              {t("shop.installIn", { app: appName("rigManager") })}
            </button>
          )}
          {!o.cancelled && stage < 2 && (
            <button type="button" className="web-btn web-btn-outline" onClick={() => cancelOrder(o.id)}>
              {t("shop.cancelOrder")}
            </button>
          )}
          {(o.cancelled || stage === 3) && (
            <button type="button" className="web-btn web-btn-outline" onClick={buyAgain}>
              {t("shop.buyAgain")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- New tab and errors ---------- */

function NewTab({ navigate }: { navigate: Nav }) {
  const t = useT();
  const [q, setQ] = useState("");
  return (
    <div className="newtab">
      <div className="t-title">Core</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate(q.startsWith("core://") ? q : urls.search(q));
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("browser.newTabPlaceholder")} autoFocus spellCheck={false} />
      </form>
      <div className="newtab-links">
        <button type="button" onClick={() => navigate(urls.category("all"))}>
          <span className="web-logo-mark">C</span>
          {marketName()}
        </button>
        <button type="button" onClick={() => navigate(urls.orders())}>
          <span className="web-logo-mark">O</span>
          {t("shop.myOrders")}
        </button>
        <button type="button" onClick={() => navigate(urls.exchange())}>
          <span className="web-logo-mark">E</span>
          {t("exchange.name")}
        </button>
      </div>
    </div>
  );
}

function NotFound({ url, navigate }: { url: string; navigate: Nav }) {
  const t = useT();
  return (
    <div className="newtab">
      <div className="t-subtitle">{t("browser.unreachable")}</div>
      <div className="c-secondary">{t("browser.unreachableText", { url })}</div>
      <button type="button" className="btn btn-standard" onClick={() => navigate(NEW_TAB_URL)}>
        {t("browser.goToNewTab")}
      </button>
    </div>
  );
}
