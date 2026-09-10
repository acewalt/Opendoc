<template>
  <div class="home" :class="{ embedded: isEmbedded }">
    <div class="top-operation-bar" v-if="!isEmbedded && !docmentObj?.fileName">
      <el-button type="primary" @click="showCreateDialog = true">Nuevo / Abrir archivo</el-button>
    </div>

    <div class="editor-content">
      <DocumentHandler
        v-if="docmentObj?.fileName"
        style="height: 100%; width: 100%"
        :file="docmentObj"
        ref="documentHandler"
      />

      <div class="main-content" v-else-if="!isEmbedded">
        <h1>Bienvenido a Waltiva</h1>
        <p>Crea un documento nuevo o abre un archivo local para empezar.</p>
      </div>

      <div class="embed-wait" v-else>
        Preparando editor…
      </div>
    </div>

    <el-dialog
      v-if="!isEmbedded"
      v-model="showCreateDialog"
      title="Nuevo / Abrir archivo"
      width="450px"
      center
    >
      <div id="panel-createnew">
        <div class="header">Nuevo</div>
        <div class="thumb-list">
          <div class="thumb-wrap" template="WORD" @click="onCreateNew('.docx')">
            <div class="thumb" style="background-image: url('./img/doc-formats/docx.png')"></div>
            <div class="title">Documento</div>
          </div>
          <div class="thumb-wrap" template="EXCEL" @click="onCreateNew('.xlsx')">
            <div class="thumb" style="background-image: url('./img/doc-formats/xlsx.png')"></div>
            <div class="title">Hoja de cálculo</div>
          </div>
          <div class="thumb-wrap" template="PPT" @click="onCreateNew('.pptx')">
            <div class="thumb" style="background-image: url('./img/doc-formats/pptx.png')"></div>
            <div class="title">Presentación</div>
          </div>
        </div>

        <div class="header">Abrir</div>
        <div class="open-container">
          <el-button type="info" size="large" :icon="FolderOpened" @click="onOpenDocument" plain>
            Abrir archivo local
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { FolderOpened } from '@element-plus/icons-vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { DocmentType } from '@/utils/util'
import DocumentHandler from '../components/DocumentHandler.vue'
import { ElLoading } from 'element-plus'

const showCreateDialog = ref(false)
const documentHandler = ref<InstanceType<typeof DocumentHandler> | null>(null)
const docmentObj = ref<DocmentType | null>(null)
const isEmbedded = ref(false)

const ACCEPTED_FILES = '.docx,.xlsx,.pptx,.doc,.xls,.ppt,.odt,.ods,.odp,.pdf,.txt,.rtf,.csv'

function queryValue(name: string): string | null {
  const direct = new URLSearchParams(window.location.search).get(name)
  if (direct !== null) return direct

  const hash = window.location.hash || ''
  const queryIndex = hash.indexOf('?')
  if (queryIndex >= 0) {
    return new URLSearchParams(hash.slice(queryIndex + 1)).get(name)
  }
  return null
}

const onCreateNew = (ext: string) => {
  const names: Record<string, string> = {
    '.docx': 'Nuevo documento.docx',
    '.xlsx': 'Nueva hoja de cálculo.xlsx',
    '.pptx': 'Nueva presentación.pptx',
  }

  docmentObj.value = {
    fileName: names[ext] || `Nuevo archivo${ext}`,
    file: null,
  }
  showCreateDialog.value = false
}

function openLocalFile(file: File) {
  docmentObj.value = {
    fileName: file.name,
    file,
  }
  showCreateDialog.value = false
}

const onOpenDocument = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = ACCEPTED_FILES

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) openLocalFile(file)
  }

  input.click()
}

function handleParentMessage(event: MessageEvent) {
  if (!isEmbedded.value) return
  if (event.origin !== window.location.origin || event.source !== window.parent) return

  const payload = event.data
  if (!payload || payload.type !== 'waltiva-open-file') return

  const file = payload.file as File | undefined
  if (!file || typeof file.name !== 'string' || typeof file.arrayBuffer !== 'function') {
    window.parent.postMessage(
      { type: 'waltiva-editor-error', message: 'El archivo recibido no es válido.' },
      window.location.origin,
    )
    return
  }

  openLocalFile(file)
}

async function initFileUrl() {
  const url = queryValue('url') || undefined
  const filenameParam = queryValue('filename') || undefined

  if (!url) return

  const loadingInstance = ElLoading.service({
    lock: true,
    text: 'Cargando…',
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo descargar el archivo.')

    const blob = await res.blob()
    let fileName = filenameParam || ''

    if (!fileName) {
      const match = decodeURIComponent(url).match(/\/([^\/?#]+)$/)
      if (match && match[1].includes('.')) fileName = match[1]
    }

    if (!fileName) {
      const disposition = res.headers.get('Content-Disposition')
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/)
        if (match) fileName = decodeURIComponent(match[1] || match[2])
      }
    }

    if (!fileName) throw new Error('No fue posible determinar el nombre del archivo.')

    openLocalFile(new File([blob], fileName, { type: blob.type }))
  } catch (err) {
    console.error('Error al cargar el archivo:', err)
    if (isEmbedded.value) {
      window.parent.postMessage(
        { type: 'waltiva-editor-error', message: err instanceof Error ? err.message : String(err) },
        window.location.origin,
      )
    }
  } finally {
    loadingInstance.close()
  }
}

onMounted(() => {
  isEmbedded.value = queryValue('embed') === '1'

  window.addEventListener('message', handleParentMessage)

  const requestedType = (queryValue('type') || '').toLowerCase()
  if (requestedType === 'docx' || requestedType === 'xlsx' || requestedType === 'pptx') {
    onCreateNew(`.${requestedType}`)
  }

  void initFileUrl()

  if (isEmbedded.value && window.parent !== window) {
    window.parent.postMessage({ type: 'waltiva-editor-ready' }, window.location.origin)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleParentMessage)
})
</script>

<style lang="less" scoped>
.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.top-operation-bar {
  background-color: white;
  padding: 12px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.editor-content {
  flex-grow: 1;
  min-height: 0;
}

.main-content,
.embed-wait {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.main-content h1 {
  margin-bottom: 20px;
}

.embed-wait {
  color: #737373;
  font-size: 14px;
}

#panel-createnew {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;

  .header {
    font-size: 18px;
    padding: 0 0 0 25px;
    white-space: nowrap;
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .thumb-list {
    display: flex;
    justify-content: space-around;

    .thumb-wrap {
      display: inline-block;
      text-align: center;
      width: auto;
      cursor: pointer;
      vertical-align: top;
      border-radius: 4px;

      .thumb {
        width: 96px;
        height: 96px;
        background-repeat: no-repeat;
        background-position: center;
        margin: 12px 12px 0;
        background-size: contain;
      }

      .title {
        width: 104px;
        font-size: 14px;
        line-height: 14px;
        min-height: 28px;
        margin: 8px 8px 12px;
        word-break: break-word;
      }

      &:hover { background-color: #e0e0e0; }
      &:active { color: rgba(0, 0, 0, 0.8); background-color: #cbcbcb; }
    }
  }
}

.open-container {
  text-align: center;
  padding-bottom: 25px;
  margin-top: 20px;
}
</style>
