<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar, NSpin, NEmpty, NText } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
import SearchResultCard from '@renderer/components/skills/SearchResultCard.vue'
import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'

const skillsStore = useSkillsStore()
const showInstallDialog = ref(false)
const selectedPackage = ref('')
const hasSearched = ref(false)

function handleSearch(keyword: string): void {
  hasSearched.value = true
  skillsStore.search(keyword)
}

function handleInstall(packageRef: string): void {
  selectedPackage.value = packageRef
  showInstallDialog.value = true
}

function handleInstallComplete(): void {
  showInstallDialog.value = false
  selectedPackage.value = ''
}
</script>

<template>
  <div class="search-page">
    <SkillSearchBar @search="handleSearch" />
    <NScrollbar class="search-scroll">
      <div v-if="skillsStore.searching" class="search-loading">
        <NSpin size="large" />
      </div>
      <template v-else-if="hasSearched">
        <div class="search-results">
          <NText depth="3" style="font-size: 12px">
            搜索耗时 {{ (skillsStore.searchDuration / 1000).toFixed(1) }} 秒，共
            {{ skillsStore.searchResults.length }} 个结果
          </NText>
          <div style="margin-top: 12px">
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
            style="margin-top: 48px"
          />
        </div>
      </template>
      <NEmpty v-else description="输入关键词搜索技能" style="margin-top: 48px" />
    </NScrollbar>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :package-ref="selectedPackage"
      @complete="handleInstallComplete"
    />
  </div>
</template>

<style scoped>
.search-page {
  max-width: 960px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-scroll {
  flex: 1;
  min-height: 0;
}

.search-scroll :deep(.n-scrollbar-rail) {
  display: none !important;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.search-results {
  padding-bottom: 24px;
}
</style>
