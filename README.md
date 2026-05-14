# NPX Skills UI

![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-blue)

[`npx skills`](https://github.com/vercel-labs/skills) CLI 的图形化管理桌面应用。

NPX Skills UI 是 [vercel-labs/skills](https://github.com/vercel-labs/skills) 的 GUI 包装与功能增强版。它将命令行操作转化为直观的可视化界面，让你告别繁琐的终端命令，统一管理 50+ AI 编码助手的技能包。

---

## 功能特性

### 相比 CLI 的功能增强

原版 `npx skills` 只能通过命令行操作，本应用提供以下增强：

| 增强点 | 说明 |
|---|---|
| 图形化界面 | 完整的 GUI 操作，无需记忆命令参数 |
| 多 Agent 统一管理 | 同时管理 55+ AI Agent 的技能，无需手动指定 `--agent` |
| 技能搜索 | 集成 [skills.sh](https://skills.sh) 搜索技能包 |
| 流式安装进度 | 实时显示安装输出，可视化进度 |
| Agent 维度管理 | 按 Agent 浏览和操作技能，支持快速打开技能目录 |
| 一键更新所有技能 | 批量更新，无需逐个执行 |
| 环境自动检测与修复 | 自动检测 Node.js / npm / skills CLI，缺失时一键安装 |
| GitHub 代理支持 | 内置 gh-proxy 代理，解决国内访问问题 |
| npm 镜像支持 | 内置淘宝、清华、腾讯云等镜像源 |
| 背景任务 | 长时间操作后台运行，不阻塞界面 |

### 核心功能

- **技能搜索与安装** — 搜索 [skills.sh](https://skills.sh) 技能包，选择目标 Agent 一键安装
- **已安装技能管理** — 查看、搜索、按 Agent 筛选本地技能，支持更新与删除
- **Agent 管理** — 可视化卡片展示各 Agent 技能数量，侧滑面板管理单个 Agent 的技能
- **环境管理** — 自动检测 Node.js 环境，缺失时一键下载安装；支持 skills CLI 更新
- **网络优化** — 内置 GitHub 代理与 npm 镜像源设置，优化国内访问体验

---

## 支持的 AI Agent

支持 55+ 主流 AI 编码助手：

**Claude Code** · **Cursor** · **GitHub Copilot** · **Gemini CLI** · **Codex** · **Windsurf** · **Cline** · **Continue** · **Roo Code** · **Trae** · **Augment** · **Goose** · **Devin** · **Kimi Code CLI** · **Qwen Code** · **Tabnine CLI** · **Zencoder** · **Firebender** · **Junie** · **Mistral Vibe** · **OpenCode** · **OpenHands** · **Pi** · **Kiro CLI** · **Kilo Code** 等

> 完整列表见 [`src/shared/agents.json`](src/shared/agents.json)

---

## 安装

### 下载安装包

从 [Releases](../../releases) 页面下载对应平台的安装包：

- **Windows**：`.exe` 安装程序
- **macOS**：`.dmg` 磁盘镜像
- **Linux**：`.AppImage` / `.deb`

### 首次启动

应用会自动检测 Node.js 运行环境。如果未检测到，将引导你一键下载安装，无需手动配置。

---

## 应用截图

> 截图占位，建议在以下位置补充产品截图：
>
> - 技能搜索页面
> - 已安装技能列表
> - Agent 管理页面
> - 设置页面

---

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

---

## 相关项目

- [vercel-labs/skills](https://github.com/vercel-labs/skills) — 原版的 `npx skills` CLI 工具
