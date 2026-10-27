import { SAVE_VERSION, TICK_MS } from "./balance";
import { newGame, type GameState } from "./state";
import { useGame } from "./store";

// Save/load in IndexedDB (GDD 7.2), one slot. Autosave at most every AUTOSAVE_MS while the state changes,
// and right away when the window is hidden or closed.

const DB_NAME = "bytecore";
const STORE = "saves";
const SLOT = "slot1";
const AUTOSAVE_MS = 5000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function saveGame(g: GameState = useGame.getState().game): Promise<unknown> {
  return run("readwrite", (s) => s.put(g, SLOT));
}

export async function loadSave(): Promise<GameState | null> {
  const g = await run<GameState | undefined>("readonly", (s) => s.get(SLOT));
  return g ? migrate(g) : null;
}

export function deleteSave(): Promise<unknown> {
  return run("readwrite", (s) => s.delete(SLOT));
}

/** Bring an older save up to the current shape. Missing top-level fields take new-game defaults. */
function migrate(g: GameState): GameState {
  if (g.version === SAVE_VERSION) return g;
  const base = newGame(g.createdAt);
  return { ...base, ...g, wallet: { ...base.wallet, ...g.wallet }, version: SAVE_VERSION };
}

let started = false;

/** Load the save (or create a new game), apply offline progress, then run the 1s loop and autosave. */
export async function startGame(): Promise<void> {
  if (started) return;
  started = true;
  const store = useGame.getState();
  let saved: GameState | null = null;
  try {
    saved = await loadSave();
  } catch (e) {
    console.error("Could not read save", e);
  }
  if (saved) store.load(saved);
  else store.reset();
  useGame.getState().tick(); // offline progress since the last save

  window.setInterval(() => useGame.getState().tick(), TICK_MS);

  let dirty = false;
  let last = 0;
  const flush = () => {
    if (!dirty) return;
    dirty = false;
    last = Date.now();
    saveGame().catch((e) => console.error("Autosave failed", e));
  };
  useGame.subscribe((s, prev) => {
    if (s.game === prev.game) return;
    dirty = true;
    if (Date.now() - last >= AUTOSAVE_MS) flush();
  });
  window.setInterval(flush, AUTOSAVE_MS);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  window.addEventListener("pagehide", flush);
}

/** New game: wipe the save and start over. */
export async function resetGame(): Promise<void> {
  useGame.getState().reset();
  await saveGame();
}
