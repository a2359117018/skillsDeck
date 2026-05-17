## 1. Main Process - Local Skill Installer Core

- [ ] 1.1 Create `src/main/services/LocalSkillInstaller.ts` with `scanSkills(dir, maxDepth=2)` function
- [ ] 1.2 Implement `installSkills(skillDirs, agents)` using `fs.promises.cp` with `recursive: true, force: true`
- [ ] 1.3 Implement `expandPath` utility for `~` home directory expansion (reuse or extract from `AgentScanner`)
- [ ] 1.4 Add temporary directory cleanup helper (`cleanupTempDir`) using `fs.promises.rm`
- [ ] 1.5 Add installation result aggregation (success list + failure list with error details)

## 2. Main Process - GitHub Skill Install Service

- [ ] 2.1 Create `src/main/services/GitHubSkillInstaller.ts` with URL parser supporting `owner/repo`, `tree/branch/path`, `.git` suffix
- [ ] 2.2 Implement `downloadZipball(owner, repo, branch)` using `fetch` with `AbortController` and 30s timeout; URL must respect `proxyUrl` setting (`${proxyUrl}/https://github.com/...` pattern, same as `SkillsService.buildGitUrl`)
- [ ] 2.3 Implement `extractAndScan(zipPath, subPath?)` using `decompress` + `LocalSkillInstaller.scanSkills`
- [ ] 2.4 Wire download progress reporting via IPC event stream (`skills:github-download-progress`)

## 3. Main Process - Archive Skill Install Service

- [ ] 3.1 Create `src/main/services/ArchiveSkillInstaller.ts` with `extractAndScan(archivePath)` using `decompress`
- [ ] 3.2 Add file type validation (zip, tar.gz, tgz) before extraction

## 4. Main Process - IPC Handlers

- [ ] 4.1 Add `skills:parse-github` handler in `skills.ipc.ts` (download + extract + scan, return skill list)
- [ ] 4.2 Add `skills:select-archive` handler using `dialog.showOpenDialog` with filter for `.zip`, `.tar.gz`, `.tgz`
- [ ] 4.3 Add `skills:extract-archive` handler (extract + scan, return skill list)
- [ ] 4.4 Add `skills:install-local` handler (copy selected skill dirs to target agents)
- [ ] 4.5 Add `skills:cancel-github-download` handler (abort in-progress fetch)

## 5. Preload - API Exposure

- [ ] 5.1 Update `src/preload/index.ts` to expose new IPC methods on `window.api.skills`
- [ ] 5.2 Update `src/preload/index.d.ts` with type declarations for new methods

## 6. Renderer - Shared Components

- [ ] 6.1 Create `src/renderer/src/components/skills/AgentSelector.vue` extracted from `SkillInstallDialog` agent selection logic
- [ ] 6.2 Create `src/renderer/src/components/skills/SkillScanResult.vue` showing checkable skill list with name and relative path
- [ ] 6.3 Create `src/renderer/src/components/skills/LocalInstallPanel.vue` combining `SkillScanResult` + `AgentSelector` + install button

## 7. Renderer - GitHub Install Tab

- [ ] 7.1 Create `src/renderer/src/components/skills/GitHubInstaller.vue` with URL input, parse button, and `LocalInstallPanel`
- [ ] 7.2 Implement download progress display (percentage or indeterminate spinner)
- [ ] 7.3 Handle parse errors (invalid URL, 404, timeout) with user-friendly messages
- [ ] 7.4 Wire install flow: parse → preview skills → select agents → install → refresh skill list

## 8. Renderer - Archive Install Tab

- [ ] 8.1 Create `src/renderer/src/components/skills/ArchiveInstaller.vue` with file picker button/drop zone and `LocalInstallPanel`
- [ ] 8.2 Implement file selection via IPC `skills:select-archive`
- [ ] 8.3 Handle extraction errors with user-friendly messages
- [ ] 8.4 Wire install flow: select file → extract & scan → preview skills → select agents → install → refresh skill list

## 9. Renderer - SkillsSearch Page Refactor

- [ ] 9.1 Add `NTabs` + `NTabPane` to `SkillsSearch.vue` with three tabs: 搜索安装 / GitHub链接 / 压缩包
- [ ] 9.2 Move existing search content into "搜索安装" tab pane (no functional changes)
- [ ] 9.3 Embed `GitHubInstaller` in "GitHub链接" tab pane
- [ ] 9.4 Embed `ArchiveInstaller` in "压缩包" tab pane
- [ ] 9.5 Ensure skill list refresh after any successful install (GitHub/archive/搜索)

## 10. Integration & Verification

- [ ] 10.1 Run `npm run typecheck` to verify TypeScript across main/renderer/preload
- [ ] 10.2 Run `npm run lint` to check code style
- [ ] 10.3 Run `npm run format` to apply formatting
- [ ] 10.4 Manual test: GitHub URL with single skill at root
- [ ] 10.5 Manual test: GitHub URL with multiple skills at depth 1
- [ ] 10.6 Manual test: GitHub URL with multiple skills at depth 2
- [ ] 10.7 Manual test: ZIP archive with mixed depth skills
- [ ] 10.8 Manual test: Cancel in-progress GitHub download
- [ ] 10.9 Verify search install still works correctly after changes
- [ ] 10.10 Verify installed skills appear in `InstalledList` after GitHub/archive install
