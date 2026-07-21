# Datos de Pica

## Estado de los datasets

**El inventario completo y actualizado (83 datasets, fuentes, tipos y
pendientes) vive en el [README principal](../../README.md#2-datos).**
Los provisorios de la etapa inicial fueron reemplazados por microdatos
reales de la ECH (enero 2024) o retirados; solo `mortalidad-infantil`
declara "2024 preliminar" (estado del propio MSP).

Los archivos descargados de las fuentes están en `anexos/datos-fuente/`,
con su manifiesto. Cada dataset lleva `fuente` (y `fuenteUrl` cuando existe
link profundo real).

## Cómo agregar un dataset

1. Crear el JSON siguiendo el schema de `src/schemas/base.ts`
   (id kebab-case, departamentos ISO 3166-2 `UY-XX`, años numéricos,
   porcentajes 0-100, siempre `fuente` + `fuenteUrl`).
2. Guardar el archivo fuente original en `anexos/datos-fuente/` y sumarlo al manifiesto.
3. Importarlo y sumarlo a `RAW_DATASETS` en `src/lib/datasets.ts`.
4. Verificar con `pnpm validate-data`.

El `VizRouter` elige la visualización automáticamente según `tipoResultado`:
A escalar · B distribución · C serie temporal · D matriz · E mapa.
