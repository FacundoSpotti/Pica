# Plan de acción — Compartir en redes (TAREA 6)

> Feature "Wrapped": convertir cualquier estadística de Pica en una **historia
> vertical 1080×1920** (formato Instagram Stories) con branding de la campaña,
> lista para compartir. Adaptable a cada temática (colores) y a cada tipo de
> visualización (representación). Basado en el prototipo enviado (Educación).

---

## 1. Veredicto de viabilidad

**Viable y de riesgo medio.** El corazón (las multitudes de sprites) ya se dibuja
en canvas con primitivas reutilizables (`useSpriteWalkers`, `spriteManager.tintSprite`,
`hardenAlpha`), y toda la identidad (paletas por tema, fuentes pixel, logo) ya
existe. No requiere backend: la imagen se genera **client-side** (mejor para el
deploy en Vercel). El principal costo es que **cada tipo de visualización (A–E +
devices) necesita su propio armado en el formato historia** — es trabajo
incremental, no un bloqueante.

---

## 2. Anatomía del prototipo (qué hay que componer)

Sobre un lienzo **1080×1920** con fondo `#0A0A0A`:

1. **Decoración pixel** (esquina superior derecha): grilla de cuadrados en el
   color de la temática.
2. **Etiqueta de temática** (ej. `EDUCACIÓN`) en el color del tema.
3. **Titular de campaña** (fijo): *"Este año no solo compartís tu Wrapped,
   también compartí nuestro Wrapped."* (en el prototipo hay typos —"NUETRO",
   "COMPARTI"— que se corrigen).
4. **Bloque del dato**: característica (`Culminación de la educación media
   superior`) + `entidad · año` + descripción.
5. **La visualización**, re-maquetada para vertical (en el prototipo, la serie
   isotype se muestra como grilla de columnas-año en 2 filas, no el scroll
   horizontal de la app).
6. **Pie**: logo PICA + `PICA.COM.UY` + `#URUGUAY`.

Todo lo dinámico sale del `Dataset` + `TEMA_COLOR`/`TEMA_PALETTE`.

---

## 3. Tecnología de render — opciones y recomendación

| Opción | Cómo | Pro | Contra |
|---|---|---|---|
| **A. html-to-image** (DOM→PNG) | Componente `StoryCard` oculto (HTML/CSS reutilizando las viz) → `toPng()` | Rápido de armar, reusa componentes | Fuentes hay que embeberlas; captura de `<canvas>` con carreras async; **pixel-art se puede ver borroso** en móvil; poco confiable en Safari iOS |
| **B. Canvas dedicado** (dibujar todo en un canvas 1080×1920) | `StoryRenderer` dibuja fondo, texto (fuentes via `ctx.font`), viz (reusa primitivas de sprites) y pie; `canvas.toBlob()` | **Pixel-perfect** (`imageSmoothingEnabled=false`), fiel a la estética, determinista, consistente cross-browser, sin hacks de fuentes | Hay que reimplementar el layout de cada viz en llamadas de dibujo |
| **C. Híbrido / Satori** | Satori (HTML→SVG→PNG) para texto + canvas como `<image>` | Bueno para texto | Satori **no** soporta canvas ni la multitud; descarta |

**Recomendación: Opción B (canvas dedicado).** Es la única que garantiza el
pixel-art crujiente y la fiabilidad en móvil (donde se comparte). Además reutiliza
directamente el sistema de sprites que ya tenemos. Es más código, pero se puede
**fasear por tipo de viz**.

---

## 4. Cómo se dibuja cada tipo de visualización en la historia

Todos son dibujables en canvas; ninguno es un bloqueante.

| Tipo | En la historia | Reusa |
|---|---|---|
| **A escalar** | Número grande + (si es de personas) multitud | primitivas de sprites |
| **B isotype** (personas) | Leyenda de chips + multitud densa | `useSpriteWalkers`/tint |
| **B devices** (grilla/glifo/lista/per-cápita) | grid de ícono+valor · hileras de glifos · barras rankeadas · persona+glifos | `PixelIcon` (grillas 16×16 → rects) |
| **C isotype** (personas) | Grilla de columnas-año con su % (como el prototipo) | sprites |
| **C abstracto** (dinero/índices) | Columnas/línea pixel | rects/paths |
| **D matriz** | Multitud por filas + leyenda | sprites |
| **E mapa** | Mapa de UY + paneles comparativos | **d3-geo `geoPath().context(ctx)`** dibuja los departamentos en canvas |

Clave: el mapa (lo más difícil) es viable con **d3-geo sobre canvas** (ya usamos
d3-geo vía react-simple-maps). No hay que rasterizar imágenes a mano.

---

## 5. Dificultades y soluciones

| # | Dificultad | Solución |
|---|---|---|
| 1 | Muchos tipos de viz, cada uno con su layout | **Fasear**: primero la familia isotype (A/B/C/D personas), que comparte el 80% del código; devices y mapa después |
| 2 | Fuentes pixel en canvas | `await document.fonts.load('64px "Handjet"')` antes de dibujar; usar los nombres de familia de `next/font` |
| 3 | Pixel-art borroso | `ctx.imageSmoothingEnabled = false`; escalado entero; exportar a 1080×1920 exacto |
| 4 | Sprites cargan async | esperar `Promise.all` de `loadSprite(...)` (ya devuelven promesas) antes de dibujar el frame final |
| 5 | Texto largo (título/descripción) desborda | wrapping manual con `measureText` + clamp de líneas |
| 6 | Escala "1 figura = X" cambia en el tamaño historia | recomputar la escala para las dimensiones del bloque de la historia |
| 7 | Compartir a Instagram | **Web Share API** (`navigator.share({ files:[png] })`) en móvil → hoja de compartir → Instagram; fallback: descargar PNG + instrucción. (No se puede abrir la cámara de Stories directo; el usuario elige IG y postea) |
| 8 | Mapa (E) en canvas | `d3.geoPath().projection(...).context(ctx)` con el mismo topojson `/geo/uruguay-departamentos.json` |
| 9 | Accesibilidad (es una imagen) | la tabla de datos y el `alt` siguen en la app; la historia es complementaria |
| 10 | Consistencia visual entre temas | un solo `StoryTemplate` que toma `tema` y colorea todo desde `TEMA_COLOR`/`TEMA_PALETTE` |

---

## 6. Beneficios

- **Alcance de campaña**: cada estadística se vuelve contenido compartible y
  branded (Instagram Stories, `#URUGUAY`).
- **Refuerza la marca** Pica (pixel art, The Pudding-style) fuera del sitio.
- **Reutiliza** los datos y el sistema de sprites ya construido.
- **Sin backend** → no complica el deploy; todo client-side.
- Diferenciador fuerte para un proyecto académico/divulgativo.

---

## 7. Plan de acción por fases

**Fase 0 — Andamiaje (StoryTemplate + share UX)**
- `StoryCanvas` 1080×1920: fondo, decoración pixel, etiqueta de tema, titular de
  campaña, bloque de dato (título/entidad/año/desc), pie con logo + `#URUGUAY`.
- Helpers: carga de fuentes, wrapping de texto, paleta por tema.
- Botón **"Compartir"** en la vista de la viz → modal de previsualización con la
  historia generada + **Descargar** / **Compartir** (Web Share API).

**Fase 1 — Familia isotype (A, B-personas, C-personas, D)**
- Renderers de multitud reutilizando las primitivas de sprites. Cubre la mayoría
  de los datasets (Trabajo/Salud/Educación son casi todos personas).

**Fase 2 — Devices (no-personas)**
- grilla (íconos), glifo (dominio), lista rankeada, per-cápita; dibujando
  `PixelIcon` (grillas 16×16) y barras en canvas.

**Fase 3 — Mapa (E)**
- d3-geo sobre canvas + paneles comparativos.

**Fase 4 — Pulido**
- Copys finales de campaña, UX de compartir en móvil real, variantes de titular,
  QA cross-navegador.

**Sugerencia de MVP:** Fase 0 + Fase 1 ya permiten compartir la gran mayoría de
las estadísticas (las de personas). Devices y mapa se suman después sin bloquear
el lanzamiento.

---

## 8. Decisiones a confirmar (antes de codear)

1. **Titular de campaña**: ¿fijo (una sola frase) o rotan variantes? ¿Texto
   final? (corrijo los typos del prototipo).
2. **Alcance del MVP**: ¿arrancamos con Fase 0 + Fase 1 (todo lo de personas) y
   dejamos devices/mapa para después?
3. **Formato**: solo Stories 1080×1920, ¿o también un cuadrado 1080×1080 para
   feed?
4. **Dominio**: el pie dice `PICA.COM.UY` — ¿es el dominio definitivo para el
   deploy?
5. **Compartir**: ¿alcanza con Web Share API + descarga, o querés también copiar
   al portapapeles?
