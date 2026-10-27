// Electron entry: one frameless-free fullscreen-ish window that hosts the Xea OS desktop.
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#1a2340",
    autoHideMenuBar: true,
    title: "ByteCore",
    webPreferences: { preload: path.join(__dirname, "preload.cjs") },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

ipcMain.on("app:quit", () => app.quit());
ipcMain.on("app:fullscreen", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.setFullScreen(!w.isFullScreen());
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
