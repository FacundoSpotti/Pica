# Salud — fuentes de datos

- `3.2.3ok.xls` — INE, Anuario Estadístico Nacional 2025, cuadro 3.2.3:
  "Afiliaciones a prestadores integrales, según área geográfica y grupos de
  edades, 2024" (fuente SINADI-AES, MSP). → cobertura-salud.json, cobertura-por-edad.json
- `MSP_PRESENTACION_ESTADISTICAS_VITALES.pdf` — mortalidad infantil serie nacional.
- `Anuario_Estadistico_Nacional_2025_102a_edicion.pdf` — el anuario completo del
  INE (19MB). PENDIENTE de extraer más cuadros (camas, mortalidad por causa,
  natalidad por depto). No extrae con parser simple; conviene exportar el cuadro
  puntual como .xls (como el 3.2.3).
- `INE-ECH-2025.xml` — diccionario DDI de la ECH 2025.

Se procesan con SheetJS (devDependency `xlsx`).
