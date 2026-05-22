# SettingsView UI 精细化调整

## 背景

设置页面中两个视觉问题：

1. select/input 组件设置了 `width: 100%`，占满 label 右侧全部空间，视觉上松散且横向过长。
2. 运行环境区域的"重新检测"按钮独占一行，作为轻量级操作显得过于"沉重"。

## 改动范围

仅涉及 `src/renderer/src/views/SettingsView.vue` 的样式和运行环境区块布局，无数据逻辑变更。

## 详细设计

### 1. 表单控件宽度限制

**改动前：**

```css
.settings-select {
  width: 100%;
}
```

**改动后：**

```css
.settings-select {
  width: 100%;
  max-width: 320px;
}
```

影响范围：通用设置中的"默认安装目标"下拉框、网络设置中的"GitHub 代理"和"npm 镜像"下拉框、以及自定义代理/镜像的输入框。

### 2. 运行环境区域底部工具栏

**改动前结构：**

```
运行环境
├── Node.js 检查项
├── npm 检查项
├── skills 检查项 (+ 更新按钮)
├── [条件渲染] 安装按钮 / 下载进度
└── 重新检测按钮（独占一行）
```

**改动后结构：**

```
运行环境
├── Node.js 检查项
├── npm 检查项
├── skills 检查项 (+ 更新按钮)
├── [条件渲染] 安装按钮 / 下载进度
└── 底部工具栏（flex row）
    ├── 左侧：检测时间提示（如"环境检测于 2 分钟前"）
    └── 右侧：重新检测按钮（文字按钮样式）
```

**样式：**

- 工具栏顶部加 `border-top: 1px solid var(--color-hairline)` 与环境检查项分隔
- 工具栏 `display: flex; justify-content: space-between; align-items: center`
- 左侧时间提示：font-size 用 `var(--text-caption)`，color 用 `var(--color-muted)`
- 右侧"重新检测"：使用文字按钮样式（无背景边框，hover 时背景变浅灰），`font-size: var(--text-body-sm)`
- 工具栏 `margin-top: var(--space-md)`，`padding-top: var(--space-md)`

**检测时间提示的数据：**

- 目前 `EnvStore` 中没有记录上次检测时间。本次改动先不做时间追踪，工具栏左侧暂时留空或只显示"环境状态"字样。后续如需可增加 `lastCheckTime` 到 `EnvStatus`。

### 3. 保持不变的区域

- 页面标题和描述
- section header（标题 + 分割线）样式
- 通用设置的表单布局（label 左侧）
- 网络设置的表单布局（label 左侧）
- 管理操作区域
- 浮动保存按钮（FAB）
- 未保存提示 banner
- 环境检查项卡片样式

## CSS 约束遵循

- 所有颜色、间距使用 `tokens.css` 变量
- `scoped` 样式
- 不使用 media query（max-width 本身不是 media query）
