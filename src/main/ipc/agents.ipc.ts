import { ipcMain } from 'electron'
import { agentScanner } from '../services/AgentScanner'

export function registerAgentsIpc(): void {
  ipcMain.handle('agent:scan-all', async () => {
    try {
      return { ok: true, data: await agentScanner.scanAll() }
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN' as const,
          command: '',
          stderr: '',
          exitCode: null,
          message: e instanceof Error ? e.message : String(e)
        }
      }
    }
  })

  ipcMain.handle('agent:scan-one', async (_, agentFlag: string) => {
    try {
      return { ok: true, data: await agentScanner.scanAgent(agentFlag) }
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN' as const,
          command: '',
          stderr: '',
          exitCode: null,
          message: e instanceof Error ? e.message : String(e)
        }
      }
    }
  })
}
