# Waltiva

Waltiva es un visor/editor de documentos que funciona completamente en el navegador y está pensado para desplegarse en GitHub Pages.

## Funciones actuales

- Arrastrar y soltar archivos.
- PDF: previsualización con PDF.js y capa de texto editable por página.
- DOCX / DOCM / DOTX / DOTM: renderizado Office Open XML con `docx-preview` y edición directa del DOM renderizado.
- DOC / DOT (Word 97–2003): lectura local con JSDoc, incluyendo texto, estilos, tablas e imágenes rasterizadas recuperables.
- RTF: importación de formato básico de texto.
- ODT: importación local de texto, estilos comunes, tablas e imágenes.
- TXT / HTML / HTM / XML / MHT / MHTML.
- Exportación a HTML editable.
- Exportación a `.doc` compatible con Word basada en HTML.
- Sin backend: los documentos no se suben a ningún servidor.

## Límites técnicos importantes

PDF no es un formato de edición semántica. El modo editable conserva la página original como fondo visual y superpone bloques de texto extraídos. Esto mantiene una fidelidad visual alta para documentos convencionales, pero no puede reconstruir de forma perfecta todas las fuentes incrustadas, columnas, fondos complejos, texto convertido a curvas o escaneos sin OCR.

La edición de DOCX de esta versión modifica el HTML renderizado. La exportación nativa de vuelta a `.docx` requiere un serializador OOXML/editor dedicado y está planteada como la siguiente fase.

Los `.doc` binarios antiguos pueden contener OLE, WMF/EMF, macros y estructuras que un navegador no puede reproducir exactamente.

## Dependencias CDN

- PDF.js `pdfjs-dist@6.2.108`
- JSZip `3.10.2`
- docx-preview `0.4.0`
- JSDoc (lector Word 97–2003, 0BSD), fijado al commit `821695a`

## GitHub Pages

El proyecto no necesita compilación. Incluye un workflow estático en `.github/workflows/pages.yml` para desplegar el contenido del repositorio con GitHub Actions.

URL prevista: `https://acewalt.github.io/Opendoc/`

Si Pages todavía no está habilitado en el repositorio, hay que hacer una única configuración en **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## Siguiente fase recomendada

Para acercarse al objetivo “PDF → DOCX editable con fidelidad de Word”, la arquitectura correcta es añadir un motor de documentos real: por ejemplo un editor OOXML/WASM y, para PDF escaneado, OCR + análisis de layout. No es técnicamente correcto prometer conversión 100% fiel con una simple extracción de texto.
