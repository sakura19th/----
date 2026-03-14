import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        modulePreload: false,
        assetsInlineLimit: 100000000,
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                format: 'iife',
                inlineDynamicImports: true,
            },
        },
    },
});
