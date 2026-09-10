<template>
  <div class="editor-container">
    <OnlyOfficeEditor
      :key="editorKey"
      :assets-path="assetsPath"
      :x2t-path="x2tPath"
      language="es-ES"
      theme="theme-light"
      :user="{ id: 'waltiva-local', name: 'Usuario' }"
      v-bind="editorSource"
      @ready="handleReady"
      @document-state-change="handleStateChange"
      @save="handleSave"
      @error="handleError"
      class="office-editor"
    />

    <div v-if="errorMessage" class="editor-error">
      <strong>No se pudo iniciar el editor.</strong>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { OnlyOfficeEditor } from 'wasm-onlyoffice-sdk/vue'
import type { DocmentType } from '@/utils/util'

const props = defineProps<{
  file: DocmentType
}>()

const editorKey = ref(0)
const errorMessage = ref('')

const extension = computed(() => {
  const name = props.file?.fileName || ''
  return name.split('.').pop()?.toLowerCase() || 'docx'
})

const newDocumentType = computed<'docx' | 'xlsx' | 'pptx'>(() => {
  if (extension.value === 'xlsx') return 'xlsx'
  if (extension.value === 'pptx') return 'pptx'
  return 'docx'
})

const editorSource = computed(() => {
  if (props.file?.file) return { file: props.file.file }
  return { newDocument: newDocumentType.value }
})

// El scaffold 9.3 se sirve desde la misma ruta de la preview. Los JS/CSS pesados
// del editor usan el CDN fijado por el scaffold, pero el documento nunca se sube.
const previewRoot = new URL('./', document.baseURI).pathname.replace(/\/$/, '')
const assetsPath = `${previewRoot}/v9.3.0.24-1`

// Reutilizamos el conversor x2t WASM que ya está alojado dentro de Waltiva.
const x2tPath = `${previewRoot}/wasm/x2t/`

watch(
  () => [props.file?.fileName, props.file?.file] as const,
  () => {
    errorMessage.value = ''
    editorKey.value += 1
  },
)

function handleReady() {
  errorMessage.value = ''
  console.info('[Waltiva] ONLYOFFICE 9.3 listo:', props.file.fileName)
}

function handleStateChange(isDirty: boolean) {
  console.debug('[Waltiva] documento modificado:', isDirty)
}

function handleSave(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || props.file.fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function handleError(error: Error) {
  console.error('[Waltiva] error del editor:', error)
  errorMessage.value = error?.message || 'Error desconocido al cargar ONLYOFFICE.'
}
</script>

<style scoped>
.editor-container,
.office-editor {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.editor-container {
  position: relative;
  overflow: hidden;
  background: #f3f3f3;
}

.editor-error {
  position: absolute;
  left: 50%;
  top: 18px;
  z-index: 9999;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: min(720px, calc(100vw - 32px));
  padding: 10px 14px;
  border: 1px solid #f0b8b8;
  border-radius: 8px;
  background: #fff5f5;
  color: #8b1e1e;
  font: 13px/1.4 system-ui, sans-serif;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
</style>
