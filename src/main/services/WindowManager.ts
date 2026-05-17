import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function createWindowOptions(opts: {
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  title: string
}): Electron.BrowserWindowConstructorOptions {
  return {
    width: opts.width,
    height: opts.height,
    minWidth: opts.minWidth,
    minHeight: opts.minHeight,
    show: false,
    autoHideMenuBar: true,
    title: opts.title,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  }
}

function loadWindow(win: BrowserWindow, query?: Record<string, string>): void {
  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL']
    const qs = query ? '?' + new URLSearchParams(query).toString() : ''
    win.loadURL(`${base}${qs}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow(
    createWindowOptions({
      width: 1200,
      height: 800,
      minWidth: 1100,
      minHeight: 700,
      title: 'NPX Skills UI'
    })
  )
  loadWindow(mainWindow)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  return mainWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }
  settingsWindow = new BrowserWindow({
    ...createWindowOptions({ width: 600, height: 500, title: 'Settings' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(settingsWindow, { window: 'settings' })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
  return settingsWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
