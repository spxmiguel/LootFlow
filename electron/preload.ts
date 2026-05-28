import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true as const,

  /** Opens the user's default browser for Google login (Epic Games style) */
  openBrowserLogin: () => ipcRenderer.invoke('auth:open-browser'),

  /** Called when the deep-link callback brings back Google tokens */
  onAuthCredential: (cb: (data: { idToken: string; accessToken: string | null }) => void) => {
    ipcRenderer.on('auth:credential', (_event, data) => cb(data))
  },

  removeAuthListener: () => {
    ipcRenderer.removeAllListeners('auth:credential')
  },
})
