import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true as const,

  /** Opens the user's default browser to authenticate with Google */
  openBrowserLogin: () => ipcRenderer.invoke('auth:open-browser'),

  /** Listens for the Google credential after the browser auth callback */
  onAuthCredential: (cb: (data: { idToken: string; accessToken: string | null }) => void) => {
    ipcRenderer.on('auth:credential', (_event, data) => cb(data))
  },

  removeAuthListener: () => {
    ipcRenderer.removeAllListeners('auth:credential')
  },
})
