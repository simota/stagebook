/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Shared links put another person's data into this page, so the built app may run only its own bundled script.
 * Build only: the dev server injects inline scripts for hot reload. GitHub Pages cannot send headers, hence a meta tag.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const contentSecurityPolicy = (): Plugin => ({
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
});

export default defineConfig({
  base: "./",
  // Fonts stay separate files: inlined as data: URLs they would be blocked by the CSP's font-src.
  build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
  plugins: [react(), contentSecurityPolicy()],
  test: { include: ["src/**/*.test.ts"] },
});
