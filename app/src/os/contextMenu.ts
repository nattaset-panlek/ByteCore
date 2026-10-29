import { create } from "zustand";
import { toStage } from "./stage";
import type { MouseEvent as RMouseEvent } from "react";

// A shared menu flyout (Xea OS): right-click menus and command-bar dropdowns. Any component builds an
// item list and calls openContextMenu (at the cursor) or openMenuBelow (under a button).

export interface MenuItem {
  /** Omit label (and toolbar) for a separator. */
  label?: string;
  icon?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Keyboard hint on the right, e.g. "Ctrl+Z". */
  shortcut?: string;
  /** Radio choice: a dot marks the current one (View, Sort by). */
  radio?: boolean;
  /** Toggle: a check marks it on (Show > Hidden items). With radio, the dot. */
  checked?: boolean;
  /** Opens a side menu on hover. */
  submenu?: MenuItem[];
  /** Icon-only quick actions shown as a row at the top (Cut, Copy, Rename, Delete). */
  toolbar?: MenuItem[];
}

export const separator: MenuItem = {};

interface ContextMenuStore {
  menu: { x: number; y: number; items: MenuItem[] } | null;
  show: (x: number, y: number, items: MenuItem[]) => void;
  close: () => void;
}

export const useContextMenu = create<ContextMenuStore>((set) => ({
  menu: null,
  show: (x, y, items) => set({ menu: { x, y, items } }),
  close: () => set({ menu: null }),
}));

/** Open a context menu at the cursor from a React onContextMenu handler. */
export function openContextMenu(e: RMouseEvent, items: MenuItem[]) {
  e.preventDefault();
  e.stopPropagation();
  const usable = items.filter(Boolean);
  if (!usable.length) return;
  const p = toStage(e.clientX, e.clientY);
  useContextMenu.getState().show(p.x, p.y, usable);
}

/** Open a dropdown menu under a command-bar button. */
export function openMenuBelow(el: HTMLElement, items: MenuItem[]) {
  const r = el.getBoundingClientRect();
  const p = toStage(r.left, r.bottom + 4);
  useContextMenu.getState().show(p.x, p.y, items.filter(Boolean));
}
