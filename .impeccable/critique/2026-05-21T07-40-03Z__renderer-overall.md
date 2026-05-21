---
target: renderer-overall
total_score: 33
p0_count: 0
p1_count: 0
p2_count: 0
timestamp: 2026-05-21T07-40-03Z
updated: 2026-05-21T12-30-00Z
slug: renderer-overall
---

# NPX Skills UI — Design Critique

## Design Health Score

| #         | Heuristic                         | Score     | Key Issue                                                                      |
| --------- | --------------------------------- | --------- | ------------------------------------------------------------------------------ |
| 1         | Visibility of System Status       | 4         | Task indicator in sidebar + TaskDrawer with progress; good feedback loop       |
| 2         | Match System / Real World         | 3         | "全局安装" still opaque; agent jargon partially addressed via empty states     |
| 3         | User Control and Freedom          | 3         | AgentSelector streamlined; keyboard shortcuts added; no bulk select yet        |
| 4         | Consistency and Standards         | 4         | CSS anti-patterns cleaned; border radius unified; install flow consistent      |
| 5         | Error Prevention                  | 3         | Confirmation dialogs exist, URL validation present; no empty-search prevention |
| 6         | Recognition Rather Than Recall    | 3         | Sidebar labels at 11px with flat design; focus indicators added; no onboarding |
| 7         | Flexibility and Efficiency of Use | 3         | `/` and `Ctrl+K` search shortcuts; AgentSelector simplified; no command palette|
| 8         | Aesthetic and Minimalist Design   | 5         | All gradient/glow decorations removed; flat dark sidebar; clean agent cards    |
| 9         | Error Recovery                    | 3         | Focus trap + aria labels added; toasts still auto-dismiss                      |
| 10        | Help and Documentation            | 2         | Contextual empty states with actions; settings onboarding added; no FAQ/help   |
| **Total** |                                   | **33/40** | **Good — remaining issues are refinements, not blockers**                      |

## Anti-Patterns Verdict

**LLM assessment**: Low AI signature. All major AI-template patterns have been addressed: sidebar is now a flat dark panel, agent card glow shadows removed, gradient avatar replaced with flat color, and step-number circles removed from drawer lists. The four-color agent cycling remains but serves a structural purpose (scannability) rather than decoration. The toolbar pattern and token system remain genuine strengths.

**Deterministic scan**: Detector returned 0 findings (clean exit). Previously found issues that have since been resolved: hardcoded hex colors reduced (CommandOutput.vue removed), `!important` overrides cleaned from AgentView.vue, and `transition: all` instances replaced with specific properties across all files.

**Browser visualization**: Skipped. Electron desktop app with no live dev server running.

## Overall Impression

The app has matured significantly from its initial critique. The sidebar is now a flat, purposeful dark panel rather than a decorative gradient strip. Background tasks are visible via the sidebar task indicator and dedicated TaskDrawer. The install flow has been streamlined with common-agent shortcuts and a collapsed expansion for additional targets. Empty states across all major views now include contextual next-step actions. Keyboard shortcuts (`/` and `Ctrl+K`) support power-user workflows.

Remaining opportunities: add a brief first-run onboarding tooltip for "Agent" terminology; consider replacing agent card color-cycling with a subtler system (tonal rather than saturated); and evaluate whether search results could benefit from higher density.

## What's Working

1. **Toolbar pattern is genuinely consistent.** Every page uses the same title + badge + search + actions layout. The badge showing filtered count is a smart detail that creates real predictability.

2. **Multi-agent skill management is thoughtful.** SkillRow shows agent tags per skill; clicking a tag filters. SkillRemoveDialog lets users remove from a specific agent or all agents. This solves a real cross-agent management problem.

3. **Token system is well-organized.** The separation into color, spacing, radius, shadow, typography, and transition categories with consistent naming shows intentional system thinking.

## Priority Issues

**[P1] ~~AgentSelector presents 50+ checkboxes for a 1-2 agent decision~~** `[RESOLVED]`
AgentSelector.vue now shows common agents as quick-toggle buttons, with a collapsed "安装到其他 agent..." expansion for the full list. Global install checkbox remains for the all-agents case. The common case is now one click.

**[P1] ~~No visible background task status~~** `[RESOLVED]`
Sidebar footer includes a task indicator (rocket icon with pulsing dot when active). Clicking opens a TaskDrawer showing all tasks with status, progress bars, cancel buttons, and clear-completed actions.

**[P1] ~~Search results lack substance~~** `[RESOLVED]`
SearchResultCard now surfaces package ref and download count. The "查看详情" link provides a path to skills.sh for full metadata. Search no-results empty state includes a "GitHub 安装" fallback action.

**[P2] ~~Sidebar sacrifices usability for minimalism~~** `[RESOLVED]`
Sidebar flattened to solid #111 background. Gradient, bottom glow, and 3px coral active bar removed. Active state uses subtle background-color difference (10% white overlay). Labels remain at 11px with icon+label vertical stack.

**[P2] ~~Zero help, onboarding, or contextual guidance~~** `[RESOLVED]`
All major empty states now include contextual action buttons: InstalledList → "搜索技能", AgentView → "搜索技能", SkillsSearch no-results → "GitHub 安装", SkillsSearch initial → suggested search terms. Settings onboarding added in prior commit.

**[P2] ~~Agent cards still carry AI-signature glow shadows~~** `[RESOLVED]`
Agent card hover glow shadows removed (now uses `box-shadow: var(--shadow-3)` only). Drawer header avatar gradient replaced with flat `var(--color-brand-blue)`. Step-number circles removed from drawer skill list.

## Persona Red Flags

**Alex (Power User)**: ~~No keyboard shortcuts anywhere~~ `RESOLVED` — `/` and `Ctrl+K` focus search; `Escape` closes modals. "全部更新" is still all-or-nothing — no way to select specific skills to update. SkillRow shows no version info, so Alex cannot evaluate if an update is needed. Search filters by name only, no agent/status/date filtering.

**Jordan (First-Timer)**: ~~Empty state is a dead end~~ `RESOLVED` — all empty states now have action buttons. "Agent" jargon still unexplained throughout. Environment banner ("缺少必要的运行组件") is still alarming without context. The "全局安装" checkbox defaults to checked — Jordan will install to nowhere useful without understanding why.

**Sam (Accessibility)**: ~~9px sidebar labels~~ `RESOLVED` — now 11px. ~~No visible focus indicators~~ `RESOLVED` — `focus-visible` styles added. ~~No skip-navigation link~~ `RESOLVED`. ~~No focus trap in modals~~ `RESOLVED`. Agent cards distinguished only by color (fails WCAG 1.4.1). `scrollbar-width: none` corrected to thin overlay scrollbars. AgentTagBar toggle buttons now have `aria-pressed`. Icon buttons in SkillRow now have `aria-label`.

## Minor Observations

1. ~~Unused components~~ `RESOLVED` — Versions.vue, CommandOutput.vue, LocalInstallPanel.vue removed.
2. ~~Duplicate routes~~ `RESOLVED` — /env removed, only /settings remains.
3. ~~Page transition flash~~ `RESOLVED` — out-in fade adjusted.
4. "搜索耗时 X 秒" is a developer metric that escaped to production
5. ~~Search button is redundant~~ `RESOLVED` — redundant button removed.
6. ~~Drawer body uses blue tint~~ `RESOLVED` — neutralized.
7. AgentSelector max-height inconsistency: 280px vs 180px in different contexts
8. Hardcoded colors in SkillInstallDialog.vue (#18a058, #d03050, #f0a020, #1e1e1e) bypass tokens
9. .env-hint styles in SettingsView.vue defined but unused
10. ~~Sidebar width is 72px~~ `RESOLVED` — now 60px as specified.

## Questions to Consider

1. What if the "choose agent" step disappeared entirely for the common case? Install to default agent with one click, "also install to..." as optional expansion.
2. What if the sidebar didn't exist? Four views could use a top tab bar, saving 72px of horizontal space and eliminating the readability/accessibility problems.
3. What if search results were a compact table instead of identical cards? Density would let users scan 15-20 results per viewport instead of 6-8.
