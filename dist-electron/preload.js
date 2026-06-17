import { contextBridge as o, ipcRenderer as e } from "electron";
o.exposeInMainWorld("electronAPI", {
  isElectron: !0,
  /** Opens the user's default browser for Google login (Epic Games style) */
  openBrowserLogin: () => e.invoke("auth:open-browser"),
  /** Called when the deep-link callback brings back Google tokens */
  onAuthCredential: (r) => {
    e.on("auth:credential", (t, n) => r(n));
  },
  removeAuthListener: () => {
    e.removeAllListeners("auth:credential");
  }
});
