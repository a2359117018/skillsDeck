/**
 * electron-builder afterPack 钩子。
 * 删除除 en-US、zh-CN 外的 Electron locale 文件，减小安装包体积。
 */
const fs = require('fs')
const path = require('path')

const KEEP_LOCALES = new Set(['en-US.pak', 'zh-CN.pak'])

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async (context) => {
  const localesDir = path.join(context.appOutDir, 'locales')
  if (!fs.existsSync(localesDir)) return

  const files = fs.readdirSync(localesDir)
  for (const file of files) {
    if (!KEEP_LOCALES.has(file)) {
      fs.unlinkSync(path.join(localesDir, file))
    }
  }
}
