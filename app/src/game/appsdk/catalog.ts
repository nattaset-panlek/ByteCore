import hello from "./examples/hello.xjs?raw";
import notes from "./examples/notes.xjs?raw";
import snake from "./examples/snake.xjs?raw";
import mines from "./examples/mines.xjs?raw";
import breakout from "./examples/breakout.xjs?raw";

// Xea Soft (core://soft): software the player can download in-game. Free items download straight away;
// paid ones are bought once with credits and can then be downloaded again for free.

export const SOFT_URL = "core://soft";
/** In-game download address, also usable with wget: core://soft/dl/<file> */
export const softFileUrl = (file: string) => `${SOFT_URL}/dl/${file}`;

export type SoftCategory = "games" | "tools" | "dev";

export interface SoftItem {
  id: string;
  file: string;
  /** Message keys under soft.item.<id>.* hold the name and blurb */
  category: SoftCategory;
  /** 0 = free */
  price: number;
  author: string;
  source: string;
}

export const SOFT_ITEMS: SoftItem[] = [
  { id: "hello", file: "hello.xjs", category: "dev", price: 0, author: "Xea Labs", source: hello },
  { id: "notes", file: "notes.xjs", category: "tools", price: 0, author: "Xea Labs", source: notes },
  { id: "snake", file: "snake.xjs", category: "games", price: 0, author: "pix3l", source: snake },
  { id: "mines", file: "mines.xjs", category: "games", price: 350, author: "sweeper_co", source: mines },
  { id: "breakout", file: "breakout.xjs", category: "games", price: 800, author: "brickhaus", source: breakout },
];

export const softItem = (id: string) => SOFT_ITEMS.find((i) => i.id === id);

/** Size in MB a download is billed at (the game's file sizes are in MB). */
export const textSizeMB = (text: string) => Math.max(0.01, text.length / 1e6);

/** core://soft/dl/<file> -> the catalog item, or null for other addresses. */
export function softItemForUrl(url: string): SoftItem | null | undefined {
  const m = /^core:\/\/soft\/dl\/([^?#]+)$/i.exec(url.trim());
  if (!m) return null;
  return SOFT_ITEMS.find((i) => i.file.toLowerCase() === decodeURIComponent(m[1]).toLowerCase());
}
