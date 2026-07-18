# Pica — datos de Uruguay que se dejan encontrar

Plataforma web que transforma datos oficiales de Uruguay en visualizaciones
exploradas en **pixel art**: una ciudad isométrica como puerta de entrada, y
multitudes de figuras que caminan hasta formar cada cifra. Como en el juego del
escondite: *«¡pica!» es encontrar al que estaba escondido* — acá los escondidos
son los datos.

Proyecto académico — Diseño Interactivo, Universidad ORT Uruguay ·
**Facundo Spotti**.

---

## Stack

- **Next.js 14** (App Router) + TypeScript estricto
- **Tailwind CSS** (sistema de colores propio: 8 paletas × 8 tonos en
  `config/tailwind.colors.ts`)
- **Framer Motion** (micro-animaciones) · **D3 / react-simple-maps** (mapas)
- **Canvas 2D** para los sprites isotype y las historias de compartir
- **Zod** como única fuente de verdad de la forma de los datos
- Deploy en **Vercel** (+ Web Analytics)

## Correr el proyecto

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # build de producción
pnpm typecheck      # TypeScript estricto
pnpm lint           # ESLint
pnpm validate-data  # valida los 65 datasets contra los schemas Zod
pnpm audit-data     # auditoría de fuentes y consistencia de los datos
```

Variables de entorno (`.env.local`):

| Variable | Uso |
| --- | --- |
| `GEMINI_PROXY_KEY` | **Server-only.** Key del proxy estudiantil de Gemini para el asistente de datos (`/api/chat`). Sin ella el chat responde 503. |
| `NEXT_PUBLIC_LANDSCAPE_ART` | Opcional: `original` \| `c4` \| `c6` — variante de arte del landscape (default `c6`). |
| `NEXT_PUBLIC_CALIBRATORS` | Opcional: `on` habilita las herramientas de calibración del Home. |

## Estructura

```
src/
  app/            # rutas: / (home), /interactivo, /nosotros, /api/chat
  components/
    home/         # landscape, overlays, notas, bandera, calibradores
    interactive/  # explorador de datos + visualizaciones (DataViz/)
    chat/         # asistente de datos
    shared/       # sprites, íconos pixel, logo, destellos
  data/           # 65 datasets JSON organizados por temática
  lib/            # escalas isotype, colores, assets, renderer de historias
  schemas/        # schemas Zod (la forma canónica de los datos)
scripts/          # validación, auditoría, pixelado del landscape
anexos/           # (fuera del deploy) datos fuente, diseño, documentación
```

## La capa de datos

Taxonomía **Entidad × Característica → Tipo de Resultado**:

| Tipo | Qué es | Visualización |
| --- | --- | --- |
| A | Escalar | Número grande + multitud |
| B | Distribución categórica | Isotype de multitud / barras / lista / grilla / glifo |
| C | Serie temporal | Multitud por período con rail de años |
| D | Matriz comparativa | Multitud segmentada con leyenda clickeable |
| E | Espacial (19 departamentos) | Mapa coroplético + paneles comparadores |

Reglas inquebrantables del proyecto:

- **Nunca se inventa un número.** Todo dato sale de un cuadro oficial; lo que
  no se encontró queda marcado como pendiente.
- **Las personas se representan con personas** (sprites isotype), nunca con
  barras ni números solos. En conteos absolutos, jamás más figuras que casos
  (escala mínima: 1 figura = 1 caso).
- **Toda visualización cita su fuente exacta** (INE, INEEd, MSP, BCU…y
  registros de sociedad civil declarados como tales, como Feminicidio
  Uruguay). Sin link profundo real, la fuente va como texto.
- **Datos sensibles** (femicidios, violencia de género): tratamiento sobrio,
  agregados sin nombres, y la línea gratuita de apoyo **0800 4141** presente.
- **Legibilidad primero**: todas las opciones visibles en cualquier
  resolución; se evita el scroll, pero si el contenido no entra, scrollea.

Flujo para agregar un dataset: crear el JSON (schema en `src/schemas/base.ts`),
guardar el archivo fuente en `anexos/datos-fuente/`, registrarlo en
`src/lib/datasets.ts` y correr `pnpm validate-data && pnpm audit-data`.

## El Home

- Landscape isométrico en **pixel art real**: mosaico de color predominante
  (celda 6px, paleta global de 64 colores) generado con
  `python scripts/pixelate-landscape.py` — misma grilla en todas las capas,
  por lo que hitboxes, paths y anclas (todo en %) no requieren recalibrar.
- Click en un edificio → la ciudad queda en blanco y negro, los puntos de
  color convergen por las calles y aparece el overlay de la temática.
- El **Palacio Legislativo** iza la bandera de Uruguay (pixel, flameando) y
  ofrece una estadística al azar.
- Calibradores de desarrollo (con `NEXT_PUBLIC_CALIBRATORS=on`): **P** paths
  de calles · **H** hitboxes · **B** posición de la bandera.

## Compartir

Cada estadística de personas (y los mapas) genera una historia **1080×1920**
dibujada en canvas (`src/lib/storyRenderer.ts`): titular, multitud isotype,
fuente y marca. Descarga directa o share nativo (Web Share API, requiere
HTTPS).

## Asistente de datos

Chat flotante acotado **exclusivamente** a los datasets cargados:

- Backend en `/api/chat` — la key vive solo en el server.
- El proxy limita el prompt a 4.000 caracteres → *RAG-lite local*
  (`src/lib/chatCatalog.ts`): matching de términos con sinónimos rioplatenses
  elige los 2-3 datasets relevantes y solo esos valores reales entran al
  prompt.
- Reglas duras: prohibido citar números fuera del contexto, link interno
  exacto a la visualización en cada respuesta, fuente citada, tono sobrio y
  0800 4141 en temas de violencia de género.

## Accesibilidad

Contraste verificado sobre fondo oscuro, `prefers-reduced-motion` respetado
globalmente (kill-switch en `globals.css`), `prefers-contrast: more`
soportado, foco siempre visible, y **toda visualización tiene su tabla de
datos alternativa** (sin scroll interno: cerrada no ocupa, abierta se
despliega completa).

---

*Los datos pertenecen a sus fuentes. El pixel art no decora — representa.*
