# 天安门景区自动化预约

Electron + Vue 3 + TypeScript 桌面端自动化预约工具。
使用 OpenSpec（规划）+ Superpowers（执行）工作流。

---

## 核心原则

- 规范先行：任何需求变更必须先走 OpenSpec，产出规划文档后再动手写代码（小任务除外）
- 最短路径优先：能用一个 skill 解决的，不升级为完整闭环
- 歧义先 brainstorm：任何创造性工作前先确认方案
- 证据优先：没有通过验证不算完成

---

## 任务规模与流程

### 只读任务

分析、解释、架构说明、代码阅读 → 直接处理，不走工作流。
真实 bug 排查但尚未修改 → 使用 `systematic-debugging`。

### 小任务

**判定条件**：单文件改动、bug 修复、配置调整

**流程**：

1. `brainstorming` → 确认改动范围和方案
2. `executing-plans` → 执行改动
3. `requesting-code-review`，**子代理执行**
4. 结束

**约束**：小任务不调用 OpenSpec 技能（`/opsx:explore`、`/opsx:propose`），不使用 `subagent-driven-development`

### 中任务

**判定条件**：2-3 个文件改动

**流程**：

1. 判断需求清晰度：

- 需求模糊 → `/opsx:explore` 梳理需求
- 需求明确 → 跳过 explore

2. `/opsx:propose` → 产出 proposal.md + design.md + tasks.md
3. `brainstorming` → 确认 tasks.md 中的计划
4. `writing-plans` → 细化为可执行的工程任务
5. `subagent-driven-development` → 子代理分配任务并执行
6. `requesting-code-review`，**子代理执行**
7. 结束

### 大任务

**判定条件**：多模块改动、架构变更

**流程**：

1. 判断需求清晰度：

- 需求模糊 → `/opsx:explore` 梳理需求、调研技术方案
- 需求明确 → 跳过 explore

2. `/opsx:propose` → 产出 proposal.md + design.md + tasks.md
3. `brainstorming` → 确认 tasks.md 中的计划
4. `writing-plans` → 细化为可执行的工程任务
5. `subagent-driven-development` → 子代理分配任务并执行
6. `requesting-code-review`，**子代理执行**
7. 结束

---

## OpenSpec（规划）

### 双文件夹模型

```
# 当前系统的事实来源（规范文件)
openspec/specs/
# 每次变更的完整提案
openspec/changes/
```

### 职责

产出规划文档。

### 边界

- 不写代码
- 不执行任何开发任务
- 产出 tasks.md 后职责结束，交给 Superpowers

### 产出物

| 产出物         | 内容           | 下游消费者                         |
|-------------|--------------|-------------------------------|
| proposal.md | 做什么、为什么、不做什么 | 用户确认、Superpowers 参考           |
| design.md   | 技术方案、架构设计    | Superpowers 参考                |
| tasks.md    | 任务清单         | Superpowers brainstorming 的输入 |

### 流程

1. 需求模糊 → 先 `/opsx:explore` 梳理，再 `/opsx:propose`
2. 需求明确 → 直接 `/opsx:propose`
3. 产出 tasks.md 后，OpenSpec 阶段结束

---

## Superpowers（执行）

### 职责

接手 tasks.md，细化并执行开发。

### 边界

- 不跳过 brainstorming 直接执行 tasks.md
- 开发完成后必须执行 `requesting-code-review`，**子代理执行**，禁止在开发上下文中自我审查
- 实施中发现规范遗漏或错误 → 回退到 OpenSpec 更新 design.md / tasks.md，再继续执行

### Subagent 策略

一定派子代理：

- 用户明确要求并行
- 2-4 个边界清晰、独立验证、无共享状态的子任务

一定不派：

- 任务有顺序依赖
- 多个子任务改同一文件或共享类型
- 根因未明的调试
- 单一目标的 bug 修复

### 执行流程

```
tasks.md → brainstorming → writing-plans → subagent-driven-development → requesting-code-review
```

---

## 全局技能：systematic-debugging

### 触发条件

用户报告 bug 或开发过程中发现 bug，任何阶段均可调用。

### 边界

- 只负责修复当前 bug，修完即结束
- 不升级到完整的工作流流程
- 不替代 `requesting-code-review`

---

## 全局技能：ui-ux-pro-max

### 触发条件

- 涉及新建或重构 UI 页面、组件、布局的任务
- 用户明确提出「设计页面」「美化界面」「改善 UX」等需求
- OpenSpec 的 design.md 中包含 UI/交互设计部分

### 使用方式

1. **小任务**（单页面/组件调整）：在 `executing-plans` 阶段直接调用 `ui-ux-pro-max` skill 辅助生成代码
2. **中/大任务**：在 `brainstorming` 阶段参考 `ui-ux-pro-max` skill 的设计思维框架确认美学方向，再进入 `writing-plans` 细化

### 边界

- 仅辅助 UI 层面的设计和实现，不干预业务逻辑和架构决策
- skill 产出的设计方向需经 brainstorming 确认后才执行
- 不替代 `requesting-code-review`

---

## 技术规范

### 架构

- 进程分离：主进程（系统/网络/定时）↔ IPC ↔ 渲染进程（UI/交互）
- 敏感数据加密存储，通过 contextBridge 暴露 API

### 代码规范

- TypeScript 严格模式
- Vue 3 Composition API（`<script setup>`）
- Prettier：单引号、无分号、行宽 100
- 命名：PascalCase（组件/类）、camelCase（变量/函数）、UPPER_SNAKE_CASE（常量）
- IPC 通道命名：`模块:操作`（如 `reservation:submit`）

### 模块化与复用

- 功能按模块组织，主进程/渲染进程代码清晰分离
- 新增功能前先检查现有模块和组件，优先复用已有实现
- 通用逻辑封装为独立模块或工具函数，禁止在多处重复相同代码
- UI 组件抽取为可复用的 Vue 组件，通过 props/emits 通信

### 开发约束

- 禁止在渲染进程执行耗时操作
- 网络请求必须包含超时和重试机制
- 控制请求频率
- 完整日志记录

### 注释规范

- 公共函数/方法必须使用 JSDoc 注释，包含 `@param`、`@returns`、`@throws`（如有异常）
- Vue 组件顶部用 `/** */` 注释说明组件用途、props 和 emits（当类型定义不足以表达语义时）
- 复杂业务逻辑、算法、正则表达式必须附上行内注释说明意图
- IPC 通道处理函数必须注释说明调用方和触发场景
- 禁止无意义注释（如 `// 赋值`、`// 返回结果`），注释应解释「为什么」而非「是什么」
- 代码变更时同步更新相关注释，禁止保留过期注释误导后续开发
