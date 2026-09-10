# Waltiva

Waltiva vuelve a usar directamente el editor ONLYOFFICE 9.3 en español, sin menú principal ni launcher intermedio.

## Estado restaurado

La rama fuente `onlyoffice-engine` fue restaurada al estado estable anterior a la integración con el menú principal. Ese estado incluye las pruebas reales de DOCX, XLSX y PPTX cargando correctamente con la interfaz principal en español.

GitHub Pages publica el runtime generado bajo `onlyoffice-preview/` y la raíz del sitio redirige directamente allí.

## Arquitectura

- `onlyoffice-engine`: fuente del editor restaurado.
- `onlyoffice-preview/`: build publicado del editor y runtime ONLYOFFICE 9.3 + x2t WebAssembly.
- `index.html`: redirección directa al editor.

Se eliminaron del `main` el launcher, la biblioteca, recientes y los estilos/scripts del menú principal.
