import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
// El sistema de colores completo (64 vars) vive en config/tailwind.colors.ts
import { picaColors } from './config/tailwind.colors';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paletas de datos — solo para visualizaciones y acentos temáticos
        pica: picaColors,
        // Colores base de la UI (blanco/negro) — ver globals.css
        bg: {
          base: '#0A0A0A',
        },
        text: {
          primary: '#EBEBEB',
          secondary: '#A0A09A',
          muted: '#606058',
        },
      },
      fontFamily: {
        // Base — todo el cuerpo (VT323, pixel monospace)
        sans: ['var(--font-vt323)', 'monospace'],
        // Headings y números (Handjet, dot-matrix variable)
        display: ['var(--font-handjet)', 'sans-serif'],
        // Alias de sans para usar explícitamente monospace
        mono: ['var(--font-vt323)', 'monospace'],
      },
      // Tokens tipográficos exactos extraídos de Figma (ver pica-ui)
      fontSize: {
        'pica-heading': ['68px', { lineHeight: '70px', letterSpacing: '0.2px' }],
        'pica-heading-2': ['48px', { lineHeight: '53px', letterSpacing: '0.2px' }],
        'pica-title': ['36px', { lineHeight: '39px', letterSpacing: '0.1px' }],
        'pica-subheading': ['30px', { lineHeight: '42px', letterSpacing: '0' }],
        'pica-button': ['22px', { lineHeight: '25px', letterSpacing: '0.2px' }],
        'pica-paragraph': ['19px', { lineHeight: '28px', letterSpacing: '0.2px' }],
        // Mínimos subidos 14→16→18px (feedback de legibilidad de Facundo)
        'pica-subtitle': ['18px', { lineHeight: '24px', letterSpacing: '0.1px' }],
        'pica-link': ['18px', { lineHeight: '24px', letterSpacing: '0.2px' }],
      },
    },
  },
  plugins: [
    // `short:` — desktop con POCA ALTURA (ej. 1024×600): comprime el chrome
    // vertical. Se define como VARIANTE (no como screen raw) porque un screen
    // `raw` rompe el ordenamiento de las variantes max-* (max-md dejaba de
    // generarse y moría todo el layout mobile).
    plugin(({ addVariant }) => {
      addVariant('short', '@media (min-width: 768px) and (max-height: 700px)');
    }),
  ],
};

export default config;
