import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      "/v1": "http://127.0.0.1:7590",
      "/salud": "http://127.0.0.1:7590",
    },
  },
});
