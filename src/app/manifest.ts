import type { MetadataRoute } from 'next';

/** Permet « Ajouter à l'écran d'accueil » : JDED APP s'ouvre comme une vraie app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JDED APP',
    short_name: 'JDED',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0705',
    theme_color: '#0a0705',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
