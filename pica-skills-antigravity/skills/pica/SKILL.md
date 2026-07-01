---
name: pica
description: >
  Cargar SIEMPRE al inicio de cualquier trabajo en el proyecto Pica. Contiene
  la visión completa, el stack, la arquitectura general y el índice de todos
  los demás skills. Es el punto de entrada — define qué es Pica, cómo está
  estructurado y a qué skill específico acudir para cada tarea.
---

# Pica — Plataforma de visualización de datos de Uruguay

> Overview general del proyecto. Para detalles específicos, cargar el skill
> correspondiente: pica-home, pica-interactive, pica-data, pica-ui, pica-accessibility.

---

## Qué es Pica

Plataforma web interactiva que transforma datos oficiales uruguayos en
experiencias visuales accesibles, estéticas y significativas. Inspirado en
The Pudding. No es un dashboard — es un explorador editorial de datos con
identidad pixel art y un paisaje isométrico de Montevideo como puerta de entrada.

**Nombre:** Pica — del juego del escondite ("¡Pica! te encontré"). Los datos
estaban escondidos en PDFs y planillas. Pica los encuentra y los revela.

**Proyecto académico:** Diseño Interactivo, Semestre 5, Universidad ORT Uruguay.
Desarrollado por Facundo Spotti.

**Ruta del proyecto:** `C:\Users\facus\Desktop\PROYECTOS\Pica`

---

## Stack tecnológico

| Capa | Herramienta |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Lenguaje | TypeScript estricto (sin `any`) |
| Estilos | Tailwind CSS + CSS custom properties |
| Animaciones | Framer Motion |
| Visualizaciones | D3.js (cálculos) + React Simple Maps (mapas) |
| Home screen | HTML5 Canvas (puntos de colores) |
| Datos | JSON estático + Zod |
| Package manager | pnpm |
| Deploy | Vercel |

---

## Las tres pantallas

```
/                → Home: landscape isométrico + puntos de colores + click en edificios
/interactivo     → Explorador de datos: scroll V (entidad) → scroll H (característica)
/nosotros        → Sobre nosotros: quiénes somos, fuentes, valores
```

---

## Índice de skills

| Skill | Cuándo cargarlo |
|---|---|
| **pica** | Siempre — este overview |
| **pica-home** | Canvas, landscape, puntos de colores, click en edificios, overlay de temática, ThemeCard 360° |
| **pica-interactive** | Pantalla /interactivo, scroll-snap, selección entidad/característica, VizRouter, D3, mapas |
| **pica-data** | JSON de datasets, schemas Zod, taxonomía Entidad×Característica×Resultado, fuentes INE/ANEP/MSP |
| **pica-ui** | Componentes, design tokens, colores (64 vars), tipografía (VT323+Handjet), logo, rutas |
| **pica-accessibility** | SIEMPRE al construir componentes — WCAG 2.1 AA, prefers-reduced-motion, ARIA, contraste |

---

## Modelo de interacción del Home (resumen)

1. **Estado default:** landscape isométrico de Montevideo a pantalla completa.
   Puntos de colores (2-3px) se mueven por las calles. Barra de temáticas abajo.
2. **Click en edificio:** la ciudad se desatura (grayscale), el edificio
   seleccionado mantiene color, los puntos convergen hacia él, aparece un
   overlay con el personaje girando 360° + info + EXPLORAR + VOLVER.

Sin scroll en el Home — todo es click. Detalle completo en pica-home.

---

## Temáticas y lanzamiento

**V1 (completo):** Educación (azul), Trabajo (amarillo), Salud (verde)
**V2 (próximamente):** Economía (naranja), Seguridad (rojo)

Cada temática está representada por un edificio real de Montevideo:
- Educación → IAVA
- Trabajo → Intendencia de Montevideo
- Salud → Hospital de Clínicas
- Economía → Banco República (BROU)
- Seguridad → Comisaría

El Palacio Legislativo es un edificio decorativo central, no clickeable.

---

## Sistema de datos (resumen)

Todo dato se clasifica: **Entidad × Característica → Tipo de Resultado (A-E)**
- A: Escalar · B: Distribución · C: Serie temporal · D: Matriz · E: Espacial (mapa)

Los tipos B, C y D usan grillas de sprites de personas (isotype charts) cuando
el dato involucra personas, o gráficas abstractas cuando no. Detalle en pica-data.

---

## Identidad visual (resumen)

- **Fondo:** #0A0A0A (no negro puro)
- **Colores:** blanco/negro como base UI, 8 paletas de color solo para datos
- **Tipografía:** VT323 (cuerpo) + Handjet (títulos y números)
- **Logo:** persona espiando con ojos asomados, animable
- **Estética:** pixel art, densidad tipo ciudad isométrica, decoración cero

Detalle completo en pica-ui.

---

## Colaboración Claude ↔ Facundo

- **Facundo:** decisiones creativas, diseño de sprites, wireframes, arte, dirección visual
- **Claude/Antigravity:** código, arquitectura, componentes, integración de datos
- **Notion** es la fuente de verdad — se sincroniza a estos skills vía pica-sync
- **Preferencias:** español para comunicación y comentarios, inglés para código

---

## Estado del proyecto

Pre-desarrollo completo. Listos para vibecoding:
- ✅ 24 sprites de personas (blanco, palette swap por código)
- ✅ 5 personajes de temática (rotación 360°, con y sin color)
- ✅ Landscape completo (7 capas, 4096×2305)
- ✅ Design system (colores, tipografía, logo)
- ✅ Wireframes y prototipo
- ✅ Inventario de datos (INE/ANEP/MSP)
- ✅ Los 6 skills

Pendiente: descargar y procesar datasets a JSON, inicializar Next.js, vibecoding.
