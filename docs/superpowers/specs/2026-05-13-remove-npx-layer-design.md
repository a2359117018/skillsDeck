# Remove npx Layer — Direct skills CLI Invocation

## Motivation

The app already globally installs the skills CLI via `npm install -g skills`, yet still invokes it through `npx skills ...`. This adds an unnecessary indirection layer: npx was designed for running packages without installing them, but since skills is already globally installed, npx provides zero value. Removing it simplifies the call chain, reduces startup latency, and eliminates a redundant dependency check.

## Changes

### 1. Shared Types (`src/shared/types.ts`)

Remove `npxInstalled` and `npxVersion` from `EnvStatus`:

```typescript
export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npmInstalled: boolean
  npmVersion: string | null
  skillsInstalled: boolean
  skillsVersion: string | null
}
```

### 2. Main Process — EnvService (`src/main/services/EnvService.ts`)

- `checkAll()`: remove `npxService.checkNpxVersion()` call; check skills version via `commandRunner.run('skills', ['--version'])` directly
- `installSkillsCli()`: change `npm install -g npx skills` to `npm install -g skills`

### 3. Main Process — NpxService → SkillsService (`src/main/services/NpxService.ts`)

- Rename file to `SkillsService.ts`, class to `SkillsService`, export to `skillsService`
- Delete `checkNpxVersion()` method
- `checkSkillsVersion()`: use `commandRunner.run('skills', ['--version'])` instead of `commandRunner.run('npx', ['skills', '--version'])`
- All other methods (`install`, `installStreaming`, `update`, `updateAll`, `remove`): change first argument of `commandRunner.run()` from `'npx'` to `'skills'`
- `buildArgs` no longer needs to prepend `'skills'` as a subcommand to npx — instead the args become direct skills CLI args (e.g., `['add', '<url>', '-g', '-y']` instead of `['skills', 'add', '<url>', '-g', '-y']`)

### 4. Main Process — IPC Handlers (`src/main/ipc/`)

Update all imports from `NpxService` / `npxService` to `SkillsService` / `skillsService`. IPC channel names remain unchanged (internal implementation detail only).

### 5. Renderer — Env Store (`src/renderer/src/stores/env.ts`)

Remove `npxInstalled` and `npxVersion` from default status values.

### 6. Renderer — App.vue

Simplify `envOk` computed property:

```typescript
const envOk = computed(() => {
  const s = envStore.status
  return s?.nodeInstalled && s?.npmInstalled && s?.skillsInstalled
})
```

### 7. Renderer — SettingsView.vue

- Remove npx status display block (icon, version text, update button)
- Remove `handleUpdateNpx` function
- Remove `update-npx` task type from background task handling if present

### 8. Preload (`src/preload/index.d.ts`)

Remove any `npx`-related type declarations if they exist independently.

## Files to Modify

| File                                      | Change                                                     |
| ----------------------------------------- | ---------------------------------------------------------- |
| `src/shared/types.ts`                     | Remove npx fields from EnvStatus                           |
| `src/main/services/NpxService.ts`         | Rename to SkillsService, change command from npx to skills |
| `src/main/services/EnvService.ts`         | Remove npx checks, simplify install command                |
| `src/main/ipc/*.ts`                       | Update imports                                             |
| `src/renderer/src/stores/env.ts`          | Remove npx defaults                                        |
| `src/renderer/src/App.vue`                | Simplify envOk check                                       |
| `src/renderer/src/views/SettingsView.vue` | Remove npx UI elements                                     |

## Not Changed

- skills CLI subcommands and args remain identical
- Proxy/mirror settings continue to work the same way
- Agent scanning is unaffected
- Search API is unaffected
- Install/update/remove flow logic unchanged — only the command invocation changes
