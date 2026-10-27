// Simple 16px line glyphs for the Task Manager nav (STYLE_NOTES: Task Manager uses vector glyphs).

const PATHS: Record<string, string> = {
  menu: "M2.5 4.5h11M2.5 8h11M2.5 11.5h11",
  grid: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  chart: "M2.5 13.5h11M4 12V8M7 12V4M10 12V7M13 12V9.5",
  clock: "M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11M8 5v3.2l2.2 1.4",
  bolt: "M9 2 4 9h3.5L7 14l5-7H8.5z",
  user: "M8 3a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M3 13.5c.6-2.4 2.6-3.7 5-3.7s4.4 1.3 5 3.7",
  details: "M3.5 2.5h9v11h-9zM5.5 5.5h5M5.5 8h5M5.5 10.5h3",
  services: "M8 2 13 5v6l-5 3-5-3V5zM8 6.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3",
  chevron: "M6 4l4 4-4 4",
};

export function Glyph({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
