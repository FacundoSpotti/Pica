import type { Metadata, Viewport } from 'next';
import { VT323, Handjet } from 'next/font/google';
import { assetUrl, LOGOS } from '@/lib/assets';
import './globals.css';

// ── Fuentes ──────────────────────────────────────────────────────────────────
// VT323 — cuerpo, labels, navegación (pixel monospace, único peso 400)
const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
});

// Handjet — títulos, números y datos destacados (dot-matrix variable)
// Ejes variables: peso (wght) + altura del elemento LED (ELSH)
const handjet = Handjet({
  subsets: ['latin'],
  axes: ['ELGR', 'ELSH'],
  variable: '--font-handjet',
  display: 'swap',
});

// ── Metadata ───────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Pica — Datos de Uruguay',
  description:
    'Plataforma web que transforma datos oficiales uruguayos en experiencias ' +
    'visuales accesibles. Un explorador editorial de datos con identidad pixel art.',
  applicationName: 'Pica',
  authors: [{ name: 'Facundo Spotti' }],
  keywords: ['Uruguay', 'datos', 'visualización', 'INE', 'pixel art', 'The Pudding'],
  // Favicon: isotipo negro para pestañas claras, blanco para oscuras
  icons: {
    icon: [
      {
        url: assetUrl(LOGOS.isotipo.favicon.dark),
        media: '(prefers-color-scheme: light)',
        type: 'image/svg+xml',
      },
      {
        url: assetUrl(LOGOS.isotipo.favicon.light),
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${vt323.variable} ${handjet.variable}`}>
      <body>{children}</body>
    </html>
  );
}
