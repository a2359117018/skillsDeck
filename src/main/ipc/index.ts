import { registerSkillsIpc } from './skills.ipc'
import { registerEnvIpc } from './env.ipc'
import { registerStoreIpc } from './store.ipc'

export function registerIpcHandlers(): void {
  registerSkillsIpc()
  registerEnvIpc()
  registerStoreIpc()
}
