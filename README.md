# Pica — datos de Uruguay que se dejan encontrar

Plataforma web que transforma datos oficiales de Uruguay en visualizaciones
exploradas en **pixel art**: una ciudad isométrica como puerta de entrada y
multitudes de figuras pixel que caminan hasta formar cada cifra. Como en el
juego del escondite: *«¡pica!» es encontrar al que estaba escondido* — acá
los escondidos son los datos.

Un proyecto de **Facundo Spotti** · Uruguay · 2026.

> *El pixel art no decora — representa.*

---

## Índice

1. [Stack e instalación](#stack-e-instalación)
2. [Estructura de carpetas](#estructura-de-carpetas)
3. [Estado final de funcionalidades](#1-estado-final-de-funcionalidades)
4. [Datos](#2-datos)
5. [Visualizaciones](#3-visualizaciones)
6. [Arquitectura](#4-arquitectura)
7. [Accesibilidad](#5-accesibilidad)
8. [Decisiones técnicas y desvíos](#6-decisiones-técnicas-y-desvíos)
9. [Performance y deploy](#7-performance-y-deploy)

---

## Stack e instalación

| Capa | Tecnología |
| --- | --- |
| Framework | **Next.js 14** (App Router) + **TypeScript** estricto |
| Estilos | **Tailwind CSS 3.4** + sistema de colores propio (8 paletas × 8 tonos en `config/tailwind.colors.ts`) |
| Animación | **Framer Motion** (micro-animaciones, drag, overlays) |
| Visualización | **Canvas 2D** (sprites isotype, historias), **D3** (escalas/interpolación de color), **react-simple-maps** (mapa coroplético) |
| Datos | **Zod** — schemas como única fuente de verdad de la forma de los datos |
| Tipografías | VT323 (cuerpo, pixel monospace) + Handjet (display/números, dot-matrix variable) vía `next/font` |
| IA | Gemini 2.5 Flash vía proxy estudiantil (asistente de datos) |
| Deploy | **Vercel** + Web Analytics |

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # build de producción (no correrlo con `pnpm dev` levantado: comparten .next)
pnpm typecheck      # TypeScript estricto
pnpm lint           # ESLint
pnpm validate-data  # valida los 83 datasets contra los schemas Zod
pnpm audit-data     # auditoría de fuentes y consistencia
```

Variables de entorno (`.env.local` local / Environment Variables en Vercel):

| Variable | Uso |
| --- | --- |
| `GEMINI_PROXY_KEY` | **Server-only.** Key del proxy de Gemini para `/api/chat`. Sin ella el chat responde 503 (el resto del sitio no depende de esto). |
| `NEXT_PUBLIC_LANDSCAPE_ART` | Opcional: `original` \| `c4` \| `c6` — variante de arte del landscape (default `c6`). |
| `NEXT_PUBLIC_CALIBRATORS` | Opcional: `on` habilita las herramientas de calibración del Home (teclas P/H/B). |

## Estructura de carpetas

```
src/
  app/
    page.tsx              # Home: ciudad isométrica clickeable
    interactivo/          # Explorador de datos (estado en la URL)
    nosotros/             # Quiénes somos + formulario de feedback
    api/chat/route.ts     # Backend del asistente de datos (server-only)
    globals.css           # Variables, reset, animaciones, a11y global
  components/
    home/                 # Landscape, overlays, notas, bandera, calibradores
    interactive/          # Explorador + DataViz/ (las 12 visualizaciones)
    chat/                 # Widget del asistente
    shared/               # Sprites, íconos pixel, logo, destellos, bandera
  data/                   # 83 datasets JSON por temática (validados con Zod)
  hooks/                  # useSpriteWalkers, useColorDots, useIsMobile, useCountUp
  lib/                    # Escalas isotype, colores, assets, renderer de historias…
  schemas/base.ts         # Schemas Zod (la forma canónica de los datos)
scripts/                  # Generadores de datos, validación, auditoría, pixelado
config/tailwind.colors.ts # Sistema de colores completo (64 variables)
public/assets/            # Arte: landscape (original + mosaico pixel), sprites, logos
public/geo/               # GeoJSON de los 19 departamentos
anexos/                   # (fuera del deploy) datos fuente, diseño, documentación
```

---

## 1. Estado final de funcionalidades

### Temáticas

**Las 5 temáticas están ACTIVAS**: Educación, Trabajo, Salud, **Economía y
Seguridad incluidas** (se habilitaron en la expansión de datos, con edificio
propio en el landscape, color, personaje y catálogo completo).

### Inventario completo (29 entidades · 83 características)

#### Educación — 5 entidades · 13 características

- **Departamentos**: Aprobación en Media Básica (E) · Aprobación en Media Superior (E) · Población con terciaria completa (E) · Población sin ciclo básico completo (E)
- **Estudiantes**: Educación pública vs privada (D) · Estudiantes por nivel educativo (B)
- **Jóvenes de 21 a 23 años**: Culminación de la educación media superior (C) · Culminación de media superior por nivel socioeconómico (D)
- **Personas de 25 años o más**: Máximo nivel educativo alcanzado (B) · Nivel educativo por generación (D) · Nivel educativo por sexo (D)
- **Áreas de conocimiento**: Egresados de educación terciaria (B) · Matriculados en educación terciaria (B)

#### Trabajo — 8 entidades · 28 características

- **Departamentos**: No registro a la seguridad social (E) · Tasa de actividad (E) · Tasa de desempleo (E) · Tasa de empleo (E) · Tasa de subempleo (E)
- **Hogares**: Ingreso medio mensual del hogar (A)
- **Personas ocupadas**: Distribución por categoría ocupacional (B) · No registro por categoría ocupacional (B) · Subempleo por categoría ocupacional (B)
- **Personas por nivel educativo**: Informalidad por sexo y nivel educativo (D) · No registro a la seguridad social (B) · Tasas de actividad, desempleo, empleo y subempleo (B ×4)
- **Personas por sexo**: Desempleo por sexo y edad (D) · No registro a la seguridad social (B) · Tasas de actividad, desempleo, empleo y subempleo (B ×4)
- **Personas por tramo de edad**: No registro a la seguridad social (B) · Tasas de actividad, desempleo, empleo y subempleo (B ×4)
- **Sectores de actividad económica**: Participación en el empleo (B)
- **Tipos de ocupación**: Distribución de ocupados (B)

#### Salud — 6 entidades · 17 características

- **Departamentos**: Cobertura ASSE (E) · Cobertura IAMC (E) · Muertes por suicidio (E) · Médicos por 1.000 habitantes (E) · Nuevos diagnósticos de VIH (E)
- **Gasto en salud**: Financiamiento del gasto en salud (B) · Gasto en salud por habitante (C)
- **Niños y niñas menores de 1 año**: Cobertura de vacunación pentavalente (C) · Tasa de mortalidad infantil (C)
- **Personas**: Muertes por suicidio (C) · Nuevos diagnósticos de VIH (C) · Prestador de salud por edad (D) · Prestador integral de salud (B)
- **Prestadores de salud**: Camas de cuidados moderados (B) · Consultas médicas por afiliado (B) · Egresos hospitalarios por 1.000 afiliados (B)
- **Profesionales de la salud**: Cantidad por profesión (B)

#### Economía — 6 entidades · 13 características

- **Energía**: Consumo eléctrico por región (B)
- **Gasto público**: A dónde va el gasto público (B) · En qué se gasta (B) · Ingresos de las empresas del Estado (B) · Ingresos vs egresos del Estado (B)
- **Impuestos**: Qué recauda cada impuesto (B)
- **Precios**: Inflación anual IPC (C) · Inflación por rubro (B) · Inflación Montevideo vs Interior (D) · Precio de la nafta Súper 95 (C)
- **Producción nacional**: PIB por industria (B)
- **Visitantes**: Motivo de la visita (D) · Visitantes por nacionalidad (B)

#### Seguridad — 4 entidades · 12 características

- **Delitos**: Denuncias contra la propiedad (D) · Procesamientos por tipo de delito (B)
- **Departamentos**: Denuncias de hurtos (E) · Denuncias de rapiñas (E) · Fallecidos en siniestros de tránsito (E) · Tasa de feminicidios (E)
- **Siniestros de tránsito**: Siniestros de tránsito por año (C)
- **Violencia de género**: Edad de las víctimas (B) · Femicidios (A) · Feminicidios por año (C) · Medio utilizado (B) · Relación del feminicida con la víctima (B)

### Features — qué quedó implementado

| Feature | Estado | Detalle |
| --- | --- | --- |
| Home interactivo | ✅ | Ciudad isométrica en pixel art real (mosaico c6); click en edificio → grayscale + puntos de color convergen por las calles (pathfinding con Dijkstra) → overlay de temática. Palacio Legislativo iza la bandera uruguaya pixel y ofrece "dato al azar". Ventanas que titilan, personas grises deambulando (interactivas), destellos, notas adhesivas. |
| Explorador de datos | ✅ | `/interactivo` con estado 100% en la URL (compartible). Selector de temáticas → grilla de entidades (ícono pixel único por entidad) → pestañas de características → visualización. Navegación por teclado (←/→/Escape) y breadcrumb. |
| Visualizaciones A–E | ✅ | 12 componentes (ver §3), con isotype de sprites para todo dato de personas. |
| **Chatbot** | ✅ | Asistente de datos flotante (botón arrastrable con memoria de posición). Acotado EXCLUSIVAMENTE a los 83 datasets: RAG-lite local + Gemini 2.5 Flash vía proxy; prohibido inventar números; responde con link interno a la visualización; líneas de apoyo en temas sensibles. |
| **Compartir en redes** | ✅ | Historias 1080×1920 dibujadas en canvas (titular "URUGUAY EN NÚMEROS", multitud isotype, fuente, marca) para estadísticas de personas y mapas. Descarga directa + Web Share nativo (HTTPS). *Pendiente fase 2: layouts para devices no-persona (monedas, torres).* |
| **Feedback** | ✅ | Formulario en `/nosotros` (card "Dejanos tu feedback") que arma un mail — sin backend, por decisión de alcance. |
| **Responsive** | ✅ | Mobile completo (mapa arriba + temáticas como botones con barra de carga, overlays fullscreen, densidades de sprites reducidas, tablas y selectores adaptados) + breakpoint `short:` para desktops de poca altura (ej. 1024×600). Regla transversal: todas las opciones siempre legibles; sin scroll cuando el contenido entra, con scroll cuando no. |
| Bienvenida/loader | ✅ | Pantalla negra "Bienvenido a Pica" + slogan + bandera; precarga el landscape (mín. 2 s, tope 6 s); solo en la primera carga real. |
| Analytics | ✅ | Vercel Web Analytics (pageviews, privacy-friendly). |
| Artículos del Home | 🟡 | Sección editorial maquetada (cards con portada, hover, botón) pero con **contenido placeholder** — las lecturas narrativas reales quedaron fuera del alcance. |
| Textos de Nosotros | 🟡 | Estructura y diseño finales; la redacción actual es borrador asistido por IA — **pendiente reescritura personal del autor**. |

---

## 2. Datos

**83 datasets** · por tipo: **A** 2 · **B** 43 · **C** 10 · **D** 10 · **E** 18 ·
20 marcados `personas: true` (isotype forzado).

### Principios

- **Nunca se inventa un número.** Cada valor sale de una celda real de un
  cuadro oficial descargado (los generadores en `scripts/` leen los archivos
  fuente con lookup por etiqueta y **aserciones de consistencia**: suma de
  departamentos = total del cuadro, PIB = industrias + impuestos netos, etc.).
  Las únicas operaciones permitidas son sumas/redondeos declarados en la
  `descripcion` del dataset.
- **Trazabilidad**: los archivos fuente originales viven en
  `anexos/datos-fuente/` (con manifiesto e índice de los 268 cuadros del
  Anuario INE 2025); `pnpm audit-data` verifica formato de fuentes y
  consistencia (estado actual: **0 errores, 0 warnings**).
- **Fuentes de sociedad civil declaradas como tales** (Feminicidio Uruguay),
  con la explicación de por qué pueden diferir de las cifras oficiales.
- **Datos sensibles**: tratamiento sobrio, sin nombres; línea de apoyo en
  violencia de género (0800 4141 / *4141) y prevención del suicidio
  (0800 0767 / *0767, verificada en ASSE) presentes en descripciones y chatbot.

### Tabla completa de datasets

| Dataset | Temática | Entidad | Característica | Tipo | Año | Fuente |
|---|---|---|---|---|---|---|
| `aprobacion-media-basica-por-departamento` | Educación | Departamentos | Aprobación en Media Básica | E | 2024 | INE — Anuario 2025, cuadro 3.1.8 (MEC-ANEP) |
| `aprobacion-media-superior-por-departamento` | Educación | Departamentos | Aprobación en Media Superior | E | 2024 | INE — Anuario 2025, cuadro 3.1.12 (MEC-ANEP) |
| `sin-ciclo-basico-por-departamento` | Educación | Departamentos | Población sin ciclo básico completo | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `terciaria-por-departamento` | Educación | Departamentos | Población con terciaria completa | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `estudiantes-por-nivel` | Educación | Estudiantes | Estudiantes por nivel educativo | B | 2023 | INE — Anuario 2025, cuadros 3.1.1/3.1.2/3.1.5/3.1.10 (MEC) |
| `estudiantes-publico-privado` | Educación | Estudiantes | Educación pública vs privada | D | 2023 | INE — Anuario 2025, cuadros 3.1.2/3.1.5/3.1.10 (MEC) |
| `egreso-media-superior` | Educación | Jóvenes de 21 a 23 años | Culminación de la educación media superior | C | 2025 | [INEEd — Mirador Educativo (ECH)](https://mirador.ineed.edu.uy/indicadores/tasa-de-egreso-de-educacion-media-superior-entre-jovenes-de-21-a-23-anos-8-2.html) |
| `egreso-por-nivel-socioeconomico` | Educación | Jóvenes de 21 a 23 años | Culminación por nivel socioeconómico | D | 2025 | [INEEd — Mirador Educativo (ECH)](https://mirador.ineed.edu.uy/indicadores/tasa-de-egreso-de-educacion-media-superior-entre-jovenes-de-21-a-23-anos-8-2.html) |
| `nivel-educativo` | Educación | Personas de 25 años o más | Máximo nivel educativo alcanzado | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `nivel-por-generacion` | Educación | Personas de 25 años o más | Nivel educativo por generación | D | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `nivel-por-sexo` | Educación | Personas de 25 años o más | Nivel educativo por sexo | D | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `egresados-terciaria-por-area` | Educación | Áreas de conocimiento | Egresados de educación terciaria | B | 2024 | INE — Anuario 2025, cuadro 3.1.13 (MEC) |
| `matriculados-terciaria-por-area` | Educación | Áreas de conocimiento | Matriculados en educación terciaria | B | 2024 | INE — Anuario 2025, cuadro 3.1.13 (MEC) |
| `actividad-por-departamento` | Trabajo | Departamentos | Tasa de actividad | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `desempleo-por-departamento` | Trabajo | Departamentos | Tasa de desempleo | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `empleo-por-departamento` | Trabajo | Departamentos | Tasa de empleo | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `informalidad-por-departamento` | Trabajo | Departamentos | No registro a la seguridad social | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `subempleo-por-departamento` | Trabajo | Departamentos | Tasa de subempleo | E | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `ingreso-medio-hogares` | Trabajo | Hogares | Ingreso medio mensual del hogar | A | 2024 | [INE — ECH, 4º trimestre 2024](https://www.gub.uy/instituto-nacional-estadistica/tematica/ingreso-personas-hogares) |
| `informalidad-por-categoria` | Trabajo | Personas ocupadas | No registro por categoría ocupacional | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `ocupados-por-categoria` | Trabajo | Personas ocupadas | Distribución por categoría ocupacional | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `subempleo-por-categoria` | Trabajo | Personas ocupadas | Subempleo por categoría ocupacional | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `actividad-por-nivel-educativo` | Trabajo | Personas por nivel educativo | Tasa de actividad | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `desempleo-por-nivel-educativo` | Trabajo | Personas por nivel educativo | Tasa de desempleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `empleo-por-nivel-educativo` | Trabajo | Personas por nivel educativo | Tasa de empleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `informalidad-por-nivel-educativo` | Trabajo | Personas por nivel educativo | No registro a la seguridad social | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `informalidad-sexo-nivel` | Trabajo | Personas por nivel educativo | Informalidad por sexo y nivel educativo | D | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `subempleo-por-nivel-educativo` | Trabajo | Personas por nivel educativo | Tasa de subempleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `actividad-por-sexo` | Trabajo | Personas por sexo | Tasa de actividad | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `desempleo-por-sexo` | Trabajo | Personas por sexo | Tasa de desempleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `desempleo-sexo-edad` | Trabajo | Personas por sexo | Desempleo por sexo y edad | D | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `empleo-por-sexo` | Trabajo | Personas por sexo | Tasa de empleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `informalidad-por-sexo` | Trabajo | Personas por sexo | No registro a la seguridad social | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `subempleo-por-sexo` | Trabajo | Personas por sexo | Tasa de subempleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `actividad-por-edad` | Trabajo | Personas por tramo de edad | Tasa de actividad | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `desempleo-por-edad` | Trabajo | Personas por tramo de edad | Tasa de desempleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `empleo-por-edad` | Trabajo | Personas por tramo de edad | Tasa de empleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `informalidad-por-edad` | Trabajo | Personas por tramo de edad | No registro a la seguridad social | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `subempleo-por-edad` | Trabajo | Personas por tramo de edad | Tasa de subempleo | B | 2024 | [INE — ECH enero 2024 (microdatos)](https://www4.ine.gub.uy/Anda5/index.php/catalog/767) |
| `ocupados-por-sector` | Trabajo | Sectores de actividad económica | Participación en el empleo | B | 2024 | INE — Anuario 2025, cuadro 3.4.7 (ECH, CIIU Rev. 4) |
| `ocupados-por-tipo-ocupacion` | Trabajo | Tipos de ocupación | Distribución de ocupados | B | 2024 | INE — Anuario 2025, cuadro 3.4.8 (ECH, CIUO 08) |
| `cobertura-asse-por-departamento` | Salud | Departamentos | Cobertura ASSE (pública) | E | 2024 | INE — Anuario 2025, cuadro 3.2.4 (SINADI-AES, MSP) |
| `cobertura-iamc-por-departamento` | Salud | Departamentos | Cobertura IAMC (mutualista) | E | 2024 | INE — Anuario 2025, cuadro 3.2.4 (SINADI-AES, MSP) |
| `medicos-por-departamento` | Salud | Departamentos | Médicos por 1.000 habitantes | E | 2024 | INE — Anuario 2025, cuadros 3.2.1 y 2.1.1 |
| `suicidios-por-departamento` | Salud | Departamentos | Muertes por suicidio | E | 2024 | INE — Anuario 2025, cuadro 3.2.7 (MSP) |
| `vih-por-departamento` | Salud | Departamentos | Nuevos diagnósticos de VIH | E | 2024 | INE — Anuario 2025, cuadro 3.2.6 (MSP) |
| `financiamiento-salud` | Salud | Gasto en salud | Financiamiento del gasto en salud | B | 2023 | INE — Anuario 2025, cuadro 3.2.8 (MSP — Área Económica de la Salud) |
| `gasto-salud-por-habitante` | Salud | Gasto en salud | Gasto en salud por habitante | C | 2023 | INE — Anuario 2025, cuadro 3.2.8 (MSP — Área Económica de la Salud) |
| `mortalidad-infantil` | Salud | Niños y niñas menores de 1 año | Tasa de mortalidad infantil | C | 2024 | [MSP — Estadísticas Vitales 2024 (2024 preliminar)](https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/documentos/noticias/MSP_PRESENTACION_ESTADISTICAS_VITALES.pdf) |
| `vacunacion` | Salud | Niños y niñas menores de 1 año | Cobertura de vacunación pentavalente (3ª dosis) | C | 2023 | [MSP — Desempeño del PAI (oct. 2024)](https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/documentos/publicaciones/Coberturas%202024%20-%20INFORME%20FINAL.pdf) |
| `cobertura-por-edad` | Salud | Personas | Prestador de salud por edad | D | 2024 | INE — Anuario 2025, cuadro 3.2.3 (SINADI-AES, MSP) |
| `cobertura-salud` | Salud | Personas | Prestador integral de salud | B | 2024 | INE — Anuario 2025, cuadro 3.2.3 (SINADI-AES, MSP) |
| `suicidios-por-anio` | Salud | Personas | Muertes por suicidio | C | 2024 | INE — Anuario 2025, cuadro 3.2.7 (MSP) |
| `vih-diagnosticos-por-anio` | Salud | Personas | Nuevos diagnósticos de VIH | C | 2024 | INE — Anuario 2025, cuadro 3.2.6 (MSP) |
| `camas-por-prestador` | Salud | Prestadores de salud | Camas de cuidados moderados | B | 2024 | INE — Anuario 2025, cuadro 3.2.5 (MSP-SINADI) |
| `consultas-por-afiliado` | Salud | Prestadores de salud | Consultas médicas por afiliado | B | 2024 | INE — Anuario 2025, cuadro 3.2.5 (MSP-SINADI) |
| `egresos-hospitalarios` | Salud | Prestadores de salud | Egresos hospitalarios por 1.000 afiliados | B | 2024 | INE — Anuario 2025, cuadro 3.2.5 (MSP-SINADI) |
| `profesionales-por-profesion` | Salud | Profesionales de la salud | Cantidad por profesión | B | 2024 | INE — Anuario 2025, cuadro 3.2.1 (CJPPU) |
| `consumo-electrico-por-region` | Economía | Energía | Consumo eléctrico por región | B | 2024 | INE — Anuario 2025, cuadro 4.5.15 (UTE) |
| `gasto-por-area-programatica` | Economía | Gasto público | A dónde va el gasto público | B | 2024 | INE — Anuario 2025, cuadro 6.1.8 (CGN) |
| `gasto-por-clasificacion` | Economía | Gasto público | En qué se gasta | B | 2024 | INE — Anuario 2025, cuadro 6.1.7 (CGN) |
| `ingresos-egresos-gobierno` | Economía | Gasto público | Ingresos vs egresos del Estado | B | 2024 | INE — Anuario 2025, cuadro 6.1.2 (MEF) |
| `ingresos-empresas-estado` | Economía | Gasto público | Ingresos de las empresas del Estado | B | 2024 | INE — Anuario 2025, cuadro 6.1.11 (empresas públicas) |
| `recaudacion-por-impuesto` | Economía | Impuestos | Qué recauda cada impuesto | B | 2024 | INE — Anuario 2025, cuadro 6.1.5 (MEF) |
| `inflacion-anual` | Economía | Precios | Inflación anual (IPC) | C | 2024 | INE — Anuario 2025, cuadro 9.1.1 (IPC) |
| `ipc-montevideo-interior` | Economía | Precios | Inflación: Montevideo vs Interior | D | 2024 | INE — Anuario 2025, cuadros 9.1.3 y 9.1.4 |
| `ipc-por-division` | Economía | Precios | Inflación por rubro | B | 2024 | INE — Anuario 2025, cuadro 9.1.2 (IPC por divisiones) |
| `precio-nafta-super` | Economía | Precios | Precio de la nafta Súper 95 | C | 2025 | INE — Anuario 2025, cuadro 9.1.8 (MIEM) |
| `pib-por-industria` | Economía | Producción nacional | PIB por industria | B | 2024 | INE — Anuario 2025, cuadro 8.1.3 (BCU) |
| `visitantes-por-motivo` | Economía | Visitantes | Motivo de la visita | D | 2024 | INE — Anuario 2025, cuadro 4.8.2 (Ministerio de Turismo) |
| `visitantes-por-nacionalidad` | Economía | Visitantes | Visitantes por nacionalidad | B | 2024 | INE — Anuario 2025, cuadro 4.8.1 (Ministerio de Turismo) |
| `denuncias-propiedad-por-tipo` | Seguridad | Delitos | Denuncias contra la propiedad | D | 2024 | INE — Anuario 2025, cuadro 3.6.13 (Ministerio del Interior) |
| `procesamientos-por-delito` | Seguridad | Delitos | Procesamientos por tipo de delito | B | 2024 | INE — Anuario 2025, cuadro 3.6.4 (Poder Judicial) |
| `fallecidos-transito-por-departamento` | Seguridad | Departamentos | Fallecidos en siniestros de tránsito | E | 2024 | INE — Anuario 2025, cuadro 3.10.1 (UNASEV) |
| `feminicidios-tasa-departamento` | Seguridad | Departamentos | Tasa de feminicidios | E | 2025 | [Feminicidio Uruguay — registro de la sociedad civil](https://docs.google.com/spreadsheets/d/1PO6wDzI1pCV7q3vTey7aJHRb1d4nVMs9eW21L3R2aPs/edit) |
| `hurtos-por-departamento` | Seguridad | Departamentos | Denuncias de hurtos | E | 2024 | INE — Anuario 2025, cuadro 3.6.13 (Ministerio del Interior) |
| `rapinas-por-departamento` | Seguridad | Departamentos | Denuncias de rapiñas | E | 2024 | INE — Anuario 2025, cuadro 3.6.13 (Ministerio del Interior) |
| `siniestros-transito` | Seguridad | Siniestros de tránsito | Siniestros de tránsito por año | C | 2024 | INE — Anuario 2025, cuadro 3.10.2 (UNASEV) |
| `femicidios` | Seguridad | Violencia de género | Femicidios | A | 2023 | [Observatorio de Violencia de Género (Inmujeres–MIDES, M. Interior, Fiscalía)](https://www.gub.uy/observatorio-violencia-genero) |
| `feminicidio-arma` | Seguridad | Violencia de género | Medio utilizado | B | 2025 | [Feminicidio Uruguay — registro de la sociedad civil](https://docs.google.com/spreadsheets/d/1PO6wDzI1pCV7q3vTey7aJHRb1d4nVMs9eW21L3R2aPs/edit) |
| `feminicidio-edad-victimas` | Seguridad | Violencia de género | Edad de las víctimas | B | 2025 | [Feminicidio Uruguay — registro de la sociedad civil](https://docs.google.com/spreadsheets/d/1PO6wDzI1pCV7q3vTey7aJHRb1d4nVMs9eW21L3R2aPs/edit) |
| `feminicidio-relacion` | Seguridad | Violencia de género | Relación del feminicida con la víctima | B | 2025 | [Feminicidio Uruguay — registro de la sociedad civil](https://docs.google.com/spreadsheets/d/1PO6wDzI1pCV7q3vTey7aJHRb1d4nVMs9eW21L3R2aPs/edit) |

*(Los datasets del Anuario citan cuadro exacto; el archivo fuente descargado
está en `anexos/datos-fuente/datos_INE_2025/` con índice de trazabilidad.)*

### Pendientes y descartes (con su razón)

| Dato | Estado | Razón |
| --- | --- | --- |
| Registro de cambios de **tasas** de impuestos | ❌ descartado | No existe como estadística oficial — es normativa (DGI/MEF/IMPO); armarlo a mano contradice la regla de no aproximar. La recaudación por impuesto (6.1.5) es el proxy honesto. |
| Niños sin acceso a educación | ❌ descartado | Decisión editorial del autor durante la expansión. |
| Feminicidio Uruguay: denuncias previas, intentos, varones vinculados | ❌ descartados | Calidad insuficiente: 78 % sin dato en denuncias previas, subregistro reconocido en intentos, n=22 en varones vinculados. |
| Mortalidad por departamento | ⏳ pendiente | La fuente oficial (uins.msp.gub.uy / otu.opp.gub.uy) estaba en mantenimiento al momento del desarrollo. |
| Serie anual oficial de empleo/desempleo | ⏳ pendiente | El dataset provisorio de la etapa inicial se retiró; queda incorporar la serie oficial del INE. |
| Los datasets provisorios de la etapa inicial | ✅ resueltos | Reemplazados por microdatos reales de la ECH (enero 2024, ponderador W) o retirados. Solo `mortalidad-infantil` declara "2024 preliminar" — estado del propio MSP. |

---

## 3. Visualizaciones

### Los cinco tipos de resultado

| Tipo | Dispositivo | Componente(s) |
| --- | --- | --- |
| **A** — Escalar | Número grande con count-up + multitud de sprites de contexto | `ScalarViz` |
| **B** — Distribución | **Isotype de multitud** (personas) · monedas/glifos de dominio · grilla de íconos · per-cápita · barras/lista (no-personas) | `IsotypeDistributionViz`, `IsotypeGlyphViz`, `IconGridViz`, `PerCapitaViz`, `DistributionViz` |
| **C** — Serie temporal | **Isotype por período** con rail de años (personas) · **torres de bloques pixel** (no-personas) | `IsotypeTimeSeriesViz`, `PixelBarsViz` |
| **D** — Matriz | **Isotype segmentado** con leyenda clickeable (personas) · heatmap con contraste por luminancia (no-personas) | `IsotypeMatrixViz`, `MatrixViz` |
| **E** — Espacial | Mapa coroplético de los 19 departamentos + paneles comparadores (multitud si es de personas) | `MapViz` |

### Confirmación isotype: B/C/D usan sprites en movimiento, no D3

**Sí — es la regla central del proyecto**: todo dato que involucra personas
(por nombre de entidad o `personas: true`) se representa con **sprites pixel
de personas que caminan** hasta formar la figura, dibujados en **Canvas 2D
propio** — no hay gráficas D3 para personas. D3 se usa solo como biblioteca
de apoyo (escalas e interpolación de color) en los dispositivos no-humanos:
heatmap de matrices, coropletas del mapa. La única gráfica "clásica" que
existió (línea D3 para series de precios) **fue eliminada** y reemplazada por
torres de bloques pixel (`PixelBarsViz`), por decisión estética del autor.

Reglas de escala del isotype (en `src/lib/isotype.ts`):

- Objetivo ~800 figuras para distribuciones/matrices, ~250 por período en
  series; escalas "lindas" (1/2/5 × 10^k) vía `niceClosest`.
- **En conteos absolutos de personas jamás se dibujan más figuras que casos**
  (escala mínima: 1 figura = 1 caso) — ej.: 23 femicidios son 23 figuras.
- Toda multitud lleva su etiqueta de escala ("1 figura = 5.000 personas").

### Sistema de sprites y palette swap

- **Spritesheet**: personajes pixel en frames de 17×43 px (contenido real
  9×17 con offset), con filas de animación (idle frontal, caminata lateral).
- **Palette swap**: los sprites son monocromos y se **tintan en runtime**:
  `getTintedSheet()` dibuja el sheet en un canvas offscreen, aplica el color
  de la temática/categoría por composición y endurece el alfa
  (`hardenAlpha`) para mantener el borde pixel crisp. Hay **cache de sheets
  tintados por color** — recolorear una multitud existente es instantáneo.
- **`useSpriteWalkers(canvasRef, targets, {scale, layoutKey})`**: mantiene un
  pool de caminantes; cada figura camina hasta su celda objetivo en la grilla
  (llegada escalonada). El enjambre solo se **reconstruye** si cambia
  `layoutKey` (que codifica las dimensiones del layout); si cambian solo los
  colores, se recolorea en caliente sin re-caminar.
- **Decorativos**: `AmbientWalkers` (personas grises deambulando en Home,
  Nosotros y selector — mantené el click y te miran), `WindowTwinkles`
  (ventanas de la ciudad), `PixelSparkles` (destellos determinísticos, sin
  mismatch de hidratación).

---

## 4. Arquitectura

### Flujo de estado

- **`/interactivo` vive 100 % en la URL**: `?tema=&entidad=&caracteristica=`
  (entidad slugificada, característica por id). Navegar reemplaza la URL sin
  recargar (`router.replace`) → **toda vista es compartible por link** y el
  chatbot puede responder con deep-links exactos. Parseo defensivo: valores
  inválidos degradan al nivel anterior.
- **Home**: estado local (`selected` + `overlayOpen`); el overlay abre a los
  2 s del click o cuando la convergencia de puntos termina (lo que ocurra
  primero). Mobile duplica el flujo con botones (misma `handleSelect`).
- **Chat**: historial en memoria del widget; el server es stateless (la
  conversación viaja completa en cada request, capada).
- **Persistencias mínimas**: posición del botón de chat (`localStorage`),
  bienvenida una vez por carga real (flag a nivel de módulo).

### Componentes y responsabilidades

**`components/home/`**
- `CityLandscape` — capas del landscape (fondo + Palacio + 5 edificios), hitboxes poligonales calibradas, hover con destello, selección con grayscale, modo "attract".
- `HomeCanvas` + `hooks/useColorDots` — puntos de color que patrullan las calles (grafo de paths calibrados) y **convergen por Dijkstra** al edificio elegido.
- `ThemeOverlay` / `RandomOverlay` — diálogos de temática y de "dato al azar" (Palacio), con foco gestionado y tinte radial del color.
- `PalacioFlag` + `shared/UruguayFlag` — bandera pixel (27×18, Sol de Mayo) que **se iza** al clickear el Palacio, flameando en canvas; renderizada detrás del edificio.
- `WelcomeScreen` — bienvenida/loader (precarga el landscape).
- `StickyNotes`, `ArticulosDestacados`, `ColorBar`, `WindowTwinkles`, `ThemeCharacter`.
- `PathCalibrator` / `HitboxCalibrator` / `FlagCalibrator` — herramientas dev (teclas P/H/B) para calibrar coordenadas **in-app** (regla: nunca se estiman a ojo); serializan al clipboard el bloque listo para pegar en `lib/assets.ts`.

**`components/interactive/`**
- `InteractiveLayout` — orquestador de los 3 estados de la URL + nav con logo que "vuela" al centro + breadcrumb.
- `EntityGrid` — tarjetas de entidades con ícono pixel único y hover con destello (el patrón de hover de toda la app).
- `CharacteristicExplorer` — pestañas de características + montaje de la viz activa (←/→/Escape).
- `EntityIcon` + `shared/PixelIcon` — mapeo exacto entidad→ícono; 36 grillas pixel 16×16 dibujadas a mano.
- `DataViz/*` — las 12 visualizaciones + `VizRouter` (decide por tipo y regla de personas) + `VizShared` (header con "ver más", tabla de datos desplegable, footer de fuente).
- `ShareStory` + `lib/storyRenderer` — genera la historia 1080×1920 en canvas y dispara descarga/Web Share (blob pregenerado para no perder el user-gesture en iOS).

**`components/chat/`**
- `ChatWidget` — botón flotante **arrastrable** (posición recordada y clampada al viewport) + panel con sugerencias, historial y render seguro de links internos (solo `/interactivo…` se vuelve `<Link>`; nada de HTML crudo).

### Hooks y utilidades principales

| Módulo | Qué resuelve |
| --- | --- |
| `hooks/useSpriteWalkers` | El corazón del isotype: pool de sprites, tintado con cache, caminata a objetivos, reconstrucción por `layoutKey`. |
| `hooks/useColorDots` | Simulación de los puntos del Home: grafo de calles, patrulla, convergencia por Dijkstra. |
| `hooks/useIsMobile` | Breakpoint JS (≤767 px) para densidades y layouts alternativos. |
| `hooks/useCountUp` | Números que cuentan al entrar (población del Home, escalares). |
| `lib/isotype` | Escalas del sistema isotype (`figureScale`, `seriesScale`, `matrixScale`, `niceClosest`, `perLabel` con singularización). |
| `lib/colors` | Temáticas: colores, labels, descripciones, escalas de mapa, contraste (`textOnColor`). |
| `lib/assets` | Rutas de arte + variante del landscape + polígonos de hitbox + ancla de la bandera + logos. |
| `lib/datasets` | Índice AUTO-GENERADO de los 83 JSON, validados con Zod al importar (falla el build si un dato no cumple). |
| `lib/chatCatalog` | RAG-lite del chatbot: índice con sinónimos es-UY, `retrieve()`, bloques compactos con valores reales. |
| `lib/storyRenderer` | Render completo de las historias de compartir (layouts por tipo, mapa con d3-geo, deco por temática). |
| `lib/slug`, `lib/hitbox`, `lib/randomDataset`, `lib/spriteManager` | Slugs de URL · geometría de polígonos · dato al azar · carga del spritesheet. |

---

## 5. Accesibilidad

Medidas concretas implementadas:

- **`prefers-reduced-motion`**: kill-switch global en `globals.css` (toda
  animación/transición a 0.01 ms) + cada componente con animación propia
  (Framer, canvas, CSS) consulta `useReducedMotion`/media query y ofrece
  estado estático (sprites en idle, bandera quieta, destellos invisibles).
- **`prefers-contrast: more`**: tokens de texto se elevan a blanco puro y
  los interactivos ganan outline.
- **Contraste verificado sobre `#0A0A0A`**: `--text-primary` 16,8:1 ·
  `--text-secondary` 5,8:1 · `--text-muted` 3,2:1 (reservado a texto
  grande). En heatmaps, el color de texto de cada celda se calcula por
  **luminancia real** del fondo (negro sobre claro, blanco sobre oscuro).
- **El color nunca es el único indicador**: las celdas de matrices muestran
  su valor, las multitudes llevan etiqueta de escala, el mapa tiene leyenda
  numérica y paneles con el número.
- **Tabla de datos alternativa en TODAS las visualizaciones** (`DataTable`
  en `VizShared`): cerrada no ocupa espacio; abierta se despliega completa
  (sin scroll interno).
- **ARIA**: `role="img"` con `aria-label` descriptivo en todos los canvas y
  SVG de datos; `role="dialog"` + `aria-modal` + foco inicial y devolución
  del foco en overlays; `aria-pressed`/`aria-expanded` en toggles;
  `role="tablist"`/`tab` en características; `sr-only` donde el contexto
  visual no alcanza.
- **Teclado**: Escape cierra overlays y desbloquea entidades; ←/→ cambian
  de característica; `:focus-visible` siempre visible (outline amarillo de
  alto contraste, nunca `outline: none` sin reemplazo).
- **Legibilidad como regla de producto**: mínimos tipográficos subidos a
  18 px tras testing con usuarios; "todas las opciones siempre legibles;
  evitar el scroll, pero si el contenido no entra, scrollear".
- **Datos sensibles**: líneas de apoyo (0800 4141 violencia de género,
  0800 0767 prevención del suicidio — verificada en ASSE) en descripciones
  y respuestas del chatbot.

**Auditoría**: no se corrió una auditoría formal automatizada (Lighthouse/
axe) — queda como pendiente declarado. Las verificaciones fueron manuales:
ratios de contraste calculados y documentados, navegación por teclado y
reduced-motion probadas a mano, y testing con usuarios reales que originó
varias de las medidas (tamaños mínimos, scroll, contraste de heatmaps).

---

## 6. Decisiones técnicas y desvíos

### Decisiones importantes (y por qué)

1. **Isotype propio en Canvas en vez de gráficas D3** — la regla "las
   personas se representan con personas" es la identidad del proyecto; D3
   quedó como utilitario de escalas/colores, nunca como gráfica de personas.
2. **Estado en la URL** (`/interactivo`) — toda vista compartible por link;
   habilitó gratis los deep-links del chatbot y del compartir.
3. **Landscape a pixel art real (mosaico c6)** — el arte original era
   pseudo-pixel sin grilla uniforme ("se notaba que era una imagen"). Script
   propio (`scripts/pixelate-landscape.py`): celda 6 px, color predominante
   por zona, paleta global de 64 colores, **misma grilla en todas las capas**
   → hitboxes/paths en % siguieron válidos sin recalibrar. Bonus: el fondo
   pasó de 5,6 MB a 466 KB (−92 %). Hallazgo documentado: celdas más grandes
   (c8/c10) producen barro, no pixel art — el pixel art "grande" real se
   redibuja, no se reduce.
4. **Coordenadas SIEMPRE calibradas in-app** (P/H/B) — los polígonos de
   hitbox, paths de calles y ancla de la bandera se marcan visualmente sobre
   el landscape y se serializan; nunca se estiman a ojo.
5. **Chatbot con límite duro de 4.000 caracteres en el proxy** → RAG-lite
   local sin costo extra: matching por sinónimos rioplatenses elige 2-3
   datasets y solo esos valores reales entran al prompt, con presupuesto de
   caracteres y recorte gradual. Reglas duras: prohibido citar números fuera
   del contexto, links internos exactos, tono sobrio + líneas de apoyo.
6. **Generadores de datos con aserciones** — cada dataset nuevo sale de un
   script que lee celdas reales y verifica totales; la transcripción manual
   está prohibida.
7. **Escala mínima 1 figura = 1 caso** en conteos absolutos de personas —
   surgió del feedback sobre feminicidios ("nunca más figuras que los casos
   reales") y quedó como regla de todo el sistema.
8. **`short:` como variante de Tailwind (plugin `addVariant`)** para
   desktops de poca altura — la primera implementación como `screen raw`
   rompió el orden de TODAS las variantes `max-*` (el mobile entero murió);
   quedó documentado en el config.
9. **Historias de compartir en canvas puro** con blob pregenerado — el Web
   Share de iOS pierde el user-gesture si el render es async; se pre-genera
   al abrir el diálogo y el click comparte directo. Share nativo solo en
   HTTPS (por eso se prueba en producción).
10. **Assets pixel con `<img>` + `image-rendering: pixelated`** en vez de
    `next/image` — la optimización de Next suaviza y rompe la estética.

### Desvíos respecto al plan original

- **Modo claro descartado** — se investigó (la base ya está tokenizada) pero
  se decidió que la identidad es la base oscura con gradients y
  micro-detalles; no habrá tema blanco.
- **Disolución pixel de bordes del mapa (EdgeDissolve)** — se construyó
  completa (dither animado hacia el fondo) y **se descartó tras probarla**:
  volvió el borde blanco con glow. El código quedó en el historial de git.
- **Línea D3 para series → torres de bloques pixel** y **barras de progreso
  → monedas pixel** en Economía — feedback del autor: "desentonaba con la
  estética"; el lenguaje de unidades discretas (1 bloque/moneda = X) es más
  coherente con el isotype.
- **Cuadro del Anuario con typo** ("Maldonaldo", 3.2.4) — mapeado al nombre
  correcto en el generador.
- **Rivera en el GeoJSON** traía un polígono espurio de GADM — eliminado
  (quedó como polígono simple).
- **Un PSD de 162 MB bloqueó el push a GitHub** — se purgó del historial con
  `git filter-branch` (52 commits reescritos) y `*.psd` entró al
  `.gitignore`; el archivo vive en `anexos/` local.
- **El slogan del compartir** pasó de la idea "wrapped" a **"Uruguay en
  números"** (decisión del autor).

### Limitaciones conocidas y deuda técnica

- **Artículos del Home**: maqueta final con contenido placeholder.
- **Textos de Nosotros**: borrador asistido por IA, pendiente de reescritura
  personal del autor.
- **Compartir fase 2**: los devices no-persona (monedas, torres, heatmaps)
  aún no tienen layout de historia.
- **Chatbot**: depende del proxy estudiantil (saldo/latencia); si el proxy
  cae, el chat degrada a un error amigable (el sitio no se ve afectado). El
  matching de sinónimos es manual — vocabulario muy fuera del catálogo puede
  no recuperar el dataset correcto.
- **Finanzas públicas a valores corrientes** — declarado en cada
  descripción; para series largas habría que deflactar.
- **El comparador del mapa es hover-only** (desktop); en mobile se muestra
  solo el departamento seleccionado.
- **Sin tests automatizados de UI** — la red de seguridad es typecheck +
  lint + validación Zod en build + auditoría de datos + probes manuales.
- **`/interactivo` es client-side** (usa `useSearchParams`) — el HTML inicial
  es un fallback; irrelevante para una app exploratoria, pero es una
  limitación de SEO conocida.
- **Feedback por `mailto:`** — sin backend de formularios, por alcance.

---

## 7. Performance y deploy

### Métricas del build de producción (Next 14, 20/7/2026)

| Ruta | Tamaño página | First Load JS |
| --- | --- | --- |
| `/` (Home) | 13,2 kB | **185 kB** |
| `/interactivo` | 79,9 kB | **251 kB** |
| `/nosotros` | 3,9 kB | 144 kB |
| `/api/chat` | — | server-only |
| JS compartido | — | 87,3 kB |

- Las 3 páginas se sirven **estáticas** (prerendered); solo `/api/chat` es
  dinámica.
- **Peso de arte del Home**: el mosaico pixel c6 completo (fondo + 6 capas +
  background) pesa **~1 MB** contra ~12 MB de los originales (el fondo solo:
  5,6 MB → 466 KB, −92 %). Los originales quedan en el repo como respaldo
  pero no se sirven.
- La bienvenida funciona como **loader real**: precarga el landscape antes
  de revelar el Home (mínimo 2 s, tope 6 s).
- 83 datasets JSON viajan dentro del bundle de `/interactivo` (validados en
  build) — es la mayor parte de sus 79,9 kB propios.
- **Lighthouse**: no se corrió una medición formal — pendiente declarado
  (las cifras de arriba son las del build real).

### Deploy

- **Vercel**, deploy automático con cada push a `main` del repo
  [github.com/FacundoSpotti/Pica](https://github.com/FacundoSpotti/Pica).
- **Vercel Web Analytics** activo.
- Variable `GEMINI_PROXY_KEY` configurada en el entorno de producción
  (server-only; nunca llega al cliente ni al repo).
- `anexos/` (datos fuente + diseño, ~360 MB) queda **fuera del deploy** vía
  `.vercelignore`.
- **Dominio**: pendiente de decisión — el pie del sitio dice `PICA.COM.UY`
  pero el dominio no está comprado; hoy se accede por la URL `*.vercel.app`
  del proyecto.

---

*Pica se construyó con datos que pertenecen a sus fuentes: INE, MEC, MSP,
MEF, BCU, Ministerio del Interior, Ministerio de Turismo, UNASEV, INEEd,
CGN, UTE, Poder Judicial, Inmujeres-MIDES y el registro ciudadano
Feminicidio Uruguay. A todas, gracias por publicar.*
