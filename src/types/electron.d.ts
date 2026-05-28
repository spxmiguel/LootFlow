interface ElectronAPI {
  isElectron: true
  openBrowserLogin: () => Promise<void>
  onAuthCredential: (cb: (data: { idToken: string; accessToken: string | null }) => void) => void
  removeAuthListener: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
