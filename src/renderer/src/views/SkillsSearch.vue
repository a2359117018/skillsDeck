<script setup lang="ts">
import { ref } from 'vue'
import { NSpin, NEmpty } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
import CommandOutput from '@renderer/components/common/CommandOutput.vue'
import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'

const skillsStore = useSkillsStore()
const showInstallDialog = ref(false)
const selectedPackage = ref('')

function handleSearch(keyword: string) {
  skillsStore.search(keyword)
}

function handleNavigate(packageRef: string) {
  selectedPackage.value = packageRef
  showInstallDialog.value = true
}

function handleInstallComplete() {
  showInstallDialog.value = false
  selectedPackage.value = ''
}
</script>

<template>
  <div class="search-page">
    <SkillSearchBar @search="handleSearch" />
    <NSpin :show="skillsStore.loading" style="margin-top: 16px">
      <CommandOutput
        v-if="skillsStore.searchOutput"
        :content="skillsStore.searchOutput"
        @navigate="handleNavigate"
      />
      <NEmpty v-else description="输入关键词搜索技能" style="margin-top: 48px" />
    </NSpin>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :package-ref="selectedPackage"
      @complete="handleInstallComplete"
    />
  </div>
</template>

<style scoped>
.search-page { max-width: 900px; }
</style>
