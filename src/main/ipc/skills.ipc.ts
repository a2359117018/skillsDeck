import { registerSkillsQueryIpc } from './skills-query.ipc'
import { registerSkillsInstallIpc } from './skills-install.ipc'
import { registerSkillsUpdateIpc } from './skills-update.ipc'
import { registerSkillsRemoveIpc } from './skills-remove.ipc'

/**
 * 注册所有技能相关的 IPC handler。
 *
 * 该函数为向后兼容的聚合入口，内部委托给按子域拆分的模块：
 * - skills-query.ipc.ts: 搜索、列表、文档查询
 * - skills-install.ipc.ts: 安装、GitHub/压缩包/本地安装
 * - skills-update.ipc.ts: 更新、后台更新任务
 * - skills-remove.ipc.ts: 删除、批量删除任务
 */
export function registerSkillsIpc(getMainWindow: () => Electron.BrowserWindow | null): void {
  registerSkillsQueryIpc()
  registerSkillsInstallIpc(getMainWindow)
  registerSkillsUpdateIpc()
  registerSkillsRemoveIpc()
}
