// Line glyphs for the gameplay screens (skill tiles, loadout, tier badges). Drawn in currentColor so
// tile states (learned / available / locked) only change the text colour.

const PATHS: Record<string, string> = {
  code: "M8 7 3 12l5 5M16 7l5 5-5 5",
  document: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  warning: "M12 4 2.5 20h19zM12 10v4M12 17v.5",
  terminal: "M3 5h18v14H3zM7 10l3 2-3 2M12 15h5",
  shield: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  puzzle: "M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z",
  scale: "M12 4v16M6 20h12M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z",
  cpu: "M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  wallet: "M3 7h16v12H3zM3 7l12-3v3M15 12h4v3h-4z",
  cart: "M3 4h3l2 11h10l2-8H7M10 19.5a1 1 0 1 0 0 .1M17 19.5a1 1 0 1 0 0 .1",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  unlock: "M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0",
  lock: "M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4",
  plus: "M12 5v14M5 12h14",
  flag: "M5 21V4h11l-2 4 2 4H5",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8M10 17h4",
  league: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4",
  play: "M8 5v14l11-7z",
  check: "M5 12l5 5L20 7",
  x: "M6 6l12 12M18 6 6 18",
  chat: "M4 5h16v11H9l-5 4z",
  thermo: "M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z",
};

export function Glyph({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`glyph ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? PATHS.grid} />
    </svg>
  );
}
