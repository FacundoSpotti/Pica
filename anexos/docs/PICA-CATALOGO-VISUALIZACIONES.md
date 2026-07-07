# Catálogo de visualizaciones — traducción de las infografías del INE a Pica

> Registro técnico generado al analizar las 9 infografías oficiales del *Anuario
> Estadístico Nacional 2025* (INE), una por capítulo, en
> `datos-fuente/infografias/`. Objetivo: que la **ampliación de la base de datos**
> tenga, para cada tipo de dato, una forma correcta de representarlo **acorde a
> los ideales y la estética de Pica** (pixel-art, isotype, color por temática,
> referencia The Pudding). No inventa datos ni cambia código todavía; define el
> vocabulario visual a implementar.

---

## Hallazgo estratégico

Las infografías del INE **validan la tesis central de Pica**: la estadística
oficial uruguaya ya se comunica con **pictogramas / isotype** (paraguas, madres,
siluetas, botellas, rayos, mapas-país) y con **una paleta monocromática por
capítulo**. Casi no usan gráficas abstractas: las barras tradicionales aparecen
**solo** en Actividad Financiera (cap. 5) y Precios (cap. 9), es decir cuando el
dato es dinero/precio y no personas — exactamente la regla de Pica
([[pica-viz-isotype]]): isotype para personas, gráfica abstracta permitida solo
para lo no-humano.

La diferencia a mantener: el INE asigna **un color por capítulo**; Pica asigna
**un color por temática** (`TEMA_COLOR`: educación azul, salud verde, trabajo
amarillo, economía naranja, seguridad rojo). Al portar cualquier recurso del INE
se recolorea a la temática de Pica, no se copia el verde/violeta/rojo del INE.

---

## Principios que todo device debe respetar

1. **Isotype primero** cuando el dato es de personas: figuras individuales (los
   24 sprites del Home) que **caminan** a su grilla; D3 solo calcula posiciones.
   `VizRouter` ya bifurca por `isPersonEntity(entidad)`.
2. **Glifo de dominio** cuando el dato NO es de personas pero sí contable en
   unidades (litros, rayos de energía, paraguas): mismo principio isotype pero la
   unidad repetida es un ícono pixel del dominio, no una barra.
3. **Gráfica abstracta** (barras/columnas/línea con estética pixel) permitida
   solo para magnitudes monetarias o índices (pesos, dólares, IPC, tasas).
4. **Color por temática**, no por capítulo. Categorías con `TEMA_PALETTE`
   (familias distintas), intensidades con `TEMA_SCALE`, filas de matriz apagadas
   hacia `#0A0A0A`.
5. Siempre **escala explícita** ("1 figura = X"), **título + bajada + tabla
   alternativa**, y **`prefers-reduced-motion`** = aparición directa sin caminata.
6. **Trazabilidad**: cada dato cita su cuadro en `fuente`/`fuenteUrl`
   (ver `datos-fuente/datos_INE_2025/INDICE.md`). Ningún número se inventa.

---

## A. Devices que ya mapean a los tipos A–E de Pica

| # | Qué hace el INE (dónde) | Adaptación Pica | Tipo / componente | Tecnología | Cuadros de ejemplo |
|---|---|---|---|---|---|
| A1 | **Tarjeta de número grande con ícono** de dominio (temp., pesca, tasas, deuda) — caps. 1,4,5,7 | Número hero en pixel + ícono pixel de la temática; sin decoración ajena | Tipo **A** · `ScalarViz` | Componente actual; ícono desde `EntityIcon` | 3.4.18 salario mínimo · 3.2.5 producción asistencial |
| A2 | **Número + trío de años** (2022/2023/2024) en una tarjeta — caps. 1,2,4 | A con mini-serie: valor grande del último año + sparkline/tres hitos pixel | Tipo **A**/**C** · extender `ScalarViz` con `serie` corta | Framer Motion para el conteo; D3 solo para el mini-eje | 3.4.14 ingreso hogares · 2.3.1 nacimientos |
| B1 | **Barras horizontales rankeadas %** (ascendencia étnica) — cap. 2 | Si es de personas → isotype; si no → barras pixel horizontales con `TEMA_PALETTE` | Tipo **B** · `IsotypeDistributionViz` / `DistributionViz` | canvas sprites o rects pixel | 2.1.4 ascendencia · 3.4.7 ocupados por sector |
| B2 | **Lista rankeada con valor** + ícono de entidad (boletos por tipo, vino por país) — caps. 4,7 | Lista pixel: fila = barra proporcional + etiqueta + valor, ordenada; ícono de entidad al frente | Tipo **B** variante "lista" · nuevo modo en `DistributionViz` | rects pixel + Framer stagger | 4.7.7 boletos · 7.1.15 vino por país |
| C1 | **Columnas por año** con burbuja de valor (IPC 2014-2024) — cap. 9 | Columnas pixel (dato monetario/índice ⇒ abstracto permitido); burbuja de valor pixel | Tipo **C** · `TimeSeriesViz` | D3 escala + rects; Framer para crecer | 9.1.1 IPC · 3.4.15 índice salarios |
| C2 | **Ícono que se rellena por año** (madre-bebé, botella de leche sombreadas por año) — caps. 2,4 | Para personas: figuras que llenan; para dominio: glifo que se llena por nivel | Tipo **C** · `IsotypeTimeSeriesViz` (+ modo glifo) | canvas máscara de relleno + sprites | 2.3.1 nacimientos · 4.2.12 leche |
| D1 | **Small-multiples de tarjetas con ícono** y par 2023/2024 (IPC por división) — cap. 9 | Grilla de tarjetas pixel, una por categoría, ícono de dominio + dos valores; fila reciente plena, anterior apagada | Tipo **D** · `MatrixViz` (modo tarjetas) | grid CSS + tono apagado vía `interpolateRgb` | 9.1.2 IPC por división · 3.1.8 aprobación por modalidad |
| D2 | **Doble entrada por sexo/área** (condición de actividad H/M) — caps. 2,3 | Matriz isotype: columnas = color de categoría, filas = tonalidades | Tipo **D** · `IsotypeMatrixViz` | ya implementado (patrón validado) | 3.4.4 empleo por sexo/depto · 3.2.2 afiliaciones por sexo |
| E1 | **Mapa coroplético** implícito (datos por departamento en tablas) | Mapa UY pixel con `TEMA_SCALE` (tono 100→600) | Tipo **E** · `MapViz` | `react-simple-maps` + escala | 3.4.3 tasas por depto · 3.2.4 afiliaciones por depto · 3.2.7 suicidios |

---

## B. Devices NUEVOS a incorporar al vocabulario de Pica

Estos aparecen en las infografías y **no** tienen equivalente directo en A–E. Son
los de mayor valor para la expansión: cubren datos que hoy no sabríamos
representar sin traicionar el estilo.

> **Estado:** ✅ implementados y enrutados **N1** (`IsotypeGlyphViz`), **N5**
> (`IconGridViz`) y **B2** (modo `lista` en `DistributionViz`). Se activan por
> campos opcionales del Tipo B (`glifo`, `presentacion: 'grilla' | 'lista'`,
> `categorias[].icono`, `categorias[].tema`) — ver `src/schemas/base.ts` y
> `VizRouter`. Faltan alimentarlos con cuadros reales. N2, N3, N4, N6, N7, N8
> quedan pendientes.

### N1 · Isotype de **glifo de dominio** (no-personas contables)
- **INE:** paraguas por estación (cap. 1), rayos = unidades de energía (cap. 4),
  botellas de leche (cap. 4), surtidores de nafta (cap. 9).
- **Pica:** misma mecánica isotype (unidades que entran/caminan) pero el sprite
  es un **ícono pixel del dominio** (paraguas, rayo, gota, res). "1 rayo = X GWh".
- **Tecnología:** reutilizar `useSpriteWalkers`/`IsotypeDistributionViz`
  parametrizando el pool de sprites con glifos pixel nuevos (set Pixel de
  Streamline, ya recomendado) en vez de personas. Alfa endurecido igual.
- **Sirve a:** energía (4.5.x), pesca (4.3.x), ganado (4.2.9), precipitaciones
  (1.x) — la futura temática **Economía/Ambiente**.

### N2 · **Indicador orbital / gauge** (radial callouts)
- **INE:** mujer embarazada con natalidad y mortalidad orbitando (cap. 2);
  círculo-total con satélites (deuda por sector, cap. 7).
- **Pica:** un ícono/figura central pixel con 2–4 "satélites" de valor que se
  despliegan con spring; anillo de progreso pixelado para tasas (o/oo, %).
- **Tecnología:** nuevo `OrbitalStatViz` (variante rica de Tipo A). SVG/rects
  pixel + Framer Motion (stiffness ~110, como el vuelo del logo).
- **Sirve a:** tasas demográficas (2.x), indicadores socioeconómicos (3.4.2).

### N3 · **Rellenar una silueta** (proporción sobre un contorno)
- **INE:** silueta de persona que se llena según el valor (matrimonios/divorcios,
  cap. 2).
- **Pica:** contorno pixel (persona, casa, edificio) con relleno proporcional
  tintado a la temática; el "vacío" en gris `#4E4E48` (mismo contraste que Tipo C).
- **Tecnología:** máscara canvas o `clip-path` sobre PNG pixel; Framer para el
  nivel. Variante de Tipo A/B de 1 sola magnitud.
- **Sirve a:** cobertura (% con cierto atributo), vivienda (3.3.x tenencia).

### N4 · **Balanza / metáfora comparativa de dos platos**
- **INE:** balanza ingresos vs egresos → resultado (cap. 6).
- **Pica:** dos columnas/platos pixel que se inclinan según la diferencia; el
  saldo resaltado. Narrativa clara para pares opuestos.
- **Tecnología:** nuevo `BalanceViz` (Tipo A comparativo, 2 valores + delta).
  Solo para magnitudes abstractas (dinero). Framer para la inclinación.
- **Sirve a:** finanzas públicas (6.1.x), balanza comercial (7.1.6), déficit.

### N5 · **Grilla-matriz de íconos de categorías** (con celdas destacadas)
- **INE:** 21 áreas de gasto, cada una ícono de línea + número; celdas de
  Educación/Salud/Seguridad resaltadas (cap. 6). Card de recaudación con lista
  itemizada y total (cap. 6).
- **Pica:** grilla pixel de categorías con ícono + valor; las celdas que
  corresponden a **temáticas de Pica se tintan con su `TEMA_COLOR`** (auto-enlace
  visual entre el presupuesto y las secciones del sitio). Ordenable por valor.
- **Tecnología:** nuevo `IconGridViz` (Tipo B con muchas categorías + íconos).
  Grid CSS + `EntityIcon`/glifos pixel + `TEMA_COLOR` para el highlight.
- **Sirve a:** gasto por área (6.1.8), afiliaciones por prestador, delitos por
  tipo (3.6.x).

### N6 · **Isotype geográfico de otros países** (comercio exterior)
- **INE:** siluetas-mapa de China, UE, Rusia, Israel dimensionadas/etiquetadas por
  monto (exportación de carne, cap. 7).
- **Pica:** siluetas pixel de países/regiones como "isotype geográfico",
  tamaño/valor por monto, color temática economía. Distinto de Tipo E (que es UY
  interno).
- **Tecnología:** nuevo `GeoIsotypeViz`; paths simplificados de países
  (topojson reducido) rasterizados a estética pixel.
- **Sirve a:** exportaciones/importaciones por destino (7.1.x) — temática
  **Economía**.

### N7 · **Tarjeta editorial / "pizarrón" explicativo**
- **INE:** pizarrón manuscrito que define el PIB antes de los datos (cap. 8).
- **Pica:** tarjeta de intro por temática/indicador — define el concepto en
  lenguaje llano con estética pixel (no un chart, una **entrada narrativa** al
  estilo The Pudding). Refuerza el tono divulgativo.
- **Tecnología:** componente de contenido (no viz); MDX/JSX + tipografía pixel.
  Encaja como cabecera de cada `CharacteristicExplorer`.
- **Sirve a:** todas — sobre todo conceptos densos (PIB, informalidad, IPC).

### N8 · **Tabla-dato con marca de agua ilustrada**
- **INE:** tablas con ícono/ilustración tenue de fondo (temperaturas, vino, PIB
  por CIIU) — cap. 1,7,8.
- **Pica:** cuando el dato es una matriz densa que **no** conviene isotipar
  (muchas filas × años), tabla pixel legible con watermark del ícono de dominio.
  Es el fallback honesto; mantiene estética sin forzar figuras.
- **Tecnología:** extender la **tabla alternativa** que ya acompaña cada viz para
  que pueda ser la vista principal en datos tipo D muy grandes.
- **Sirve a:** PIB por industria (8.1.3), series largas multi-columna.

---

## C. Prioridad de implementación (atada a la expansión de datos)

| Prioridad | Device | Por qué ahora | Desbloquea |
|---|---|---|---|
| 1 | **N1 glifo de dominio** | Abre todo lo no-humano sin romper estilo | Economía, energía, ambiente |
| 2 | **N5 grilla de íconos** | Categorías numerosas (gasto, delitos, prestadores) | Salud, Seguridad, Economía |
| 3 | **B2 lista rankeada** | Patrón simple y muy frecuente en el Anuario | Trabajo, Economía |
| 4 | **N2 orbital / N3 silueta** | Enriquecen Tipo A (hoy muy plano) | Población, cobertura |
| 5 | **N4 balanza · N6 geo-isotype · N7 pizarrón** | Habilitan la temática Economía completa | Economía, Sector externo |

Los devices A1–E1 ya tienen componente; solo requieren pequeñas variantes
(A2 serie corta, B2 modo lista, D1 modo tarjetas).

---

## D. Nota de recoloreo INE → Pica

| Capítulo INE (color) | Temática Pica (color) al portar |
|---|---|
| 3 Aspectos Sociales · 3.1 (azul) | Educación → azul `TEMA_COLOR.educacion` |
| 3.2 (azul) | Salud → verde `TEMA_COLOR.salud` |
| 3.4 (azul) | Trabajo → amarillo `TEMA_COLOR.trabajo` |
| 4/5/8/9 (violeta/magenta/rojo/naranja) | Economía → naranja `TEMA_COLOR.economia` |
| 3.6 / 3.10 (azul) | Seguridad → rojo `TEMA_COLOR.seguridad` |

Nunca se copia el color del INE; se traduce a la temática correspondiente para
mantener la coherencia cromática del sitio (`ColorBar`, overlays, sprites).

---

*Fuente de las infografías: INE, Anuario Estadístico Nacional 2025 —
`datos-fuente/infografias/Infografía capítulo 1..9.jpg`. Cuadros citados en
`datos-fuente/datos_INE_2025/INDICE.md`.*
