import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => ({
    base: command === 'serve' ? '/' : '/ALKASH-TRANS/',
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                home: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                services: resolve(__dirname, 'services.html'),
                schedule: resolve(__dirname, 'schedule.html'),
                quote: resolve(__dirname, 'quote.html'),
                tracking: resolve(__dirname, 'tracking.html'),
                gallery: resolve(__dirname, 'gallery.html'),
                contact: resolve(__dirname, 'contact.html'),
                ask: resolve(__dirname, 'ask.html'),
                register: resolve(__dirname, 'register.html'),
                login: resolve(__dirname, 'login.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                admin: resolve(__dirname, 'admin.html')
            }
        }
    }
}));