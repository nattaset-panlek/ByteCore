import { create } from "zustand";
import type { MouseEvent as RMouseEvent } from "react";

// A shared right-click context menu (Xea OS). Any component builds an item list and calls openContextMenu.

export interface MenuItem {
  /** Omit label for a separator. */
  label?: string;
  icon?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
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
  if (usable.length) useContextMenu.getState().show(e.clientX, e.clientY, usable);
}
