import { app, ipcMain, shell, Menu, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = app.isPackaged ? "https://spxmiguel.github.io/LootFlow/app/" : "http://localhost:5173/app/";
const AUTH_URL = app.isPackaged ? "https://spxmiguel.github.io/LootFlow/app/?electron-auth=1" : "http://localhost:5173/app/?electron-auth=1";
const ICON = app.isPackaged ? path.join(process.resourcesPath, "build-assets/icon-512.png") : path.join(__dirname$1, "../build-assets/icon-512.png");
app.commandLine.appendSwitch("use-mock-keychain");
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let win = null;
function handleDeepLink(url) {
  try {
    const u = new URL(url);
    if (u.host === "auth") {
      const idToken = u.searchParams.get("idToken");
      const accessToken = u.searchParams.get("accessToken");
      if (idToken && win) {
        win.webContents.send("auth:credential", { idToken, accessToken });
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    }
  } catch (e) {
    console.error("[deep-link] parse error:", e);
  }
}
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("lootflow", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("lootflow");
}
app.on("second-instance", (_event, commandLine) => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
  const url = commandLine.find((arg) => arg.startsWith("lootflow://"));
  if (url) handleDeepLink(url);
});
app.on("open-url", (_event, url) => {
  handleDeepLink(url);
});
ipcMain.handle("auth:open-browser", () => {
  shell.openExternal(AUTH_URL);
});
function createWindow() {
  win = new BrowserWindow({
    title: "LootFlow",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: ICON,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false is required for ESM preload scripts (import syntax) to
      // work correctly. Electron v20+ defaults sandbox to true, which breaks
      // ESM module loading in the preload — contextBridge.exposeInMainWorld
      // never runs and window.electronAPI stays undefined in the renderer.
      sandbox: false,
      backgroundThrottling: false,
      preload: path.join(__dirname$1, "preload.js")
    }
  });
  win.loadURL(APP_URL);
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
