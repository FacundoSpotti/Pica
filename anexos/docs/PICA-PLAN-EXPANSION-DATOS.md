# PICA — Plan de expansión de datos (fase 2)

Estado: **IMPLEMENTADO** (2026-07-20, "dale vamos con todos"): 18 datasets
nuevos → 83 totales, generados por `scripts/gen-datos-fase2.mjs` (celdas
reales + aserciones). Única pieza excluida: registro de cambios de tasas de
impuestos (no viable, ver abajo). Entidades nuevas: Estudiantes, Visitantes,
Gasto público, Impuestos, Producción nacional — con ícono pixel propio.

Regla vigente para toda la expansión: generadores que leen las **celdas
reales** de los cuadros (nunca transcripción manual), fuente + año en cada
dataset, `pnpm validate-data && pnpm audit-data` en verde antes de commitear.
El chatbot levanta los datasets nuevos automáticamente (lee `DATASETS` en
runtime); revisar `SINONIMOS` de `chatCatalog.ts` si aparece vocabulario
nuevo (ej. "impuestos", "IVA", "combustible", "suicidio", "VIH").

## Tanda A — candidatos originales (verificados en disco)

| Cuadro | Temática | Dataset propuesto | Tipo | Viabilidad |
|---|---|---|---|---|
| 3.2.6 | Salud | Nuevos diagnósticos de VIH por año + por departamento | C + E | ✅ archivo presente |
| 3.2.7 | Salud | Suicidios por año + por departamento — **SENSIBLE**: tratamiento sobrio como femicidios; verificar línea de prevención oficial antes de publicar (no escribir de memoria) | C + E | ✅ archivo presente |
| 3.1.1/2/5/10 | Educación | Estudiantes por nivel educativo · público vs privado | B + D | ✅ archivos presentes |
| 3.6.12/13 | Seguridad | Denuncias contra la propiedad por tipo/año + por departamento | D + E | ✅ archivos presentes |
| 4.8.1/2 | Economía | Visitantes por nacionalidad (2024) + evolución por motivo | B + C | ✅ archivos presentes |
| 8.1.3 | Economía | Distribución del PIB por industria (último año) | B lista | ✅ archivo presente |

## Tanda B — pedidos de Facundo 2026-07-20 (análisis de viabilidad)

### Inflación (ampliar lo existente)

Ya publicados: `inflacion-anual` (C) e `ipc-por-division` (B).

| Cuadro | Dataset propuesto | Tipo | Viabilidad |
|---|---|---|---|
| 9.1.3 + 9.1.4 | IPC por división: Montevideo vs Interior | D | ✅ archivos presentes — comparación con gancho editorial |
| 9.1.8 | Precio de combustibles por fecha de vigencia (pesos/litro) | C (o glifo) | ✅ archivo presente — es un registro real de SUBIDAS de precios administrados por el Estado; muy visualizable |

### Gasto y distribución del dinero estatal

El capítulo 6.1 (Gobierno central y finanzas públicas) tiene TODO lo pedido,
con los 11 archivos en disco:

| Cuadro | Dataset propuesto | Tipo | Viabilidad |
|---|---|---|---|
| 6.1.8 | **Gastos del Gobierno Central por área programática** ("a dónde va la plata": educación, salud, seguridad…) | B | ✅ el corazón del pedido |
| 6.1.7 | Gastos por clasificación económica (remuneraciones, inversión, transferencias…) | B | ✅ |
| 6.1.2 | Ingresos vs egresos del Gobierno Central (resultado fiscal) por año | C | ✅ |
| 6.1.11 | Ingresos/egresos de las empresas del Estado (2024) | B | ✅ |
| 6.1.9/10 | Deuda pública por tenedor / instrumento | B | ⚠️ viable; evaluar si aporta al público objetivo |

**Advertencia de honestidad**: todos estos cuadros están en *millones de
pesos a valores corrientes*. Para series largas (C) los valores corrientes
distorsionan por inflación → preferir distribuciones del último año (% del
total) o declarar explícitamente "a valores corrientes" en la descripción.

### Registro de subidas de impuestos

| Idea | Viabilidad |
|---|---|
| Recaudación por impuesto (IVA, IRPF, IMESI, IRAE…) por año — cuadro 6.1.5 | ✅ VIABLE — proxy honesto: "cuánto recauda cada impuesto" (B último año o D impuesto×año) |
| Registro histórico de CAMBIOS DE TASAS de impuestos | ❌ NO VIABLE con el Anuario INE — eso es normativa (DGI/MEF/IMPO), no estadística publicada. Requeriría curaduría manual de fuentes legales, con alto riesgo de incompletitud → contradice la regla "nunca inventar/aproximar". Si se quiere a futuro: construir dataset propio citando cada norma, declarado como elaboración propia. |
| Subidas de precios administrados (combustibles) — cuadro 9.1.8 | ✅ cubre parcialmente la idea de "subidas" con datos oficiales |

## Resumen

- Tanda A: ~10-12 datasets · Tanda B viable: ~7-8 datasets → total ~83 datasets.
- Todo el material está en `anexos/datos-fuente/datos_INE_2025/` salvo el
  registro de cambios de tasas (única pieza no viable con fuentes actuales).
- Entidades nuevas probables: "Gasto público", "Impuestos", "Combustibles",
  "Visitantes" — cada una necesitará su ícono pixel único (regla de íconos
  por entidad) y color de temática Economía.
