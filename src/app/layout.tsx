import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SoundEngine } from '@/components/SoundEngine';
import { ShakeEruption } from '@/components/ShakeEruption';
import { Splash } from '@/components/Splash';
import { TvStage } from '@/components/TvStage';
import { VolcanoJourney } from '@/components/VolcanoJourney';
import { VolcanoBackground } from '@/components/VolcanoBackground';
import { EmberProvider } from '@/components/ui/Embers';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'JDED APP',
  description: 'JDED APP by @jdedcut : réserve ta coupe (Cut) ou ta place à un évènement (Showtime).',
  applicationName: 'JDED APP',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'JDED', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0705',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&family=Rozha+One&family=Alfa+Slab+One&family=Oswald:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <VolcanoBackground />
        <TvStage />
        <VolcanoJourney />
        <ToastProvider>
          <EmberProvider>{children}</EmberProvider>
        </ToastProvider>
        <SoundEngine />
        <ShakeEruption />
        <Splash />
      </body>
    </html>
  );
}
