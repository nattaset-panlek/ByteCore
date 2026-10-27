import { create } from "zustand";
import { saveGame } from "../game/save";

interface ShellStore {
  startOpen: boolean;
  /** Text typed in the taskbar search pill, forwarded to the Start menu search. */
  startQuery: string;
  poweredOff: boolean;
  setStart: (open: boolean, query?: string) => void;
  shutDown: () => void;
  powerOn: () => void;
}

export const useShell = create<ShellStore>((set) => ({
  startOpen: false,
  startQuery: "",
  poweredOff: false,
  setStart: (open, query = "") => set({ startOpen: open, startQuery: query }),
  shutDown: async () => {
    set({ startOpen: false });
    await saveGame().catch((e) => console.error("Save on shut down failed", e));
    if (window.host) window.host.quit();
    else set({ poweredOff: true }); // browser dev build: no host to quit
  },
  powerOn: () => set({ poweredOff: false }),
}));
