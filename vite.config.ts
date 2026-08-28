import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";

const precacheShell = [
  "/", "/index.html", "/offline.html", "/privacy/", "/terms/", "/robots.txt", "/sitemap.xml",
  "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png",
  "/assets/app.js", "/assets/app.css", "/assets/legal.css",
  "/assets/tempo-line-hero-640.webp", "/assets/tempo-line-hero-1200.webp"
];

/**
 * The worker itself is the update signal for an installed PWA. Derive both its
 * cache name and bytes from the exact precache payload so an app-shell change
 * cannot leave a controlled client pinned to an older fixed asset URL.
 */
function versionedServiceWorker(): Plugin {
  return {
    name: "tempo-lab-versioned-service-worker",
    apply: "build",
    writeBundle(outputOptions) {
      const outputDir = outputOptions.dir ?? "dist";
      const digest = createHash("sha256");
      for (const url of precacheShell) {
        const file = url === "/" ? "index.html" : url.replace(/^\//, "").replace(/\/$/, "/index.html");
        digest.update(file);
        digest.update(readFileSync(join(outputDir, file)));
      }
      const version = `tempo-lab-${digest.digest("hex").slice(0, 16)}`;
      const template = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
      writeFileSync(join(outputDir, "sw.js"), template.replace("__TEMPO_LAB_CACHE_VERSION__", version));
    }
  };
}

export default defineConfig({
  plugins: [versionedServiceWorker()],
  build: {
    target: "es2022",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (asset) => asset.name?.endsWith(".css") ? "assets/app.css" : "assets/[name][extname]"
      }
    }
  }
});
