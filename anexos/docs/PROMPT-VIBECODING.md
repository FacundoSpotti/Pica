# Prompt de inicio — Vibecoding de Pica en Antigravity

Copiá y pegá este prompt como primer mensaje en Antigravity para arrancar.

---

## PROMPT

```
Vamos a construir Pica, una plataforma de visualización de datos de Uruguay.

ANTES DE ESCRIBIR CUALQUIER CÓDIGO, leé y procesá en este orden:

1. Todos los skills en .gemini/config/skills/pica*/ — especialmente el skill
   "pica" (overview) que explica qué es el proyecto, y luego pica-ui,
   pica-home, pica-interactive, pica-data y pica-accessibility.

2. El árbol completo de la carpeta public/ para mapear todos los assets reales
   disponibles (sprites de personas, personajes de temática, capas del
   landscape, logo). Usá los nombres de archivo EXACTOS que encuentres — no
   inventes rutas.

3. El archivo tailwind.colors.ts en la raíz del proyecto (si existe) que
   contiene el sistema de colores completo.

Una vez que tengas todo ese contexto, tu primera tarea es el SETUP BASE:

TAREA 1 — Inicializar el proyecto:
- Next.js 14 con App Router y TypeScript estricto
- Tailwind CSS configurado con los colores de tailwind.colors.ts
- Framer Motion, D3, React Simple Maps, Zod instalados
- pnpm como package manager
- Las fuentes VT323 y Handjet cargadas vía next/font/google
- La estructura de carpetas definida en los skills (app/, components/,
  hooks/, lib/, types/, data/)

TAREA 2 — Configuración base:
- globals.css con las CSS custom properties (colores, fondo #0A0A0A,
  image-rendering pixelated para canvas)
- El layout raíz (app/layout.tsx) con las fuentes y metadata
- Las tres rutas vacías: / (home), /interactivo, /nosotros
- tailwind.config.ts con los tokens tipográficos exactos de Figma
  (ver pica-ui)

NO construyas todavía el Canvas, las visualizaciones ni el overlay. Solo el
setup base y la estructura. Cuando termines, mostrame la estructura de
carpetas creada y confirmá que el proyecto levanta con pnpm dev.

Trabajamos en español, comentarios en español, código en inglés. Seguí
estrictamente las convenciones y los valores definidos en los skills.
Priorizá la accesibilidad (pica-accessibility) desde el primer componente.
```

---

## Después del setup

Una vez que el setup base funcione, las siguientes tareas en orden sugerido:

1. **Sistema de sprites** — spriteManager.ts (carga, caché, palette swap, flip)
2. **Home - Canvas de puntos** — useColorDots.ts + HomeCanvas.tsx
3. **Home - Landscape** — CityLandscape.tsx con las 7 capas y hitboxes automáticas
4. **Home - Overlay** — ThemeOverlay.tsx + ThemeCard.tsx con rotación 360°
5. **Home - Convergencia** — puntos que van al edificio al hacer click
6. **Datos** — procesar ECH 2024 a JSON + schemas Zod
7. **Pantalla interactiva** — EntityScroller + CharacteristicExplorer + VizRouter
8. **Visualizaciones** — los 5 tipos (A-E)
9. **Sobre nosotros** — las 5 cards
10. **Logo animado** — con transición de posición entre pantallas

Cada tarea es un prompt separado. No intentes hacer todo de una.
