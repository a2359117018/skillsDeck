# 压缩包安装技能 UX 改进设计

> 日期: 2026-05-17
> 状态: 已确认

## 背景

当前通过压缩包安装技能的流程存在 4 个问题：

1. **无法拖拽导入** — 只能通过"选择压缩包"按钮触发文件对话框
2. **页面空旷** — 未选择文件时，"扫描到的技能"和"安装目标"两个区域都是空白占位
3. **技能名错误** — 解压到临时目录后，技能名使用临时目录名（如 `skills-archive-xxx`），而非真实技能名（如 `find-skills`）
4. **垂直布局浪费空间** — 技能列表和安装目标上下堆叠，宽度利用率低

## 改进方案

### 1. 拖拽上传区域

在页面顶部添加一个虚线框拖拽区域，替代当前的按钮选择。

- 虚线边框（`2px dashed`）+ 文件夹图标 + 提示文字"拖拽压缩包到此处"
- 支持拖拽 `.zip / .tar.gz / .tgz` 文件
- 点击该区域也能触发文件选择对话框（保持向后兼容）
- 拖入文件时边框高亮变色（`dragenter` 事件反馈）

**实现方式**: Electron renderer 进程的 `dragover` / `drop` 事件，通过 `e.dataTransfer.files[0].path` 获取本地文件路径，传给已有的 `skills:extract-archive` IPC channel。无需新增 IPC channel。

### 2. 水平两栏布局

将"扫描到的技能"和"安装目标"从垂直堆叠改为左右两栏：

```
┌─────────────────────────────────────┐
│       拖拽区域（虚线框）              │
├──────────────────┬──────────────────┤
│  扫描到的技能     │  安装目标         │
│  ☑ find-skills   │  ☑ 全局安装       │
│  ☑ code-review   │  ☐ Claude Code   │
│                  │  ☐ Cursor        │
├──────────────────┴──────────────────┤
│                        [安装选中技能] │
└─────────────────────────────────────┘
```

- CSS Grid: `grid-template-columns: 1fr 1fr`
- 保持 `LocalInstallPanel.vue` 作为独立组件，内部改为 grid 布局
- 移动端/窄窗口时自动回退到垂直堆叠

### 3. 技能名从 SKILL.md 提取

**当前行为**: `LocalSkillInstaller.scanSkills()` 用 `path.basename(currentPath)` 作为技能名。解压后的临时目录名类似 `skills-archive-xxx/find-skills-0.1.0/find-skills/`，导致显示不友好。

**改进**: 在 `scanDir()` 发现 `SKILL.md` 后，解析其 YAML frontmatter 的 `name` 字段作为技能名。若 `name` 不存在则回退到目录名。

SKILL.md frontmatter 格式：

```yaml
---
name: find-skills
description: ...
---
```

解析逻辑（在 `LocalSkillInstaller.ts` 中）：

1. 读取 `SKILL.md` 文件内容
2. 提取 `---` 之间的 YAML frontmatter
3. 解析 `name` 字段
4. 若解析失败或无 `name` 字段，回退到 `path.basename(currentPath)`

**不引入 YAML 解析库**，使用正则提取 `name:` 行值即可（frontmatter 格式简单稳定）。

### 4. 默认全选

减少用户操作步骤：

- **技能列表**: 扫描到的技能默认全选（`selectedSkills` 初始化为所有 `skill.path`）
- **安装目标**: 默认选中"全局安装"（`isGlobal` 默认为 `true`）

用户只需：拖入压缩包 → 点击安装，两步完成。

## 涉及文件

| 文件                                                       | 改动                                              |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `src/renderer/src/components/skills/ArchiveInstaller.vue`  | 添加拖拽区域，移除旧按钮                          |
| `src/renderer/src/components/skills/LocalInstallPanel.vue` | 改为水平两栏 grid 布局，默认全选                  |
| `src/main/services/LocalSkillInstaller.ts`                 | `scanDir()` 中解析 SKILL.md frontmatter 提取 name |
| `src/renderer/src/components/skills/SkillScanResult.vue`   | 无改动（已正确显示 `skill.name`）                 |
| `src/renderer/src/components/skills/AgentSelector.vue`     | 无改动                                            |

**不需要新增 IPC channel** — 拖拽文件路径直接传给已有的 `skills:extract-archive`。

**不需要新增依赖** — SKILL.md 解析使用正则而非 YAML 库。

## 不做的事情

- 不支持多文件同时拖拽（一次只处理一个压缩包）
- 不改变 `ScannedSkill` 接口（`name` 字段含义不变，只是来源变了）
- 不改变安装逻辑（`installSkills` 仍用目录名创建目标文件夹，名称正确性由 `name` 保证）
