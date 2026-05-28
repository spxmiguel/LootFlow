import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Electron loads the live GitHub Pages app — no local bundling needed.
// This means:
//   • Firebase Auth sees spxmiguel.github.io (authorized domain) → no more unauthorized-domain
//   • App is always up to date without reinstalling
//   • Device code auth flow works out of the box
const APP_URL = 'https://spxmiguel.github.io/LootFlow/app/'

const ICON = app.isPackaged
  ? path.join(process.resourcesPath, 'build-assets/icon-512.png')
  : path.join(__dirname, '../build-assets/icon-512.png')

// Single-instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

let win: BrowserWindow | null = null

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
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.loadURL(APP_URL)
}

// ── IPC ────────────────────────────────────────────────────────────────────
// Opens the user's default browser at the device-code auth page.
// The user logs in with Google there; Electron polls Firestore for completion.
ipcMain.handle('auth:open-device-browser', (_event, code: string) => {
  shell.openExternal(`https://spxmiguel.github.io/LootFlow/app/?device=${code}`)
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

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
