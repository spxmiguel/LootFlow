interface ElectronAPI {
  isElectron: true
  openDeviceBrowser: (code: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
