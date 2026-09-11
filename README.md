# Waltiva

Waltiva es un editor ofimático web que permite abrir, editar y trabajar con documentos de Office directamente desde el navegador, manteniendo el procesamiento de archivos de forma local siempre que es posible.

Este proyecto está basado en [sweetwisdom/onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local), sobre el cual se han realizado cambios de interfaz, compatibilidad y experiencia de uso para adaptarlo a Waltiva.

**Demo:** [acewalt.github.io/Waltiva](https://acewalt.github.io/Waltiva/)

## ✨ Cambios principales de Waltiva

- 🇪🇸 **Interfaz en español**: se adaptó la interfaz de ONLYOFFICE para utilizar español como idioma principal.
- 🎨 **Nuevo tema visual**: se implementó una apariencia propia para Waltiva, con una interfaz más moderna y consistente.
- 🧩 **Corrección de SmartArt**: se corrigió un problema del menú de SmartArt que impedía utilizar correctamente sus categorías y submenús.
- 📱 **Vista móvil propia**: se integró una visualización específica para dispositivos móviles, separada de la experiencia de escritorio y adaptada a pantallas pequeñas.
- 🔒 **Procesamiento local**: los documentos se trabajan desde el navegador sin depender de un servidor tradicional de ONLYOFFICE para la edición local.
- 📝 **Compatibilidad con documentos de Office**: soporte para formatos como DOCX, XLSX y PPTX, además de otros formatos compatibles con la base de ONLYOFFICE.
- ⚡ **Aplicación web estática**: puede ejecutarse como una aplicación frontend y publicarse mediante GitHub Pages.

## 🛠️ Base técnica

Waltiva conserva la arquitectura principal de `onlyoffice-web-local` y utiliza varias tecnologías del ecosistema ONLYOFFICE:

- **ONLYOFFICE WebSDK / se-office** para la interfaz y las herramientas de edición.
- **WebAssembly** para realizar conversiones de documentos localmente mediante `x2t-wasm`.
- **Vue + Vite** para la aplicación web y su interfaz exterior.
- **Arquitectura frontend** orientada a funcionar directamente en el navegador.

## 📄 Apertura de archivos remotos

Waltiva conserva la posibilidad de abrir determinados documentos remotos mediante parámetros en la URL.

Parámetros disponibles:

- `url`: dirección del archivo remoto.
- `filename`: nombre del archivo; es opcional si puede obtenerse automáticamente.

Ejemplo:

```text
?filename=documento.docx&url=https://example.com/files/documento.docx
```

El nombre del archivo se intenta obtener en este orden:

1. Parámetro `filename`.
2. Nombre incluido en la propia URL.
3. Cabecera HTTP `Content-Disposition`.

## 🚀 Desarrollo

Instalar dependencias:

```sh
pnpm install
```

Ejecutar el entorno de desarrollo:

```sh
pnpm dev
```

Generar la versión de producción:

```sh
pnpm build
```

La compilación de producción se genera en el directorio configurado por Vite y puede publicarse como un sitio web estático.

## 🐳 Docker

También puede ejecutarse mediante Docker.

Construir la imagen:

```sh
docker build -t waltiva .
```

Ejecutar el contenedor:

```sh
docker run -dp 8080:80 --name waltiva waltiva
```

Después se puede acceder desde:

```text
http://localhost:8080
```

## 📌 Estado del proyecto

Waltiva no pretende ser una distribución oficial de ONLYOFFICE. Es una adaptación independiente construida sobre proyectos de código abierto existentes, con modificaciones centradas en la experiencia web local, la interfaz en español, la personalización visual, la compatibilidad móvil y correcciones específicas de la interfaz.

## 🙏 Créditos y proyectos base

Este proyecto se apoya en el trabajo de otros proyectos de código abierto:

- [sweetwisdom/onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local) — proyecto base utilizado para la edición local de documentos en el navegador.
- [Qihoo360/se-office](https://github.com/Qihoo360/se-office) — suite ofimática web utilizada por la base del editor.
- [cryptpad/onlyoffice-x2t-wasm](https://github.com/cryptpad/onlyoffice-x2t-wasm) — conversión de documentos mediante WebAssembly.

## 📜 Licencia

Waltiva conserva las obligaciones de licencia correspondientes a los proyectos de código abierto sobre los que está construido. Consulta el archivo de licencia del repositorio y las licencias de los proyectos mencionados anteriormente para conocer los términos aplicables.
