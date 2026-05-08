# AgentView UI 优化设计

## 背景

AgentView 是 npx-skills-ui 中展示已安装 Agent 及其技能的页面。当前版本存在审美问题：渐变色卡片过于花哨、搜索框样式不统一、技能 Drawer 缺乏设计感。需要重新设计，与全站统一基调的同时保持适度差异化。

## 设计原则

- **统一基调**：与 InstalledList 保持一致的设计语言（hero 区域、药丸搜索框、品牌色体系）
- **适度差异化**：Agent 页面使用浅色系卡片网格而非列表，每个 Agent 有身份色
- **简洁克制**：去除花哨渐变，用白底/浅色 + 品牌色点缀
- **中文界面**：所有 tooltip 和文案使用中文

## 1. 页面整体结构

与 InstalledList 保持一致的页面框架：

### Hero 区域

- 渐变背景：`coral → purple`，与 InstalledList 一致
- 圆角：`--radius-xl`（16px）
- 内边距：`--space-xl --space-xxl`
- 内容：标题"Agent 管理" + Agent 总数标签（白底半透明药丸）+ 右侧刷新按钮
- 装饰：三个 blob 圆形（白半透明 + blur），与 InstalledList hero 相同手法

### 搜索区域

- 药丸形搜索框：`--radius-full`，surface 背景色，hairline 边框
- 搜索图标前缀（prefix slot），颜色 `--color-muted`
- size="large"，与 InstalledList 一致
- 右侧显示 "X 个 Agent" 计数文字，`--text-body-sm`，stone 色
- 占满可用宽度，flex: 1

### 卡片网格

- 布局：`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`
- 间距：`gap: 16px`（`--space-md`）
- 一行约 4 张卡片（960px 容器宽度下）
- 底部内边距：`--space-xl`

### 空状态

- NEmpty 组件，文案"暂无已安装的 Agent"
- 居中显示，上方留白 `--space-xxxl`

## 2. Agent 卡片设计

### 外观

- **背景色**：极浅品牌色，每个 Agent 按顺序循环分配身份色
  - coral: `#fff5f2`
  - blue: `#eff6ff`
  - magenta: `#fdf2f8`
  - purple: `#faf5ff`
- **边框**：`1px solid`，对应极浅边框色
  - coral: `#ffe0d6`
  - blue: `#dbeafe`
  - magenta: `#fce7f3`
  - purple: `#f3e8ff`
- **圆角**：`--radius-lg`（12px）
- **阴影**：默认 `--shadow-1`，hover 时 `--shadow-3` + `translateY(-2px)`
- **内边距**：`--space-lg`（20px）
- **过渡**：`150ms ease`

### 卡片内容（从上到下）

1. **头像**：48×48px，`--radius-md`（8px）圆角方块
   - 背景：对应的品牌色（非浅色，用原始品牌色）
   - 文字：白色，`--weight-semibold`，显示 Agent 名称前两个字符
   - 示例："Claude Code" → "CC"，"Cursor" → "Cu"，"Windsurf" → "Wi"
2. **Agent 名称**：`--text-body-lg`，`--weight-semibold`，颜色 `--color-ink`，紧跟头像下方
3. **信息行**：`--text-body-sm`，颜色 `--color-stone`
   - 左侧："X 个技能"
   - 右侧：文件夹图标按钮，始终可见（不需要 hover），颜色用对应的品牌色
   - 按钮大小：`size="tiny"`，quaternary，circle

### 交互

- 整张卡片可点击，点击打开右侧 Drawer
- hover 时阴影加深 + 轻微上浮
- 文件夹按钮始终可见，点击时 `stopPropagation` 防止触发卡片点击

## 3. Drawer 技能列表设计

### Drawer 配置

- 宽度：500px
- 方向：右侧
- 动画：右侧滑入，300ms ease-out
- 点击遮罩关闭

### Header 区域

- 背景：对应 Agent 身份色的品牌色渐变（如 coral 用 `coral → coral-light`），高度约 100px
- 白色文字显示 Agent 全名（`--text-heading-lg`，bold）+ 技能数标签（白底半透明药丸）
- 右侧：一个"打开文件夹"按钮，白底半透明（`rgba(255,255,255,0.2)` 背景 + 白色文字 + `--radius-full`）

### 技能列表区域

- 白底，整体内边距 `--space-lg`
- 每个技能一行：
  - 左侧：技能名称（`--weight-semibold`，`--color-ink`）+ 技能路径简写（`--text-caption`，`--color-stone`，显示最后两级目录）
  - 右侧：更新按钮（品牌色文字按钮，图标 + "更新" 文字）+ 删除按钮（error 色文字按钮，图标 + "删除" 文字）
- 行间距：`padding: 14px 0`
- 分隔线：`1px solid --color-hairline`，最后一行无分隔线
- 按钮加载状态：使用 NaiveUI 内置 loading 属性

### Tooltip 中文化

所有按钮的 title 属性使用中文：
- "打开位置" → "打开技能位置"
- "更新" → "更新"
- "删除" → "删除"

## 4. 实现要点

### Agent 名称前两字符提取

```ts
function getAgentInitials(name: string): string {
  return name.slice(0, 2)
}
```

简单取前两个字符即可，不做复杂分词。

### 身份色循环

使用现有的 `:nth-child(4n+X)` CSS 选择器，4 种颜色循环分配。

### 复用组件

- 搜索框样式直接复用 InstalledList 的 CSS（`.search-section`、`.search-input`）
- Hero 区域复用 InstalledList 的布局和 blob 装饰方案
- 抽屉使用 NaiveUI NDrawer + NDrawerContent

### 不修改的部分

- 路由和页面结构不变
- IPC 通信逻辑不变
- 数据流（Pinia store）不变
- 仅修改 `AgentView.vue` 一个文件
