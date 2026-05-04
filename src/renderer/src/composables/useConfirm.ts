import { useDialog } from 'naive-ui'

export function useConfirm() {
  const dialog = useDialog()

  function confirmInstall(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.info({
        title: '安装确认',
        content: `确定要安装「${name}」技能？`,
        positiveText: '确认安装',
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
        content: `确定要更新「${name}」技能？`,
        positiveText: '确认更新',
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
        content: `确定要删除「${name}」技能？此操作不可撤销。`,
        positiveText: '确认删除',
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
      names.length > maxShow ? `\n...等 ${names.length} 个技能` : `\n共 ${names.length} 个技能`
    const content = `确定要更新以下技能？\n${displayed}${suffix}`

    return new Promise((resolve) => {
      dialog.info({
        title: '全部更新确认',
        content,
        positiveText: '确认更新',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  return { confirmInstall, confirmUpdate, confirmRemove, confirmUpdateAll }
}
