# Electron Builder 打包配置增强设计

## 目标

为 NPX Skills UI 的 Windows NSIS 安装包添加以下功能：

1. **使用声明页**：安装开始时显示免责声明与使用条款，用户必须同意后才能继续。
2. **用户协议页**：安装过程中显示 Apache License 2.0，用户必须同意后才能继续安装。
3. **自定义安装路径**：允许用户在安装时选择或修改应用程序的安装目录。

## 方案选择

采用**基于原生配置 + 轻量 NSIS 脚本扩展**的混合方案。

- `license` 和 `allowToChangeInstallationDirectory` 仍使用 electron-builder 原生 NSIS 配置。
- 额外的"使用声明"页面通过自定义 `build/installer.nsh` 脚本实现，使用 NSIS `LicenseData` + `Page license` 机制插入到标准协议页之前。
- 保持改动范围最小，不引入复杂的 NSIS 宏或自定义 UI。

## 文件变更

### 新增/更新文件

| 文件                    | 操作 | 说明                                                |
| ----------------------- | ---- | --------------------------------------------------- |
| `LICENSE`               | 新增 | 从 `origin/main` 获取的标准 Apache License 2.0 全文 |
| `build/declaration.txt` | 新增 | 使用声明与免责条款文本                              |
| `build/installer.nsh`   | 新增 | 自定义 NSIS 脚本，在安装流程中插入使用声明页        |

### 修改文件

| 文件                   | 变更内容                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `electron-builder.yml` | 在 `nsis:` 块下新增 `license: LICENSE`、`allowToChangeInstallationDirectory: true` 和 `include: build/installer.nsh` |

## 配置细节

### `electron-builder.yml`

```yaml
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
  license: LICENSE # 原生协议页：Apache 2.0
  allowToChangeInstallationDirectory: true # 允许用户修改安装目录
  include: build/installer.nsh # 自定义脚本：插入使用声明页
```

### `build/installer.nsh`

```nsis
!macro customPageAfterWelcome
  LicenseData "${BUILD_RESOURCES_DIR}\declaration.txt"
  Page license "" "" ""
!macroend
```

（注：实际宏名需根据 electron-builder 提供的 hook 点调整。electron-builder 支持在 welcome 页后插入自定义页面通过 `customInit` 或 `customInstall` 宏，具体宏名需查阅其 NSIS 模板。更可靠的方式是使用 `!insertmacro MUI_PAGE_LICENSE` 在 MUI 页面流中插入。）

### `build/declaration.txt`

```
使用声明与免责条款

1. 软件按"原样"提供，作者不对软件的适用性、可靠性、准确性做任何明示或暗示的担保。
2. 使用本软件所产生的任何直接或间接损失，作者不承担任何责任。
3. 本软件不会主动收集、上传用户的任何个人数据或敏感信息。
4. 用户不得将本软件用于任何违反法律法规的用途。
5. 继续使用即表示您已阅读并理解上述声明。

请勾选"我已阅读并同意上述声明"以继续安装。
```

## 安装流程变化

修改后的 Windows 安装向导流程：

1. **欢迎页** — 应用名称和版本
2. **使用声明页**（新增）— 显示免责声明与使用条款，提供"我同意" / "我不同意"选项
3. **许可协议页**（新增）— 显示 Apache 2.0 全文，提供"我同意" / "我不同意"选项
4. **安装路径页**（增强）— 显示默认路径，用户可点击"浏览"自定义目录
5. **安装中** — 进度条
6. **完成页** — 可选创建桌面快捷方式

## 验证方式

1. 执行 `npm run build:win` 生成安装包
2. 在 Windows 环境中运行生成的 `npx-skills-ui-1.0.0-setup.exe`
3. 确认安装向导第 2 步出现使用声明页，第 3 步出现 Apache 2.0 协议页，第 4 步路径可编辑
4. 测试：
   - 拒绝使用声明 → 安装终止
   - 同意使用声明但拒绝协议 → 安装终止
   - 两项均同意 → 正常进入路径选择并完成安装

## 排除项

- 不涉及 macOS DMG 或 Linux 安装包的协议/路径配置（按用户要求仅针对 Windows NSIS）。
- 不修改 `perMachine`、`allowElevation` 等其他 NSIS 行为（保持现有默认值）。
