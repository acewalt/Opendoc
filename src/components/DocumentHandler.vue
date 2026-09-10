<template>
    <div class="editor-container" v-loaing="loading" element-loading-text="Cargando...">
        <div v-if="isWordDocument" class="math-view-toolbar">
            <button
                type="button"
                class="math-view-toggle"
                :class="{ active: viewMath }"
                role="switch"
                :aria-checked="viewMath"
                @click="toggleMathView"
            >
                <span class="math-view-icon">√x</span>
                <span>Vista matemática</span>
                <span class="switch-track" aria-hidden="true">
                    <span class="switch-knob"></span>
                </span>
            </button>
            <span v-if="viewMath" class="math-view-status">
                Selecciona una expresión en el documento para previsualizarla.
            </span>
        </div>

        <div id="iframe"></div>

        <aside v-if="isWordDocument && viewMath" class="math-preview" aria-live="polite">
            <div class="math-preview-header">
                <div>
                    <strong>Vista matemática</strong>
                    <span class="beta-badge">Beta</span>
                </div>
                <button type="button" class="math-preview-close" aria-label="Cerrar Vista matemática" @click="viewMath = false">
                    ×
                </button>
            </div>

            <label class="math-source-label" for="waltiva-math-source">Expresión</label>
            <textarea
                id="waltiva-math-source"
                v-model="mathSource"
                class="math-source-input"
                rows="2"
                spellcheck="false"
                placeholder="Selecciona texto o escribe: \\frac{x^2+1}{\\sqrt{y}}"
            ></textarea>

            <div class="math-render-surface">
                <div v-if="mathSource.trim()" class="math-render" v-html="mathPreviewHtml"></div>
                <div v-else class="math-empty-state">
                    Selecciona una expresión como <code>x^2</code>, <code>sqrt(x)</code> o <code>\\frac{a}{b}</code>.
                </div>
            </div>

            <div class="math-preview-footnote" :class="{ warning: mathExportNotice }">
                {{ mathExportNotice || 'Solo cambia la visualización. El contenido original del DOCX no se modifica.' }}
            </div>
        </aside>
    </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getDocumentType, DocmentType } from '@/utils/util'
import { g_sEmpty_bin } from '@/utils/empty_bin'
import { renderMathMl } from '@/utils/mathView'
// @ts-ignore
import {
    initX2TScript,
    initX2T,
    convertDocument,
    convertBinToDocumentAndDownload,
    c_oAscFileType2,
} from '@/utils/x2t'

const props = defineProps<{
    file: DocmentType
}>()

const editor = ref<any>(null)
const loading = ref(false)
const viewMath = ref(false)
const mathSource = ref('')
const mathExportNotice = ref('')
const media: { [key: string]: string } = {}

let stopFileWatch: (() => void) | null = null
let mathSelectionTimer: ReturnType<typeof setInterval> | null = null

const currentFileType = computed(() => props.file.fileName.split('.').pop()?.toLowerCase() || '')
const isWordDocument = computed(() => getDocumentType(currentFileType.value) === 'word')
const mathPreviewHtml = computed(() => renderMathMl(mathSource.value))

onMounted(async () => {
    loading.value = true
    try {
        await initX2TScript()
        await loadEditorApi()
        await initX2T()
        console.log('Editor cargado')
        loading.value = false

        stopFileWatch = watch(
            () => props.file.fileName,
            async () => {
                try {
                    viewMath.value = false
                    mathSource.value = ''
                    mathExportNotice.value = ''
                    stopMathSelectionTracking()
                    await openFile()
                } catch (error) {
                    console.error('Error al abrir el archivo:', error)
                    alert('No se pudo abrir el archivo. Comprueba su formato.')
                }
            },
            { immediate: true },
        )
    } catch (error) {
        loading.value = false
        console.error('Error al inicializar el editor:', error)
    }
})

watch(viewMath, (enabled) => {
    mathExportNotice.value = ''
    if (enabled && isWordDocument.value) startMathSelectionTracking()
    else stopMathSelectionTracking()
})

async function handleDocumentOperation(options: { isNew: boolean; fileName: string; file?: File }) {
    try {
        const { isNew, fileName, file } = options
        const fileType = fileName.split('.').pop() || ''

        let documentData: {
            bin: ArrayBuffer
            media?: any
        }

        if (isNew) {
            const emptyBin = g_sEmpty_bin[`.${fileType}`]
            if (!emptyBin) throw new Error(`Tipo de archivo no compatible: ${fileType}`)
            documentData = { bin: emptyBin }
        } else {
            if (!file) throw new Error('Archivo no válido')
            documentData = await convertDocument(file)
        }

        createEditorInstance({
            fileName,
            fileType,
            binData: documentData.bin,
            media: documentData.media,
        })
    } catch (error: any) {
        console.error('Error al procesar el documento:', error)
        alert(`Error al procesar el documento: ${error.message}`)
        throw error
    }
}

function createEditorInstance(config: {
    fileName: string
    fileType: string
    binData: ArrayBuffer
    media?: any
}) {
    if (editor.value) {
        editor.value.destroyEditor()
        editor.value = null
    }

    const { fileName, fileType, binData, media: documentMedia } = config
    const documentType = getDocumentType(fileType)

    editor.value = new window.DocsAPI.DocEditor('iframe', {
        document: {
            title: fileName,
            url: fileName,
            fileType,
            permissions: {
                edit: true,
                chat: false,
                protect: false,
            },
        },
        editorConfig: {
            lang: 'es',
            customization: {
                ...(documentType === 'word' ? { uiTheme: 'theme-contrast-dark' } : {}),
                help: false,
                about: false,
                hideRightMenu: true,
                features: {
                    spellcheck: {
                        change: false,
                    },
                },
                anonymous: {
                    request: false,
                    label: 'Invitado',
                },
            },
        },
        events: {
            onAppReady: () => {
                if (documentMedia) {
                    editor.value.sendCommand({
                        command: 'asc_setImageUrls',
                        data: { urls: documentMedia },
                    })
                }

                editor.value.sendCommand({
                    command: 'asc_openDocument',
                    data: { buf: binData },
                })
            },
            onDocumentReady: () => {
                console.log('Documento cargado:', fileName)
                if (viewMath.value && documentType === 'word') startMathSelectionTracking()
            },
            onSave: handleSaveDocument,
            writeFile: handleWriteFile,
        },
    })
}

async function openFile() {
    const { fileName, file } = props.file
    await handleDocumentOperation({
        isNew: !file,
        fileName,
        file,
    })
}

function toggleMathView(): void {
    viewMath.value = !viewMath.value
}

function getOnlyOfficeWordApi(): any | null {
    try {
        const host = document.getElementById('iframe')
        const frame = host?.querySelector('iframe') as HTMLIFrameElement | null
        const frameWindow = frame?.contentWindow as any
        if (!frameWindow) return null

        return (
            frameWindow.DE?.getController?.('Toolbar')?.api ||
            frameWindow.DE?.getController?.('Main')?.api ||
            frameWindow.DE?.getController?.('DocumentHolder')?.api ||
            frameWindow.Asc?.editor ||
            null
        )
    } catch (error) {
        console.debug('Vista matemática: la API interna aún no está disponible.', error)
        return null
    }
}

function refreshSelectedMath(): void {
    if (!viewMath.value || !isWordDocument.value) return

    const api = getOnlyOfficeWordApi()
    if (!api) return

    try {
        const selected =
            api.asc_GetSelectedText?.() ??
            api.GetSelectedText?.() ??
            api.getSelectedText?.()

        if (typeof selected === 'string' && selected.trim()) {
            const normalized = selected.replace(/\r/g, '').trim()
            if (normalized !== mathSource.value) mathSource.value = normalized
        }
    } catch (error) {
        console.debug('Vista matemática: no se pudo leer la selección actual.', error)
    }
}

function startMathSelectionTracking(): void {
    stopMathSelectionTracking()
    refreshSelectedMath()
    mathSelectionTimer = setInterval(refreshSelectedMath, 350)
}

function stopMathSelectionTracking(): void {
    if (mathSelectionTimer) {
        clearInterval(mathSelectionTimer)
        mathSelectionTimer = null
    }
}

function loadEditorApi(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.DocsAPI) {
            resolve()
            return
        }

        const script = document.createElement('script')
        script.src = './web-apps/apps/api/documents/api.js'
        script.onload = () => resolve()
        script.onerror = (error) => {
            console.error('No se pudo cargar la API de ONLYOFFICE:', error)
            alert('No se pudo cargar el editor. Comprueba que la API de ONLYOFFICE esté disponible.')
            reject(error)
        }
        document.head.appendChild(script)
    })
}

interface SaveEvent {
    data: {
        data: any
        option: {
            outputformat: number
        }
    }
}

async function handleSaveDocument(event: SaveEvent) {
    console.log('Evento de guardado del documento:', event)

    if (event.data && event.data.data) {
        const { data, option } = event.data
        const targetFormat = c_oAscFileType2[option.outputformat]

        if (viewMath.value && isWordDocument.value && targetFormat === 'PDF') {
            mathExportNotice.value =
                'Este PDF usa el BIN original: la Vista matemática todavía no se incrusta en la exportación. El documento no se modifica.'
            console.warn('Vista matemática activa: el exportador PDF actual usa el BIN original de ONLYOFFICE.')
        }

        await convertBinToDocumentAndDownload(data.data, props.file.fileName, targetFormat)
    }

    editor.value.sendCommand({
        command: 'asc_onSaveCallback',
        data: { err_code: 0 },
    })
}

function handleWriteFile(event: any) {
    try {
        console.log('Evento de escritura del archivo:', event)

        const { data: eventData } = event
        if (!eventData) {
            console.warn('El evento de escritura no contiene datos')
            return
        }

        const { data: imageData, file: fileName } = eventData

        if (!imageData || !(imageData instanceof Uint8Array)) {
            throw new Error('Datos de imagen no válidos: se esperaba Uint8Array')
        }
        if (!fileName || typeof fileName !== 'string') {
            throw new Error('Nombre de archivo no válido')
        }

        const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = getMimeTypeFromExtension(fileExtension)
        const blob = new Blob([imageData], { type: mimeType })
        const objectUrl = URL.createObjectURL(blob)

        media[`media/${fileName}`] = objectUrl
        editor.value.sendCommand({
            command: 'asc_setImageUrls',
            data: { urls: media },
        })
        editor.value.sendCommand({
            command: 'asc_writeFileCallback',
            data: {
                path: objectUrl,
                imgName: fileName,
            },
        })
    } catch (error: any) {
        console.error('Error al procesar la escritura del archivo:', error)

        if (editor.value && typeof editor.value.sendCommand === 'function') {
            editor.value.sendCommand({
                command: 'asc_writeFileCallback',
                data: {
                    success: false,
                    error: error.message,
                },
            })
        }

        if (event.callback && typeof event.callback === 'function') {
            event.callback({
                success: false,
                error: error.message,
            })
        }
    }
}

function getMimeTypeFromExtension(extension: string): string {
    const mimeMap: { [key: string]: string } = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        bmp: 'image/bmp',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        ico: 'image/x-icon',
        tiff: 'image/tiff',
        tif: 'image/tiff',
    }

    return mimeMap[extension?.toLowerCase()] || 'image/png'
}

onBeforeUnmount(() => {
    stopFileWatch?.()
    stopMathSelectionTracking()

    Object.values(media).forEach((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url)
    })

    if (editor.value && typeof editor.value.destroyEditor === 'function') {
        editor.value.destroyEditor()
    }
})
</script>

<style scoped>
.editor-container {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: #151515;
}

#iframe {
    flex: 1;
    min-height: 0;
    width: 100%;
}

.math-view-toolbar {
    flex: 0 0 38px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 5px 10px;
    color: #d7d7d7;
    background: #191919;
    border-bottom: 1px solid #303030;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    z-index: 20;
}

.math-view-toggle {
    height: 28px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 9px;
    border: 1px solid #3a3a3a;
    border-radius: 7px;
    color: #d8d8d8;
    background: #242424;
    cursor: pointer;
    font: inherit;
    transition: background 0.15s ease, border-color 0.15s ease;
}

.math-view-toggle:hover {
    background: #2c2c2c;
    border-color: #4a4a4a;
}

.math-view-toggle.active {
    color: #ffffff;
    background: #2c3340;
    border-color: #4b6487;
}

.math-view-icon {
    font-family: 'Cambria Math', 'STIX Two Math', serif;
    font-size: 14px;
    line-height: 1;
}

.switch-track {
    position: relative;
    width: 25px;
    height: 14px;
    margin-left: 2px;
    border-radius: 999px;
    background: #555;
    transition: background 0.15s ease;
}

.switch-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s ease;
}

.math-view-toggle.active .switch-track {
    background: #4f78b8;
}

.math-view-toggle.active .switch-knob {
    transform: translateX(11px);
}

.math-view-status {
    color: #929292;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.math-preview {
    position: absolute;
    top: 50px;
    right: 14px;
    width: min(390px, calc(100vw - 28px));
    padding: 12px;
    border: 1px solid #3b3b3b;
    border-radius: 10px;
    background: rgba(28, 28, 28, 0.97);
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.38);
    color: #ececec;
    z-index: 100;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.math-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 13px;
}

.beta-badge {
    display: inline-block;
    margin-left: 7px;
    padding: 1px 5px;
    border: 1px solid #4a4a4a;
    border-radius: 999px;
    color: #aaa;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    vertical-align: 1px;
}

.math-preview-close {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    color: #aaa;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    line-height: 22px;
}

.math-preview-close:hover {
    color: #fff;
    background: #333;
}

.math-source-label {
    display: block;
    margin-bottom: 5px;
    color: #aaa;
    font-size: 11px;
}

.math-source-input {
    width: 100%;
    min-height: 48px;
    resize: vertical;
    padding: 8px 9px;
    border: 1px solid #444;
    border-radius: 7px;
    outline: none;
    color: #ececec;
    background: #111;
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.math-source-input:focus {
    border-color: #617da7;
    box-shadow: 0 0 0 2px rgba(97, 125, 167, 0.18);
}

.math-render-surface {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 92px;
    margin-top: 9px;
    padding: 12px;
    overflow: auto;
    border: 1px solid #383838;
    border-radius: 8px;
    color: #171717;
    background: #fff;
}

.math-render {
    width: 100%;
    text-align: center;
    font-family: 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif;
    font-size: 25px;
}

.math-render :deep(math) {
    margin: 0 auto;
}

.math-empty-state {
    color: #777;
    font-size: 11px;
    text-align: center;
}

.math-empty-state code {
    padding: 1px 3px;
    border-radius: 3px;
    color: #333;
    background: #eee;
}

.math-preview-footnote {
    margin-top: 8px;
    color: #8f8f8f;
    font-size: 10px;
    line-height: 1.4;
}

.math-preview-footnote.warning {
    color: #e1b96e;
}

@media (max-width: 700px) {
    .math-view-status {
        display: none;
    }

    .math-preview {
        right: 8px;
        width: calc(100vw - 16px);
    }
}
</style>
