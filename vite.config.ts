import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.VITE_BASE_PATH || '/hypertrophy-lab/';
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..')) {
  throw new Error('VITE_BASE_PATH must be an absolute directory path ending in /');
}
export default defineConfig({
  base,
  server: { fs: { strict: true, deny: [
    '.env', '.env.*', '*.{crt,pem,key}', '**/.git/**',
    '**/data/**', '**/reports/**', '**/docs/private/**',
    '**/*.csv', '**/*.parquet', '**/*.private.json',
    '**/AGENTS.md', '**/codex_bodybuilding_master_prompt.md',
  ] } },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [
    { name: 'react', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 30 },
    { name: 'charts', test: /node_modules[\\/](?:recharts|d3-[^/\\]+|victory-vendor|@reduxjs|react-redux|reselect|immer|use-sync-external-store)[\\/]/, priority: 20 },
    { name: 'validation', test: /node_modules[\\/]zod[\\/]/, priority: 10 },
  ] } } } },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'Hypertrophy Lab', short_name: 'Hypertrophy Lab',
      description: '기록에서 시작하는 나의 근성장 시스템', lang: 'ko',
      start_url: base, scope: base, display: 'standalone',
      theme_color: '#d6ee91', background_color: '#f5f5f0',
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
      navigateFallback: `${base}index.html`,
      navigateFallbackDenylist: [/\/data\//, /\/api\//],
      cleanupOutdatedCaches: true,
    },
  })],
  test: { include: ['tests/**/*.test.ts'], environment: 'node', maxWorkers: 2 },
});
