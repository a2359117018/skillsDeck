# 响应式布局重构设计文档

## 背景与问题

当前项目所有页面使用固定 `max-width: 960px` 居中容器，网格始终 `repeat(3, 1fr)`，无任何响应式适配。导致：

- **窗口缩小时**：3 列网格被极度压缩，内容显示不全
- **窗口放大时**：内容区保持 960px 不变，两侧大量留白，空间浪费
- **无任何断点或弹性策略**：零 media query，零自适应机制

## 设计目标

实现**纯流式自适应布局**，让内容随窗口尺寸自然伸缩，最大化利用可用空间，同时保持实现简洁、维护成本低。

## 核心策略

### 三条铁律

1. **容器零约束**：所有页面移除 `max-width` 和 `margin: 0 auto`，改为 `width: 100%` + 固定 padding
2. **网格自适配**：所有卡片网格统一使用 `repeat(auto-fill, minmax(280px, 1fr))`，列数由可用空间决定
3. **组件内聚弹性**：内部元素用 `flex: 1`、`flex-wrap: wrap` 和 `minmax()` 解决，**零 media query**

### 窗口约束

Electron 主进程设置最小窗口尺寸：

```ts
minWidth: 1200,
minHeight: 800
```

从系统层面杜绝过小窗口，确保流式布局的最低可用空间。

## 具体改动清单

### 页面容器

| 文件                | 当前问题                                          | 改动方式                                              |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `SkillsSearch.vue`  | `max-width: 960px` + `repeat(3, 1fr)`             | 移除 max-width；网格改 `auto-fill`                    |
| `InstalledList.vue` | `max-width: 960px`                                | 移除 max-width；保留 min-height 用于空状态            |
| `AgentView.vue`     | `max-width: 960px` + 固定 3 列 + drawer width 500 | 移除 max-width；网格改 `auto-fill`；drawer 改相对宽度 |
| `SettingsView.vue`  | `max-width: 720px` + label-width 140 + FAB fixed  | 移除 max-width；label 改弹性；FAB 保留但确认不遮挡    |
| `SkillDetail.vue`   | 无水平 padding + `max-width: 900px`               | 添加水平 padding；移除 max-width                      |

### 组件

| 文件                 | 当前问题            | 改动方式                              |
| -------------------- | ------------------- | ------------------------------------- |
| `SkillSearchBar.vue` | `max-width: 680px`  | 移除 max-width，搜索框 `flex: 1` 填满 |
| `AppSidebar.vue`     | 固定 60px，不可折叠 | 无改动，60px 在 1200px+ 窗口下可接受  |

### 主进程

| 文件                                 | 改动内容                                        |
| ------------------------------------ | ----------------------------------------------- |
| `src/main/services/WindowManager.ts` | 窗口创建时增加 `minWidth: 1200, minHeight: 800` |

### Drawer 宽度策略

`AgentView.vue` 的 `NDrawer` 从固定 `width: 500` 改为动态计算：

```ts
const drawerWidth = computed(() => Math.min(480, window.innerWidth * 0.4))
```

确保在小窗口下 drawer 不会占据过大比例。

## 网格列数预期（供参考，非硬编码）

| 窗口宽度 | 内容区宽度 (扣除 sidebar) | 估算列数 |
| -------- | ------------------------- | -------- |
| 1200px   | ~1110px                   | 3 列     |
| 1440px   | ~1350px                   | 4 列     |
| 1920px   | ~1830px                   | 6 列     |

## 新增布局规范（写入 CLAUDE.md）

项目完成后，将以下规范追加到 `CLAUDE.md` 的 **CSS 约束** 和 **布局约束** 章节：

### CSS 约束追加

```markdown
- **流式布局优先**：所有页面容器使用 `width: 100%` + padding，禁止写死 `max-width` 或固定像素宽度
- **网格使用 auto-fill**：多列卡片列表使用 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`，禁止写死 `repeat(N, 1fr)`
- **零 media query 原则**：布局弹性通过 flex 和 grid 的内建能力实现，不引入断点；仅在极特殊场景下可例外
```

### 布局约束追加

```markdown
- **页面容器填满内容区**：每个页面根元素为 `width: 100%`，通过 `padding` 控制内容边距，不用 `max-width` 限制
- **工具栏允许换行**：`display: flex` 的 toolbar 必须设置 `flex-wrap: wrap`，防止空间不足时溢出
- **Drawer 使用相对宽度**：侧滑抽屉宽度使用 `min(固定值, 窗口百分比)`，不用固定像素
- **最小窗口保障**：Electron 主进程设置 `minWidth: 1200, minHeight: 800`，布局在此尺寸下必须可用
```

## 实施注意事项

1. **测试范围**：改动后需在 1200×800 和 1920×1080 两种分辨率下验证所有 5 个页面的视觉效果
2. **Drawer 动效**：`NDrawer` 宽度改为绑定变量后，需确认 NaiveUI 的过渡动画不受影响
3. **空状态与加载状态**：`min-height` 用于居中加载 spinner 的场景保留，但确保不限制内容区扩展
4. **回滚风险**：此改动涉及面广，建议在独立分支实施

## 排除项（明确不做）

- 不添加任何 media query
- 不做侧边栏折叠/展开
- 不针对特定分辨率做特殊处理
- 不改变动效或交互逻辑
