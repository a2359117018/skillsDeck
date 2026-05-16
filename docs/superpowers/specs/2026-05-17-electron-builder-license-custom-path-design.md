# Electron Builder 打包配置增强设计

## 目标

为 NPX Skills UI 的 Windows NSIS 安装包添加两项功能：

1. **用户协议页**：安装过程中显示 Apache License 2.0，用户必须同意后才能继续安装。
2. **自定义安装路径**：允许用户在安装时选择或修改应用程序的安装目录。

## 方案选择

采用**方案 1：最小改动**。

- 完全依赖 electron-builder 原生 NSIS 配置能力，不引入自定义 NSIS 脚本。
- 改动范围仅限 `electron-builder.yml` 和项目根目录的 `LICENSE` 文件。

## 文件变更

### 新增/更新文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `LICENSE` | 新增 | 从 `origin/main` 获取的标准 Apache License 2.0 全文 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `electron-builder.yml` | 在 `nsis:` 块下新增 `license: LICENSE` 和 `allowToChangeInstallationDirectory: true` |

## 配置细节

```yaml
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
  license: LICENSE                          # 安装前显示协议页
  allowToChangeInstallationDirectory: true  # 允许用户修改安装目录
```

- `license` 支持纯文本（`.txt`）和富文本（`.rtf`）。本项目使用从远程获取的纯文本 `LICENSE` 文件。
- `allowToChangeInstallationDirectory` 在 NSIS 安装路径页启用"浏览"按钮，默认路径仍为 `$LOCALAPPDATA\Programs\${productName}`（per-user）或 `$PROGRAMFILES\${productName}`（per-machine）。

## 安装流程变化

修改后的 Windows 安装向导流程：

1. **欢迎页** — 应用名称和版本
2. **许可协议页**（新增）— 显示 Apache 2.0 全文，提供"我同意" / "我不同意"选项
3. **安装路径页**（增强）— 显示默认路径，用户可点击"浏览"自定义目录
4. **安装中** — 进度条
5. **完成页** — 可选创建桌面快捷方式

## 验证方式

1. 执行 `npm run build:win` 生成安装包
2. 在 Windows 环境中运行生成的 `npx-skills-ui-1.0.0-setup.exe`
3. 确认安装向导第 2 步出现协议页，第 3 步路径可编辑
4. 测试同意协议后正常完成安装，拒绝协议后安装终止

## 排除项

- 不涉及 macOS DMG 或 Linux 安装包的协议/路径配置（按用户要求仅针对 Windows NSIS）。
- 不引入自定义 `installer.nsh` 脚本或 NSIS 宏扩展。
- 不修改 `perMachine`、`allowElevation` 等其他 NSIS 行为（保持现有默认值）。
