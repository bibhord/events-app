import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this from /events-app/, everything else from the
  // root. Set by the deploy workflow; unset locally and in a sandbox, so
  // those keep working unchanged.
  base: process.env.BASE_PATH ?? '/',
  server: {
    // Bind to 0.0.0.0 rather than localhost. Locally this changes nothing,
    // but in a container (CodeSandbox, Codespaces, Docker) the preview proxy
    // lives outside the container and cannot reach a localhost-only socket --
    // which shows up as a 502 from the proxy rather than an error from Vite.
    host: true,
    // Fail loudly instead of silently moving to 5174 if the port is taken;
    // the preview URL is bound to a fixed port.
    strictPort: true,
    port: 5173,
  },
})
