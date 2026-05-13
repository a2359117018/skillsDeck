# Skill Remove Agent Selection

## Problem

InstalledList page deletes a skill from ALL agents unconditionally. When a skill is installed under multiple agents, the user should be able to choose whether to delete from all agents or only from a specific one.

AgentView already supports agent-specific deletion, but InstalledList always passes `global: true` with no `agent` parameter.

## Design

### New Component: SkillRemoveDialog.vue

Path: `src/renderer/src/components/skills/SkillRemoveDialog.vue`

A single-purpose confirmation dialog that receives a skill name and its agent list, lets the user pick a deletion target, and returns the choice.

**Interface:**

- Props: `skillName: string`, `agents: InstalledSkillAgent[]`
- Exposes `open(): Promise<{ confirmed: boolean; agent?: string }>` via `defineExpose`
- `agent` present = delete from that specific agent; absent = delete from all

**Dialog layout (multiple agents):**

- Title: `删除「{skillName}」`
- Radio group, default selection = "all agents":
  - `全部删除（{n} 个 agent）`
  - One row per agent showing its display name (e.g. Claude Code, Cursor)
- Footer: `取消` | `确认删除` (danger button)

**Single agent case:** The caller handles this by falling through to the existing `confirmRemove()` simple dialog instead of opening SkillRemoveDialog.

### useConfirm.ts Change

Add `confirmRemoveWithAgent(name: string, agents: InstalledSkillAgent[]): Promise<{ confirmed: boolean; agent?: string }>`.

Internally:
- `agents.length <= 1` → delegate to existing `confirmRemove(name)`, returning `{ confirmed, agent: agents[0]?.name }`
- `agents.length > 1` → programmatically render SkillRemoveDialog and return its result

### InstalledList.vue Change

In `handleRemove(name)`:

1. Look up the skill in `skillsStore.installedSkills` to get its `agents` array
2. Call `confirmRemoveWithAgent(name, agents)`
3. On confirmation, call `skillsStore.remove(name, true, result.agent)`

### Scope

- Files changed: `useConfirm.ts`, `InstalledList.vue`, new `SkillRemoveDialog.vue`
- No backend / IPC / store method changes needed — `skillsStore.remove()` already accepts an optional `agent` parameter
