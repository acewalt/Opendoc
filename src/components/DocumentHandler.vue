<template>
    <div class="editor-container" v-loaing="loading" element-loading-text="Cargando…">
        <div id="iframe"></div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { getDocumentType, DocmentType } from '@/utils/util'
import { g_sEmpty_bin } from '@/utils/empty_bin'
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
const media: { [key: string]: string } = {}

onMounted(async () => {
    loading.value = true
    try {
        await initX2TScript()
        await loadEditorApi()
        await initX2T()
        loading.value = false

        const stopWatch = watch(
            () => props.file.fileName,
            async () => {
                try {
                    await openFile()
                } catch (error) {
                    console.error('Error al abrir el archivo:', error)
                    alert('No se pudo abrir el archivo. Comprueba que el formato sea compatible.')
                }
            },
            { immediate: true },
        )

        onBeforeUnmount(stopWatch)
    } catch (error) {
        console.error('No se pudo inicializar el editor:', error)
    }
})

async function handleDocumentOperation(options: { isNew: boolean; fileName: string; file?: File }) {
    try {
        const { isNew, fileName, file } = options
        const fileType = fileName.split('.').pop() || ''
        const docType = getDocumentType(fileType)
        void docType

        let documentData: {
            bin: ArrayBuffer
            media?: any
        }

        if (isNew) {
            const emptyBin = g_sEmpty_bin[`.${fileType}`]
            if (!emptyBin) {
                throw new Error(`Formato de archivo no compatible: ${fileType}`)
            }
            documentData = { bin: emptyBin }
        } else {
            if (!file) throw new Error('El archivo no es válido.')
            documentData = await convertDocument(file)
        }

        createEditorInstance({
            fileName,
            fileType,
            binData: documentData.bin,
            media: documentData.media,
        })
    } catch (error: any) {
        console.error('Falló la operación del documento:', error)
        alert(`No se pudo procesar el documento: ${error.message}`)
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

    const { fileName, fileType, binData, media } = config

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
                if (media) {
                    editor.value.sendCommand({
                        command: 'asc_setImageUrls',
                        data: { urls: media },
                    })
                }

                editor.value.sendCommand({
                    command: 'asc_openDocument',
                    data: { buf: binData },
                })
            },
            onDocumentReady: () => {
                console.log('Documento cargado:', fileName)
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

onBeforeUnmount(() => {
    if (editor.value && typeof editor.value.destroyEditor === 'function') {
        editor.value.destroyEditor()
    }
})

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
            alert('No se pudo cargar el componente del editor de ONLYOFFICE.')
            reject(error)
        }
        document.head.appendChild(script)
    })
}

interface SaveEvent {
    data: {
        data: string
        option: any
    }
}

async function handleSaveDocument(event: SaveEvent) {
    console.log('Evento de guardado:', event)

    if (event.data && event.data.data) {
        const { data, option } = event.data
        await convertBinToDocumentAndDownload(
            data.data,
            props.file.fileName,
            c_oAscFileType2[option.outputformat],
        )
    }

    editor.value.sendCommand({
        command: 'asc_onSaveCallback',
        data: { err_code: 0 },
    })
}

function handleWriteFile(event: any) {
    try {
        const { data: eventData } = event
        if (!eventData) {
            console.warn('No se recibieron datos para escribir el archivo.')
            return
        }

        const {
            data: imageData,
            file: fileName,
        } = eventData

        if (!imageData || !(imageData instanceof Uint8Array)) {
            throw new Error('Datos de imagen no válidos: se esperaba Uint8Array.')
        }

        if (!fileName || typeof fileName !== 'string') {
            throw new Error('Nombre de archivo no válido.')
        }

        const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = getMimeTypeFromExtension(fileExtension)
        const blob = new Blob([imageData], { type: mimeType })
        const objectUrl = URL.createObjectURL(blob)

        media[`media/${fileName}`] = objectUrl
        editor.value.sendCommand({
            command: 'asc_setImageUrls',
            data: {
                urls: media,
            },
        })

        editor.value.sendCommand({
            command: 'asc_writeFileCallback',
            data: {
                path: objectUrl,
                imgName: fileName,
            },
        })
    } catch (error: any) {
        console.error('Error al procesar la imagen:', error)

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
    Object.values(media).forEach((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
        }
    })

    if (editor.value && typeof editor.value.destroyEditor === 'function') {
        editor.value.destroyEditor()
    }
})
</script>

<style scoped>
.editor-container {
    width: 100%;
    height: 100vh;
}

#iframe {
    width: 100%;
    height: 100%;
}
</style>
