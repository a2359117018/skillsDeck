import { ref, computed } from 'vue'
import { useNotification } from 'naive-ui'
import type { ScannedSkill, LocalInstallResult } from '../../../shared/types'
import { useAgentSelection } from './useAgentSelection'

/** 技能安装流程共享逻辑 composable */
export function useSkillInstall(): {
  selectedSkills: import('vue').Ref<string[]>
  selectedAgents: import('vue').Ref<string[]>
  isGlobal: import('vue').Ref<boolean>
  installing: import('vue').Ref<boolean>
  installResult: import('vue').Ref<LocalInstallResult | null>
  tempDir: import('vue').Ref<string>
  canInstall: import('vue').ComputedRef<boolean>
  setSkills: (skills: ScannedSkill[]) => void
  setTempDir: (dir: string) => void
  install: () => Promise<LocalInstallResult | null>
  cleanup: () => Promise<void>
  resetResult: () => void
} {
  const { selectedAgents, isGlobal, canProceed, reset: resetAgents } = useAgentSelection()
  const selectedSkills = ref<string[]>([])
  const installing = ref(false)
  const installResult = ref<LocalInstallResult | null>(null)
  const tempDir = ref('')

  const canInstall = computed(() => {
    if (selectedSkills.value.length === 0) return false
    return canProceed.value
  })

  const notification = useNotification()

  /** 设置扫描到的技能列表，默认选中常用 agent */
  function setSkills(skills: ScannedSkill[]): void {
    selectedSkills.value = skills.map((s) => s.path)
    resetAgents()
    installing.value = false
    installResult.value = null
  }

  /** 记录临时目录路径 */
  function setTempDir(dir: string): void {
    tempDir.value = dir
  }

  /** 执行安装（不清理临时目录） */
  async function install(): Promise<LocalInstallResult | null> {
    if (!canInstall.value) {
      notification.warning({
        title: '无法安装',
        content: '请选择要安装的技能和目标 agent',
        duration: 5000
      })
      return null
    }
    installing.value = true
    installResult.value = null
    try {
      const result = await window.api.skills.installLocal({
        skillDirs: [...selectedSkills.value],
        agents: isGlobal.value ? [] : [...selectedAgents.value]
      })
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      installResult.value = result.data
      if (result.data.failed.length > 0) {
        const failList = result.data.failed.map((f) => `${f.name}: ${f.error}`).join('\n')
        notification.warning({
          title: '安装部分失败',
          content: `成功 ${result.data.success.length} 个，失败 ${result.data.failed.length} 个\n${failList}`,
          duration: 0
        })
      } else {
        notification.success({
          title: '安装成功',
          content: `成功安装 ${result.data.success.length} 个技能`,
          duration: 3000
        })
      }
      return result.data
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      notification.error({
        title: '安装失败',
        content: msg,
        duration: 0
      })
      return null
    } finally {
      installing.value = false
    }
  }

  /** 清理临时目录 */
  async function cleanup(): Promise<void> {
    if (tempDir.value) {
      try {
        await window.api.skills.cleanupTemp([tempDir.value])
      } catch {
        // ignore cleanup errors
      }
      tempDir.value = ''
      selectedSkills.value = []
      resetAgents()
      installResult.value = null
    }
  }

  /** 清除安装结果 */
  function resetResult(): void {
    installResult.value = null
  }

  return {
    selectedSkills,
    selectedAgents,
    isGlobal,
    installing,
    installResult,
    tempDir,
    canInstall,
    setSkills,
    setTempDir,
    install,
    cleanup,
    resetResult
  }
}
