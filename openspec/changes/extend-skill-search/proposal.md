## Why

当前技能搜索页面功能单一，仅支持通过 skills.sh API 搜索安装技能。用户在实际使用中经常遇到需要直接从 GitHub 仓库或本地压缩包安装技能的场景，这些渠道无法通过现有搜索流程覆盖。扩展安装入口可以提升工具的灵活性和实用性，同时保持搜索安装的原有体验不变。

## What Changes

- 在 `SkillsSearch.vue` 页面引入 Tab 切换，将原有单一搜索入口扩展为三个并列功能：搜索安装、GitHub 链接安装、本地压缩包安装
- **搜索安装完全保留现有流程**：通过 skills.sh API 搜索，`npx skills add` CLI 执行安装，不做任何改动
- **新增 GitHub 链接安装**：用户粘贴 GitHub 仓库 URL，应用自行解析并下载 zipball，解压后扫描目录结构（最大深度 2 层）识别 SKILL.md，将选中的 skill 复制到目标 agent 的 global skills 目录
- **新增压缩包安装**：用户选择本地压缩包文件（zip / tar.gz / tgz），应用解压后执行与 GitHub 安装相同的扫描和复制逻辑
- 当扫描到多个 skill 时，提供复选框列表供用户选择全部或部分安装
- 安装完成后立即清理临时下载/解压目录

## Capabilities

### New Capabilities

- `github-skill-install`: 解析 GitHub 仓库 URL，下载 zipball 并安装其中包含的技能
- `archive-skill-install`: 从本地压缩包解压并安装其中包含的技能
- `local-skill-installer`: 共用的本地 skill 扫描与复制核心逻辑（扫描目录找 SKILL.md，复制到 agent skills 目录）

### Modified Capabilities

- （无现有 spec 需要修改，搜索安装的行为和需求不变）

## Impact

- **前端**：`SkillsSearch.vue` 新增 Tab 结构；新增 GitHub 安装和压缩包安装输入/预览组件；安装流程内联在页面内完成，不复用现有 `SkillInstallDialog` 的 CLI 流式输出模式
- **主进程**：新增 IPC handlers（`skills:parse-github`, `skills:select-archive`, `skills:extract-archive`, `skills:install-local`）；新增 `LocalSkillInstaller` 服务
- **依赖**：无新增依赖，`decompress` 和 `execa` 已存在于项目中
- **兼容性**：自安装的技能与 CLI 安装的技能在文件结构上完全一致，`AgentScanner` 可正常识别，无兼容性问题
