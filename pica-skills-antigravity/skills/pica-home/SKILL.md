---
name: pica-home
description: >
  Cargar cuando se trabaje en el Home de Pica: Canvas de animación, sprites
  pixel art, walk cycles, sistema de fases (counting/spawning/walking/regrouping),
  el mecanismo de reagrupamiento por temática al hacer scroll, palette swap de
  colores por código, o cualquier lógica de la ruta /. También cargar cuando
  se habla de "Home", "Canvas", "sprite", "personaje", "animación", "pixel art",
  "walk cycle", "regroup", "palette swap", "scroll del home" en Pica.
---

# pica-home — Canvas de animación del Home

---

## Arquitectura del Home

```
src/
  app/
    page.tsx                     → ruta /, renderiza HomeCanvas + ThemeSelector
  components/
    home/
      HomeCanvas.tsx             → componente principal ← ENTRY POINT
      ThemeSelector.tsx          → sección de temáticas (aparece al hacer scroll)
  hooks/
    useHomeCanvas.ts             → loop de animación Canvas
    useHomeScroll.ts             → detecta scroll y dispara regroup
  lib/
    spriteManager.ts             → carga, caché, flip H, palette swap
    personaSimulation.ts         → movimiento y animación de personas
    canvasRenderer.ts            → lógica de dibujo separada de React
  types/
    sprites.ts                   → tipos TypeScript del sistema
  public/
    sprites/                     → 24 PNGs base en blanco 68×172px
```

---

## Los 24 sprites — SPRITE_CONFIGS completo

```typescript
// src/components/home/HomeCanvas.tsx

const SPRITE_CONFIGS: SpriteConfig[] = [
  // ── Adulto masculino (8 modelos) ──────────────────────────────────────────
  { id: 'm-01', src: '/sprites/persona_m-01-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-02', src: '/sprites/persona_m-02-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-03', src: '/sprites/persona_m-03-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-04', src: '/sprites/persona_m-04-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-05', src: '/sprites/persona_m-05-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-06', src: '/sprites/persona_m-06-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-07', src: '/sprites/persona_m-07-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'm-08', src: '/sprites/persona_m-08-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },

  // ── Adulta femenina (8 modelos) ────────────────────────────────────────────
  { id: 'w-01', src: '/sprites/persona_w-01-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-02', src: '/sprites/persona_w-02-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-03', src: '/sprites/persona_w-03-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-04', src: '/sprites/persona_w-04-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-05', src: '/sprites/persona_w-05-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-06', src: '/sprites/persona_w-06-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-07', src: '/sprites/persona_w-07-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'w-08', src: '/sprites/persona_w-08-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },

  // ── Niño (4 modelos) ───────────────────────────────────────────────────────
  { id: 'cm-01', src: '/sprites/persona_cm-01-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'cm-02', src: '/sprites/persona_cm-02-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'cm-03', src: '/sprites/persona_cm-03-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'cm-04', src: '/sprites/persona_cm-04-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },

  // ── Niña (4 modelos) ───────────────────────────────────────────────────────
  { id: 'cw-01', src: '/sprites/persona_cw-01-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'cw-02', src: '/sprites/persona_cw-02-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'cw-03', src: '/sprites/persona_cw-03-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
  { id: 'cw-04', src: '/sprites/persona_cw-04-base-spritesheet.png', frameWidth: 17, frameHeight: 43, walkFrames: 4, idleFrames: 2 },
];
```

---

## Sistema de palette swap

Los sprites base son blancos (#FFFFFF). El color se aplica en runtime:

```typescript
// spriteManager.ts
function tintSprite(
  img: HTMLImageElement,
  color: string  // ej: '#2B49DD'
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
```

**Los 16 colores disponibles para sprites:**
```typescript
const SPRITE_COLORS = [
  '#DFE4FA', '#2B49DD',  // blue 100, 400
  '#FFEAF1', '#FD70A1',  // pink 100, 400
  '#E9E2F0', '#6D3D98',  // purple 100, 400
  '#FFE4E4', '#FF4A4D',  // red 100, 400
  '#FFF6D9', '#FFC300',  // yellow 100, 400
  '#F2FADF', '#A8DD2B',  // green 100, 400
  '#DFF7FA', '#2BCBDD',  // cyan 100, 400
  '#FFF5E8', '#FF7A27',  // orange 100, 400
];
```

---

## Sistema de fases del Canvas

```
loading → counting → spawning → walking → regrouping → grouped
```

| Fase | Qué ocurre |
|---|---|
| `loading` | Cargando los 24 spritesheets en paralelo |
| `counting` | Contador 0→3.499.451 animado + partículas apareciendo |
| `spawning` | Personas apareciendo gradualmente caminando |
| `walking` | Estado estacionario, movimiento aleatorio |
| `regrouping` | Personas caminan hacia su grupo temático (scroll trigger) |
| `grouped` | Personas en idle dentro de grupos, ThemeSelector visible |

**Trigger del regroup:**
```typescript
// useHomeScroll.ts
const { scrollYProgress } = useScroll();
scrollYProgress.on('change', (v) => {
  if (v > 0.4 && phase === 'walking')  triggerRegroup();
  if (v < 0.15 && phase === 'grouped') triggerUngroup();
});
```

---

## Formato del spritesheet por modelo (68×172px)

```
Fila 0 — Idle frente  (2 frames × 17px): stand · stand+breathe
Fila 1 — Walk frente  (4 frames × 17px): stand · paso-R · stand · paso-L
Fila 2 — Idle espalda (2 frames × 17px): stand · stand+breathe
Fila 3 — Walk espalda (4 frames × 17px): stand · paso-R · stand · paso-L

Izquierda  = flip horizontal de fila 1
Derecha    = fila 1 directamente
```

---

## Reagrupamiento — lógica de lerp

```typescript
// Al entrar en fase 'regrouping':
// Cada persona recibe targetX/targetY según su tema asignado

const GRUPO_X = {
  educacion: canvasWidth * 0.2,
  trabajo:   canvasWidth * 0.5,
  salud:     canvasWidth * 0.8,
};

// En updatePersona durante 'regrouping':
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
p.x = lerp(p.x, p.targetX, 0.03);
p.y = lerp(p.y, p.targetY, 0.03);
```

---

## Regla crítica de renderizado

```typescript
// SIEMPRE en el elemento <canvas>:
style={{ imageRendering: 'pixelated' }}
// Sin esto los sprites se ven borrosos
```

---

## prefers-reduced-motion

```typescript
// En useHomeCanvas.ts — OBLIGATORIO
const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReduced) {
  // Saltar fases counting y spawning
  // Los sprites aparecen directamente en sus posiciones (sin walk-in)
  // El contador muestra el número final sin animación
  stateRef.current.phase = 'walking';
  stateRef.current.populationCount = TOTAL_POPULATION;
}
```

---

## ⏳ Pendiente — se completa con el prototipo de alta

- [ ] Velocidad exacta del walk-in al formar gráficas (lerp speed)
- [ ] Duración de la transición de dispersión entre características
- [ ] Layout definitivo del ThemeSelector (posición y tamaño de grupos)
- [ ] Asignación de modelos específicos a cada temática

---

## ThemeCard — sprites de rotación por temática

### Specs de los 5 personajes

| Temática | Personaje | Archivo |
|---|---|---|
| Educación | Estudiante con túnica y lazo azul | `/sprites/icons/educacion-rotation.png` |
| Trabajo | Trabajador con casco amarillo y chaleco | `/sprites/icons/trabajo-rotation.png` |
| Salud | Doctor con guardapolvo y estetoscopio | `/sprites/icons/salud-rotation.png` |
| Economía | Empresario con camisa y barba | `/sprites/icons/economia-rotation.png` |
| Seguridad | Policía con uniforme POLICÍA | `/sprites/icons/seguridad-rotation.png` |

### Dimensiones del spritesheet

```
Frame size:      48×70px (fondo transparente)
Frames totales:  8 (rotación 360°)
Spritesheet:     384×70px total
Formato:         PNG transparente

Distribución de frames (izquierda a derecha):
Frame 1 (0°)   → frente completo ← dibujado
Frame 2 (45°)  → 3/4 derecha     ← dibujado
Frame 3 (90°)  → perfil derecho  ← dibujado
Frame 4 (135°) → 3/4 espalda-der ← dibujado
Frame 5 (180°) → espalda         ← dibujado
Frame 6 (225°) → flip de Frame 4 ← generado por código
Frame 7 (270°) → flip de Frame 3 ← generado por código
Frame 8 (315°) → flip de Frame 2 ← generado por código
```

### Generación de frames 6-8 por código

```typescript
// spriteManager.ts — generar la rotación completa desde 5 frames
async function buildRotationSheet(
  src: string
): Promise<OffscreenCanvas> {
  const img = await loadImage(src); // spritesheet 5 frames = 240×70px
  const FRAME_W = 48;
  const FRAME_H = 70;
  const TOTAL_FRAMES = 8;

  const sheet = new OffscreenCanvas(FRAME_W * TOTAL_FRAMES, FRAME_H);
  const ctx = sheet.getContext('2d')!;

  // Copiar frames 1-5 directamente
  for (let i = 0; i < 5; i++) {
    ctx.drawImage(img, i * FRAME_W, 0, FRAME_W, FRAME_H,
                       i * FRAME_W, 0, FRAME_W, FRAME_H);
  }

  // Generar frames 6-8 como flip de frames 4, 3, 2
  const flipSources = [3, 2, 1]; // índices base (0-indexed)
  flipSources.forEach((srcIdx, i) => {
    const destIdx = 5 + i;
    ctx.save();
    ctx.translate((destIdx + 1) * FRAME_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, srcIdx * FRAME_W, 0, FRAME_W, FRAME_H,
                       0, 0, FRAME_W, FRAME_H);
    ctx.restore();
  });

  return sheet;
}
```

### ThemeCard — animación de rotación

```typescript
const FRAME_W = 48;
const FRAME_H = 70;
const FRAME_COUNT = 8;
const FRAME_DURATION = 80; // ms → 640ms por vuelta completa

function ThemeCard({ tema, label, color, active }: ThemeCardProps) {
  const [frame, setFrame] = useState(0);
  const [hovered, setHovered] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!hovered || prefersReduced) { setFrame(0); return; }
    const id = setInterval(
      () => setFrame(f => (f + 1) % FRAME_COUNT),
      FRAME_DURATION
    );
    return () => clearInterval(id);
  }, [hovered, prefersReduced]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderColor: active ? color : 'transparent' }}
      className={`
        border-2 p-4 cursor-pointer transition-colors
        ${active ? 'opacity-100' : 'opacity-40 border-dashed'}
      `}
    >
      {/* Sprite de rotación */}
      <div
        style={{
          width: FRAME_W,
          height: FRAME_H,
          backgroundImage: `url(/sprites/icons/${tema}-rotation.png)`,
          backgroundPosition: `-${frame * FRAME_W}px 0`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
        role="img"
        aria-label={`Ícono de ${label}`}
      />

      {/* Label */}
      <p style={{ color, fontFamily: 'var(--font-handjet)', fontWeight: 700,
                  fontSize: 14, letterSpacing: '0.12em' }}
         className="uppercase mt-2 text-center">
        {active ? label : 'Próximamente'}
      </p>
    </div>
  );
}
```

---

## ⚠️ REVISIÓN MAYOR DE CONCEPTO — Home screen rediseñado

> Decisiones tomadas en el prototipo de baja fidelidad. Reemplaza el concepto
> original de scroll + walking sprites + ThemeSelector.

---

## Nuevo modelo de interacción del Home

### Estado 1 — Ciudad activa (default)

- Landscape isométrico de Montevideo ocupa el 100% de la pantalla
- Puntos de colores (2-3px) se mueven por las calles siguiendo paths fijos
- Barra de colores temáticos en el borde inferior (línea delgada, todos los temas)
- Sin scroll — toda la interacción es click

### Estado 2 — Temática seleccionada (click en edificio)

- Ciudad pasa a escala de grises: `filter: grayscale(100%)`
- Solo el edificio clickeado mantiene color
- Overlay oscuro semi-transparente sobre la ciudad
- Centro del overlay: character 360° + nombre temática + descripción + VOLVER

---

## Arquitectura técnica revisada

```
src/
  app/
    page.tsx                     → Home completo
  components/
    home/
      HomeCanvas.tsx             → SOLO los puntos de colores (Canvas)
      CityLandscape.tsx          → imagen del landscape + hitboxes + filter
      ThemeOverlay.tsx           → overlay cuando se selecciona temática
      ColorBar.tsx               → barra de colores inferior
  hooks/
    useCityInteraction.ts        → lógica de click en edificios
    useColorDots.ts              → animación de puntos de colores
```

---

## Puntos de colores — reemplaza walking sprites

```typescript
// useColorDots.ts
interface ColorDot {
  x: number;
  y: number;
  pathIndex: number;   // índice del path de calle que sigue
  progress: number;    // 0-1 progreso en el path
  speed: number;       // px por tick
  color: string;       // uno de los 16 colores de la paleta
  radius: number;      // 2 o 3px
}

// CONVERGENCIA: al clickear un edificio, todos los dots
// hacen lerp hacia las coordenadas del edificio seleccionado.
// Fases: moving (paths normales) → converging (lerp al edificio) → arrived
// Al llegar → aparece el overlay con el character

// Los paths son coordenadas predefinidas que siguen las calles
// del landscape isométrico — definirlos una vez mirando la imagen
const STREET_PATHS: [number, number][][] = [
  [[100, 200], [300, 200], [500, 350]],  // calle principal horizontal
  [[200, 100], [200, 400], [200, 600]],  // calle vertical izquierda
  // ... definir 8-12 paths que cubran las calles visibles
];

// Render en Canvas — muy liviano
function renderDots(ctx: CanvasRenderingContext2D, dots: ColorDot[]) {
  dots.forEach(dot => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
    ctx.fillStyle = dot.color;
    ctx.fill();
  });
}
```

---

## CityLandscape — hitboxes por edificio

```typescript
// Coordenadas aproximadas sobre el landscape 1920×1080
// Se ajustan cuando esté la imagen final del landscape

interface BuildingZone {
  tema: 'educacion' | 'trabajo' | 'salud' | 'economia' | 'seguridad';
  label: string;
  // Polígono o rectángulo clickeable sobre el landscape
  hitbox: { x: number; y: number; w: number; h: number };
  color: string;
}

const BUILDING_ZONES: BuildingZone[] = [
  { tema: 'educacion', label: 'Educación',
    hitbox: { x: 320, y: 180, w: 180, h: 140 },  // Palacio Legislativo
    color: '#2B49DD' },
  { tema: 'salud',     label: 'Salud',
    hitbox: { x: 820, y: 120, w: 200, h: 160 },  // Hospital de Clínicas
    color: '#A8DD2B' },
  // ... definir al tener la imagen final
];
```

---

## CityLandscape — grayscale al seleccionar

```typescript
// CityLandscape.tsx
function CityLandscape({ selectedTema }: { selectedTema: string | null }) {
  return (
    <div className="relative w-full h-screen overflow-hidden">

      {/* Ciudad completa — se desatura al seleccionar */}
      <img
        src="/landscape/montevideo.png"
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
        style={{
          filter: selectedTema ? 'grayscale(100%) brightness(0.5)' : 'none',
          imageRendering: 'pixelated',
        }}
      />

      {/* Edificio seleccionado — siempre en color, por encima */}
      {selectedTema && (
        <img
          src={`/landscape/building-${selectedTema}.png`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      )}

      {/* Canvas de puntos de colores — encima de todo */}
      <HomeCanvas />

      {/* Hitboxes invisibles */}
      {BUILDING_ZONES.map(zone => (
        <button
          key={zone.tema}
          onClick={() => setSelected(zone.tema)}
          style={{ position: 'absolute', ...zone.hitbox, background: 'transparent' }}
          aria-label={`Explorar temática ${zone.label}`}
        />
      ))}

    </div>
  );
}
```

---

## ThemeOverlay — modal de temática seleccionada

```typescript
function ThemeOverlay({ tema, onClose }: ThemeOverlayProps) {
  const config = TEMA_CONFIG[tema];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-50"
    >
      {/* Character 360° */}
      <ThemeCharacter tema={tema} autoRotate />

      {/* Info */}
      <div>
        <p style={{ color: config.color, fontFamily: 'var(--font-handjet)',
                    fontWeight: 700, letterSpacing: '0.12em' }}>
          TEMÁTICA
        </p>
        <h2 style={{ fontFamily: 'var(--font-handjet)', fontSize: 48,
                     fontWeight: 700, color: '#EBEBEB' }}>
          {config.label.toUpperCase()}
        </h2>
        <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 20,
                    color: '#A0A09A', maxWidth: 400 }}>
          {config.descripcion}
        </p>
        <button onClick={() => router.push(`/interactivo?tema=${tema}`)}>
          EXPLORAR
        </button>
        <button onClick={onClose}>VOLVER</button>
      </div>
    </motion.div>
  );
}
```

---

## ColorBar — barra inferior de temáticas

```typescript
// Línea delgada en el borde inferior con el color de cada tema
// V2 aparece en gris o con borde dashed

const BARRA_TEMAS = [
  { tema: 'educacion', color: '#2B49DD', active: true },
  { tema: 'trabajo',   color: '#FFC300', active: true },
  { tema: 'salud',     color: '#A8DD2B', active: true },
  { tema: 'economia',  color: '#FF7A27', active: false }, // V2
  { tema: 'seguridad', color: '#FF4A4D', active: false }, // V2
];

// 5 segmentos de igual ancho, altura 4px, borde inferior de la pantalla
```

---

## Velocidades de animación (referencia The Pudding)

Pendiente de ajuste fino durante vibecoeding. Valores iniciales:

```typescript
const ANIMATION_DEFAULTS = {
  dotsSpeed:        { min: 0.4, max: 1.2 },  // px/tick para puntos de colores
  dotsFadeIn:       300,    // ms para que aparezca un nuevo punto
  overlayFadeIn:    400,    // ms para el overlay de temática
  grayscaleTransition: 500, // ms para el efecto CSS de desaturación
  characterRotation: 80,   // ms por frame de la rotación 360°
};
```

---

## Convergencia de puntos al seleccionar edificio

Al hacer clic en un edificio los puntos dejan de seguir los paths de calles
y convergen hacia las coordenadas del edificio seleccionado.

```typescript
type DotPhase = 'moving' | 'converging' | 'arrived';

// En el update loop:
function updateDot(dot: ColorDot, phase: DotPhase, target: {x:number, y:number}) {
  if (phase === 'moving') {
    // Movimiento normal por paths de calles
    advanceAlongPath(dot);
  }

  if (phase === 'converging') {
    // Todos los puntos lerp hacia el edificio clickeado
    dot.x = lerp(dot.x, target.x, 0.04);
    dot.y = lerp(dot.y, target.y, 0.04);

    // Detectar llegada
    const dist = Math.hypot(dot.x - target.x, dot.y - target.y);
    if (dist < 3) dot.phase = 'arrived';
  }
}

// Cuando todos (o la mayoría) están en 'arrived' → mostrar overlay
const allArrived = dots.every(d => d.phase === 'arrived');
if (allArrived) showThemeOverlay(selectedTema);
```

**Variante posible durante vibecoeding:**
- Solo los puntos del color de la temática seleccionada convergen
- Los demás se desvanecen con `opacity → 0`
- Resultado: solo el color de esa temática "llega" al edificio

---

## Archivos de animación de rotación — nombres exactos

```
public/sprites/icons/
  Animacion Doctor Color.png          → Doctor, versión con color verde
  Animacion Doctor.png                → Doctor, versión sin color (blanco)
  Animación Economica Color.png       → Económico, versión azul
  Animación Economica Color-1.png     → Económico, versión marrón
  Animación Economica.png             → Económico, sin color (versión 1)
  Animación Economica-1.png           → Económico, sin color (versión 2)
  Animacion Estudiante.png            → Estudiante, sin color
  Animación Policia Color.png         → Policía, versión con color rojo/granate
  Animación Policia.png               → Policía, sin color (azul marino)
  Animacion Trabajador.png            → Trabajador, versión amarilla
  Animación Trabajador Color.png      → Trabajador, versión color dorado
  Animación Trabajador.png            → Trabajador, variante
```

**Asignación por temática (versión a usar — decidir en vibecoeding):**
```typescript
const ROTATION_SPRITES = {
  educacion: {
    color:    'Animacion Estudiante.png',     // pendiente versión color
    nocolor:  'Animacion Estudiante.png',
  },
  salud: {
    color:    'Animacion Doctor Color.png',
    nocolor:  'Animacion Doctor.png',
  },
  economia: {
    color:    'Animación Economica Color.png',
    nocolor:  'Animación Economica.png',
  },
  seguridad: {
    color:    'Animación Policia Color.png',
    nocolor:  'Animación Policia.png',
  },
  trabajo: {
    color:    'Animación Trabajador Color.png',
    nocolor:  'Animacion Trabajador.png',
  },
};
```

---

## Layout del ThemeOverlay — layout revisado

El personaje va en la **izquierda**, la información en la **derecha**.

```
┌─────────────────────────────────────────────────────────┐
│                    [franja negra overlay]                │
│                                                         │
│   [personaje 360°]    │    TEMÁTICA                     │
│   girando continuo    │    EDUCACIÓN                    │
│   left side           │                                 │
│                       │    descripción del tema...      │
│                       │                                 │
│                       │    [EXPLORAR]    [VOLVER]       │
└─────────────────────────────────────────────────────────┘
```

```typescript
function ThemeOverlay({ tema, onClose }: ThemeOverlayProps) {
  const config = TEMA_CONFIG[tema];

  return (
    <motion.div
      className="absolute inset-0 flex items-center z-50"
      style={{ background: 'rgba(8,8,8,0.92)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* IZQUIERDA — personaje girando continuamente */}
      <div className="flex-shrink-0 flex items-center justify-center w-64 h-full">
        <ThemeCharacter
          spriteSheet={`/sprites/icons/${config.rotationSprite}`}
          frameWidth={48}
          frameHeight={70}
          autoRotate   // gira sin parar mientras el overlay está abierto
          frameDuration={80}
        />
      </div>

      {/* DERECHA — información de la temática */}
      <div className="flex flex-col gap-6 px-12">
        <div>
          <p style={{ fontFamily: 'var(--font-handjet)', fontWeight: 700,
                      fontSize: 14, letterSpacing: '0.12em', color: config.color }}>
            TEMÁTICA
          </p>
          <h2 style={{ fontFamily: 'var(--font-handjet)', fontWeight: 700,
                       fontSize: 48, lineHeight: '53px', color: '#EBEBEB' }}>
            {config.label.toUpperCase()}
          </h2>
        </div>

        <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 20,
                    lineHeight: '28px', color: '#A0A09A', maxWidth: 400 }}>
          {config.descripcion}
        </p>

        <div className="flex gap-4">
          <button onClick={() => router.push(`/interactivo?tema=${tema}`)}>
            EXPLORAR
          </button>
          <button onClick={onClose}>
            VOLVER
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## ThemeOverlay — layout corregido

El título de la temática va **debajo del personaje 360°**, no al lado.

```
IZQUIERDA                    DERECHA
┌─────────────────┐          descripción del tema...
│                 │
│   [360° gira]   │          [EXPLORAR]   [VOLVER]
│                 │
│   EDUCACIÓN     │  ← título debajo del personaje
└─────────────────┘
```

```typescript
// Columna izquierda: personaje + título debajo
<div className="flex flex-col items-center gap-3">
  <ThemeCharacter spriteSheet={...} autoRotate />
  <p style={{ fontFamily: 'var(--font-handjet)', fontWeight: 700,
              fontSize: 22, color: config.color, letterSpacing: '0.12em' }}>
    {config.label.toUpperCase()}
  </p>
</div>

// Columna derecha: descripción + botones
<div className="flex flex-col gap-6">
  <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 20,
              color: '#A0A09A' }}>
    {config.descripcion}
  </p>
  <div className="flex gap-4">
    <button onClick={() => router.push(`/interactivo?tema=${tema}`)}>EXPLORAR</button>
    <button onClick={onClose}>VOLVER</button>
  </div>
</div>
```

---

## Landscape final — archivos y dimensiones definitivas

**Resolución del canvas:** 4096×2305px (todas las capas idénticas)

Todas las capas están alineadas al mismo canvas — cada edificio está en su
posición real con el resto transparente. Se apilan con `position: absolute`
sin necesidad de ajustar coordenadas.

```
public/landscape/
  Landscape_background.png              → base completo, edificios temáticos vaciados
  Landscape_parts_palacio_legislativo.png → solo Palacio Legislativo (decorativo, no clickeable en V1)
  Landscape_parts-educación.png         → solo IAVA (Educación)
  Landscape_parts_trabajo.png           → solo Intendencia (Trabajo)
  Landscape_parts_salud.png             → solo Hospital de Clínicas (Salud)
  Landscape_parts_economia.png          → solo BROU (Economía, V2)
  Landscape_parts_seguridad.png         → solo Comisaría (Seguridad, V2)
```

**Nota sobre el Palacio Legislativo:** es un edificio decorativo central del
landscape, no una temática clickeable. Las 5 temáticas clickeables son IAVA,
Intendencia, Hospital de Clínicas, BROU y Comisaría.

### Mapeo de archivos a temáticas

```typescript
const BUILDING_LAYERS = {
  educacion:  '/landscape/Landscape_parts-educación.png',   // IAVA
  trabajo:    '/landscape/Landscape_parts_trabajo.png',     // Intendencia
  salud:      '/landscape/Landscape_parts_salud.png',       // Hospital Clínicas
  economia:   '/landscape/Landscape_parts_economia.png',    // BROU (V2)
  seguridad:  '/landscape/Landscape_parts_seguridad.png',   // Comisaría (V2)
};

const BASE_LAYER = '/landscape/Landscape_background.png';
```

### Hitboxes automáticas — escala 4096×2305

Las hitboxes se calculan escaneando los píxeles no-transparentes de cada capa
(ver función getHitboxFromPNG). Como el canvas es 4096×2305 pero se renderiza
en pantallas variables, las coordenadas resultantes se convierten a porcentajes:

```typescript
const CANVAS_W = 4096;
const CANVAS_H = 2305;

// Hitbox en píxeles del PNG → porcentaje para el DOM
function toPercent(hitbox: PixelHitbox) {
  return {
    left:   `${(hitbox.x / CANVAS_W) * 100}%`,
    top:    `${(hitbox.y / CANVAS_H) * 100}%`,
    width:  `${(hitbox.w / CANVAS_W) * 100}%`,
    height: `${(hitbox.h / CANVAS_H) * 100}%`,
  };
}
```

**Nota:** El archivo con "ñ" (`Landscape_parts-educación.png`) puede causar
problemas en algunos sistemas. Considerar renombrar a `educacion` sin tilde
al importar al proyecto, o usar `encodeURIComponent` en la ruta.
