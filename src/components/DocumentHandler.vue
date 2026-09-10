<template>
    <div class="editor-container" v-loaing="loading" element-loading-text="Cargando...">
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
let mathRibbonInstallTimer: ReturnType<typeof setTimeout> | null = null
let mathRibbonButton: HTMLButtonElement | null = null
let mathRibbonSlot: HTMLElement | null = null

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
                    removeMathRibbonControl()
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
    syncMathRibbonControl()
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
    removeMathRibbonControl()

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
                if (documentType === 'word') {
                    installMathRibbonControl()
                    if (viewMath.value) startMathSelectionTracking()
                }
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

function getOnlyOfficeFrame(): HTMLIFrameElement | null {
    return (
        (document.querySelector('iframe[name="frameEditor"]') as HTMLIFrameElement | null) ||
        (document.getElementById('iframe')?.querySelector('iframe') as HTMLIFrameElement | null)
    )
}

function getOnlyOfficeDocument(): Document | null {
    try {
        return getOnlyOfficeFrame()?.contentDocument || null
    } catch (error) {
        console.debug('Vista matemática: no se pudo acceder al documento interno de ONLYOFFICE.', error)
        return null
    }
}

function getOnlyOfficeWordApi(): any | null {
    try {
        const frameWindow = getOnlyOfficeFrame()?.contentWindow as any
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

function installMathRibbonControl(attempt = 0): void {
    if (!isWordDocument.value) return

    const doc = getOnlyOfficeDocument()
    const pageColorSlot = doc?.getElementById('slot-btn-pagecolor')

    if (!doc || !pageColorSlot) {
        if (attempt < 40) {
            if (mathRibbonInstallTimer) clearTimeout(mathRibbonInstallTimer)
            mathRibbonInstallTimer = setTimeout(() => installMathRibbonControl(attempt + 1), 250)
        }
        return
    }

    const existing = doc.getElementById('waltiva-math-view-toggle') as HTMLButtonElement | null
    if (existing) {
        mathRibbonButton = existing
        mathRibbonSlot = existing.closest('#waltiva-math-view-slot') as HTMLElement | null
        syncMathRibbonControl()
        return
    }

    if (!doc.getElementById('waltiva-math-view-style')) {
        const style = doc.createElement('style')
        style.id = 'waltiva-math-view-style'
        style.textContent = `
            #waltiva-math-view-slot {
                display: inline-flex !important;
                width: 88px !important;
                min-width: 88px !important;
                height: 64px !important;
                vertical-align: top !important;
                align-items: stretch !important;
            }
            #waltiva-math-view-toggle {
                box-sizing: border-box !important;
                width: 84px !important;
                min-width: 84px !important;
                height: 62px !important;
                margin: 0 2px !important;
                padding: 4px 4px 3px !important;
                border: 0 !important;
                border-radius: 3px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 2px !important;
                color: var(--text-normal, #d8d8d8) !important;
                background: transparent !important;
                cursor: pointer !important;
                font: inherit !important;
                line-height: 1 !important;
            }
            #waltiva-math-view-toggle:hover {
                background: var(--highlight-button-hover, rgba(255,255,255,.08)) !important;
            }
            #waltiva-math-view-toggle.active {
                background: var(--highlight-button-pressed, rgba(255,255,255,.12)) !important;
            }
            #waltiva-math-view-toggle .waltiva-math-icon {
                display: block;
                height: 19px;
                font-family: "Cambria Math", "STIX Two Math", serif;
                font-size: 18px;
                line-height: 19px;
            }
            #waltiva-math-view-toggle .waltiva-math-caption {
                display: block;
                max-width: 80px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-size: 11px;
                line-height: 13px;
            }
            #waltiva-math-view-toggle .waltiva-math-switch {
                position: relative;
                display: block;
                width: 24px;
                height: 12px;
                border-radius: 999px;
                background: #666;
                transition: background .15s ease;
            }
            #waltiva-math-view-toggle .waltiva-math-switch > span {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #fff;
                transition: transform .15s ease;
            }
            #waltiva-math-view-toggle.active .waltiva-math-switch {
                background: #4f78b8;
            }
            #waltiva-math-view-toggle.active .waltiva-math-switch > span {
                transform: translateX(12px);
            }
            @media (max-width: 600px) {
                #waltiva-math-view-slot {
                    width: 74px !important;
                    min-width: 74px !important;
                }
                #waltiva-math-view-toggle {
                    width: 70px !important;
                    min-width: 70px !important;
                }
                #waltiva-math-view-toggle .waltiva-math-caption {
                    font-size: 10px;
                }
            }
        `
        doc.head.appendChild(style)
    }

    const slot = doc.createElement('span')
    slot.id = 'waltiva-math-view-slot'
    slot.className = 'btn-slot text x-huge'

    const button = doc.createElement('button')
    button.id = 'waltiva-math-view-toggle'
    button.type = 'button'
    button.className = 'btn btn-toolbar x-huge icon-top'
    button.setAttribute('role', 'switch')
    button.setAttribute('aria-label', 'Vista matemática')
    button.innerHTML = `
        <span class="waltiva-math-icon" aria-hidden="true">√x</span>
        <span class="waltiva-math-caption">Vista matemática</span>
        <span class="waltiva-math-switch" aria-hidden="true"><span></span></span>
    `
    button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleMathView()
    })

    slot.appendChild(button)

    const designGroup = pageColorSlot.closest('.group') || pageColorSlot.parentElement
    if (!designGroup) return
    designGroup.appendChild(slot)

    mathRibbonSlot = slot
    mathRibbonButton = button
    syncMathRibbonControl()
}

function syncMathRibbonControl(): void {
    if (!mathRibbonButton || !mathRibbonButton.isConnected) return

    const enabled = viewMath.value
    mathRibbonButton.classList.toggle('active', enabled)
    mathRibbonButton.setAttribute('aria-checked', String(enabled))
    mathRibbonButton.setAttribute(
        'title',
        enabled ? 'Desactivar Vista matemática' : 'Activar Vista matemática',
    )
}

function removeMathRibbonControl(): void {
    if (mathRibbonInstallTimer) {
        clearTimeout(mathRibbonInstallTimer)
        mathRibbonInstallTimer = null
    }

    try {
        mathRibbonSlot?.remove()
        getOnlyOfficeDocument()?.getElementById('waltiva-math-view-slot')?.remove()
        getOnlyOfficeDocument()?.getElementById('waltiva-math-view-style')?.remove()
    } catch (error) {
        console.debug('Vista matemática: no se pudo retirar el control del ribbon.', error)
    }

    mathRibbonButton = null
    mathRibbonSlot = null
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
    removeMathRibbonControl()

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

.math-preview {
    position: absolute;
    top: 12px;
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
    .math-preview {
        top: 8px;
        right: 8px;
        width: calc(100vw - 16px);
    }
}
</style>