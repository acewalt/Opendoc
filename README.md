# Waltiva

Waltiva es un visor/editor de documentos que funciona completamente en el navegador y está pensado para desplegarse en GitHub Pages.

## Funciones actuales

- Crear documentos nuevos desde una página en blanco.
- Importar PDF, DOC, DOT, DOCX, DOCM, DOTX, DOTM, RTF, ODT, TXT, HTML, HTM, XML, MHT y MHTML.
- PDF: vista original con PDF.js y reconstrucción del texto en páginas editables tipo Word.
- DOCX / DOCM / DOTX / DOTM: renderizado Office Open XML con `docx-preview` y edición del DOM renderizado.
- DOC / DOT (Word 97–2003): lectura local con JSDoc, incluyendo texto, estilos, tablas e imágenes rasterizadas recuperables.
- RTF y ODT: importación y reconstrucción editable del contenido principal.
- Editor con estilos de párrafo, fuentes, tamaños, negrita, cursiva, subrayado, tachado, subíndice, superíndice, colores, resaltado, alineación, listas, sangría, enlaces, imágenes, tablas, líneas, saltos de página, deshacer/rehacer y zoom.
- Modo claro y modo noche.
- Exportación a HTML editable.
- Exportación a `.doc` compatible con Word basada en HTML.
- Impresión / exportación a PDF desde el navegador.
- Sin backend: los documentos no se suben a ningún servidor.
- Regla de página estilo Word con márgenes izquierdo/derecho arrastrables.
- Selector “Descargas / Archivos” y lista local de documentos importados recientemente.

## Límites técnicos importantes

PDF no es un formato de edición semántica. Waltiva conserva una vista original del PDF y genera una reconstrucción editable del texto. Esto funciona bien en documentos convencionales, pero no puede reconstruir de forma perfecta todas las fuentes incrustadas, columnas, fondos complejos, cuadros de texto, gráficos vectoriales o escaneos sin OCR.

La edición de DOCX de esta versión modifica el HTML renderizado. La exportación nativa de vuelta a `.docx` requiere un serializador OOXML/editor dedicado.

Los `.doc` binarios antiguos pueden contener OLE, WMF/EMF, macros y estructuras que un navegador no puede reproducir exactamente.

## Dependencias CDN

- PDF.js `pdfjs-dist@3.11.174`
- JSZip `3.10.1`
- docx-preview `0.3.6`
- JSDoc (lector Word 97–2003, 0BSD), fijado al commit `821695a`

## GitHub Pages

El proyecto no necesita compilación. GitHub Pages publica directamente desde la rama `main`.

Sitio: `https://acewalt.github.io/Waltiva/`

Repositorio: `https://github.com/acewalt/Waltiva`

## Próximas mejoras

Para acercarse a una conversión PDF → DOCX editable con mayor fidelidad, la arquitectura debe incorporar un motor OOXML real, análisis de layout y OCR para PDFs escaneados.
