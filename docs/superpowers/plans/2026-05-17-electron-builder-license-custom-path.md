# Electron Builder License and Custom Install Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a usage declaration page, Apache 2.0 license agreement page, and custom installation directory selection to the Windows NSIS installer.

**Architecture:** Use electron-builder\'s native `license` and `allowToChangeInstallationDirectory` options for the license and path features. Insert an additional usage declaration page before the license page by defining a `customWelcomePage` macro in a custom `build/installer.nsh` script.

**Tech Stack:** electron-builder, NSIS, YAML

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `build/declaration.txt` | Create | Usage declaration and disclaimer text shown on the first license page |
| `build/installer.nsh` | Create | Custom NSIS script defining `customWelcomePage` macro to insert welcome + declaration pages |
| `electron-builder.yml` | Modify | Add `license`, `allowToChangeInstallationDirectory`, and `include` to the `nsis` block |
| `LICENSE` | Existing | Apache 2.0 license text (already fetched from `origin/main`) |

---

### Task 1: Create Usage Declaration Text File

**Files:**
- Create: `build/declaration.txt`

- [ ] **Step 1: Write the declaration text file**

  Create `build/declaration.txt` with the following content:

  ```
  使用声明与免责条款

  1. 软件按"原样"提供，作者不对软件的适用性、可靠性、准确性做任何明示或暗示的担保。
  2. 使用本软件所产生的任何直接或间接损失，作者不承担任何责任。
  3. 本软件不会主动收集、上传用户的任何个人数据或敏感信息。
  4. 用户不得将本软件用于任何违反法律法规的用途。
  5. 继续使用即表示您已阅读并理解上述声明。

  请勾选"我已阅读并同意上述声明"以继续安装。
  ```

- [ ] **Step 2: Verify file encoding**

  Run: `file build/declaration.txt`
  Expected: UTF-8 text (NSIS requires UTF-8 with BOM for non-ASCII characters; electron-builder will auto-convert during build)

- [ ] **Step 3: Commit**

  ```bash
  git add build/declaration.txt
  git commit -m "feat: add usage declaration text for NSIS installer

  Adds the usage declaration and disclaimer shown before the
  Apache 2.0 license agreement during installation.

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  ```

---

### Task 2: Create Custom NSIS Script

**Files:**
- Create: `build/installer.nsh`

- [ ] **Step 1: Write the custom NSIS script**

  Create `build/installer.nsh` with the following content:

  ```nsis
  ; Custom NSIS script for electron-builder
  ; Inserts a welcome page and usage declaration license page before the standard license page

  !macro customWelcomePage
    ; Standard MUI welcome page
    !insertmacro MUI_PAGE_WELCOME

    ; Usage declaration page (shown before the Apache 2.0 license)
    ; File path is relative to this script file (build/installer.nsh)
    !insertmacro MUI_PAGE_LICENSE "declaration.txt"
  !macroend
  ```

- [ ] **Step 2: Verify syntax**

  Run: `cat build/installer.nsh`
  Expected: The file contains exactly the content from Step 1, with no syntax errors.

- [ ] **Step 3: Commit**

  ```bash
  git add build/installer.nsh
  git commit -m "feat: add custom NSIS script for declaration page

  Defines customWelcomePage macro to insert a welcome page and
  usage declaration license page before the standard Apache 2.0
  license agreement.

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  ```

---

### Task 3: Update electron-builder.yml

**Files:**
- Modify: `electron-builder.yml`

- [ ] **Step 1: Update the NSIS configuration block**

  Modify the `nsis` section in `electron-builder.yml`. The existing block:

  ```yaml
  nsis:
    artifactName: ${name}-${version}-setup.${ext}
    shortcutName: ${productName}
    uninstallDisplayName: ${productName}
    createDesktopShortcut: always
  ```

  Change it to:

  ```yaml
  nsis:
    artifactName: ${name}-${version}-setup.${ext}
    shortcutName: ${productName}
    uninstallDisplayName: ${productName}
    createDesktopShortcut: always
    license: LICENSE                          # Apache 2.0 license page
    allowToChangeInstallationDirectory: true  # Enable custom install path selection
    include: build/installer.nsh              # Custom script for declaration page
  ```

- [ ] **Step 2: Verify YAML syntax**

  Run: `npx electron-builder --help` or check with a YAML linter
  Expected: No YAML syntax errors in `electron-builder.yml`

- [ ] **Step 3: Commit**

  ```bash
  git add electron-builder.yml
  git commit -m "feat: configure NSIS with license, custom path, and declaration

  Configures electron-builder NSIS installer to:
  - Display Apache 2.0 license agreement
  - Allow users to customize installation directory
  - Include custom script for usage declaration page

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  ```

---

### Task 4: Verify Build

**Files:**
- Test: Generated installer `out/npx-skills-ui-1.0.0-setup.exe`

- [ ] **Step 1: Run Windows build**

  Run: `npm run build:win`
  Expected: Build completes successfully without NSIS compilation errors.

- [ ] **Step 2: Check for NSIS errors in build output**

  Look for any errors in the console output related to:
  - `MUI_PAGE_LICENSE` or `MUI_PAGE_WELCOME` macros
  - File not found for `declaration.txt`
  - `customWelcomePage` macro issues

  Expected: No NSIS macro or file-not-found errors.

- [ ] **Step 3: Test the generated installer (manual smoke test)**

  On a Windows machine or VM:
  1. Run `out/npx-skills-ui-1.0.0-setup.exe`
  2. Verify the installation wizard shows:
     - Page 1: Welcome page (应用名称和版本)
     - Page 2: Usage declaration page (使用声明与免责条款) with "I agree" / "I disagree" buttons
     - Page 3: Apache 2.0 license page with "I agree" / "I disagree" buttons
     - Page 4: Installation directory page with "Browse" button enabled
     - Page 5: Installation progress
     - Page 6: Completion page
  3. Test rejection path: Decline usage declaration → installation terminates
  4. Test acceptance path: Agree to declaration + agree to license → proceeds to directory selection

  Expected: All pages display correctly and rejection terminates installation.

- [ ] **Step 4: Commit any fixes if needed**

  If any issues were found and fixed during verification, commit them:

  ```bash
  git add <fixed-files>
  git commit -m "fix: correct NSIS script paths and configuration

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  ```

---

## Self-Review

**1. Spec coverage:**
- ✅ Usage declaration page before license — Task 2 (`customWelcomePage` macro with `MUI_PAGE_LICENSE "declaration.txt"`)
- ✅ Apache 2.0 license agreement — Task 3 (`license: LICENSE` in electron-builder.yml)
- ✅ Custom installation directory — Task 3 (`allowToChangeInstallationDirectory: true`)
- ✅ Windows NSIS only — No changes to macOS or Linux blocks

**2. Placeholder scan:**
- ✅ No "TBD", "TODO", or "implement later"
- ✅ All code blocks contain complete, copy-pasteable content
- ✅ All file paths are exact and absolute relative to project root
- ✅ No vague instructions like "add appropriate error handling"

**3. Type consistency:**
- ✅ `declaration.txt` referenced consistently as `"declaration.txt"` in `installer.nsh`
- ✅ `build/installer.nsh` referenced consistently as `build/installer.nsh` in YAML and plan
- ✅ `LICENSE` referenced consistently as `LICENSE` in YAML

**4. Known limitations / edge cases:**
- The `declaration.txt` file path in `installer.nsh` uses a relative path `"declaration.txt"`. This relies on NSIS resolving it relative to the `build/` directory where both `installer.nsh` and `declaration.txt` reside. If electron-builder copies `installer.nsh` to a different location during compilation, this path may need to be adjusted to an absolute path or use `${BUILD_RESOURCES_DIR}` if available.
- Non-ASCII characters (Chinese) in `declaration.txt` require UTF-8 encoding. electron-builder\'s `nsisLicense.js` automatically converts license files to UTF-8 with BOM, so this should be handled correctly.
