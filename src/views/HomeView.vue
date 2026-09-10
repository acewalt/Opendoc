<template>
  <div class="home" :class="{ 'home--editor': !!docmentObj?.fileName }">
    <DocumentHandler
      v-if="docmentObj?.fileName"
      class="document-editor"
      :file="docmentObj"
      ref="documentHandler"
    />

    <main v-else class="workspace-shell" :class="{ 'workspace-shell--light': isLightMode }">
      <div class="workspace">
        <header class="workspace-header">
          <div class="brand">
            <div class="brand-mark" aria-hidden="true">W</div>
            <div class="brand-copy">
              <strong>WALTIVA</strong>
              <span>Tu escritorio local de documentos</span>
            </div>
          </div>

          <div class="workspace-badges">
            <button
              class="theme-toggle"
              type="button"
              :aria-label="isLightMode ? 'Activar modo oscuro' : 'Activar modo claro'"
              @click="isLightMode = !isLightMode"
            >
              <svg v-if="!isLightMode" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.2 15.2A8.2 8.2 0 0 1 8.8 3.8 8.7 8.7 0 1 0 20.2 15.2Z" />
              </svg>
              {{ isLightMode ? 'Modo oscuro' : 'Modo claro' }}
            </button>
            <span class="local-badge">
              <span class="status-dot" aria-hidden="true"></span>
              Local-first
            </span>
          </div>
        </header>

        <section class="workspace-intro">
          <p class="eyebrow">DOCUMENTOS</p>
          <h1>Tu espacio de trabajo</h1>

          <div class="primary-actions">
            <button class="workspace-action" type="button" @click="showCreateDialog = true">
              <span class="action-visual action-visual--create">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 6v12M6 12h12" />
                </svg>
              </span>
              <span class="action-label">
                <strong>Crear documento</strong>
                <small>Elige DOCX, XLSX o PPTX</small>
              </span>
            </button>

            <button class="workspace-action" type="button" @click="onOpenDocument">
              <span class="action-visual action-visual--import">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 16V4M8 8l4-4 4 4" />
                  <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
                </svg>
              </span>
              <span class="action-label">
                <strong>Importar documento</strong>
                <small>DOC, DOCX, XLS, XLSX, PPT o PPTX</small>
              </span>
            </button>
          </div>
        </section>

        <section class="files-panel" aria-labelledby="files-title">
          <div class="section-heading">
            <h2 id="files-title">Tus archivos</h2>
            <p>Elige dónde quieres abrir un documento.</p>
          </div>

          <div class="file-shortcuts">
            <button class="file-shortcut file-shortcut--downloads" type="button" @click="onOpenDocument">
              <span class="shortcut-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 7.5h6l2 2h8v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" />
                  <path d="M4 7.5V6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1.5" />
                </svg>
              </span>
              <span class="shortcut-copy">
                <strong>Descargas / Archivos</strong>
                <small>Abre un archivo del dispositivo</small>
              </span>
              <span class="shortcut-arrow" aria-hidden="true">›</span>
            </button>

            <div class="file-shortcut file-shortcut--recent" aria-disabled="true">
              <span class="shortcut-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 7v5l3 2" />
                  <path d="M5.4 5.4A9 9 0 1 1 3 12" />
                  <path d="M3 5v5h5" />
                </svg>
              </span>
              <span class="shortcut-copy">
                <strong>Recientes</strong>
                <small>El historial local se añadirá después</small>
              </span>
              <span class="shortcut-arrow" aria-hidden="true">›</span>
            </div>
          </div>
        </section>
      </div>
    </main>

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
const isLightMode = ref(false)
const documentHandler = ref<InstanceType<typeof DocumentHandler> | null>(null)
const docmentObj = ref<DocmentType | null>(null)

const onCreateNew = (ext: string) => {
  docmentObj.value = {
    fileName: 'Nuevo documento' + ext,
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
        file: file,
      }
    }
  }

  input.click()
}

async function initFileUrl() {
  const route = useRoute()
  const url = route.query.url as string | undefined
  const filenameParam = route.query.filename as string | undefined
  if (!url) return

  const laodingInstance = ElLoading.service({
    lock: true,
    text: 'Cargando...',
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo solicitar el archivo')

    laodingInstance.close()
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
      console.error('No se pudo determinar el nombre del archivo')
      return
    }

    const file = new File([blob], fileName, { type: blob.type })
    docmentObj.value = { fileName, file }
    showCreateDialog.value = false
  } catch (err) {
    console.error('Error al cargar el archivo:', err)
    laodingInstance.close()
  }
}

onMounted(() => {
  initFileUrl()
})
</script>

<style lang="less" scoped>
.home {
  min-height: 100vh;
  width: 100%;
}

.home--editor {
  height: 100vh;
  overflow: hidden;
}

.document-editor {
  height: 100%;
  width: 100%;
}

.workspace-shell {
  --page-bg: #12151d;
  --surface: #171b24;
  --surface-soft: #1c212c;
  --border: rgba(255, 255, 255, 0.075);
  --text: #f4f6fb;
  --muted: #868fa1;
  --muted-strong: #a7afbd;
  --green: #27cf91;
  --purple: #a58cff;
  --blue: #6e8dff;

  min-height: 100vh;
  overflow: auto;
  background:
    radial-gradient(circle at 71% 5%, rgba(91, 73, 126, 0.13), transparent 29%),
    radial-gradient(circle at 16% 100%, rgba(28, 92, 86, 0.08), transparent 32%),
    var(--page-bg);
  color: var(--text);
  transition: background 180ms ease, color 180ms ease;
}

.workspace-shell--light {
  --page-bg: #f3f5f8;
  --surface: #ffffff;
  --surface-soft: #f7f8fb;
  --border: rgba(22, 29, 41, 0.09);
  --text: #171b23;
  --muted: #747d8c;
  --muted-strong: #596272;

  background:
    radial-gradient(circle at 71% 5%, rgba(114, 92, 160, 0.09), transparent 29%),
    var(--page-bg);
}

.workspace {
  width: min(1080px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px 0 72px;
}

.workspace-header {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(39, 207, 145, 0.18);
  border-radius: 10px;
  background: rgba(39, 207, 145, 0.07);
  color: var(--green);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.06em;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-copy strong {
  color: var(--text);
  font-size: 13px;
  font-weight: 760;
  letter-spacing: 0.115em;
}

.brand-copy span {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.workspace-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle,
.local-badge {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.018);
  color: var(--muted-strong);
  padding: 0 10px;
  font: inherit;
  font-size: 10px;
}

.theme-toggle {
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.theme-toggle:hover {
  border-color: rgba(165, 140, 255, 0.32);
  background: rgba(165, 140, 255, 0.06);
  color: var(--text);
}

.theme-toggle svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 3px rgba(39, 207, 145, 0.1);
}

.workspace-intro {
  margin-top: 55px;
}

.eyebrow {
  margin: 0 0 5px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.workspace-intro h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(30px, 4vw, 43px);
  line-height: 1.08;
  font-weight: 720;
  letter-spacing: -0.045em;
}

.primary-actions {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-top: 25px;
}

.workspace-action {
  width: 164px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.action-visual {
  position: relative;
  width: 164px;
  height: 142px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
  transition: transform 170ms ease, border-color 170ms ease, filter 170ms ease;
}

.action-visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 45%);
  pointer-events: none;
}

.action-visual--create {
  background: linear-gradient(145deg, #24334f 0%, #384167 100%);
}

.action-visual--import {
  background: linear-gradient(145deg, #29324d 0%, #493b61 100%);
}

.action-visual svg {
  position: relative;
  z-index: 1;
  width: 27px;
  height: 27px;
  fill: none;
  stroke: #b6a9ff;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.workspace-action:hover .action-visual,
.workspace-action:focus-visible .action-visual {
  transform: translateY(-2px);
  border-color: rgba(165, 140, 255, 0.32);
  filter: brightness(1.06);
}

.workspace-action:focus-visible {
  outline: none;
}

.action-label {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

.action-label strong {
  color: var(--text);
  font-size: 11px;
  font-weight: 660;
}

.action-label small {
  margin-top: 1px;
  color: var(--muted);
  font-size: 8px;
  line-height: 1.35;
}

.files-panel {
  margin-top: 39px;
  padding: 20px 21px 21px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.012);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.workspace-shell--light .files-panel {
  background: rgba(255, 255, 255, 0.48);
}

.section-heading h2 {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  font-weight: 660;
}

.section-heading p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 9px;
}

.file-shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 15px;
}

.file-shortcut {
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.035);
  border-radius: 11px;
  color: white;
  padding: 12px 13px;
  text-align: left;
  font: inherit;
}

button.file-shortcut {
  cursor: pointer;
}

.file-shortcut--downloads {
  background: linear-gradient(110deg, rgba(63, 74, 119, 0.9), rgba(69, 56, 102, 0.9));
}

.file-shortcut--recent {
  background: linear-gradient(110deg, rgba(47, 77, 91, 0.9), rgba(40, 67, 79, 0.92));
  opacity: 0.78;
}

button.file-shortcut:hover {
  border-color: rgba(165, 140, 255, 0.24);
  filter: brightness(1.05);
}

.shortcut-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.055);
}

.shortcut-icon svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: #d9d7ee;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.shortcut-copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.shortcut-copy strong {
  color: #f2f3f7;
  font-size: 10px;
  font-weight: 640;
}

.shortcut-copy small {
  margin-top: 1px;
  color: rgba(238, 240, 246, 0.58);
  font-size: 8px;
}

.shortcut-arrow {
  color: rgba(255, 255, 255, 0.48);
  font-size: 20px;
  font-weight: 300;
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
        margin: 12px 12px 0 12px;
        background-size: contain;
      }

      .title {
        width: 104px;
        font-size: 14px;
        line-height: 14px;
        height: 28px;
        margin: 8px 8px 12px;
        word-break: break-word;
        word-wrap: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
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

@media (max-width: 700px) {
  .workspace {
    width: min(100% - 30px, 1080px);
    padding-top: 19px;
  }

  .workspace-header {
    align-items: flex-start;
  }

  .brand-copy span,
  .local-badge {
    display: none;
  }

  .workspace-intro {
    margin-top: 45px;
  }

  .primary-actions {
    gap: 13px;
  }

  .workspace-action,
  .action-visual {
    width: min(164px, calc((100vw - 43px) / 2));
  }

  .action-visual {
    height: 132px;
  }

  .file-shortcuts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 430px) {
  .workspace-header {
    gap: 12px;
  }

  .theme-toggle {
    width: 30px;
    padding: 0;
    justify-content: center;
    overflow: hidden;
    color: transparent;
  }

  .theme-toggle svg {
    flex: 0 0 auto;
    color: var(--muted-strong);
  }
}
</style>
