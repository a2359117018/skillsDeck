import { useDialog } from 'naive-ui'
import { h } from 'vue'

export function useConfirm(): {
  confirmInstall: (name: string) => Promise<boolean>
  confirmUpdate: (name: string) => Promise<boolean>
  confirmRemove: (name: string) => Promise<boolean>
  confirmUpdateAll: (names: string[]) => Promise<boolean>
  confirmUpdateEnv: (name: string, version: string) => Promise<boolean>
} {
  const dialog = useDialog()

  function confirmInstall(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.info({
        title: '安装确认',
        content: `要安装「${name}」技能吗？`,
        positiveText: '安装',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmUpdate(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.info({
        title: '更新确认',
        content: `要更新「${name}」技能吗？`,
        positiveText: '更新',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmRemove(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.warning({
        title: '删除确认',
        content: `删除「${name}」技能后无法恢复，确认删除吗？`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmUpdateAll(names: string[]): Promise<boolean> {
    const maxShow = 10
    const displayed = names.slice(0, maxShow).join('、')
    const suffix =
      names.length > maxShow ? `...等 ${names.length} 个技能` : `共 ${names.length} 个技能`

    const contentVNode = h('div', [
      h('p', { style: 'margin-bottom: 8px' }, '要更新以下技能吗？'),
      h('p', { class: 'confirm-skill-list' }, displayed),
      h('p', { class: 'confirm-skill-suffix' }, suffix)
    ])

    return new Promise((resolve) => {
      dialog.info({
        title: '全部更新确认',
        content: () => contentVNode,
        positiveText: '全部更新',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmUpdateEnv(name: string, version: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.info({
        title: `更新 ${name}`,
        content: () =>
          h('div', null, [
            h('p', null, `要更新 ${name} 吗？`),
            h(
              'p',
              {
                style: {
                  color: 'var(--color-stone)',
                  fontSize: '13px',
                  marginTop: '8px'
                }
              },
              `当前版本 ${version || '未知'}，更新期间相关功能可能暂时不可用。`
            )
          ]),
        positiveText: '更新',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  return { confirmInstall, confirmUpdate, confirmRemove, confirmUpdateAll, confirmUpdateEnv }
}
