# 安装流程与代理设置改造设计文档

## 背景

当前技能安装过程在 `SkillInstallDialog` 中显示实时终端日志输出，体验较为粗糙。同时 `npx skills add` 底层实际是 `git clone` GitHub 仓库，国内网络环境下经常失败，需要支持代理加速。

## 目标

1. 将安装过程的实时日志替换为简洁的进度指示（不确定性进度条 + "正在安装中，请稍候..."）
2. 在设置中新增 GitHub 代理选择器，提供常用代理预设
3. 改造 `npx skills add` 的参数构造方式：使用 `skill.source` 拼接完整的 GitHub URL（含代理前缀）

## 设计

### 模块 1：代理设置（Settings）

#### 数据模型

`AppSettings` 新增 `proxyUrl` 字段：

```typescript
export interface AppSettings {
  defaultAgent: string
  autoCheckEnv: boolean
  proxyUrl?: string  // 空字符串或 undefined 表示不使用代理
}
```

`StoreService` 默认值同步更新：

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  defaultAgent: 'claude-code',
  autoCheckEnv: true,
  proxyUrl: ''
}
```

#### UI（SettingsView.vue）

新增一行设置项"GitHub 代理"，使用 `NSelect`：

| 选项 | 值 |
|------|-----|
| 不使用代理 | `''` |
| gh-proxy.org | `https://gh-proxy.org` |
| hk.gh-proxy.org | `https://hk.gh-proxy.org` |
| cdn.gh-proxy.org | `https://cdn.gh-proxy.org` |
| edgeone.gh-proxy.org | `https://edgeone.gh-proxy.org` |
| 自定义... | `'__custom__'` |

当选择"自定义..."时，下方展开 `NInput` 输入框：
- placeholder: `https://your-proxy.com`
- 需以 `https://` 开头
- 输入内容实时更新 `proxyUrl` 值

保存逻辑复用现有 `settingsStore.save()` → `StoreService` → `electron-store` 链路。

### 模块 2：安装进度指示器（SkillInstallDialog）

#### 状态流转

| 状态 | UI 表现 |
|------|---------|
| 安装中 | `NProgress` indeterminate 模式 + "正在安装中，请稍候..." + 取消按钮可用 |
| 成功 | 进度条消失，绿色对勾 + "安装成功"，2 秒后自动关闭对话框 |
| 失败 | 进度条消失，红色错误图标 + "安装失败"，下方展开失败日志区域（原始输出的最后 30 行），带"重试"和"关闭"按钮 |

#### 实现要点

- 移除原有的实时终端输出区域（`NScrollbar` + 逐行追加逻辑）
- `CommandRunner.run` 的 Promise resolve/reject 作为状态切换信号
- 安装过程中，原始输出不再实时展示，但仍然需要在内存中累积，用于失败时展示日志
- 取消按钮行为不变，调用 `window.api.skills.cancelInstall()`

### 模块 3：URL 构造逻辑（NpxService）

#### 参数改造

`buildInstallArgs` 方法从原来的接收 `packageRef`（`@scope/name` 格式）改为接收 `source`（`owner/repo` 格式），并在内部拼接完整 URL：

```typescript
private buildGitUrl(source: string): string {
  const proxyUrl = storeService.getSettings().proxyUrl
  if (proxyUrl) {
    return `${proxyUrl}/https://github.com/${source}.git`
  }
  return `https://github.com/${source}.git`
}

private buildInstallArgs(source: string, agents: string[], global?: boolean): string[] {
  const gitUrl = this.buildGitUrl(source)
  const args = this.buildArgs('add', gitUrl)  // ['skills', 'add', gitUrl]
  args.push('-g', '-y')
  if (global) {
    args.push('--agent', '*')
  } else if (agents.length > 0) {
    args.push('--agent', ...agents)
  }
  return args
}
```

#### 调用链路改造

前端 `SkillInstallDialog` 调用 `skillsStore.installStreaming` 时，传入的不再是 `skill.name`，而是 `skill.source`：

```typescript
// 改造前
await skillsStore.installStreaming(skill.name, selectedAgents)

// 改造后
await skillsStore.installStreaming(skill.source, selectedAgents)
```

`skillsStore.installStreaming` → IPC `skills:install-streaming` → `NpxService.installStreaming` 整个链路中的 `packageRef: string` 参数名统一改为 `source: string`，类型不变。

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/shared/types.ts` | 修改 | `AppSettings` 新增 `proxyUrl` |
| `src/main/services/StoreService.ts` | 修改 | `DEFAULT_SETTINGS` 新增 `proxyUrl` |
| `src/main/services/NpxService.ts` | 修改 | `buildInstallArgs` 改为接收 `source` 并拼接 git URL；新增 `buildGitUrl` |
| `src/main/ipc/skills.ipc.ts` | 修改 | `install-streaming` handler 参数名 `packageRef` → `source` |
| `src/preload/index.ts` | 修改 | `installStreaming` 参数名同步更新 |
| `src/preload/index.d.ts` | 修改 | `installStreaming` 类型签名同步更新 |
| `src/renderer/src/stores/skills.ts` | 修改 | `installStreaming` action 参数名 `packageRef` → `source` |
| `src/renderer/src/components/skills/SkillInstallDialog.vue` | 大幅修改 | 移除实时日志区域，改为进度指示器；传入参数改为 `skill.source` |
| `src/renderer/src/views/SettingsView.vue` | 修改 | 新增代理选择器 |
| `src/renderer/src/stores/settings.ts` | 修改 | `settingsCache` default value 新增 `proxyUrl: ''` |

## 边界情况

- **代理设置后立即安装**：Settings 页面保存是实时的（`NSelect` 的 `onUpdate:value` 直接调用 `save`），无需额外处理
- **自定义代理格式校验**：前端简单校验必须以 `https://` 开头，后端不做额外校验（`npx skills add` 执行失败时会自然报错）
- **代理失效**：安装失败时展示原始命令输出，用户可以从日志中看到 HTTP 错误码判断代理问题
- **向后兼容**：现有已保存的用户设置中没有 `proxyUrl` 字段，`StoreService` 读取时会被 `DEFAULT_SETTINGS` 合并，表现为不使用代理
