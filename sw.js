// Arquivo sw.js (Service Worker básico)
self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
});

self.addEventListener('fetch', (event) => {
    // Permite que o PWA passe pela verificação do navegador
});