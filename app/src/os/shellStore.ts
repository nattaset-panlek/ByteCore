import { create } from "zustand";
import { saveGame } from "../game/save";

interface ShellStore {
  startOpen: boolean;
  /** Text typed in the taskbar search pill, forwarded to the Start menu search. */
  startQuery: string;
  poweredOff: boolean;
  /** The "Shutting down" screen is up while the save is written (Figma 03). */
  shuttingDown: boolean;
  setStart: (open: boolean, query?: string) => void;
  shutDown: () => void;
  powerOn: () => void;
}

export const useShell = create<ShellStore>((set) => ({
  startOpen: false,
  startQuery: "",
  poweredOff: false,
  shuttingDown: false,
  setStart: (open, query = "") => set({ startOpen: open, startQuery: query }),
  shutDown: async () => {
    set({ startOpen: false, shuttingDown: true });
    await Promise.all([saveGame().catch((e) => console.error("Save on shut down failed", e)), new Promise((r) => setTimeout(r, 1600))]);
    if (window.host) window.host.quit();
    else set({ poweredOff: true, shuttingDown: false }); // browser build: no host to quit
  },
  powerOn: () => set({ poweredOff: false }),
}));
