<template>
  <div class="home">
    <div class="top-operation-bar" v-if="!docmentObj?.fileName">
      <el-button type="primary" @click="showCreateDialog = true">Nuevo / Abrir archivo</el-button>
    </div>

    <div class="editor-content">
      <DocumentHandler
        v-if="docmentObj?.fileName"
        style="height: 100%; width: 100%"
        :file="docmentObj"
        ref="documentHandler"
      />

      <div class="main-content" v-else>
        <h1>Bienvenido a Waltiva</h1>
        <p>Crea un documento nuevo o abre un archivo local para empezar.</p>
      </div>
    </div>

    <el-dialog v-model="showCreateDialog" title="Nuevo / Abrir archivo" width="450px" center>
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
import { onMounted, ref } from 'vue'
import { DocmentType } from '@/utils/util'
import DocumentHandler from '../components/DocumentHandler.vue'
import { useRoute } from 'vue-router'
import { ElLoading } from 'element-plus'

const showCreateDialog = ref(false)
const documentHandler = ref<InstanceType<typeof DocumentHandler> | null>(null)
const docmentObj = ref<DocmentType | null>(null)

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

const onOpenDocument = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.docx,.xlsx,.pptx,.doc,.xls,.ppt'

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      showCreateDialog.value = false
      docmentObj.value = {
        fileName: file.name,
        file,
      }
    }
  }

  input.click()
}

async function initFileUrl() {
  const route = useRoute()
  const url = route.query.url as string | undefined
  const filenameParam = route.query.filename as string | undefined

  if (!url) {
    console.info('No se proporcionó una URL de archivo.')
    return
  }

  const loadingInstance = ElLoading.service({
    lock: true,
    text: 'Cargando…',
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo descargar el archivo.')

    const blob = await res.blob()
    let fileName = ''

    if (filenameParam) {
      fileName = filenameParam
    }

    if (!fileName) {
      const match = decodeURIComponent(url).match(/\/([^\/?#]+)$/)
      if (match && match[1].includes('.')) {
        fileName = match[1]
      }
    }

    if (!fileName) {
      const disposition = res.headers.get('Content-Disposition')
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/)
        if (match) {
          fileName = decodeURIComponent(match[1] || match[2])
        }
      }
    }

    if (!fileName) {
      console.error('No fue posible determinar el nombre del archivo.')
      return
    }

    const file = new File([blob], fileName, { type: blob.type })
    docmentObj.value = { fileName, file }
    showCreateDialog.value = false
  } catch (err) {
    console.error('Error al cargar el archivo:', err)
  } finally {
    loadingInstance.close()
  }
}

onMounted(() => {
  initFileUrl()
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
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  h1 {
    margin-bottom: 20px;
  }
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

      &:hover {
        background-color: #e0e0e0;
      }

      &:active {
        color: rgba(0, 0, 0, 0.8);
        background-color: #cbcbcb;
      }
    }
  }
}

.open-container {
  text-align: center;
  padding-bottom: 25px;
  margin-top: 20px;
}
</style>
