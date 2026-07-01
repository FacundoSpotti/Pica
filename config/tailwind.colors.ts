// ─────────────────────────────────────────────────────────────────────────────
// PICA — Sistema de colores completo
// 8 paletas × 8 tonos = 64 variables de color
//
// Asignación por temática:
//   blue   → Educación
//   yellow → Trabajo
//   green  → Salud
//   orange → Economía
//   red    → Seguridad
//   pink   → Sin asignar (V3+)
//   purple → Sin asignar (V3+)
//   cyan   → Sin asignar (V3+)
//
// Tonos 400 y 600 son los originales de Figma.
// Tonos 100-300 = tints (mezcla con blanco)
// Tonos 500 = interpolación entre 400 y 600
// Tonos 700-800 = shades (mezcla con negro)
// ─────────────────────────────────────────────────────────────────────────────

export const picaColors = {
  // ── Educación ──────────────────────────────────────────────────────────────
  blue: {
    100: '#DFE4FA',
    200: '#B5BFF3',
    300: '#7589E9',
    400: '#2B49DD', // original Light
    500: '#1D2DCD',
    600: '#0F11BD', // original Dark
    700: '#0B0D8E',
    800: '#07085F',
  },

  // ── Trabajo ────────────────────────────────────────────────────────────────
  yellow: {
    100: '#FFF6D9',
    200: '#FFEAA6',
    300: '#FFD859',
    400: '#FFC300', // original Light
    500: '#F7B810',
    600: '#EEAC1F', // original Dark
    700: '#B38117',
    800: '#775610',
  },

  // ── Salud ──────────────────────────────────────────────────────────────────
  green: {
    100: '#F2FADF',
    200: '#E1F3B5',
    300: '#C6E975',
    400: '#A8DD2B', // original Light
    500: '#98CD1D',
    600: '#88BD0F', // original Dark
    700: '#668E0B',
    800: '#445F08',
  },

  // ── Economía ───────────────────────────────────────────────────────────────
  orange: {
    100: '#FFF5E8',
    200: '#FFD9B3',
    300: '#FFAD73',
    400: '#FF7A27', // original Light
    500: '#FF6F16',
    600: '#FF6404', // original Dark
    700: '#BF4B03',
    800: '#803202',
  },

  // ── Seguridad ──────────────────────────────────────────────────────────────
  red: {
    100: '#FFE4E4',
    200: '#FFC0C1',
    300: '#FF898B',
    400: '#FF4A4D', // original Light
    500: '#E12546',
    600: '#C3003E', // original Dark
    700: '#92002F',
    800: '#62001F',
  },

  // ── Sin asignar (V3+) ──────────────────────────────────────────────────────
  pink: {
    100: '#FFEAF1',
    200: '#FFCEDF',
    300: '#FEA3C2',
    400: '#FD70A1', // original Light
    500: '#F64886',
    600: '#EE1F6A', // original Dark
    700: '#B31750',
    800: '#771035',
  },

  purple: {
    100: '#E9E2F0',
    200: '#CCBBDB',
    300: '#A081BC',
    400: '#6D3D98', // original Light
    500: '#633888',
    600: '#593377', // original Dark
    700: '#432659',
    800: '#2D1A3C',
  },

  cyan: {
    100: '#DFF7FA',
    200: '#B5EDF3',
    300: '#75DDE9',
    400: '#2BCBDD', // original Light
    500: '#1DB7CD',
    600: '#0FA3BD', // original Dark
    700: '#0B7A8E',
    800: '#08525F',
  },
} as const;

// ── Aliases semánticos por temática ──────────────────────────────────────────
// Para usar en código sin recordar qué color le toca a cada tema

export const tematicas = {
  educacion: picaColors.blue,
  trabajo:   picaColors.yellow,
  salud:     picaColors.green,
  economia:  picaColors.orange,
  seguridad: picaColors.red,
} as const;

// ── Integración en tailwind.config.ts ────────────────────────────────────────
//
// import { picaColors } from './tailwind.colors';
//
// export default {
//   theme: {
//     extend: {
//       colors: {
//         pica: picaColors,
//       },
//     },
//   },
// };
//
// Uso en componentes:
//   className="bg-pica-blue-400 text-pica-blue-800"
//   className="bg-pica-yellow-400"   ← Trabajo
//   className="border-pica-green-600" ← Salud
