# Trabajo — fuente de datos

`ECH_01_24.csv` = microdatos de la **Encuesta Continua de Hogares, enero 2024**
(INE, ~21.000 personas). Todos los datasets de Trabajo se calcularon sobre este
archivo con el ponderador de expansión `W`, validando las tasas nacionales
contra el dashboard del INE (actividad 64,3 · empleo 58,8 · desempleo 8,5).

- Fuente: INE ECH 2024 — https://www4.ine.gub.uy/Anda5/index.php/catalog/767
- Variables usadas: POBPCOAC (condición de actividad), W (ponderador),
  INFORMAL, SUBEMPLEO, NIV_EDU, SIT_OCUP, e26 (sexo), e27 (edad), dpto.
- IMPORTANTE: es un MES puntual (enero 2024), no promedio anual. Los datasets
  lo declaran en su descripción.

`indicador (1/2).csv` = totales nacionales del dashboard (para validación).
Los PDF FireShot = capturas del boletín técnico.
