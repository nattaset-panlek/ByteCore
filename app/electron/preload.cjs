const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("host", {
  quit: () => ipcRenderer.send("app:quit"),
  toggleFullscreen: () => ipcRenderer.send("app:fullscreen"),
});
