<script setup lang="ts">
import { ref } from 'vue'
import { NSpin, NEmpty, NText } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
import SearchResultCard from '@renderer/components/skills/SearchResultCard.vue'
import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'

const skillsStore = useSkillsStore()
const showInstallDialog = ref(false)
const selectedSource = ref('')
const hasSearched = ref(false)

function handleSearch(keyword: string): void {
  hasSearched.value = true
  skillsStore.search(keyword)
}

function handleInstall(source: string): void {
  selectedSource.value = source
  showInstallDialog.value = true
}

function handleInstallComplete(): void {
  showInstallDialog.value = false
  selectedSource.value = ''
}
</script>

<template>
  <div class="search-page">
    <SkillSearchBar @search="handleSearch" />
    <div class="search-scroll">
      <div v-if="skillsStore.searching" class="search-loading">
        <NSpin size="large" />
      </div>
      <template v-else-if="hasSearched">
        <div class="search-results">
          <div class="search-meta">
            <NText depth="3" class="search-meta-text">
              搜索耗时 {{ (skillsStore.searchDuration / 1000).toFixed(1) }} 秒，共
              {{ skillsStore.searchResults.length }} 个结果
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
          <NEmpty
            v-if="skillsStore.searchResults.length === 0"
            description="无搜索结果"
            class="search-empty"
          />
        </div>
      </template>
      <NEmpty v-else description="输入关键词搜索技能" class="search-empty" />
    </div>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :source="selectedSource"
      @complete="handleInstallComplete"
    />
  </div>
</template>

<style scoped>
.search-page {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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
</style>
