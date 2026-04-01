import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // Isso faz o link "Network" (online) aparecer sempre!
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true, // Permite testar a instalação do App mesmo em modo de treino
      },
      includeAssets: ["favicon.png", "logoempresaCAJsemfundo.png"],
      manifest: {
        name: "CAJ TECH - Gestão de Barbearia",
        short_name: "CAJ TECH",
        description: "O sistema definitivo para sua barbearia",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone", // Remove a barra do navegador ao abrir o app
        start_url: "/",
        icons: [
          {
            src: "logoempresaCAJsemfundo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logoempresaCAJsemfundo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});