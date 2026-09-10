import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: './',
    optimizeDeps: {
      exclude: ['wasm-onlyoffice-sdk'],
    },
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: '0.0.0.0',
    },
    build: {
      outDir: 'html',
    },
    plugins: [
      AutoImport({ resolvers: [ElementPlusResolver()] }),
      Components({ resolvers: [ElementPlusResolver()] }),
      vue(),
      vueJsx(),
      vueDevTools(),
      viteCompression({
        filter: /\.(js|css|json|txt|ico|svg|wasm)(\?.*)?$/i,
        threshold: 1024,
        algorithm: 'gzip',
        ext: 'gz',
        deleteOriginFile: false,
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
