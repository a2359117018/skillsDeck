# GitHub 链接安装 UI 重构设计

## 背景

当前 GitHubInstaller 组件在空态时仅显示一行 URL 输入框，页面空荡。安装结果使用居中浮层展示，与压缩包安装（已统一使用 notification）不一致。需要重构为始终可见的左右双栏布局，增加 GitHub 特有视觉元素，并统一通知方式。

## 设计决策

- **布局**：左右双栏始终可见（与压缩包安装一致的 `1fr 1fr` 网格）
- **配色**：统一浅色背景，两栏使用相同的白色/浅色卡片
- **区分**：通过 GitHub 图标和品牌化输入卡片区分，不依赖布局结构差异
- **通知**：统一使用 Naive UI notification，去除内联浮层
- **进度**：使用 NModal dialog 展示下载/解析进度，避免在左栏内做状态切换

## 布局结构

### 整体：左右双列

```
┌─────────────────────────┬─────────────────────────┐
│ 左栏                     │ 右栏                     │
│                         │                         │
│ GitHub 输入卡片          │ 步骤 2 · 选择目标        │
│ (图标+标题+URL输入)      │                         │
│                         │ AgentSelector            │
│ 步骤 1 · 选择技能        │ (全局安装/常见/全部)      │
│                         │                         │
│ 技能列表区               │─────────────────────────│
│ (空态占位/复选框列表)    │ 已选 X 个技能    [安装]  │
└─────────────────────────┴─────────────────────────┘
```

### 左栏：GitHub 品牌化输入卡片

**空态：**

- GitHub SVG 图标（16px）+ 标题 "从 GitHub 安装技能"（13px, font-weight: 600）
- URL 输入框（flex: 1）+ "解析" 按钮
- 无额外格式提示文字

**解析成功后：**

- 输入框变为只读（显示已解析的 URL），"解析" 按钮变为 "重新解析"
- 底部出现紧凑仓库信息标签：`owner/repo · 分支: main`（12px, depth=3 文字）

### 左栏：技能列表

- 步骤标题行：蓝色圆形编号 `1` + "选择技能"
- 空态：占位文案 "解析仓库后显示技能列表"
- 解析后：复用 SkillScanResult 组件展示复选框列表

### 右栏

- 步骤标题行：蓝色圆形编号 `2` + "选择目标"
- AgentSelector 组件（与压缩包安装共用）
- 底部紧凑操作条

### 底部操作条

- 容器：白色背景 + 边框 + 8px 圆角，padding 6px 12px
- 左侧：`已选 X 个技能`（12px, X 用 font-weight: 600 + 深色）
- 右侧："安装" 按钮（pill shape, 26px 高, 12px 字号, border-radius: 9999px）
- 未选中技能时按钮 disabled + 半透明（opacity: 0.5）

## 状态流转

1. **空态**：输入卡片 + 空技能列表 + 右栏目标选择 + 底部操作条
2. **点解析** → 弹出 NModal 进度 Dialog（标题 "正在解析仓库"，进度条 + 百分比 + "取消" 按钮）
3. **下载完成进入解析** → Dialog 内进度条变为 indeterminate + "正在扫描技能..."
4. **解析完成** → Dialog 自动关闭，左栏输入卡片变为只读 + 仓库信息标签，技能列表展示扫描结果
5. **选择技能和目标** → 底部操作条实时更新选中数量
6. **点安装** → 调用 `useSkillInstall.install()`，结果通过 notification 展示

## 进度 Dialog 设计

- 使用 Naive UI `NModal` + `NCard`
- 标题："正在解析仓库"
- 下载阶段：`NProgress type="line"` + 百分比数字
- 解析阶段：indeterminate 进度条 + "正在扫描技能..." 文字
- 底部："取消" 按钮（调用 `window.api.skills.cancelGitHubDownload()`）
- 解析完成或失败后自动关闭

## 通知策略

去除 `GitHubInstaller.vue` 中的 `result-overlay` 浮层，全部使用 `useSkillInstall` composable 已有的通知逻辑：

| 场景         | 类型                                     | duration |
| ------------ | ---------------------------------------- | -------- |
| 全部成功     | `notification.success`                   | 3000ms   |
| 部分失败     | `notification.warning`                   | 0        |
| 全部失败     | `notification.error`                     | 0        |
| 未扫描到技能 | `notification.info`（Dialog 关闭后触发） | 5000ms   |

## 删除内容

从 `GitHubInstaller.vue` 中移除：

- `result-overlay` 模板及其样式（约 50 行 CSS）
- `closeInstallResult()` 方法
- `installResult` 的引用（由 composable 处理）
- `NAlert` 内联错误展示改为 notification

## 组件依赖

- `NModal` + `NCard` + `NProgress`（新增，用于进度 Dialog）
- `SkillScanResult`（复用，替代当前内联的扫描列表）
- `AgentSelector`（复用）
- `useSkillInstall` composable（复用）

## 与压缩包安装的一致性

| 维度     | 压缩包安装               | GitHub 安装（新）       |
| -------- | ------------------------ | ----------------------- |
| 网格     | 1fr 1fr                  | 1fr 1fr                 |
| 步骤编号 | 蓝色圆形 1/2             | 蓝色圆形 1/2            |
| 左栏输入 | 拖拽区 + 文件路径        | URL 输入卡片 + 仓库标签 |
| 右栏     | AgentSelector + 安装按钮 | AgentSelector + 操作条  |
| 通知     | Naive UI notification    | Naive UI notification   |
