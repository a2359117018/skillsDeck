<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import type { VNodeChild, Component } from 'vue'
import { NForm, NFormItem, NSelect, NInput, NIcon, NText, type SelectOption } from 'naive-ui'
import LinkOutline from '@vicons/ionicons5/LinkOutline'
import UnlinkOutline from '@vicons/ionicons5/UnlinkOutline'
import PencilOutline from '@vicons/ionicons5/PencilOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/CheckmarkCircleOutline'

interface ProxyOption extends SelectOption {
  icon?: Component
}

const props = defineProps<{
  proxyUrl: string
  npmRegistry: string
}>()

const emit = defineEmits<{
  (e: 'update:proxyUrl', value: string): void
  (e: 'update:npmRegistry', value: string): void
}>()

const CUSTOM_PROXY_VALUE = '__custom__'

const proxyOptions: ProxyOption[] = [
  { label: '不使用代理', value: '', icon: UnlinkOutline },
  { label: 'gh-proxy.org', value: 'https://gh-proxy.org', icon: LinkOutline },
  { label: 'hk.gh-proxy.org', value: 'https://hk.gh-proxy.org', icon: LinkOutline },
  { label: 'cdn.gh-proxy.org', value: 'https://cdn.gh-proxy.org', icon: LinkOutline },
  { label: 'edgeone.gh-proxy.org', value: 'https://edgeone.gh-proxy.org', icon: LinkOutline },
  { label: '自定义...', value: CUSTOM_PROXY_VALUE, icon: PencilOutline }
]

const selectedProxy = ref('')
const customProxyUrl = ref('')

const CUSTOM_REGISTRY_VALUE = '__custom_registry__'

const registryOptions: ProxyOption[] = [
  { label: '不使用镜像', value: '', icon: UnlinkOutline },
  { label: '淘宝 (npmmirror.com)', value: 'https://registry.npmmirror.com/', icon: LinkOutline },
  {
    label: '清华大学 (tuna.tsinghua.edu.cn)',
    value: 'https://mirrors.tuna.tsinghua.edu.cn/npm/',
    icon: LinkOutline
  },
  {
    label: '腾讯云 (tencent.com)',
    value: 'https://mirrors.cloud.tencent.com/npm/',
    icon: LinkOutline
  },
  { label: '自定义...', value: CUSTOM_REGISTRY_VALUE, icon: PencilOutline }
]

const selectedRegistry = ref('')
const customRegistryUrl = ref('')

/** 根据外部 proxyUrl 初始化内部状态 */
function initFromProps(): void {
  const stored = props.proxyUrl
  const preset = proxyOptions.find((o) => o.value === stored)
  if (preset && stored !== CUSTOM_PROXY_VALUE) {
    selectedProxy.value = stored
    customProxyUrl.value = ''
  } else if (stored && stored.startsWith('https://')) {
    selectedProxy.value = CUSTOM_PROXY_VALUE
    customProxyUrl.value = stored
  } else {
    selectedProxy.value = ''
    customProxyUrl.value = ''
  }

  const storedRegistry = props.npmRegistry
  const registryPreset = registryOptions.find((o) => o.value === storedRegistry)
  if (registryPreset && storedRegistry !== CUSTOM_REGISTRY_VALUE) {
    selectedRegistry.value = storedRegistry
    customRegistryUrl.value = ''
  } else if (storedRegistry && storedRegistry.startsWith('https://')) {
    selectedRegistry.value = CUSTOM_REGISTRY_VALUE
    customRegistryUrl.value = storedRegistry
  } else {
    selectedRegistry.value = ''
    customRegistryUrl.value = ''
  }
}

initFromProps()
watch(() => props.proxyUrl, initFromProps)
watch(() => props.npmRegistry, initFromProps)

const showCustomInput = computed(() => selectedProxy.value === CUSTOM_PROXY_VALUE)
const showCustomRegistryInput = computed(() => selectedRegistry.value === CUSTOM_REGISTRY_VALUE)

const effectiveRegistryUrl = computed(() => {
  if (selectedRegistry.value === CUSTOM_REGISTRY_VALUE) {
    return customRegistryUrl.value.trim()
  }
  return selectedRegistry.value
})

const activeRegistryDisplay = computed(() => {
  if (selectedRegistry.value === CUSTOM_REGISTRY_VALUE) {
    return customRegistryUrl.value.trim() || '未填写'
  }
  if (selectedRegistry.value === '') {
    return '官方源'
  }
  const preset = registryOptions.find((o) => o.value === selectedRegistry.value)
  return preset?.label || selectedRegistry.value
})

const effectiveProxyUrl = computed(() => {
  if (selectedProxy.value === CUSTOM_PROXY_VALUE) {
    return customProxyUrl.value.trim()
  }
  return selectedProxy.value
})

const activeProxyDisplay = computed(() => {
  if (selectedProxy.value === CUSTOM_PROXY_VALUE) {
    return customProxyUrl.value.trim() || '未设置'
  }
  if (selectedProxy.value === '') {
    return '不使用代理'
  }
  const preset = proxyOptions.find((o) => o.value === selectedProxy.value)
  return preset?.label || selectedProxy.value
})

watch(effectiveProxyUrl, (val) => emit('update:proxyUrl', val))
watch(effectiveRegistryUrl, (val) => emit('update:npmRegistry', val))

function renderProxyIcon(option: ProxyOption, size: number): VNodeChild {
  const IconComp = option.icon || LinkOutline
  return h(NIcon, { size, color: 'var(--color-stone)' }, { default: () => h(IconComp) })
}

function renderProxyLabel(option: SelectOption): VNodeChild {
  const opt = option as ProxyOption
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
    renderProxyIcon(opt, 16),
    h('span', null, opt.label as string)
  ])
}

function renderProxyTag(props: { option: SelectOption; handleClose: () => void }): VNodeChild {
  const opt = props.option as ProxyOption
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
    renderProxyIcon(opt, 14),
    h('span', null, opt.label as string)
  ])
}
</script>

<template>
  <NForm label-placement="left" label-width="140" class="settings-form">
    <NFormItem label="GitHub 下载代理">
      <div class="proxy-field">
        <NSelect
          v-model:value="selectedProxy"
          :options="proxyOptions"
          :render-label="renderProxyLabel"
          :render-tag="renderProxyTag"
          class="settings-select"
        />
        <Transition name="expand">
          <div v-if="showCustomInput" class="custom-input-wrapper">
            <NInput
              v-model:value="customProxyUrl"
              placeholder="https://your-proxy.com"
              class="custom-proxy-input"
            >
              <template #prefix>
                <NIcon :size="16" color="var(--color-muted)">
                  <PencilOutline />
                </NIcon>
              </template>
            </NInput>
          </div>
        </Transition>
        <div class="proxy-active">
          <NIcon :size="14" color="var(--color-muted)">
            <CheckmarkCircleOutline />
          </NIcon>
          <NText depth="3" class="proxy-active-text"> 当前使用：{{ activeProxyDisplay }} </NText>
        </div>
      </div>
    </NFormItem>
    <NFormItem label="npm 镜像源">
      <div class="proxy-field">
        <NSelect
          v-model:value="selectedRegistry"
          :options="registryOptions"
          :render-label="renderProxyLabel"
          :render-tag="renderProxyTag"
          class="settings-select"
        />
        <Transition name="expand">
          <div v-if="showCustomRegistryInput" class="custom-input-wrapper">
            <NInput
              v-model:value="customRegistryUrl"
              placeholder="https://your-mirror.com/npm/"
              class="custom-proxy-input"
            >
              <template #prefix>
                <NIcon :size="16" color="var(--color-muted)">
                  <PencilOutline />
                </NIcon>
              </template>
            </NInput>
          </div>
        </Transition>
        <div class="proxy-active">
          <NIcon :size="14" color="var(--color-muted)">
            <CheckmarkCircleOutline />
          </NIcon>
          <NText depth="3" class="proxy-active-text"> 当前使用：{{ activeRegistryDisplay }} </NText>
        </div>
      </div>
    </NFormItem>
  </NForm>
</template>

<style scoped>
.settings-form :deep(.n-form-item-label) {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

.settings-form :deep(.n-form-item) {
  margin-bottom: var(--space-md);
}

.settings-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.settings-select {
  width: 100%;
}

.proxy-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
}

.custom-input-wrapper {
  display: grid;
  grid-template-rows: 1fr;
}

.custom-input-wrapper > * {
  overflow: hidden;
}

.custom-proxy-input :deep(.n-input__input) {
  padding-left: var(--space-xs);
}

.proxy-active {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.proxy-active-text {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.expand-enter-active,
.expand-leave-active {
  transition:
    grid-template-rows var(--transition-base),
    opacity var(--transition-base);
}

.expand-enter-from,
.expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}
</style>
