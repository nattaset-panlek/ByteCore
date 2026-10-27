import { create } from "zustand";
import { getModel } from "../../game/catalog";
import type { PartKind } from "../../game/types";

/** The PC Builder build, shared by every Browser tab. It is also the shop's cart. Not saved. */
interface ShopStore {
  build: Partial<Record<PartKind, string>>;
  add: (modelId: string) => void;
  remove: (kind: PartKind) => void;
  clear: () => void;
}

export const useShop = create<ShopStore>((set) => ({
  build: {},
  add: (modelId) => set((s) => ({ build: { ...s.build, [getModel(modelId).kind]: modelId } })),
  remove: (kind) =>
    set((s) => {
      const build = { ...s.build };
      delete build[kind];
      return { build };
    }),
  clear: () => set({ build: {} }),
}));
