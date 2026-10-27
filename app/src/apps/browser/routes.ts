import type { PartKind } from "../../game/types";
import { t } from "../../i18n";

// Simulated web addresses (GDD 3.7: the Browser shows "Core html" sites, no real internet).

export const HOME_URL = "core://market";
export const EXCHANGE_URL = "core://exchange";
export const NEW_TAB_URL = "core://newtab";
/** Shop site name (translated). */
export const marketName = () => t("shop.marketName");
export const exchangeName = () => t("exchange.name");

/** Shop categories. Display names: categoryLabel(id) (plural, "Processors") and slotLabel(id) from ../common (singular). */
export const CATEGORIES: { id: PartKind }[] = [{ id: "cpu" }, { id: "ram" }, { id: "net" }, { id: "disk" }];

export const categoryLabel = (kind: PartKind | "all") => t(`shop.cat.${kind}`);

export type Route =
  | { page: "newtab" }
  | { page: "category"; kind: PartKind | "all"; q: string }
  | { page: "builder"; slot: PartKind }
  | { page: "orders" }
  | { page: "exchange" }
  | { page: "notfound"; url: string };

const KINDS = ["cpu", "ram", "net", "disk"];

export function parseUrl(raw: string): Route {
  const url = raw.trim();
  if (url === NEW_TAB_URL) return { page: "newtab" };
  if (url === EXCHANGE_URL || url === `${EXCHANGE_URL}/`) return { page: "exchange" };
  const m = /^core:\/\/market(\/[^?]*)?(\?.*)?$/.exec(url);
  if (!m) return { page: "notfound", url };
  const path = (m[1] ?? "/").replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(m[2] ?? "");
  if (path === "/") return { page: "category", kind: "all", q: "" };
  if (path === "/search") return { page: "category", kind: "all", q: params.get("q") ?? "" };
  if (path === "/pc-builder") {
    const slot = params.get("slot") ?? "cpu";
    return { page: "builder", slot: (KINDS.includes(slot) ? slot : "cpu") as PartKind };
  }
  if (path === "/account/orders") return { page: "orders" };
  const c = /^\/c\/(\w+)$/.exec(path);
  if (c && (c[1] === "all" || KINDS.includes(c[1]))) return { page: "category", kind: c[1] as PartKind | "all", q: params.get("q") ?? "" };
  return { page: "notfound", url };
}

export const urls = {
  category: (kind: PartKind | "all") => `${HOME_URL}/c/${kind}`,
  search: (q: string) => `${HOME_URL}/search?q=${encodeURIComponent(q)}`,
  builder: (slot: PartKind = "cpu") => `${HOME_URL}/pc-builder?slot=${slot}`,
  orders: () => `${HOME_URL}/account/orders`,
  exchange: () => EXCHANGE_URL,
};

export function pageTitle(url: string): string {
  const r = parseUrl(url);
  switch (r.page) {
    case "newtab":
      return t("browser.newTab");
    case "builder":
      return t("shop.pageTitle", { site: marketName(), page: t("shop.pcBuilder") });
    case "orders":
      return t("shop.pageTitle", { site: marketName(), page: t("shop.myOrders") });
    case "exchange":
      return exchangeName();
    case "category":
      if (r.q) return t("shop.pageTitle", { site: marketName(), page: t("shop.search") });
      return t("shop.pageTitle", { site: marketName(), page: categoryLabel(r.kind) });
    case "notfound":
      return t("browser.notFoundTitle");
  }
}
