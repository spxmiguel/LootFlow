import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
// ├─┬─┬ dist
// │ │ └── index.html
// ├─┬ dist-electron
// │ └── main.js
const DIST = path.join(__dirname, '../dist')

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    title: 'LootFlow',
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    // icon: path.join(__dirname, '../public/icon.png'), // Uncomment and add your icon file
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Load the Vite-built index.html
  win.loadFile(path.join(DIST, 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running until the user quits explicitly with Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
