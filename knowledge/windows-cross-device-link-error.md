# Windows 跨驱动器硬链接错误 (EXDEV)

## 错误原因

Windows 文件系统不允许跨驱动器创建硬链接（hard link）。当源文件和目标路径位于不同盘符（如 C: 和 E:）时，`fs.link()` 会抛出 `EXDEV: cross-device link not permitted`。

在本项目中，该错误出现在两个环节：

1. **ZIP 解压环节**：`decompress` 库在 Windows 上遇到 ZIP 中的符号链接（symlink）时，会将其转换为硬链接重建，且未正确解析符号链接目标路径的相对位置，导致目标路径被解析为项目所在驱动器的文件，而写入位置在临时目录（另一驱动器），触发跨盘硬链接失败。

2. **文件复制环节**：Node.js 的 `fs.cp()` 在 Windows 上递归复制目录时，内部可能尝试使用硬链接（reflink/hardlink）进行优化，跨驱动器时同样会失败。

## 处理方案

### ZIP 解压 — 绕过 `decompress` 的硬链接行为

使用 `yauzl` 直接解压 ZIP，自行控制文件写入逻辑：

- 普通文件：通过流直接写入目标路径
- 目录：递归创建
- 符号链接：跳过流写入，待全部文件解压完毕后，使用 `fs.copyFile` 将目标文件内容复制到符号链接位置

这样既避免了硬链接，也保留了符号链接指向的文件内容，不影响后续的 skill 扫描。

### 文件复制 — 替换 `fs.cp()`

实现自定义的 `copyDir` 递归复制函数，明确使用 `fs.copyFile` 逐文件复制，不依赖任何系统级链接优化：

```typescript
private async copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true })
  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await this.copyDir(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}
```

## 错误总结

- **平台特性**：Windows 硬链接严格限制在同一文件系统内，跨驱动器必然失败。符号链接在 Windows 上也需要特殊权限（开发者模式或管理员权限），不能作为可靠的跨盘替代方案。
- **第三方库陷阱**：`decompress` 库为了兼容 Windows，将符号链接降级为硬链接，反而在跨盘场景下引入了更隐蔽的 `EXDEV` 错误。依赖库的默认行为在跨平台环境中需要谨慎验证。
- **Node.js 优化陷阱**：`fs.cp()` 的内部实现可能使用 reflink/hardlink 加速复制，这在跨盘场景下会静默失败。对于需要跨盘操作的场景，应显式使用 `fs.copyFile` 保证可移植性。
- **防御性编程**：涉及文件系统跨盘操作的代码，应避免依赖任何可能创建链接的 API，使用最基础的文件读写原语（`mkdir` + `copyFile` + `pipe`）以确保跨平台安全。
