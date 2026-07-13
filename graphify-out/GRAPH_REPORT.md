# Graph Report - C:/Users/facus/Desktop/PROYECTOS/Pica/src  (2026-07-13)

## Corpus Check
- 122 files · ~50,148 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 337 nodes · 897 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.81)
- Token cost: 43,580 input · 0 output

## Community Hubs (Navigation)
- Visores de datos (DataViz)
- Navegacion, home y tematicas
- Sprites y multitudes
- Home: landscape y assets
- Visualizaciones isotype
- Renderer de historias (compartir)
- Documentacion de datos
- Puntos de color y calles
- Calibracion de hitboxes
- Notas y contador animado

## God Nodes (most connected - your core abstractions)
1. `Tematica` - 21 edges
2. `renderStory()` - 20 edges
3. `TEMA_COLOR` - 18 edges
4. `perLabel()` - 15 edges
5. `useSpriteWalkers()` - 14 edges
6. `Estado de los datasets (REAL / MIXTO / PROVISORIO)` - 14 edges
7. `useIsMobile()` - 13 edges
8. `niceClosest()` - 13 edges
9. `IsotypeTimeSeriesViz()` - 12 edges
10. `VizFooter()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `NosotrosPage()` --calls--> `useIsMobile()`  [EXTRACTED]
  app/nosotros/page.tsx → hooks/useIsMobile.ts
- `ArticulosDestacados()` --calls--> `textOnColor()`  [EXTRACTED]
  components/home/ArticulosDestacados.tsx → lib/colors.ts
- `ShareStory()` --calls--> `renderStory()`  [EXTRACTED]
  components/interactive/ShareStory.tsx → lib/storyRenderer.ts
- `HomePage()` --calls--> `useIsMobile()`  [EXTRACTED]
  app/page.tsx → hooks/useIsMobile.ts
- `CityLandscape()` --calls--> `isTemaActive()`  [EXTRACTED]
  components/home/CityLandscape.tsx → lib/colors.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Datasets provisorios a reemplazar con ECH 2024** — data_readme_educacion_nivel_educativo, data_readme_educacion_asistencia_por_departamento, data_readme_salud_cobertura_salud, data_readme_ech_2024 [EXTRACTED 1.00]
- **Flujo de alta de un dataset en Pica** — data_readme_schemas_base, data_readme_anexos_datos_fuente, data_readme_raw_datasets, data_readme_validate_data, data_readme_vizrouter [EXTRACTED 1.00]
- **Tipología de visualizaciones A-E aplicada a los datasets** — data_readme_tiporesultado, data_readme_vizrouter, data_readme_estado_datasets [EXTRACTED 1.00]

## Communities (12 total, 1 thin omitted)

### Community 0 - "Visores de datos (DataViz)"
Cohesion: 0.08
Nodes (40): CharacteristicExplorer(), CharacteristicExplorerProps, DistributionViz(), IconGridViz(), IsotypeGlyphViz(), PerCapitaViz(), scalarPool(), ScalarViz() (+32 more)

### Community 1 - "Navegacion, home y tematicas"
Cohesion: 0.07
Nodes (42): ArticulosDestacados(), CARDS, ColorBar(), EASE, RandomOverlay(), RandomOverlayProps, ThemeCharacterProps, EASE (+34 more)

### Community 2 - "Sprites y multitudes"
Cohesion: 0.07
Nodes (38): Card, CARDS, DIM_STYLE, NosotrosPage(), UNDIM_STYLE, ThemeCharacter(), AmbientWalkers(), AmbientWalkersProps (+30 more)

### Community 3 - "Home: landscape y assets"
Cohesion: 0.10
Nodes (29): handjet, metadata, viewport, vt323, HomePage(), Selection, CityLandscape(), CityLandscapeProps (+21 more)

### Community 4 - "Visualizaciones isotype"
Cohesion: 0.17
Nodes (30): Cat, IsotypeDistributionViz(), poolFor(), CrowdRow(), finerPer(), IsotypeMatrixViz(), Bar, clamp() (+22 more)

### Community 5 - "Renderer de historias (compartir)"
Cohesion: 0.15
Nodes (25): contentBox(), CrowdPlan, DECO_PATTERNS, drawDeco(), drawFig(), drawFlow(), drawFooter(), drawLegend() (+17 more)

### Community 6 - "Documentacion de datos"
Cohesion: 0.12
Nodes (25): anexos/datos-fuente/ (archivos fuente descargados + manifiesto), Datos de Pica (README de datos), ECH 2024 (microdatos, fuente pendiente para datasets provisorios), Dataset educacion/asistencia-por-departamento (tipo E, PROVISORIO), Dataset educacion/egreso-media-superior (tipo C, REAL), Dataset educacion/egreso-por-nivel-socioeconomico (tipo D, REAL), Dataset educacion/nivel-educativo (tipo B, PROVISORIO), Estado de los datasets (REAL / MIXTO / PROVISORIO) (+17 more)

### Community 7 - "Puntos de color y calles"
Cohesion: 0.18
Nodes (19): HomeCanvas(), HomeCanvasProps, buildGraph(), buildPathMeta(), clamp01(), dijkstra(), lerp(), PathMeta (+11 more)

### Community 8 - "Calibracion de hitboxes"
Cohesion: 0.20
Nodes (15): calibration, CalibrationMode, setCalibrationMode(), CalKey, centroid(), colorOf(), HitboxCalibrator(), initialPolys() (+7 more)

## Knowledge Gaps
- **70 isolated node(s):** `vt323`, `handjet`, `metadata`, `viewport`, `Card` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tematica` connect `Navegacion, home y tematicas` to `Calibracion de hitboxes`, `Visores de datos (DataViz)`, `Home: landscape y assets`, `Renderer de historias (compartir)`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `TEMA_COLOR` connect `Visores de datos (DataViz)` to `Navegacion, home y tematicas`, `Home: landscape y assets`, `Visualizaciones isotype`, `Renderer de historias (compartir)`, `Calibracion de hitboxes`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `assetUrl()` connect `Home: landscape y assets` to `Navegacion, home y tematicas`, `Sprites y multitudes`, `Renderer de historias (compartir)`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `vt323`, `handjet`, `metadata` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Visores de datos (DataViz)` be split into smaller, more focused modules?**
  _Cohesion score 0.07923497267759563 - nodes in this community are weakly interconnected._
- **Should `Navegacion, home y tematicas` be split into smaller, more focused modules?**
  _Cohesion score 0.07199032062915911 - nodes in this community are weakly interconnected._
- **Should `Sprites y multitudes` be split into smaller, more focused modules?**
  _Cohesion score 0.07493061979648474 - nodes in this community are weakly interconnected._