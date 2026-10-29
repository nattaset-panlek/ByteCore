import { MAX_DOWNLOAD_BYTES } from "../../game/appsdk/jobs";
import { useGame } from "../../game/store";
import * as vfs from "../../game/vfs";
import { t, tm } from "../../i18n";
import { notify } from "../../os/toasts";
import { useWindows } from "../../os/windowStore";

// Import text files (.xjs, .js, .txt...) from the player's real computer into the virtual drive.

/** Open the browser's file picker and copy the chosen text files into a VFS folder. */
export function pickLocalFiles(destDir: string) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".xjs,.js,.txt,.css,.json,.md,text/*";
  input.onchange = () => void importFiles([...(input.files ?? [])], destDir);
  input.click();
}

export async function importFiles(files: File[], destDir: string) {
  const store = useGame.getState;
  for (const f of files) {
    if (f.size > MAX_DOWNLOAD_BYTES) {
      notify({ appId: "explorer", title: t("sdk.import.failed", { name: f.name }), message: t("sdk.err.tooBig") });
      continue;
    }
    const content = await f.text();
    const dir = vfs.getNode(store().game.fs, destDir);
    const clean = f.name.replace(/[<>:"|?*\\/]/g, "") || "imported.xjs";
    const name = dir?.type === "dir" && dir.children[clean] ? vfs.copyName(dir, clean) : clean;
    const path = `${destDir}/${name}`;
    const r = store().writeFile(path, { size: Math.max(0.001, content.length / 1e6), content });
    if (!r.ok) {
      notify({ appId: "explorer", title: t("sdk.import.failed", { name: f.name }), message: tm(r.error) });
      continue;
    }
    notify({
      appId: "explorer",
      title: t("sdk.import.done", { name }),
      message: destDir,
      actions: [{ label: t("ctx.open"), onClick: () => useWindows.getState().open("explorer", { path: destDir }) }, { label: t("toast.dismiss") }],
    });
  }
}
