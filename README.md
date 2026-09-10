# Waltiva

Waltiva es un escritorio local de documentos para navegador y GitHub Pages.

## Arquitectura actual

La rama `main` conserva únicamente la interfaz principal de Waltiva: biblioteca, creación/importación de documentos, recientes locales y el contenedor del editor.

El editor anterior basado en DOM, PDF.js, docx-preview y los módulos `editor-*`, `fidelity-*`, `free-transform`, `media`, `history`, `book-layout`, etc. fue retirado de `main`.

La edición se realiza ahora con el runtime de ONLYOFFICE 9.3 preparado para navegador y WebAssembly, publicado bajo `onlyoffice-preview/`. La integración usa `wasm-onlyoffice-sdk` y el conversor local `x2t` WebAssembly.

## Flujo

- **Crear documento** abre el selector de tipo.
- Se puede crear un Documento (`.docx`), Hoja de cálculo (`.xlsx`) o Presentación (`.pptx`).
- Cada opción abre directamente el editor correspondiente de ONLYOFFICE en español.
- **Importar documento** permite seleccionar archivos locales y enviarlos al editor embebido sin usar un backend propio.
- Los archivos recientes se conservan mediante IndexedDB cuando el tamaño permite guardar una copia local.
- El botón flotante **← Waltiva** vuelve al espacio de trabajo.

## Formatos conectados

DOCX, XLSX, PPTX, DOC, XLS, PPT, ODT, ODS, ODP, PDF, TXT, RTF y CSV.

La compatibilidad final de lectura, edición y exportación depende de lo que soporte el motor ONLYOFFICE/x2t para cada formato.

## Privacidad

Waltiva no incorpora un servidor propio para subir documentos. La selección del archivo y la comunicación entre la biblioteca y el editor se realizan en el navegador.

## Código

- `index.html`: interfaz principal y selector Nuevo/Abrir.
- `styles.css`: estilos base de la biblioteca y del contenedor del editor.
- `library-redesign.css`: apariencia actual del menú principal.
- `workspace.js`: navegación, tema, archivos recientes e integración con el editor.
- `onlyoffice-preview/`: runtime publicado de ONLYOFFICE 9.3 + x2t WASM.
- `onlyoffice-engine`: rama fuente utilizada para construir y validar la integración de ONLYOFFICE.

## Despliegue

GitHub Pages publica desde `main`.

Sitio: `https://acewalt.github.io/Waltiva/`
