import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      "/v1": {
        target: "http://127.0.0.1:7590",
        timeout: 0,
        proxyTimeout: 0,
      },
      "/salud": "http://127.0.0.1:7590",
    },
  },
});
