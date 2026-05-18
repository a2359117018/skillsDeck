import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import type { ScannedSkill, LocalInstallResult } from '../../../shared/types'

/** 技能安装流程共享逻辑 composable */
export function useSkillInstall(): {
  selectedSkills: import('vue').Ref<string[]>
  selectedAgents: import('vue').Ref<string[]>
  isGlobal: import('vue').Ref<boolean>
  installing: import('vue').Ref<boolean>
  installResult: import('vue').Ref<LocalInstallResult | null>
  tempDir: import('vue').Ref<string>
  hasContent: import('vue').ComputedRef<boolean>
  canInstall: import('vue').ComputedRef<boolean>
  setSkills: (skills: ScannedSkill[]) => void
  setTempDir: (dir: string) => void
  install: () => Promise<LocalInstallResult | null>
  cleanup: () => Promise<void>
  resetResult: () => void
} {
  const selectedSkills = ref<string[]>([])
  const selectedAgents = ref<string[]>([])
  const isGlobal = ref(true)
  const installing = ref(false)
  const installResult = ref<LocalInstallResult | null>(null)
  const tempDir = ref('')

  const hasContent = computed(() => tempDir.value !== '' || selectedSkills.value.length > 0)

  const canInstall = computed(() => {
    if (selectedSkills.value.length === 0) return false
    if (isGlobal.value) return true
    return selectedAgents.value.length > 0
  })

  const message = useMessage()

  /** 设置扫描到的技能列表，默认全选 */
  function setSkills(skills: ScannedSkill[]): void {
    selectedSkills.value = skills.map((s) => s.path)
    selectedAgents.value = []
    isGlobal.value = true
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
      message.warning('请选择要安装的技能和目标 agent')
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
        message.error(
          `安装完成：${result.data.success.length} 个成功，${result.data.failed.length} 个失败`
        )
      } else {
        message.success(`成功安装 ${result.data.success.length} 个技能`)
      }
      return result.data
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      message.error('安装失败: ' + msg)
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
    hasContent,
    canInstall,
    setSkills,
    setTempDir,
    install,
    cleanup,
    resetResult
  }
}
