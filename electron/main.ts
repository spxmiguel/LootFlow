import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Electron loads the live GitHub Pages app in production so Firebase Auth sees
// the authorized domain (spxmiguel.github.io). In development, it loads localhost.
const APP_URL = app.isPackaged
  ? 'https://spxmiguel.github.io/LootFlow/app/'
  : 'http://localhost:5173/app/'

// Auth callback URL opened in the user's real browser:
const AUTH_URL = app.isPackaged
  ? 'https://spxmiguel.github.io/LootFlow/app/?electron-auth=1'
  : 'http://localhost:5173/app/?electron-auth=1'

const ICON = app.isPackaged
  ? path.join(process.resourcesPath, 'build-assets/icon-512.png')
  : path.join(__dirname, '../build-assets/icon-512.png')

// Prevent macOS keychain prompt — Chromium's OSCrypt uses the system
// keychain to store its encryption key. --use-mock-keychain replaces that
// with a fixed internal key so the OS never prompts for keychain access.
app.commandLine.appendSwitch('use-mock-keychain')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

let win: BrowserWindow | null = null

// ── Deep-link handler ──────────────────────────────────────────────────────
// Receives lootflow://auth?idToken=...&accessToken=...
// after the user authenticated in their real browser, then forwards
// the tokens to the renderer to sign into Firebase.
function handleDeepLink(url: string) {
  try {
    const u = new URL(url)
    if (u.host === 'auth') {
      const idToken = u.searchParams.get('idToken')
      const accessToken = u.searchParams.get('accessToken')
      if (idToken && win) {
        win.webContents.send('auth:credential', { idToken, accessToken })
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    }
  } catch (e) {
    console.error('[deep-link] parse error:', e)
  }
}

// ── Protocol registration ──────────────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('lootflow', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('lootflow')
}

app.on('second-instance', (_event, commandLine) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  const url = commandLine.find(arg => arg.startsWith('lootflow://'))
  if (url) handleDeepLink(url)
})

app.on('open-url', (_event, url) => {
  handleDeepLink(url)
})

// ── IPC ────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:open-browser', () => {
  shell.openExternal(AUTH_URL)
})

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    title: 'LootFlow',
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
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.loadURL(APP_URL)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
