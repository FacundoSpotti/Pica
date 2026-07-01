---
name: pica-data
description: >
  Cargar cuando se trabaje con datos en Pica: crear o modificar archivos JSON
  de datasets, definir schemas Zod, agregar nuevas entidades o características,
  trabajar con la taxonomía Entidad × Característica × Resultado, integrar
  fuentes del INE o MSP, o construir visualizaciones D3. También cargar cuando
  se habla de "datos", "dataset", "entidad", "característica", "resultado",
  "visualización", "gráfico", "mapa", "serie temporal" en el contexto de Pica.
---

# pica-data — Capa de datos de Pica

---

## Taxonomía central

Todo dato en Pica se clasifica con tres preguntas:

```
¿Qué entidad mide?  →  ¿Qué característica usa?  →  ¿Qué tipo de resultado produce?
```

### Tipos de entidad
- **Discreta** — sujetos u objetos individuales o grupales
- **Geográfica** — elementos con fronteras o coordenadas (transversal a todas las temáticas)
- **Temporal** — periodos de tiempo como sujeto principal (transversal a todas las temáticas)

### Tipos de característica
- **Nominal** — categorías sin orden (tipo de contrato, tipo de enfermedad)
- **Ordinal** — categorías con jerarquía (nivel educativo, gravedad)
- **Cuantitativa continua** — valores numéricos (salario, tasa de deserción)

### Tipos de resultado — 5 tipos, cada uno con su visualización

| Tipo | Nombre | Visualización | Tecnología |
|---|---|---|---|
| A | Resultado Escalar | Número grande con contexto | CSS + Framer Motion |
| B | Distribución Categórica | Barras / dona | D3.js |
| C | Serie Temporal | Línea de tiempo | D3.js |
| D | Matriz Comparativa | Heatmap / tabla visual | D3.js |
| E | Datos Espaciales | Mapa Uruguay por departamento | React Simple Maps |

---

## Estructura de archivos de datos

```
src/
  data/
    educacion/
      nivel-educativo.json
      desercion-escolar.json
      matricula-por-departamento.json
    trabajo/
      empleo-desempleo.json
      salarios.json
      informalidad.json
    salud/
      mortalidad-infantil.json
      cobertura-salud.json
      vacunacion.json
  schemas/
    educacion.ts       → schemas Zod para cada dataset
    trabajo.ts
    salud.ts
    base.ts            → tipos compartidos
```

---

## Schema base de un dataset (TypeScript + Zod)

```typescript
// src/schemas/base.ts
import { z } from 'zod';

export const TipoResultado = z.enum(['A', 'B', 'C', 'D', 'E']);
export const Tematica = z.enum(['educacion', 'trabajo', 'salud', 'economia', 'seguridad']);

// Schema base que todo dataset debe cumplir
export const DatasetBase = z.object({
  id: z.string(),                    // ej: 'nivel-educativo-maximo'
  tematica: Tematica,
  entidad: z.string(),               // ej: 'Personas'
  caracteristica: z.string(),        // ej: 'Nivel educativo máximo alcanzado'
  tipoResultado: TipoResultado,
  fuente: z.string(),                // ej: 'INE — ECH 2024'
  anio: z.number(),
  descripcion: z.string(),
  unidad: z.string().optional(),     // ej: '%', 'personas', '$UYU'
});
```

---

## Schema por tipo de resultado

### Tipo A — Escalar
```typescript
export const DatasetEscalar = DatasetBase.extend({
  tipoResultado: z.literal('A'),
  valor: z.number(),
  variacion: z.object({             // cambio respecto al período anterior
    valor: z.number(),
    periodo: z.string(),
  }).optional(),
  contexto: z.string().optional(),  // texto breve de interpretación
});
```

### Tipo B — Distribución Categórica
```typescript
export const DatasetDistribucion = DatasetBase.extend({
  tipoResultado: z.literal('B'),
  categorias: z.array(z.object({
    label: z.string(),
    valor: z.number(),
    color: z.string().optional(),
  })),
});
```

### Tipo C — Serie Temporal
```typescript
export const DatasetSerie = DatasetBase.extend({
  tipoResultado: z.literal('C'),
  puntos: z.array(z.object({
    periodo: z.string(),            // ej: '2010', '2023-Q1'
    valor: z.number(),
    label: z.string().optional(),
  })),
});
```

### Tipo D — Matriz Comparativa
```typescript
export const DatasetMatriz = DatasetBase.extend({
  tipoResultado: z.literal('D'),
  filas: z.array(z.string()),
  columnas: z.array(z.string()),
  valores: z.array(z.array(z.number())),  // matriz[fila][columna]
});
```

### Tipo E — Datos Espaciales
```typescript
export const DatasetEspacial = DatasetBase.extend({
  tipoResultado: z.literal('E'),
  departamentos: z.array(z.object({
    id: z.string(),                 // código INE del departamento
    nombre: z.string(),
    valor: z.number(),
  })),
});
```

---

## Ejemplo de archivo JSON real

`src/data/salud/mortalidad-infantil.json`
```json
{
  "id": "mortalidad-infantil",
  "tematica": "salud",
  "entidad": "Departamentos",
  "caracteristica": "Tasa de mortalidad infantil",
  "tipoResultado": "E",
  "fuente": "INE — Estadísticas Vitales 2023",
  "anio": 2023,
  "descripcion": "Número de defunciones de menores de 1 año por cada 1.000 nacidos vivos, por departamento.",
  "unidad": "por mil nacidos vivos",
  "departamentos": [
    { "id": "UY-MO", "nombre": "Montevideo", "valor": 6.1 },
    { "id": "UY-CA", "nombre": "Canelones", "valor": 7.4 },
    { "id": "UY-MA", "nombre": "Maldonado", "valor": 5.9 }
  ]
}
```

---

## Agregar un nuevo dataset — checklist

1. Crear el archivo JSON en `src/data/[tematica]/[nombre].json`
2. Validar manualmente que cumple el schema correspondiente
3. Importar y validar en el schema TS de la temática:
   ```typescript
   // src/schemas/salud.ts
   import mortalidadData from '../data/salud/mortalidad-infantil.json';
   const validated = DatasetEspacial.parse(mortalidadData); // lanza error si falla
   ```
4. Registrar en el índice de datasets de la temática:
   ```typescript
   // src/data/salud/index.ts
   export { default as mortalidadInfantil } from './mortalidad-infantil.json';
   ```
5. El componente de visualización lo consume automáticamente por `tipoResultado`

---

## Fuentes de datos V1 — links directos

### Educación
- Nivel educativo 2024 (MEC): https://www.gub.uy/ministerio-educacion-cultura/datos-y-estadisticas/estadisticas
- Monitor Educativo ANEP (2002-2024): https://www.anep.edu.uy
- Costo por estudiante ANEP 2022: buscar en https://www.anep.edu.uy/publicaciones
- INEEd Informe 2023-2024: https://www.ineed.edu.uy

### Trabajo
- ECH 2024 (empleo, salario, informalidad, brecha salarial): https://www4.ine.gub.uy/Anda5/index.php/catalog/767
- ECH 2025 1er semestre: https://www4.ine.gub.uy/Anda5/index.php/catalog/775

### Salud
- Estadísticas Vitales INE (mortalidad, natalidad por departamento): https://www.ine.gub.uy/estadisticas-vitales
- Indicadores ASSE y IAMC 2005-2025 (MSP): https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos
- PAI — Cobertura vacunación 2024: https://www.gub.uy/ministerio-salud-publica/comunicacion/publicaciones/informe-anual-coberturas-del-programa-ampliado-inmunizaciones-uruguay
- ECH 2024 (cobertura de salud por hogar): ídem ECH arriba

### Transversal
- Catálogo datos abiertos: https://catalogodatos.gub.uy
- Portal OPP Transparencia Presupuestaria: https://transparenciapresupuestaria.opp.gub.uy

---

## Convenciones

- IDs de dataset en kebab-case: `nivel-educativo-maximo`, no `nivelEducativoMaximo`
- IDs de departamentos: códigos ISO 3166-2 de Uruguay (`UY-MO`, `UY-CA`, etc.)
- Años como número, no string: `2023`, no `"2023"`
- Valores porcentuales como número entre 0-100: `67.3`, no `0.673`
- Siempre incluir `fuente` con nombre del organismo y año del dato
