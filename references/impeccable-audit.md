# Impeccable Audit 规范

每次执行 `/impeccable audit` 后，必须按以下规范生成审计报告并持久化到磁盘。

## 执行流程

审计必须覆盖 **5 个维度**，每个维度单独评分 0-4：

| 维度                     | 检查要点                                                                       |
| ------------------------ | ------------------------------------------------------------------------------ |
| **Accessibility (A11y)** | 对比度 (< 4.5:1)、ARIA 缺失、键盘导航、语义 HTML、alt 文本、表单标签           |
| **Performance**          | 布局抖动、昂贵动画、懒加载缺失、bundle 体积、不必要的重渲染                    |
| **Theming**              | 硬编码颜色、暗黑模式缺失、token 使用不一致、主题切换问题                       |
| **Responsive Design**    | 固定宽度、触摸目标 < 44px、水平溢出、文本缩放破坏、断点缺失                    |
| **Anti-Patterns**        | AI slop 迹象（渐变文字、玻璃拟态、英雄指标、相同卡片网格）、DESIGN.md 禁令违反 |

**评分标准**：

- 0 = 严重/不可用，1 = 重大问题，2 = 部分达标，3 = 良好/小缺陷，4 = 优秀
- **总分 18-20** = 优秀，**14-17** = 良好，**10-13** = 可接受需改进，**6-9** = 较差，**0-5** = 关键问题

## 报告格式

审计报告必须包含以下章节（按顺序）：

1. **Audit Health Score** — 表格，5 个维度 + 总分
2. **Anti-Patterns Verdict** — 是否看起来像 AI 生成，列出具体迹象
3. **Executive Summary** — 总分、问题统计 (P0/P1/P2/P3)、Top 5 关键问题、下一步建议
4. **Detailed Findings by Severity** — 按 P0 → P3 分级，每个问题必须包含：
   - 问题名称（带 `[P?]` 标签）
   - **Location**：文件路径 + 行号
   - **Category**：Accessibility / Performance / Theming / Responsive / Anti-Pattern
   - **Impact**：对用户的影响
   - **WCAG/Standard**：违反的标准（如适用）
   - **Recommendation**：具体修复建议
   - **Suggested command**：推荐的 `/impeccable` 子命令
5. **Patterns & Systemic Issues** — 反复出现的问题模式，而非一次性错误
6. **Positive Findings** — 值得保持的良好实践
7. **Recommended Actions** — 按优先级排序的 `/impeccable` 命令列表

## Severity 定义

| 级别            | 定义                                | 修复时机 |
| --------------- | ----------------------------------- | -------- |
| **P0 Blocking** | 阻止任务完成，必须立即修复          | 立即     |
| **P1 Major**    | 重大困难或 WCAG AA 违反，发布前修复 | 发布前   |
| **P2 Minor**    | 有变通方案，下次迭代修复            | 下一周期 |
| **P3 Polish**   | 锦上添花，有时间再修                | 有空时   |

## 文件输出规范

每次审计完成后，必须将完整报告写入文件：

- **存放路径**：`.impeccable/audit/`
- **命名格式**：`{ISO-date}T{ISO-time}Z__audit-report.md`
- 示例：`.impeccable/audit/2026-05-21T21-30-00Z__audit-report.md`

如果 `.impeccable/audit/` 目录不存在，先创建目录再写入文件。
