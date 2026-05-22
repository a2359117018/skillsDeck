<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { NSpin, NText, NTabs, NTabPane, NButton } from 'naive-ui'
import SearchOutline from '@vicons/ionicons5/SearchOutline'
import { useSkillsStore } from '@renderer/stores/skills'
import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
import SearchResultCard from '@renderer/components/skills/SearchResultCard.vue'
import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'
import GitHubInstaller from '@renderer/components/skills/GitHubInstaller.vue'
import ArchiveInstaller from '@renderer/components/skills/ArchiveInstaller.vue'
import EmptyState from '@renderer/components/common/EmptyState.vue'

const skillsStore = useSkillsStore()
const showInstallDialog = ref(false)
const selectedSource = ref('')
const hasSearched = ref(false)
const activeTab = ref('search')
const searchKeyword = ref('')

/** Watch for global shortcut trigger and focus the search input */
watch(
  () => skillsStore.focusSearchTrigger,
  () => {
    nextTick(() => {
      const input = document.querySelector('.search-input input') as HTMLInputElement | null
      input?.focus()
    })
  }
)

const SUGGESTIONS = ['code-review', 'testing', 'debug', 'docs']

let searchTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSearch(keyword: string): void {
  if (searchTimer) clearTimeout(searchTimer)
  if (!keyword.trim()) return
  searchTimer = setTimeout(() => {
    hasSearched.value = true
    skillsStore.search(keyword)
  }, 300)
}

function handleSearch(keyword: string): void {
  searchKeyword.value = keyword
  debouncedSearch(keyword)
}

function handleInstall(source: string): void {
  selectedSource.value = source
  showInstallDialog.value = true
}

function handleInstallComplete(): void {
  showInstallDialog.value = false
  selectedSource.value = ''
}

function handleLocalInstallComplete(): void {
  skillsStore.fetchInstalled()
}
</script>

<template>
  <main class="search-page">
    <NTabs v-model:value="activeTab" type="line">
      <NTabPane name="search" tab="搜索安装">
        <div class="tab-content">
          <SkillSearchBar v-model="searchKeyword" @search="handleSearch" />
          <div class="search-scroll">
            <div v-if="skillsStore.searching" class="search-loading">
              <NSpin size="large" />
            </div>
            <template v-else-if="hasSearched">
              <div class="search-results">
                <div class="search-meta">
                  <NText depth="3" class="search-meta-text">
                    找到 {{ skillsStore.searchResults.length }} 个技能
                  </NText>
                </div>
                <div class="search-grid">
                  <SearchResultCard
                    v-for="result in skillsStore.searchResults"
                    :key="result.id"
                    :result="result"
                    @install="handleInstall"
                  />
                </div>
                <EmptyState
                  v-if="skillsStore.searchResults.length === 0"
                  :icon="SearchOutline"
                  title="未找到相关技能"
                  description="尝试使用其他关键词，或通过 GitHub 链接直接安装"
                >
                  <template #actions>
                    <NButton size="small" round secondary @click="activeTab = 'github'">
                      GitHub 安装
                    </NButton>
                  </template>
                </EmptyState>
              </div>
            </template>
            <EmptyState
              v-else
              :icon="SearchOutline"
              title="搜索技能"
              description="输入关键词查找 AI 编程技能，如代码审查、测试生成、文档编写"
            >
              <template #actions>
                <div class="search-suggestions">
                  <NButton
                    v-for="term in SUGGESTIONS"
                    :key="term"
                    size="small"
                    round
                    secondary
                    @click="handleSearch(term)"
                  >
                    {{ term }}
                  </NButton>
                </div>
              </template>
            </EmptyState>
          </div>
        </div>
      </NTabPane>

      <NTabPane name="github" tab="GitHub链接">
        <div class="tab-content">
          <GitHubInstaller @install-complete="handleLocalInstallComplete" />
        </div>
      </NTabPane>

      <NTabPane name="archive" tab="压缩包">
        <div class="tab-content">
          <ArchiveInstaller @install-complete="handleLocalInstallComplete" />
        </div>
      </NTabPane>
    </NTabs>

    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :source="selectedSource"
      @complete="handleInstallComplete"
    />
  </main>
</template>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: var(--space-xl);
}

/* 让 NTabs 填满剩余空间 */
.search-page :deep(.n-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.search-page :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.search-page :deep(.n-tab-pane) {
  height: 100%;
}

.tab-content {
  padding-top: var(--space-md);
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.search-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.search-results {
  padding-bottom: var(--space-xl);
}

.search-meta {
  margin-bottom: var(--space-md);
}

.search-meta-text {
  font-size: var(--text-caption);
  color: var(--color-stone);
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

.search-empty {
  margin-top: var(--space-xxxl);
}

.search-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: center;
}
</style>
