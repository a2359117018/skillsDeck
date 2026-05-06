# Fix: Windows 技能安装不生效

## 问题

在 Windows 上通过应用安装技能时，安装日志显示成功，但 `npx skills list` 看不到安装的技能。手动在终端执行相同命令可以正常安装。

## 根因

`CommandRunner.ts` 在 Windows 上使用 `shell: true`，execa 通过 cmd.exe 执行命令。cmd.exe 会对命令字符串做二次解析，可能导致参数传递与预期不一致，使得 `npx skills add` 的 `--agent` 等参数被错误解析。

项目使用 execa v9.6.1，该版本已原生支持 Windows `.cmd` 文件直接执行，不再需要 `shell: true`。

## 方案

仅改动 `src/main/services/CommandRunner.ts`：

1. 去掉 `shell: true`，改为 `shell: false`
2. 新增 `resolveCommand` 方法：Windows 上将 `npx` 解析为 `npx.cmd`
3. `run()` 和 `runStreaming()` 使用解析后的命令名

### 代码改动

```typescript
// 新增方法
private resolveCommand(command: string): string {
    if (process.platform === 'win32' && command === 'npx') {
        return 'npx.cmd'
    }
    return command
}

// run() 方法改动
// - 调用 resolveCommand(command) 替代 command
// - execaOpts.shell 改为 false
```

### 不改动的部分

- `NpxService.ts`：调用方仍传 `'npx'`
- 非 Windows 平台行为不变
- IPC 层和渲染层不受影响

## 验证

1. `npm run typecheck` 通过
2. 在 Windows 上安装一个技能（如选择 codex agent），确认：
   - 安装日志显示成功
   - `npx skills list --json -g` 能看到该技能
   - 应用内已安装列表能看到该技能
