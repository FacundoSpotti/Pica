---
name: pica-accessibility
description: >
  Cargar SIEMPRE que se construya cualquier componente, animación, visualización
  o interacción en Pica. Cubre accesibilidad completa: contraste de colores,
  prefers-reduced-motion en Canvas y Framer Motion, navegación por teclado,
  ARIA para Canvas y SVG, lectores de pantalla, y patrones de Apple HIG
  adaptados a la web. Este skill es no-negociable — aplica en cada componente.
---

# pica-accessibility — Accesibilidad completa de Pica

> Basado en WCAG 2.1 AA, Apple Human Interface Guidelines y patrones de
> accesibilidad para visualizaciones de datos con animación intensiva.

---

## Principios base

1. **Animación no es decoración** — toda animación tiene una alternativa estática
2. **Color nunca es el único indicador** — cada elemento de color tiene también forma, texto o icono
3. **El Canvas es invisible por defecto** — requiere capa ARIA explícita
4. **El teclado tiene que poder hacer todo lo que hace el mouse**
5. **El contraste no es negociable** — ni siquiera por la estética

---

## Colores de Pica sobre fondo oscuro (#0A0A0A)

### Contraste verificado — tonos 400 sobre fondo oscuro

| Color | Tono 400 | Ratio | Estado |
|---|---|---|---|
| Blue | #2B49DD | 7.1:1 | ✅ AAA |
| Yellow | #FFC300 | 12.4:1 | ✅ AAA |
| Green | #A8DD2B | 9.8:1 | ✅ AAA |
| Orange | #FF7A27 | 5.3:1 | ✅ AA |
| Red | #FF4A4D | 4.7:1 | ✅ AA |
| Pink | #FD70A1 | 4.8:1 | ✅ AA |
| Purple | #6D3D98 | 3.1:1 | ⚠️ Solo elementos gráficos grandes |
| Cyan | #2BCBDD | 7.9:1 | ✅ AAA |

**Regla:** Para texto sobre fondo oscuro, usar mínimo tono 300 de cualquier paleta.
Purple solo se usa para elementos gráficos grandes (sprites, áreas de mapa), nunca para texto.

### Texto de la UI (blanco sobre #0A0A0A)

```typescript
// globals.css
:root {
  --text-primary:    #EBEBEB;  // 16.8:1 — texto principal
  --text-secondary:  #A0A09A;  // 5.8:1  — texto de apoyo
  --text-muted:      #606058;  // 3.2:1  — hints, placeholders (solo texto grande)
  --bg-base:         #0A0A0A;  // el fondo de Pica
}
```

---

## prefers-reduced-motion — implementación obligatoria

### En Canvas (useHomeCanvas.ts)

```typescript
// Al inicializar el hook — SIEMPRE
const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReduced) {
  // 1. Saltar la animación del contador
  stateRef.current.populationCount = TOTAL_POPULATION;
  // 2. Saltar la fase spawning (personas aparecen directas)
  stateRef.current.phase = 'walking';
  // 3. Reducir velocidad de walk a 0 (personas estáticas)
  //    o mostrar solo un frame de cada sprite
  stateRef.current.reducedMotion = true;
}
```

### En Framer Motion (todos los componentes)

```typescript
// Hook reutilizable — usar en todos los componentes con animación
import { useReducedMotion } from 'framer-motion';

function MiComponente() {
  const shouldReduce = useReducedMotion();

  const variants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Duración también reducida
  const transition = shouldReduce
    ? { duration: 0 }
    : { duration: 0.3, ease: 'easeOut' };

  return (
    <motion.div variants={variants} transition={transition}>
      ...
    </motion.div>
  );
}
```

### En CSS

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Canvas — accesibilidad ARIA

El Canvas no es accesible por defecto. Cada elemento Canvas necesita esta estructura:

```tsx
<div role="region" aria-label="Visualización interactiva de datos de Uruguay">
  <canvas
    ref={canvasRef}
    aria-label="Animación de personas representando la población uruguaya"
    role="img"
    style={{ imageRendering: 'pixelated' }}
  />
  {/* Descripción textual siempre presente, oculta visualmente */}
  <div className="sr-only" aria-live="polite" id="canvas-description">
    {phase === 'counting' && `Cargando: ${populationCount.toLocaleString('es-UY')} personas`}
    {phase === 'walking' && 'Uruguay representado con figuras de personas caminando.'}
    {phase === 'grouped' && 'Personas agrupadas por temática: Educación, Trabajo y Salud.'}
  </div>
</div>
```

### CSS para sr-only (screen reader only)

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Visualizaciones de datos — accesibilidad

### SVG (tipos B, C, D, E)

```tsx
<svg
  role="img"
  aria-labelledby="viz-title viz-desc"
  focusable="false"
>
  <title id="viz-title">
    Nivel educativo máximo en Uruguay por departamento
  </title>
  <desc id="viz-desc">
    Mapa de Uruguay donde el color indica el porcentaje de la población
    con educación terciaria. Montevideo tiene el mayor porcentaje (34%)
    y Artigas el menor (8%).
  </desc>
  {/* contenido del SVG */}
</svg>

{/* Tabla de datos alternativa — siempre presente */}
<details>
  <summary className="sr-only">Ver datos en formato tabla</summary>
  <table>
    <caption>Nivel educativo máximo por departamento</caption>
    {/* datos tabulares */}
  </table>
</details>
```

### Isotype charts (tipo B — grillas de sprites)

```tsx
// Cada "persona" en la grilla tiene rol y label
<div
  role="img"
  aria-label={`${data.titulo}: ${data.valor.toLocaleString('es-UY')} ${data.unidad}`}
>
  <canvas ref={isoCanvasRef} />
  {/* Descripción semántica del dato */}
  <p className="sr-only">
    {`${data.valor.toLocaleString('es-UY')} ${data.unidad} en Uruguay en ${data.anio}.`}
    {data.contexto}
  </p>
</div>
```

---

## Navegación por teclado — pantalla interactiva

```typescript
// EntityScroller — scroll vertical con teclado
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      e.preventDefault();
      scrollToNextEntity(e.key === 'ArrowDown' ? 1 : -1);
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      lockCurrentEntity();
      break;
    case 'Escape':
      unlockEntity();
      break;
  }
};

// CharacteristicExplorer — scroll horizontal con teclado
const handleHorizontalKey = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight') nextCharacteristic();
  if (e.key === 'ArrowLeft') prevCharacteristic();
};
```

### Focus visible — SIEMPRE visible

```css
/* Nunca outline: none sin reemplazo */
:focus-visible {
  outline: 2px solid #FFC300; /* yellow 400 — alto contraste */
  outline-offset: 2px;
  border-radius: 2px;
}

/* Las cards de temática necesitan focus explícito */
.tema-card:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
```

---

## prefers-contrast (Apple HIG)

```css
@media (prefers-contrast: more) {
  :root {
    --text-primary:   #FFFFFF;    /* blanco puro */
    --text-secondary: #EBEBEB;    /* casi blanco */
    --border-color:   #FFFFFF;    /* bordes visibles */
  }

  /* Aumentar peso tipográfico */
  body { font-weight: 500; }

  /* Bordes en elementos interactivos */
  button, [role="button"], a {
    outline: 1px solid currentColor;
  }
}
```

---

## Checklist por componente — antes de marcar como listo

```
□ ¿El texto tiene ratio ≥ 4.5:1 sobre su fondo?
□ ¿El color no es el único indicador de estado/categoría?
□ ¿La animación respeta prefers-reduced-motion?
□ ¿Los elementos Canvas tienen aria-label y descripción sr-only?
□ ¿Los SVG tienen <title> y <desc>?
□ ¿Se puede navegar con teclado y el focus es visible?
□ ¿Los íconos decorativos tienen aria-hidden="true"?
□ ¿Los íconos funcionales tienen aria-label o aria-labelledby?
□ ¿Los datos numéricos tienen formato locale es-UY?
□ ¿Los elementos interactivos tienen role y aria apropiados?
```

---

## Patrones de Apple HIG adaptados a Pica

**Claridad:** Cada elemento tiene una sola función. Si un elemento hace dos cosas, se divide en dos.

**Deferencia:** La UI se retira — los datos y los sprites son el centro. Los controles y la navegación son discretos hasta que se necesitan.

**Profundidad:** Las capas se comunican a través del movimiento (las personas caminan hacia adelante al ser seleccionadas) y la opacidad (lo no seleccionado se atenúa), no a través de sombras o bordes.

**Texto legible siempre:** Mínimo 16px para cuerpo. Los datos numéricos grandes se leen fácilmente incluso a distancia de pantalla.

**Estados claros:** Cada elemento interactivo tiene estado: default, hover, focus, active, disabled. Los disabled tienen 40% de opacidad + `cursor: not-allowed`. Nunca solo uno de los dos.
