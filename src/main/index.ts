import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createMainWindow } from './services/WindowManager'
import { checkAll } from './services/EnvService'
import { registerIpcHandlers } from './ipc'
import { registerSkillTaskExecutors } from './services/SkillTaskExecutors'
import { getSettings, setEnvStatus } from './services/StoreService'

/** Remove leftover skills-* temp directories from previous sessions. */
function cleanupOrphanedTempDirs(): void {
  const tmpDir = os.tmpdir()
  try {
    const entries = fs.readdirSync(tmpDir, { withFileTypes: true })
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        (entry.name.startsWith('skills-github-') || entry.name.startsWith('skills-archive-'))
      ) {
        fs.rmSync(path.join(tmpDir, entry.name), { recursive: true, force: true })
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

app.whenReady().then(() => {
  cleanupOrphanedTempDirs()
  electronApp.setAppUserModelId('com.skilldeck.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  registerSkillTaskExecutors()
  createMainWindow()

  const settings = getSettings()
  if (settings.autoCheckEnv) {
    checkAll().then((status) => {
      setEnvStatus(status)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
