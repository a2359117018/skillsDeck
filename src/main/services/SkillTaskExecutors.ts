import { backgroundTaskService } from './BackgroundTaskService'
import { skillsService } from './SkillsService'

/**
 * Register skill-specific task executors with the BackgroundTaskService.
 * Registers executors for: skill-update, skill-update-all, skill-remove-batch.
 */
export function registerSkillTaskExecutors(): void {
  backgroundTaskService.registerExecutor('skill-update', {
    async execute(taskId, payload) {
      const { packageRef, global } = payload as { packageRef: string; global?: boolean }
      const result = await skillsService.update(packageRef, global)
      if (result.success) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.stderr || '更新失败')
      }
    }
  })

  backgroundTaskService.registerExecutor('skill-update-all', {
    async execute(taskId, payload) {
      const { global } = payload as { global?: boolean }
      const result = await skillsService.updateAll(global)
      if (result.success) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.stderr || '更新失败')
      }
    }
  })

  backgroundTaskService.registerExecutor('skill-remove-batch', {
    async execute(taskId, payload) {
      const { packageRefs, agentFlag, global } = payload as {
        packageRefs: string[]
        agentFlag?: string
        global?: boolean
      }
      const failedNames: string[] = []

      for (const packageRef of packageRefs) {
        try {
          const result = await skillsService.remove(packageRef, agentFlag, global ?? true)
          if (!result.success) {
            failedNames.push(packageRef)
          }
        } catch {
          failedNames.push(packageRef)
        }
      }

      if (failedNames.length === 0) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        const displayed = failedNames.slice(0, 5).join('、')
        const suffix = failedNames.length > 5 ? ` 等 ${failedNames.length} 个技能` : ''
        backgroundTaskService.markError(taskId, `删除失败：${displayed}${suffix}`)
      }
    }
  })
}
