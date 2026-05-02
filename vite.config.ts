import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { buildContentSecurityPolicy } from "./src/shared/content-security-policy";

const devServerUrl = "http://127.0.0.1:5173";

function hypermailCspMeta(): Plugin {
  return {
    name: "hypermail-csp-meta",
    transformIndexHtml(html, context) {
      const csp = buildContentSecurityPolicy({
        devServerUrl: context.server ? devServerUrl : undefined,
        includeFrameAncestors: false
      });

      return html.replace("%HYPERMAIL_CSP%", csp);
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [hypermailCspMeta(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },
  build: {
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@tiptap") || id.includes("prosemirror")) {
            return "vendor-tiptap";
          }
          if (id.includes("dexie")) return "vendor-dexie";
          if (id.includes("zustand")) return "vendor-state";
          if (
            id.includes("lucide-react") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("class-variance-authority")
          ) {
            return "vendor-ui";
          }
          return undefined;
        }
      }
    }
  }
});
