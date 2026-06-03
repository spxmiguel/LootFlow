import { app as e, ipcMain as d, shell as h, Menu as u, BrowserWindow as r } from "electron";
import { fileURLToPath as f } from "node:url";
import i from "node:path";
const c = i.dirname(f(import.meta.url)), g = e.isPackaged ? "https://spxmiguel.github.io/LootFlow/app/" : "http://localhost:5173/app/", m = e.isPackaged ? "https://spxmiguel.github.io/LootFlow/app/?electron-auth=1" : "http://localhost:5173/app/?electron-auth=1", w = e.isPackaged ? i.join(process.resourcesPath, "build-assets/icon-512.png") : i.join(c, "../build-assets/icon-512.png");
e.commandLine.appendSwitch("use-mock-keychain");
const k = e.requestSingleInstanceLock();
k || e.quit();
let o = null;
function p(s) {
  try {
    const t = new URL(s);
    if (t.host === "auth") {
      const n = t.searchParams.get("idToken"), a = t.searchParams.get("accessToken");
      n && o && (o.webContents.send("auth:credential", { idToken: n, accessToken: a }), o.isMinimized() && o.restore(), o.focus());
    }
  } catch (t) {
    console.error("[deep-link] parse error:", t);
  }
}
process.defaultApp ? process.argv.length >= 2 && e.setAsDefaultProtocolClient("lootflow", process.execPath, [i.resolve(process.argv[1])]) : e.setAsDefaultProtocolClient("lootflow");
e.on("second-instance", (s, t) => {
  o && (o.isMinimized() && o.restore(), o.focus());
  const n = t.find((a) => a.startsWith("lootflow://"));
  n && p(n);
});
e.on("open-url", (s, t) => {
  p(t);
});
d.handle("auth:open-browser", () => {
  h.openExternal(m);
});
function l() {
  o = new r({
    title: "LootFlow",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: w,
    autoHideMenuBar: !0,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      // sandbox: false is required for ESM preload scripts (import syntax) to
      // work correctly. Electron v20+ defaults sandbox to true, which breaks
      // ESM module loading in the preload — contextBridge.exposeInMainWorld
      // never runs and window.electronAPI stays undefined in the renderer.
      sandbox: !1,
      backgroundThrottling: !1,
      preload: i.join(c, "preload.js")
    }
  }), o.loadURL(g);
}
e.whenReady().then(() => {
  u.setApplicationMenu(null), l(), e.on("activate", () => {
    r.getAllWindows().length === 0 && l();
  });
});
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
