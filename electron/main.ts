import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// dist/app/index.html — React SPA (dist/index.html is the landing page, do NOT load that)
const DIST = path.join(__dirname, '../dist')
const ICON = app.isPackaged
  ? path.join(process.resourcesPath, 'build-assets/icon-512.png')
  : path.join(__dirname, '../build-assets/icon-512.png')

// Single-instance lock — required for Windows deep-link handling
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let win: BrowserWindow | null = null

// ── Deep-link handler ──────────────────────────────────────────────────────
// Receives lootflow://auth-callback?idToken=...&accessToken=...
// after the user authenticated in their real browser, then forwards
// the Google credential to the renderer to sign into Firebase.
function handleDeepLink(url: string) {
  try {
    const u = new URL(url)
    if (u.host === 'auth-callback') {
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

// Windows: deep link arrives as second-instance argv
app.on('second-instance', (_event, commandLine) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  const url = commandLine.find(arg => arg.startsWith('lootflow://'))
  if (url) handleDeepLink(url)
})

// macOS: deep link arrives via open-url
app.on('open-url', (_event, url) => {
  handleDeepLink(url)
})

// ── IPC ────────────────────────────────────────────────────────────────────
// Renderer calls this when user wants to login — opens their real browser
ipcMain.handle('auth:open-browser', () => {
  shell.openExternal('https://spxmiguel.github.io/LootFlow/app/?electron-cb=1')
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
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Load React SPA — NOT dist/index.html (that's the landing page)
  win.loadFile(path.join(DIST, 'app', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
