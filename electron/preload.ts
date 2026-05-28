import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true as const,

  /** Opens the user's default browser at the device-code auth URL */
  openDeviceBrowser: (code: string) => ipcRenderer.invoke('auth:open-device-browser', code),
})
