# SettingsView UI 精细化调整

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 限制设置页 select/input 宽度，优化运行环境区域"重新检测"按钮布局。

**Architecture:** 纯样式和模板结构调整，无数据逻辑变更。仅修改 `SettingsView.vue` 的 CSS 和运行环境区块模板。

**Tech Stack:** Vue 3.5 + Naive UI 2.44 + CSS scoped styles

---

### File Structure

| File                                      | Action | Description                                                       |
| ----------------------------------------- | ------ | ----------------------------------------------------------------- |
| `src/renderer/src/views/SettingsView.vue` | Modify | 样式：`.settings-select` 加 `max-width`；模板：运行环境底部工具栏 |

---

### Task 1: Select/Input 宽度限制

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue:700-702`

- [ ] **Step 1: 修改 `.settings-select` 样式**

  找到现有的 `.settings-select` 样式块，添加 `max-width: 320px`：

  ```css
  .settings-select {
    width: 100%;
    max-width: 320px;
  }
  ```

  当前代码位置约在 700 行附近：

  ```css
  .settings-select {
    width: 100%;
  }
  ```

- [ ] **Step 2: 验证改动**

  确认以下 select 组件都被限制：
  - "默认安装目标"下拉框（通用设置）
  - "GitHub 代理"下拉框（网络设置）
  - "npm 镜像"下拉框（网络设置）
  - 自定义代理输入框（`custom-proxy-input`）——检查是否需要同时限制

  `custom-proxy-input` 在 `.proxy-field` 内部，`proxy-field` 已设 `width: 100%`，而 `custom-proxy-input` 是 NInput 组件的 class，NInput 默认是 block 宽度。由于 `max-width: 320px` 是在 `.settings-select` 上，`custom-proxy-input` 不在这个 class 下，需要确认它是否也会过宽。

  实际上 `custom-proxy-input` 所在的 `.proxy-field` 已设 `width: 100%`，但 NInput 组件默认宽度是由其父容器决定的。因为 `.proxy-field` 在 NFormItem 内容区域内，`NFormItem` 的内容区域宽度不受 `.settings-select` 的 `max-width` 影响。所以 `custom-proxy-input` 可能仍然过宽。

  解决方案：给 `.proxy-field` 也加 `max-width: 320px`。

  修改位置约在 705-710 行：

  ```css
  .proxy-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: 100%;
    max-width: 320px;
  }
  ```

---

### Task 2: 运行环境底部工具栏

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue:555-599`（运行环境区域模板）

- [ ] **Step 1: 重构运行环境底部操作区**

  当前运行环境底部有 3 个条件渲染的 `.env-actions` 块：
  1. 下载 Node.js 进度条/按钮
  2. 安装 skills CLI 按钮
  3. 重新检测按钮

  需要把这 3 个 `.env-actions` 合并为一个底部工具栏结构：

  ```vue
  <!-- 底部工具栏 -->
  <div class="env-toolbar">
    <div class="env-toolbar-left">
      <!-- 条件渲染：下载进度 -->
      <div v-if="envDownloading" class="env-download-progress">
        <div class="env-progress-header">
          <NText depth="3" class="env-progress-label">正在下载 Node.js</NText>
          <NText depth="3" class="env-progress-percent">{{ envDownloadProgress }}%</NText>
        </div>
        <NProgress
          type="line"
          :percentage="envDownloadProgress"
          indicator-placement="inside"
          :height="8"
          :border-radius="4"
          :fill-border-radius="4"
        />
        <NButton size="small" round @click="handleCancelInstallNode"> 取消 </NButton>
      </div>
      <!-- 条件渲染：安装 Node.js 按钮 -->
      <NButton
        v-else-if="!envStore.status?.nodeInstalled"
        type="primary"
        round
        @click="handleInstallNode"
      >
        <template #icon>
          <NIcon :size="14"><DownloadOutline /></NIcon>
        </template>
        下载并安装 Node.js
      </NButton>
      <!-- 条件渲染：安装 skills CLI 按钮 -->
      <NButton
        v-else-if="envStore.status?.nodeInstalled && !envStore.status?.skillsInstalled"
        type="primary"
        round
        :loading="skillsInstalling"
        @click="handleInstallSkills"
      >
        <template #icon>
          <NIcon :size="14"><DownloadOutline /></NIcon>
        </template>
        安装 skills CLI
      </NButton>
    </div>
    <div class="env-toolbar-right">
      <NButton size="small" round :disabled="envStore.refreshing" @click="handleEnvRecheck">
        <template #icon>
          <NIcon :size="14"><RefreshOutline /></NIcon>
        </template>
        重新检测
      </NButton>
    </div>
  </div>
  ```

  注意：当前代码中 3 个 `.env-actions` 是分开的条件渲染。需要把它们合并到同一个容器内，但保持各自的条件逻辑。

  实际上更清晰的结构是：
  - 左侧：条件渲染下载进度/安装按钮
  - 右侧：始终显示重新检测按钮

  但"下载并安装 Node.js"和"安装 skills CLI"是主操作按钮（primary），不应该和"重新检测"并排放在一起，因为视觉权重不同。

  更合理的结构：
  - 主操作按钮（安装 Node.js / 安装 skills / 下载进度）保持单独一行（因为它们是主要操作）
  - 只在"已安装完成"的状态下，把"重新检测"做成底部工具栏样式

  等等，让我重新看用户的需求。用户说的是"重新检测按钮太长了，太丑了"——指的是当前重新检测独占一行的样子不好看。如果 Node.js 未安装时，显示一个大号的"下载并安装 Node.js"按钮，这个按钮本身就应该显眼。重新检测作为次要操作，可以和它放在同一行（左侧主按钮，右侧重新检测），或者只在环境已完全安装时才把重新检测放到工具栏。

  让我看当前代码结构：

  ```vue
  <div v-if="!envStore.status?.nodeInstalled" class="env-actions">
    <!-- 下载进度 or 下载按钮 -->
  </div>
  <div
    v-if="envStore.status?.nodeInstalled && !envStore.status?.skillsInstalled"
    class="env-actions"
  >
    <!-- 安装 skills CLI 按钮 -->
  </div>
  <div class="env-actions">
    <!-- 重新检测按钮 -->
  </div>
  ```

  最简洁的改动：把 3 个 `.env-actions` 合并成 1 个，使用 flex row，主操作在左，重新检测在右。

  但当 Node.js 未安装时，下载进度条占的空间比较大，和重新检测并排放不太合适。

  所以更合理的方案：
  - 下载进度条保持独占一行（它是一个信息展示区域）
  - "下载并安装 Node.js"按钮和"重新检测"放在同一行
  - "安装 skills CLI"按钮和"重新检测"放在同一行
  - 当环境都安装好了，只有"重新检测"一个按钮时，把它改为底部工具栏样式（右侧）

  这个逻辑有点复杂。让我简化一下：

  用户的核心诉求是"重新检测按钮太长了，太丑了"。最直接的改法是把 `.env-actions` 从 `flex-direction: column` 改为 `flex-direction: row`，让重新检测按钮不再独占整行宽度，而是自然地根据内容收缩。

  但用户说要结合方案 B 的底部工具栏。方案 B 的特点是：环境卡片底部增加一条分隔线，左侧时间提示，右侧重新检测按钮。

  好吧，让我重新设计这个改动：

  **方案：统一底部工具栏**

  无论环境状态如何，底部都有一个工具栏。工具栏内根据状态显示不同内容：

  ```vue
  <div class="env-toolbar">
    <div class="env-toolbar-left">
      <!-- 状态1：下载中 -->
      <div v-if="envDownloading" class="env-download-progress">
        ...
      </div>
      <!-- 状态2：未安装 Node.js -->
      <NButton v-else-if="!envStore.status?.nodeInstalled" type="primary" round ...>
        下载并安装 Node.js
      </NButton>
      <!-- 状态3：未安装 skills -->
      <NButton v-else-if="!envStore.status?.skillsInstalled" type="primary" round ...>
        安装 skills CLI
      </NButton>
      <!-- 状态4：全部就绪，左侧留空或显示状态文字 -->
      <NText v-else depth="3" class="env-status-text">环境就绪</NText>
    </div>
    <div class="env-toolbar-right">
      <NButton size="small" round :disabled="envStore.refreshing" @click="handleEnvRecheck">
        <template #icon><NIcon :size="14"><RefreshOutline /></NIcon></template>
        重新检测
      </NButton>
    </div>
  </div>
  ```

  等等，这样当显示下载进度条时，进度条会和重新检测按钮并排，这不太好——进度条太宽了。

  好吧，我再想想。也许最简单的方法就是：
  1. 下载进度条保持独占一行（不改）
  2. 把原来的 3 个 `.env-actions` 合并，改为 `flex-direction: row; flex-wrap: wrap;`
  3. 给 `.env-actions` 加 `border-top` 和 `padding-top`，让它看起来像工具栏

  不不不，用户明确说喜欢方案 B 的运行环境。方案 B 的核心是底部有一个工具栏区域，重新检测在右侧。

  让我采用这个结构：

  ```
  运行环境
  ├── Node.js 检查项
  ├── npm 检查项
  ├── skills 检查项 (+ 更新按钮)
  ├── [条件] 下载进度条（独占一行，因为内容多）
  └── 底部工具栏（env-toolbar）
      ├── [条件] 安装按钮（Node.js 或 skills）
      └── 重新检测按钮（始终显示）
  ```

  这样：
  - 下载进度条保持独占一行（因为它有进度条+取消按钮，内容多）
  - 安装按钮和重新检测按钮在同一行
  - 环境就绪时，只有重新检测按钮在右侧

  这个方案最合理。让我写进计划。

- [ ] **Step 1: 重构运行环境底部模板**

  把原来的 3 个 `.env-actions` 块（约 556-599 行）替换为：

  保留下载进度条的独立区块（因为它内容太多，不适合并排）：

  ```vue
  <div v-if="envDownloading" class="env-actions">
    <div class="env-download-progress">
      <div class="env-progress-header">
        <NText depth="3" class="env-progress-label">正在下载 Node.js</NText>
        <NText depth="3" class="env-progress-percent">{{ envDownloadProgress }}%</NText>
      </div>
      <NProgress
        type="line"
        :percentage="envDownloadProgress"
        indicator-placement="inside"
        :height="8"
        :border-radius="4"
        :fill-border-radius="4"
      />
      <NButton size="small" round @click="handleCancelInstallNode"> 取消 </NButton>
    </div>
  </div>
  ```

  然后把"安装按钮"和"重新检测"合并到一个工具栏：

  ```vue
  <div class="env-toolbar">
    <div class="env-toolbar-left">
      <NButton
        v-if="!envStore.status?.nodeInstalled && !envDownloading"
        type="primary"
        round
        @click="handleInstallNode"
      >
        <template #icon>
          <NIcon :size="14"><DownloadOutline /></NIcon>
        </template>
        下载并安装 Node.js
      </NButton>
      <NButton
        v-else-if="envStore.status?.nodeInstalled && !envStore.status?.skillsInstalled"
        type="primary"
        round
        :loading="skillsInstalling"
        @click="handleInstallSkills"
      >
        <template #icon>
          <NIcon :size="14"><DownloadOutline /></NIcon>
        </template>
        安装 skills CLI
      </NButton>
    </div>
    <div class="env-toolbar-right">
      <NButton size="small" round :disabled="envStore.refreshing" @click="handleEnvRecheck">
        <template #icon>
          <NIcon :size="14"><RefreshOutline /></NIcon>
        </template>
        重新检测
      </NButton>
    </div>
  </div>
  ```

- [ ] **Step 2: 添加 `.env-toolbar` 样式**

  在 `<style scoped>` 末尾添加：

  ```css
  .env-toolbar {
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-hairline);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  ```

- [ ] **Step 3: 调整 `.env-actions` 样式（下载进度条容器）**

  当前 `.env-actions`：

  ```css
  .env-actions {
    margin-top: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  ```

  因为下载进度条现在还在 `.env-actions` 内，这个样式可以保留或微调。由于下载进度条下面紧跟着 `.env-toolbar`，两者间距需要协调。

  把 `.env-actions` 的 `margin-top` 从 `var(--space-lg)` 改为 `var(--space-md)`，避免和 toolbar 的 `margin-top` 叠加后间距过大：

  ```css
  .env-actions {
    margin-top: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  ```

---

### Task 3: 验证与提交

- [ ] **Step 1: 启动 dev server 验证**

  ```bash
  npm run dev
  ```

  打开设置页面，检查：
  1. 通用设置的"默认安装目标"下拉框宽度不超过 320px
  2. 网络设置的"GitHub 代理"和"npm 镜像"下拉框宽度不超过 320px
  3. 选择"自定义"后，输入框宽度与下拉框一致
  4. 运行环境区域的"重新检测"按钮在底部右侧
  5. 当 Node.js 未安装时，"下载并安装 Node.js"按钮在底部左侧，"重新检测"在右侧
  6. 当 skills 未安装时，"安装 skills CLI"按钮在底部左侧，"重新检测"在右侧
  7. 当全部安装完成时，底部只有右侧的"重新检测"按钮

- [ ] **Step 2: TypeScript 类型检查**

  ```bash
  npm run typecheck
  ```

- [ ] **Step 3: Lint 检查**

  ```bash
  npm run lint
  ```

- [ ] **Step 4: 提交**

  ```bash
  git add src/renderer/src/views/SettingsView.vue
  git commit -m "style(SettingsView): limit select width and refine env toolbar layout

  - Add max-width: 320px to settings-select and proxy-field
  - Restructure env actions into a toolbar with primary actions
    on the left and recheck button on the right
  - Add border-top separator for visual hierarchy"
  ```

---

## Self-Review

**Spec coverage:**

- [x] select/input 宽度限制 → Task 1
- [x] 运行环境底部工具栏 → Task 2
- [x] 保持其他区域不变 → 计划中未涉及其他区域

**Placeholder scan:**

- [x] 无 TBD/TODO
- [x] 无 "add appropriate error handling" 类模糊描述
- [x] 无 "similar to Task N" 引用
- [x] 代码块包含完整代码

**Type consistency:**

- [x] 未引入新类型或方法签名
