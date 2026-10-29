import type { OutLine } from "../terminal/commands";

// Lines other windows print into the Terminal (e.g. Lockgrid's "ready" banner). The first local shell shows them.

type Listener = (lines: OutLine[]) => void;
const listeners = new Set<Listener>();

export function onTerminalLines(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitTerminal(lines: OutLine[]) {
  for (const fn of listeners) fn(lines);
}
