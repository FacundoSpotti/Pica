---
name: pica-ui
description: >
  Cargar cuando se trabaje en componentes de UI de Pica, design tokens,
  Tailwind config, tipografía, colores, espaciado, o el sistema de rutas
  de Next.js. También cargar cuando se habla de "componente", "diseño",
  "color", "tipografía", "Tailwind", "layout", "navegación", "ruta" en
  el contexto de Pica.
---

# pica-ui — Design system y componentes de Pica

---

## Identidad visual

**Logo:** Persona espiando detrás de una pared con ojos asomados.
**Versión final:** Recta (straight). La inclinada es para animación de transición.
**Capas nombradas para animación:** `eye-left`, `eye-right`, `Cabeza`, `Label`, `Cuerpo`

### Variantes de logo disponibles en Figma

| Variante | Uso | Modo |
|---|---|---|
| Logo - Original - Light | Página Sobre nosotros, fondos claros | Light |
| Logo - Original - Dark | Navbar sobre canvas negro | Dark |
| Logo - Navbar - Light / Dark | Navbar 120×120px | Ambos |
| Isotipo - Navbar - Light / Dark | Solo el símbolo, sin texto | Ambos |
| Logo - favicon - Light / Dark | 32×32px | Ambos |
| Animación - Original/Navbar/favicon | Versión animable (ojos separados) | Ambos |

**Animación idle del logo:**
```typescript
// Framer Motion — ojos mirando a los lados + blink
const eyeVariants = {
  idle: { x: 0 },
  left: { x: -2 },
  right: { x: 2 },
};
// eye-left y eye-right son rectángulos en el SVG exportado
// Ciclo: idle → left → idle → right → idle → blink (scale y: 0.1) → idle
```

---

## Sistema de colores

Base: **blanco y negro** para toda la UI. Los colores de acento son exclusivos para datos.

### Paleta completa — 8 colores × 8 tonos

```typescript
// archivo: tailwind.colors.ts
export const picaColors = {
  blue: {
    100: '#DFE4FA', 200: '#B5BFF3', 300: '#7589E9',
    400: '#2B49DD', // Figma: Blue_Light
    500: '#1D2DCD',
    600: '#0F11BD', // Figma: Blue_Dark
    700: '#0B0D8E', 800: '#07085F',
  },
  yellow: {
    100: '#FFF6D9', 200: '#FFEAA6', 300: '#FFD859',
    400: '#FFC300', // Figma: Yellow_Light
    500: '#F7B810',
    600: '#EEAC1F', // Figma: Yellow_Dark
    700: '#B38117', 800: '#775610',
  },
  green: {
    100: '#F2FADF', 200: '#E1F3B5', 300: '#C6E975',
    400: '#A8DD2B', // Figma: Green_Light
    500: '#98CD1D',
    600: '#88BD0F', // Figma: Green_Dark
    700: '#668E0B', 800: '#445F08',
  },
  orange: {
    100: '#FFF5E8', 200: '#FFD9B3', 300: '#FFAD73',
    400: '#FF7A27', // Figma: Orange_Light
    500: '#FF6F16',
    600: '#FF6404', // Figma: Orange_Dark
    700: '#BF4B03', 800: '#803202',
  },
  red: {
    100: '#FFE4E4', 200: '#FFC0C1', 300: '#FF898B',
    400: '#FF4A4D', // Figma: Red_Light
    500: '#E12546',
    600: '#C3003E', // Figma: Red_Dark
    700: '#92002F', 800: '#62001F',
  },
  pink: {
    100: '#FFEAF1', 200: '#FFCEDF', 300: '#FEA3C2',
    400: '#FD70A1', // Figma: Pink_Light
    500: '#F64886',
    600: '#EE1F6A', // Figma: Pink_Dark
    700: '#B31750', 800: '#771035',
  },
  purple: {
    100: '#E9E2F0', 200: '#CCBBDB', 300: '#A081BC',
    400: '#6D3D98', // Figma: Purple_Light
    500: '#633888',
    600: '#593377', // Figma: Purple_Dark
    700: '#432659', 800: '#2D1A3C',
  },
  cyan: {
    100: '#DFF7FA', 200: '#B5EDF3', 300: '#75DDE9',
    400: '#2BCBDD', // Figma: Cyan_Light
    500: '#1DB7CD',
    600: '#0FA3BD', // Figma: Cyan_Dark
    700: '#0B7A8E', 800: '#08525F',
  },
};
```

### Asignación por temática

```typescript
export const tematicas = {
  educacion: picaColors.blue,
  trabajo:   picaColors.yellow,
  salud:     picaColors.green,
  economia:  picaColors.orange,
  seguridad: picaColors.red,
  // pink, purple, cyan → sin asignar (V3+)
};
```

### Cuándo usar cada tono

- **100–300**: fondos sutiles, estados deshabilitados, hover muy suave
- **400**: el color principal de la temática (visualizaciones, acentos)
- **600**: hover, bordes, énfasis
- **700–800**: texto sobre fondos de color, estados muy activos

### Integración en Tailwind

```typescript
// tailwind.config.ts
import { picaColors } from './tailwind.colors';

export default {
  theme: {
    extend: {
      colors: { pica: picaColors },
    },
  },
};

// Uso:
// bg-pica-blue-400      ← color Educación
// text-pica-yellow-800  ← texto sobre fondo amarillo
// border-pica-green-600 ← borde Salud
```

---

## Tipografía

⏳ **Pendiente** — fuente aún no seleccionada.

Jerarquía definida en Figma:
- Heading
- Second Heading
- Title
- Sub Heading
- Button
- Paragraph
- Subtitle
- Link

Una vez seleccionada la fuente, completar esta sección con:
- Nombre de la fuente + Google Fonts URL
- Escala de tamaños en px
- Line heights
- Letter spacing por nivel
- Configuración en next/font

---

## Estructura de rutas (Next.js App Router)

```
src/app/
  layout.tsx              → layout raíz (fuentes, metadata global)
  page.tsx                → / → HomeCanvas + ThemeSelector
  interactivo/
    page.tsx              → /interactivo → InteractiveLayout
    loading.tsx           → skeleton mientras carga el dataset
  nosotros/
    page.tsx              → /nosotros → Sobre nosotros
  not-found.tsx           → 404
```

---

## Navegación entre pantallas

```typescript
import { useRouter } from 'next/navigation';
const router = useRouter();

// Home → Interactivo (al elegir temática)
router.push(`/interactivo?tema=${tema}`);

// Cambiar entidad/característica sin recargar
router.replace(`/interactivo?tema=${tema}&entidad=${entidad}&caracteristica=${car}`);

// Volver al home
router.push('/');
```

---

## Convenciones de componentes

- Componentes en `src/components/[feature]/NombreComponente.tsx`
- Un componente por archivo, default export
- Props tipadas con interfaz explícita antes del componente
- Clases Tailwind para estilos estáticos, CSS custom props para valores dinámicos
- Nunca hardcodear colores — siempre `pica.blue[400]` o `var(--color-educacion)`

---

## CSS custom properties para Canvas y pixel art

```css
/* globals.css */
:root {
  --color-educacion: #2B49DD;
  --color-trabajo:   #FFC300;
  --color-salud:     #A8DD2B;
  --color-economia:  #FF7A27;
  --color-seguridad: #FF4A4D;
}

canvas {
  image-rendering: pixelated;  /* OBLIGATORIO para sprites */
  image-rendering: crisp-edges;
}
```

---

## Assets del logo — archivos a exportar desde Figma

```
public/
  logo.svg              ← Logo completo, light (negro sobre transparente)
  logo-dark.svg         ← Logo completo, dark (blanco sobre transparente)
  logo-icon.svg         ← Isotipo solo, light
  logo-icon-dark.svg    ← Isotipo solo, dark
  logo@2x.png           ← PNG fallback, 2x
  favicon.ico
  favicon.png           ← 32×32px
```

Los archivos de animación (Animación - Original - Dark/Light) se usan para
construir la animación del logo en código con Framer Motion sobre las capas
`eye-left` y `eye-right` del SVG exportado.

---

## Tipografía — sistema completo

### Las dos fuentes

**VT323** — fuente principal de toda la web
- Uso: cuerpo de texto, labels, descripciones, navegación, copy, subtítulos
- Estilo: monospace pixel, una sola variable (weight 400)
- Sensación: terminal, datos, retro-digital — coherente con las referencias estéticas
- Importante: renderiza limpio en múltiplos de 4px — evitar tamaños impares

**Handjet** — títulos, números y datos destacados
- Uso: números grandes del contador, valores de visualizaciones, títulos de temáticas, headings principales
- Estilo: dot-matrix variable, peso 100-900
- En peso alto (800-900) con ELSH 2: efecto LED display muy marcado
- Es la fuente que hace que los datos se vean como datos

---

### Carga en Next.js (app/layout.tsx)

```typescript
import { VT323, Handjet } from 'next/font/google';

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
});

const handjet = Handjet({
  subsets: ['latin'],
  axes: ['wght', 'ELSH'],  // ejes variables
  variable: '--font-handjet',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${vt323.variable} ${handjet.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

---

### Configuración en Tailwind

```typescript
// tailwind.config.ts
fontFamily: {
  sans:    ['var(--font-vt323)', 'monospace'],      // base — todo el cuerpo
  display: ['var(--font-handjet)', 'sans-serif'],   // headings y números
  mono:    ['var(--font-vt323)', 'monospace'],       // alias de sans
},
```

---

### Escala tipográfica

| Rol | Fuente | Tamaño | Peso | ELSH | Uso |
|---|---|---|---|---|---|
| Counter | Handjet | 96–128px | 900 | 2 | Contador de población en Home |
| Data hero | Handjet | 64–80px | 800 | 2 | Número principal Tipo A |
| Heading 1 | Handjet | 48px | 700 | 2 | Título de temática |
| Heading 2 | Handjet | 32px | 600 | 2 | Título de sección |
| Heading 3 | VT323 | 28px | 400 | — | Subtítulos |
| Body | VT323 | 20px | 400 | — | Cuerpo general |
| Label | VT323 | 16px | 400 | — | Labels, breadcrumbs, nav |
| Small | VT323 | 14px | 400 | — | Fuentes, notas al pie |

**Importante:** VT323 es una pixel font — renderiza limpio solo en múltiplos de 4px.
No usar tamaños como 15px, 17px, 19px, etc.

---

### CSS custom properties

```css
:root {
  --font-vt323:   'VT323', monospace;
  --font-handjet: 'Handjet', sans-serif;
  --font-body:    var(--font-vt323);
  --font-display: var(--font-handjet);
}
```

---

### Handjet — variantes de peso + ELSH

```css
/* Contador de población — máximo impacto */
.counter {
  font-family: var(--font-handjet);
  font-weight: 900;
  font-variation-settings: "ELGR" 1, "ELSH" 2;
  font-size: 96px;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

/* Valor principal de una visualización */
.data-value {
  font-family: var(--font-handjet);
  font-weight: 800;
  font-variation-settings: "ELGR" 1, "ELSH" 2;
  font-size: 64px;
}

/* Título de temática en ThemeCard */
.tema-title {
  font-family: var(--font-handjet);
  font-weight: 700;
  font-variation-settings: "ELGR" 1, "ELSH" 2;
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

---

### Uso de Handjet en Canvas (contador del home)

```typescript
// canvasRenderer.ts — para dibujar el contador sobre el Canvas
ctx.font = '900 96px "Handjet"';
ctx.fontVariationSettings = '"ELGR" 1, "ELSH" 2';
ctx.fillStyle = '#EBEBEB';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(
  count.toLocaleString('es-UY'),
  width / 2,
  height / 2
);
// Asegurar que la fuente esté cargada antes del primer render:
// await document.fonts.ready;
```

---

### Letter spacing recomendado por contexto

```
Handjet, títulos grandes:  0.04em
Handjet, labels ALL CAPS:  0.12em
VT323, body:               0.02em (pixel fonts se leen mejor con ligero tracking)
VT323, labels:             0.06em
```

---

### Lo que NO hacer con estas fuentes

```
❌ VT323 a tamaños impares (15px, 17px, 23px) — se pixela mal
❌ Handjet peso bajo (<500) para texto largo — ilegible a tamaño pequeño
❌ Handjet en cuerpo de texto — solo para display y datos
❌ Mezclar ambas fuentes en la misma línea — cada una tiene su rol
❌ VT323 en italic — no tiene variante italic, el navegador la simula mal
```

---

## Tokens tipográficos exactos — extraídos de Figma

Estos valores son los definitivos. Reemplazan cualquier estimación anterior.

### Tailwind fontSize config

```typescript
// tailwind.config.ts — fontSize con valores exactos de Figma
fontSize: {
  'pica-heading':    ['68px', { lineHeight: '70px',  letterSpacing: '0.2px' }],
  'pica-heading-2':  ['48px', { lineHeight: '53px',  letterSpacing: '0.2px' }],
  'pica-title':      ['36px', { lineHeight: '39px',  letterSpacing: '0.1px' }],
  'pica-subheading': ['30px', { lineHeight: '42px',  letterSpacing: '0' }],
  'pica-button':     ['22px', { lineHeight: '25px',  letterSpacing: '0.2px' }],
  'pica-paragraph':  ['19px', { lineHeight: '28px',  letterSpacing: '0.2px' }],
  'pica-subtitle':   ['14px', { lineHeight: '18px',  letterSpacing: '0.1px' }],
  'pica-link':       ['14px', { lineHeight: '18px',  letterSpacing: '0.2px' }],
},
```

### CSS custom properties — aplicación por fuente

```css
/* Handjet — headings y datos */
.text-heading    { font-family: var(--font-handjet); font-size: 68px; line-height: 70px; letter-spacing: 0.2px; font-weight: 700; }
.text-heading-2  { font-family: var(--font-handjet); font-size: 48px; line-height: 53px; letter-spacing: 0.2px; font-weight: 700; }
.text-title      { font-family: var(--font-handjet); font-size: 36px; line-height: 39px; letter-spacing: 0.1px; font-weight: 700; }
.text-subheading { font-family: var(--font-handjet); font-size: 30px; line-height: 42px; letter-spacing: 0;     font-weight: 400; }
.text-button     { font-family: var(--font-handjet); font-size: 22px; line-height: 25px; letter-spacing: 0.2px; font-weight: 700; }
.text-paragraph  { font-family: var(--font-handjet); font-size: 19px; line-height: 28px; letter-spacing: 0.2px; font-weight: 400; }
.text-subtitle   { font-family: var(--font-handjet); font-size: 14px; line-height: 18px; letter-spacing: 0.1px; font-weight: 400; }
.text-link       { font-family: var(--font-handjet); font-size: 14px; line-height: 18px; letter-spacing: 0.2px; font-weight: 400; }

/* VT323 — cuerpo general (mismos tamaños, font-weight siempre 400) */
.text-heading.vt    { font-family: var(--font-vt323); font-weight: 400; }
.text-heading-2.vt  { font-family: var(--font-vt323); font-weight: 400; }
/* ... mismo patrón para todos los niveles */
```

### Cuándo usar Handjet vs VT323

```
Handjet Bold   → títulos, CTAs, labels de temáticas, valores numéricos destacados
Handjet Regular → subtítulos de apoyo, texto de párrafo en contextos de datos
VT323 Regular  → cuerpo general, descripciones, copy largo, breadcrumbs, nav
```

### Uso en Canvas (Handjet para el contador)

```typescript
// Para el contador de población — NO está en la escala de Figma
// Es un estilo especial exclusivo del home screen
ctx.font = '700 80px "Handjet"';
// O a 68px (el tamaño Heading de Figma):
ctx.font = '700 68px "Handjet"';
ctx.letterSpacing = '0.2px'; // solo Chrome — en otros browsers no aplica
```

### Nota sobre Counter (home screen)

El contador de población usa el estilo **Heading** (68px, Handjet Bold, lineHeight 70px)
como tamaño base. Puede escalarse a 80-96px para pantallas grandes usando
`clamp()` en CSS o calculándolo respecto al viewport en Canvas.

---

## Animación del logo — transición entre pantallas

El logo se mueve de **izquierda** (Home, Interactivo) a **centro** (Sobre Nosotros)
mediante una animación de layout compartido con Framer Motion.

```
Home / Interactivo:    [PICA]  ←  esquina superior izquierda
Sobre Nosotros:                   [PICA]  ←  centro superior
```

### Implementación con layoutId

```typescript
// Mismo componente en todas las páginas — Framer Motion anima automáticamente
// app/components/shared/PicaLogo.tsx

'use client';
import { motion } from 'framer-motion';

export function PicaLogo({ centered = false }: { centered?: boolean }) {
  return (
    <motion.div
      layoutId="pica-logo"  // ← clave — mismo ID en todas las páginas
      className={centered ? 'mx-auto' : ''}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <img src="/logo-dark.svg" alt="Pica" style={{ imageRendering: 'pixelated' }} />
    </motion.div>
  );
}

// En page.tsx (Home) → <PicaLogo />            posición left en nav
// En nosotros/page.tsx → <PicaLogo centered /> posición center
// Framer Motion detecta el cambio de posición y anima suavemente entre páginas
```

### Wrapping con AnimatePresence

```typescript
// app/layout.tsx — necesario para que la animación funcione entre rutas
import { AnimatePresence } from 'framer-motion';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </body>
    </html>
  );
}
```
