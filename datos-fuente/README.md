# Archivos fuente descargados

Copias locales de las fuentes oficiales usadas para poblar `src/data/`.
Descargados el 2/7/2026.

| Archivo | Fuente | URL | Usado en |
|---|---|---|---|
| `msp-pai-coberturas-2024.pdf` | MSP — Desempeño del PAI en Uruguay, doc. técnico (oct. 2024) | [gub.uy](https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/documentos/publicaciones/Coberturas%202024%20-%20INFORME%20FINAL.pdf) | `salud/vacunacion.json` |
| `msp-estadisticas-vitales-2024.pdf` | MSP — Estadísticas Vitales 2024 (preliminares) | [gub.uy](https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/documentos/noticias/MSP_PRESENTACION_ESTADISTICAS_VITALES.pdf) | `salud/mortalidad-infantil.json` |
| `ineed-mirador-tabla8-egreso.xlsx` | INEEd — Mirador Educativo, tabla 8 (egreso EMS) | [mirador.ineed.edu.uy](https://mirador.ineed.edu.uy/indicadores/tasa-de-egreso-de-educacion-media-superior-entre-jovenes-de-21-a-23-anos-8-2.html) | `educacion/egreso-media-superior.json`, `educacion/egreso-por-nivel-socioeconomico.json` |

Los `.txt` son extracciones de texto de los PDFs (generadas con un script propio,
pueden tener espaciado irregular). `tabla8/` es el xlsx descomprimido.

## Verificado por otras vías (sin archivo descargable)

- **Ingreso medio hogares 4T-2024** ($95.182; Mvd $114.988, Interior $81.796):
  INE vía prensa (Telenoche, ene-2025) — el boletín HTML del INE (www5.ine.gub.uy)
  falla el certificado SSL desde algunos clientes.
- **Informalidad 2024** (nacional 22,7%; AR 48,8 · CL 45,5 · RV 39,0 · SA 29,2 ·
  CO 21,5 · FS 16,9 · MO 14,4): informe INE 2024 citado por Subrayado,
  Medios Públicos y América Economía.
- **Desempleo mensual dic-2023 7,8% · dic-2024 7,4% · dic-2025 7,0%**: INE vía
  Montevideo Portal (ene-2026).

## Pendiente de descarga (fuentes caídas o no ubicadas)

- Serie ANUAL de desempleo (visualizador INE es una app JS sin export directo).
- Informalidad de los 12 departamentos restantes (informe departamental completo del INE).
- Mortalidad infantil POR DEPARTAMENTO (OTU/OPP en mantenimiento; uins.msp.gub.uy es una app).
- Nivel educativo (ECH/Censo 2023), prestador de salud (ECH), asistencia por depto.
