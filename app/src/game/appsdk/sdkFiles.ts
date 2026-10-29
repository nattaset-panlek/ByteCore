import { useGame } from "../store";
import * as vfs from "../vfs";
import guide from "./guide.xpdf?raw";
import hello from "./examples/hello.xjs?raw";

// The player-facing SDK guide and a starter app, put in Documents so the in-game IDE and Text Editor
// can open them. Re-added when the folder is missing (new game, or an older save).

export const SDK_DIR = "C:/Users/ghost_user/Documents/Xea App SDK";
export const SDK_GUIDE_PATH = `${SDK_DIR}/app-sdk-guide.pdf`;
const OLD_GUIDE = `${SDK_DIR}/app-sdk-guide.txt`;

export function ensureSdkFiles() {
  const store = useGame.getState();
  if (vfs.getNode(store.game.fs, SDK_DIR)) {
    // Older saves: the guide became a PDF. Swap in the PDF; drop the old .txt unless the player rewrote it.
    const old = vfs.getNode(store.game.fs, OLD_GUIDE);
    if (old?.type === "file" && old.content?.startsWith("XEA APP SDK")) store.remove(OLD_GUIDE);
    if (!vfs.getNode(store.game.fs, SDK_GUIDE_PATH)) store.writeFile(SDK_GUIDE_PATH, { size: vfs.pdfSize(guide), content: guide });
    return;
  }
  if (!store.mkdir(SDK_DIR).ok) return;
  store.writeFile(SDK_GUIDE_PATH, { size: vfs.pdfSize(guide), content: guide });
  store.writeFile(`${SDK_DIR}/hello.xjs`, { size: 0.01, content: hello });
}
