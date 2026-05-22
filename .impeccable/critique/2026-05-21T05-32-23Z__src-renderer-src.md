---
target: 整个应用 UI
total_score: 21
p0_count: 1
p1_count: 2
timestamp: 2026-05-21T05-32-23Z
slug: src-renderer-src
resolved:
  - issue: P0 SkillDetail.vue 骨架页
    action: 删除整个 SkillDetail 页面及路由（用户确认页面为多余遗留内容）
    date: 2026-05-21
  - issue: P1 模拟进度条破坏信任
    action: 替换为真实 CLI 流式终端输出 + 自动滚动到底部
    date: 2026-05-21
  - issue: P2 AgentView drawer 硬编码颜色
    action: 新增 Agent 卡片色调 token，替换所有硬编码 hex 为 token 引用
    date: 2026-05-21
  - issue: P2 侧栏无文字标签
    action: 侧栏加宽到 72px，图标下方添加 9px 文字标签
    date: 2026-05-21
  - issue: P3 AgentFilter.vue 死代码
    action: 删除未使用的 AgentFilter.vue 组件
    date: 2026-05-21
---

## Design Health Score

| #         | Heuristic                         | Score     | Key Issue                                                                    |
| --------- | --------------------------------- | --------- | ---------------------------------------------------------------------------- |
| 1         | Visibility of System Status       | 2         | 后台任务状态不可见，技能行无独立更新状态指示                                 |
| 2         | Match System / Real World         | 2         | "Agent"/"全局安装"术语未解释，三套 Agent 选择 UI 语义不一致                  |
| 3         | User Control and Freedom          | 3         | 取消/确认机制存在，但删除不可撤销，后台更新无法从列表中断                    |
| 4         | Consistency and Standards         | 2         | 三种 Agent 选择 UI（pills/checkboxes/tags），AgentView 硬编码颜色绕过 tokens |
| 5         | Error Prevention                  | 2         | 自定义代理 URL 无即时验证，模拟进度条制造虚假预期                            |
| 6         | Recognition Rather Than Recall    | 2         | 侧栏无文字标签仅靠图标（SkillDetail 页面已删除，不再适用）                   |
| 7         | Flexibility and Efficiency of Use | 2         | 无键盘快捷键，无命令面板，无多选批量操作                                     |
| 8         | Aesthetic and Minimalist Design   | 3         | 整体简洁，但安装对话框 50+ Agent 列表信息过载                                |
| 9         | Error Recovery                    | 2         | 错误信息泛化（"安装失败"），无可操作恢复建议                                 |
| 10        | Help and Documentation            | 1         | 零应用内帮助，无新手引导，无概念解释                                         |
| **Total** |                                   | **21/40** | **Acceptable (需显著改善)**                                                  |

## Anti-Patterns Verdict

**LLM 评估: 低到中等 AI 痕迹。整体像有主见的开发者作品，但存在若干脚手架特征。**

设计系统完整且自洽（tokens.css + pill 按钮 + 深色侧栏 + coral 强调色），具备明确的视觉身份。但有几点暴露生成痕迹：

- **侧栏 active-bar（3px coral 左边框）** 落入 side-stripe border 禁忌模式（AppSidebar.vue line 122-136）。虽然导航上下文有一定合理性，但这是经典的 AI 生成标识。
- **搜索结果卡片网格** 结构完全一致（name + downloads + install button），无差异化，落入 "identical card grids" 陷阱。
- **模拟进度条**（SkillInstallDialog.vue line 43-62）`startProgressSimulation()` 生成虚假进度。对开发者受众而言这是最大的信任杀手。
- ~~**SkillDetail.vue 是骨架而非功能页**~~: 已确认删除，页面为多余遗留内容。

**分类直觉检查:**

- 一阶：不像"通用技能管理后台"。深色渐变侧栏 + coral 强调色有辨识度，避开了蓝白 SaaS 陷阱。
- 二阶：Drawer 模式、分步安装向导、Settings 分区是常见 UI 模式，不算独特也不算反参考。整体停在"合格的工具"层面，未达到 Linear/Figma 那种"设计感"。

**确定性扫描: 0 个发现（36 个文件，exit code 0）。**

检测器在全部 25 条规则上均未触发。原因：CSS 设计 token 系统和 NaiveUI 组件库将视觉属性抽象为变量和 props，regex 引擎无法检测运行时渲染结果。此结果应谨慎解读：运行时可见的对比度、间距节奏、排版层次问题对静态扫描器不可见。

**浏览器可视化: 跳过。** Electron 桌面应用，无 HTTP 开发服务器可供注入。

## Overall Impression

这是一个有设计主见的开发者工具，深色侧栏 + pill 按钮 + coral 强调色构成明确身份。但"三种 Agent 选择 UI 并存"、"模拟进度条"等问题暴露了细节打磨不足。整体感觉像 v0.7：框架扎实，但细节未打磨到位。

最大的机会：**统一 Agent 选择 UI + 替换模拟进度条**，这两项修改将显著提升开发者信任度和操作一致性。

## What's Working

1. **设计 token 系统专业度高。** tokens.css 定义了完整的颜色/间距/圆角/阴影/排版变量体系，CLAUDE.md 约束强制使用 token。Agent 卡片的四色循环（coral/blue/magenta/purple）让网格具备扫描性。

2. **多源安装架构经过思考。** CLI 搜索 / GitHub URL / 本地归档三条安装路径共享 SkillScanResult + AgentSelector 组件。GitHub/Archive 安装器的两栏布局（左选技能，右选目标 Agent）是好的空间隐喻。

3. **侧栏有个性。** 深色渐变背景（`#0a0a0a → #1a1a2e`）、coral 活跃指示条、底部蓝色微光（AppSidebar.vue `::after` radial-gradient），这是全应用最具辨识度的视觉元素。

## Priority Issues

~~**[P0] SkillDetail.vue 是骨架不是功能页**~~ -- **已解决：用户确认页面为多余遗留内容，已删除。**

**[P3] AgentFilter.vue 是死代码**

- **What**: 深入分析后发现，AgentSelector（安装目标选择，写操作）和 AgentTagBar（列表过滤，读操作）交互模式不同是合理的。真正的冗余是 AgentFilter.vue，没有任何地方导入使用
- **Why it matters**: 死代码增加维护负担，误导新贡献者
- **Fix**: 删除 `src/renderer/src/components/skills/AgentFilter.vue`

**[P1] 模拟进度条破坏信任** -- **已解决：替换为真实 CLI 流式终端输出 + 自动滚动。**

**[P2] AgentView drawer 硬编码颜色绕过 token 系统** -- **已解决：新增 Agent 卡片色调 token，替换所有硬编码 hex。**

- 新增 token：`--color-agent-{coral,blue,magenta,purple}-{bg,border}`、`--color-brand-blue-tint`、`--color-brand-blue-600`

**[P2] 侧栏无可见文字标签** -- **已解决：侧栏加宽到 72px，图标下方添加 9px 文字标签。**

**[P3] AgentFilter.vue 死代码** -- **已解决：删除未使用的组件文件。**

## Persona Red Flags

**Alex（Power User，每天在编码间隙使用）**:

- 无键盘快捷键。安装/搜索/导航全部依赖鼠标，Alex 会直接回到 CLI
- 无命令面板或快速操作入口
- 搜索结果无技能描述，无法在不点击的情况下判断相关性
- 模拟进度条会被 Alex 一眼识别为假进度，直接丧失对 UI 的信任
- 批量操作仅有"全部更新"，无多选选择性批量操作
- 后台任务状态不可从主列表页查看

**Jordan（First-Timer，安装后首次探索）**:

- 首次启动：环境 banner 说"运行环境不完整"但"去安装"按钮小且容易被忽略
- "Agent"概念从未解释。安装对话框展示 50+ 复选框，无任何引导
- Settings 页面四个区块同时呈现，无引导式设置向导
- 空状态是死胡同："暂无已安装的技能"没有建议去搜索安装
- GitMergeOutline 图标对新人完全无意义

## Minor Observations

1. **全局隐藏滚动条**（tokens.css line 7-13 `scrollbar-width: none`）违反 DESIGN.md "Don't hide scrollbars" 指令，用户无法感知内容溢出
2. **card.css hover 边框跳变** 从 `#e5e7eb` 直接跳到 `#9ca3af`，视觉上过于突兀
3. **Agent 卡片四色背景**（`#fff5f2`、`#eff6ff`、`#fdf2f8`、`#faf5ff`）不在 tokens.css 中，未考虑暗色模式
4. **Settings FAB** `position: fixed; bottom: 24px; right: 24px` 可能与滚动条和 env-toolbar 重叠
5. **CommandOutput.vue** `max-height: 400px` + `overflow-y: auto` + 全局 `scrollbar-width: none` = 不可见滚动
6. **Router /env 路由**指向 SettingsView 但侧栏无对应链接，疑似残留

## Questions to Consider

1. 如果"已安装"页面是唯一页面会怎样？当前 4 个导航项，但核心工作流是"看我有什么 → 搜索更多 → 安装"。如果已安装列表内嵌搜索安装功能，整个应用可以减到 3 个页面。

2. 为什么安装对话框默认展示 50+ Agent，而 90% 用户只装到 2-3 个？如果默认只显示常用 Agent，"显示全部"作为展开器，常见场景会快得多。

3. 应用的性格是否在"开发者工具"和"消费级应用"之间摇摆？深色侧栏 + coral 说"工具"，pill 按钮 + 圆角卡片 + 模拟进度说"友好"。如果全力投入"工具"身份：等宽字体详情、真实 CLI 输出、零模拟，个性是否更强？
