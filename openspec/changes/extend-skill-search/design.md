## Context

当前 `SkillsSearch.vue` 仅提供搜索安装单一入口，通过 `skills.sh` API 搜索后调用 `npx skills add` CLI 完成安装。用户需要补充两种新的安装渠道：直接从 GitHub 仓库 URL 安装，以及从本地压缩包安装。这两种渠道的共同点是不经过 `skills.sh` 搜索，且 `npx skills` CLI 的 `add` 子命令仅支持 git URL 或 `owner/repo` 格式，不直接支持从已下载的本地目录安装。因此需要自实现下载、解压、扫描 SKILL.md、复制到 agent 目录的完整流程。

## Goals / Non-Goals

**Goals:**

- 在搜索页面提供 Tab 切换，支持搜索安装、GitHub 链接安装、压缩包安装三种入口
- GitHub 链接安装：解析 URL，下载 zipball，解压，扫描 SKILL.md（最大深度 2），将选中的 skill 复制到目标 agent 的 global skills 目录
- 压缩包安装：选择本地压缩包，解压，执行与 GitHub 安装相同的扫描和复制逻辑
- 多 skill 场景下提供复选框列表，用户可选全部或部分安装
- 安装完成后立即清理临时目录
- 搜索安装功能完全保留，不做任何改动

**Non-Goals:**

- 不修改 `npx skills` CLI 的调用逻辑或行为
- 不追踪自安装 skill 的来源元数据（如记录从哪个 GitHub URL 安装），第一阶段不涉及更新/溯源
- 不处理符号链接（一律复制）
- 不递归扫描超过 2 层的目录结构
- 不支持私有 GitHub 仓库（无 token 认证）

## Decisions

### 1. 搜索安装保持不变，GitHub/压缩包自实现

**决策**：搜索安装继续调用 `npx skills add`，GitHub 和压缩包安装走自实现逻辑。

**理由**：搜索安装经过 `skills.sh` API 返回的 `source` 字段天然适配 CLI 的 `owner/repo` 格式，改动它会引入不必要的风险。而 GitHub 和压缩包用户直接提供的是 URL 或文件路径，CLI 不支持从这些来源直接安装本地目录，必须自实现。

**替代方案**：统一将所有安装改为自实现。被否决，因为搜索安装涉及 50+ agent 的兼容性处理，CLI 已稳定运行，重构收益不高。

### 2. GitHub 代码获取使用 zipball + fetch 而非 git clone

**决策**：通过 `fetch` 下载 `https://github.com/{owner}/{repo}/archive/{branch}.zip`，而非调用系统 `git clone`。

**理由**：

- Electron 应用不能假设用户机器上已安装 git；zipball 是单文件下载，可控性更好
- 项目已有 `decompress` 依赖处理解压，无需引入新的 git 相关依赖
- `fetch` + `AbortController` 可直接控制超时（30s）和取消，而 `git clone` 是子进程调用，取消和进度监控更复杂
- zipball 仅下载指定分支的快照，无需 `.git` 历史，体积更小

**代理支持**：下载 URL 必须复用 `SkillsService` 的代理拼接逻辑。若用户在设置中配置了 `proxyUrl`（如 `https://gh-proxy.org`），实际请求地址为 `${proxyUrl}/https://github.com/{owner}/{repo}/archive/{branch}.zip`，与现有 `npx skills add` 的代理行为保持一致。

**替代方案**：使用 `git clone --depth 1`。被否决，依赖外部 git，取消/超时控制复杂，且无法处理用户直接粘贴 zip 下载链接的场景。

### 3. 扫描深度限制为 2 层

**决策**：从解压根目录开始递归扫描，最多深入 2 层子目录寻找 `SKILL.md`；若某层目录已包含 `SKILL.md`，不再继续扫描其子目录。

**理由**：覆盖"单 skill 仓库"（根目录有）、"多 skill 一级目录"（如 `review/SKILL.md`）、"多 skill 二级目录"（如 `packages/review/SKILL.md`）三种主流结构；防止 skill 内部子目录被误判为独立 skill；与业界常见 skill 仓库结构一致。

### 4. 安装方式为文件复制而非符号链接

**决策**：使用 `fs.promises.cp(src, dest, { recursive: true, force: true })` 直接复制目录。

**理由**：复制更直观，不依赖文件系统符号链接支持（Windows 下有时受限）；不同 agent 可以独立管理；删除一个 agent 的 skill 不影响其他。

**替代方案**：符号链接。被否决，跨平台兼容性和权限问题更复杂。

### 5. 临时文件安装后立即清理

**决策**：下载/解压产生的临时目录在安装完成后（无论成功或失败）立即删除。

**理由**：避免磁盘空间浪费；Electron 应用没有长期保留中间文件的需求；失败时用户通常会重新操作，保留临时文件无实质帮助。

### 6. 不复用 `SkillInstallDialog` 的流式输出模式

**决策**：GitHub 和压缩包安装在各自 Tab 页面内完成全部交互，不复用现有的 `SkillInstallDialog`。

**理由**：`SkillInstallDialog` 是为 CLI 流式输出设计的（步骤条 + 终端输出区域），而自实现安装没有 stdout 流，进度是分阶段的（下载/解压 → 扫描 → 复制）；多 skill 选择界面也不适合放入对话框内。可以抽取 `AgentSelector` 子组件供复用。

## Risks / Trade-offs

| 风险                                                                                       | 缓解措施                                                                                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 自安装的 skill 与 CLI 安装的 skill 在元数据层面不一致（CLI 可能维护了 `skills-lock.json`） | 当前 `AgentScanner` 只认目录结构，两者共存无兼容性问题；第一阶段不处理元数据同步                                   |
| zipball 下载大仓库时超时                                                                   | fetch 设置 30 秒超时，支持 AbortController 取消；UI 展示下载进度                                                   |
| 用户配置了代理但代理不可用                                                                 | 下载失败时错误提示区分「代理连接失败」与「GitHub 连接失败」；保留不使用代理的 fallback（仅当 proxyUrl 为空时直连） |
| Windows 长路径限制（某些 agent 路径嵌套较深）                                              | Node.js 22 默认启用长路径支持，需要测试验证                                                                        |
| skill 名称与已有 skill 冲突                                                                | 默认覆盖（`force: true`），安装结果报告展示哪些被覆盖                                                              |
| 压缩包格式不兼容                                                                           | `decompress` 已支持 zip / tar / tar.gz / tgz，覆盖主流格式                                                         |
| 扫描逻辑误判（如 `node_modules` 内恰好有 `SKILL.md`）                                      | 跳过 `.` 开头的隐藏目录，且最大深度 2 限制了影响范围                                                               |
