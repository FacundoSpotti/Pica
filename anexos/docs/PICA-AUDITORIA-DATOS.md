# Auditoría de datos — Pica (TAREA 8)

> Chequeo de integridad de toda la información publicada. Reproducible con
> `pnpm audit-data` (script `scripts/audit-data.mjs`). Última corrida: **60
> datasets · 0 errores · 0 warnings**.

## Qué se verificó (sobre los 60 datasets)

- **Fuente y trazabilidad:** cada dataset tiene `fuente` citada, `fuenteUrl` a un
  dominio **oficial** (`ine.gub.uy`, `gub.uy` — MSP, Min. Interior, MIDES, BCU —,
  `ineed.edu.uy`) y `anio` en rango válido.
- **Sin datos inventados:** no hay marcas de dato provisorio/placeholder; todo
  sale de un cuadro del Anuario INE, de la microdata ECH o de una fuente oficial
  citada.
- **Unidades y rangos:** porcentajes en 0–100, tasas no negativas, escalares
  numéricos.
- **Sumas coherentes:** las distribuciones (parte de un todo) suman ~100%; las
  **tasas** e **índices** (que no son distribuciones) quedan excluidas del chequeo.
- **Completitud espacial:** los mapas (Tipo E) tienen los 19 departamentos, sin
  repetidos.
- **Consistencia:** sin `id` duplicados; descripciones sin paréntesis truncados.

## Lo corregido en esta pasada

- **4 descripciones truncadas** (`… (.`) — artefacto de una limpieza previa de
  fuentes que se comió un paréntesis. Corregidas:
  `egreso-media-superior`, `egreso-por-nivel-socioeconomico`,
  `mortalidad-infantil`, `vacunacion`.
- Se ajustó el auditor para no marcar falsos positivos (p. ej. "de**pendiente**"
  o "**todo**s" no son datos inventados; INEEd sí es dominio oficial; el IPC por
  rubro son tasas, no una distribución que sume 100).

## Notas metodológicas (no son errores)

- **Matrices de tasas** (`desempleo-sexo-edad`, `informalidad-sexo-nivel`,
  `egreso-por-nivel-socioeconomico`): sus filas **no** suman 100% porque cada
  celda es una tasa independiente, no una parte de un todo. Correcto.
- **IPC por rubro** (`ipc-por-division`): cada rubro es su propia variación anual
  de precios; no suma 100%. Correcto.
- **Años de dato vs. edición del Anuario:** el `anio` refleja el año del DATO
  (p. ej. gasto en salud 2023), aunque la fuente sea el "Anuario 2025" (edición).

## Pendiente / a tener en cuenta

- **Verificación LIVE de URLs:** los dominios de fuente son oficiales, pero
  `gub.uy` bloquea el fetch automatizado, así que no se validó por HTTP que cada
  URL resuelva al cuadro exacto. Chequear manualmente al publicar.
- **Femicidios (`femicidios`):** el dato (23 en 2023) proviene del **Observatorio
  de Violencia de Género** (Inmujeres–MIDES, Min. Interior, Fiscalía), obtenido
  vía difusión pública porque el informe primario es un PDF escaneado. Confirmar
  con el archivo primario si se consigue.
- **Microdata ECH enero 2024:** las tasas de Trabajo/Educación derivadas de la
  ECH son de un **mes puntual** (no promedio anual), ya aclarado en cada
  `descripcion`.
