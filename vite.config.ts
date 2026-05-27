import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Use `<script defer>` instead of `type="module" crossorigin` (for opening dist via file://). */
function classicScriptTag(): Plugin {
  return {
    name: 'classic-script-tag',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/\s+crossorigin/g, '')
        .replace(
          /<script type="module" src="(\.\/assets\/[^"]+\.js)"><\/script>/,
          '<script defer src="$1"></script>',
        )
    },
  }
}

const fileBuild = process.env.VITE_FILE_BUILD === '1'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), ...(fileBuild ? [classicScriptTag()] : [])],
  build: fileBuild
    ? {
        modulePreload: false,
        rollupOptions: {
          output: {
            format: 'iife',
            inlineDynamicImports: true,
            name: 'ReviewEnglish',
          },
        },
      }
    : undefined,
})
