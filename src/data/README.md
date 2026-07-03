# Datos de Pica

## Estado de los datasets

Los archivos descargados de las fuentes están en `datos-fuente/` (raíz del repo),
con su manifiesto. Cada dataset lleva `fuente` y `fuenteUrl` exactas.

| Dataset | Tipo | Estado |
|---|---|---|
| `educacion/egreso-media-superior` | C | ✅ REAL — INEEd Mirador (Excel descargado), serie 2006-2025 |
| `educacion/egreso-por-nivel-socioeconomico` | D | ✅ REAL — INEEd Mirador (mismo Excel) |
| `salud/vacunacion` | C | ✅ REAL — MSP PAI oct-2024 (PDF descargado), serie 2018-2023 |
| `salud/mortalidad-infantil` | C | ✅ REAL — MSP Estadísticas Vitales 2024 (PDF descargado), 2024 preliminar |
| `trabajo/salarios` (ingreso-medio-hogares) | A | ✅ REAL — INE ECH 4T-2024 (vía prensa) |
| `trabajo/informalidad` | E | ⚠️ MIXTO — 7 departamentos verificados (INE 2024), 12 provisorios |
| `trabajo/empleo-desempleo` | C | ⚠️ PROVISORIO — anclas verificadas dic-23/24/25; falta la serie anual oficial |
| `educacion/nivel-educativo` | B | ⚠️ PROVISORIO — reemplazar con ECH 2024 / Censo 2023 |
| `educacion/asistencia-por-departamento` | E | ⚠️ PROVISORIO — reemplazar con ECH 2024 |
| `salud/cobertura-salud` | B | ⚠️ PROVISORIO — reemplazar con ECH 2024 |

Todo dataset ⚠️ lo declara también en su campo `descripcion`.

## Fuentes oficiales para completar los pendientes

- ECH 2024 (microdatos): https://www4.ine.gub.uy/Anda5/index.php/catalog/767
- Visualizador mercado laboral INE: https://www7.ine.gub.uy/Dashboard-%20ML-ECH/MercadoLaboral/
- Mortalidad por departamento: https://uins.msp.gub.uy/ y https://otu.opp.gub.uy (en mantenimiento al 2/7/2026)
- Catálogo de datos abiertos: https://catalogodatos.gub.uy

## Cómo agregar un dataset

1. Crear el JSON siguiendo el schema de `src/schemas/base.ts`
   (id kebab-case, departamentos ISO 3166-2 `UY-XX`, años numéricos,
   porcentajes 0-100, siempre `fuente` + `fuenteUrl`).
2. Guardar el archivo fuente original en `datos-fuente/` y sumarlo al manifiesto.
3. Importarlo y sumarlo a `RAW_DATASETS` en `src/lib/datasets.ts`.
4. Verificar con `pnpm validate-data`.

El `VizRouter` elige la visualización automáticamente según `tipoResultado`:
A escalar · B distribución · C serie temporal · D matriz · E mapa.
