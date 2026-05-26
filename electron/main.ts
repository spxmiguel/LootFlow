import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'
import fs from 'node:fs'
import type { AddressInfo } from 'node:net'

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

// ── Local HTTP server ──────────────────────────────────────────────────────
// Firebase Auth rejects file:// origins as "unauthorized domain".
// Serving from http://127.0.0.1 (localhost) — already in Firebase's
// authorized domains list — fixes signInWithCredential in production.
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
}

function startLocalServer(root: string): Promise<string> {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = (req.url ?? '/').split('?')[0]
      const filePath = path.join(root, url === '/' ? 'index.html' : url)
      try {
        const data = fs.readFileSync(filePath)
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
        res.end(data)
      } catch {
        // SPA fallback: unknown routes → index.html
        try {
          const data = fs.readFileSync(path.join(root, 'index.html'))
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(data)
        } catch {
          res.writeHead(404); res.end('Not found')
        }
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve(`http://127.0.0.1:${port}`)
    })
  })
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow(baseUrl: string) {
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

  // Load React SPA via local HTTP server (Firebase Auth requires http:// origin)
  win.loadURL(baseUrl)
}

app.whenReady().then(async () => {
  // Remove native menu bar (File / Edit / View / Window) on all platforms
  Menu.setApplicationMenu(null)
  // Start local HTTP server before creating window so Firebase Auth
  // sees http://127.0.0.1 (authorized) instead of file:// (blocked).
  const baseUrl = await startLocalServer(path.join(DIST, 'app'))
  createWindow(baseUrl)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(baseUrl)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
