# PICA — Plan de acción: tareas futuras (prompt a prompt)

> Este documento es el roadmap de las tareas pendientes de Pica. Cada sección es
> una tarea que se resuelve en uno o varios prompts. El contexto general del
> proyecto (stack, arquitectura, assets, convenciones) ya lo tenés en el proyecto
> — este archivo se enfoca SOLO en lo que falta hacer, en orden.
>
> Trabajamos una tarea a la vez. No adelantarse. Al terminar cada una, validar
> con Facundo antes de pasar a la siguiente.

---

## Orden de ejecución recomendado

El orden no es estrictamente el de la lista — algunas tareas dependen de otras.
Orden sugerido:

1. Expandir database (Salud + las 3 activas)
2. Expandir a dos temáticas nuevas (Economía + Seguridad)
3. Mejorar flow en características
4. Mejorar interfaz de entidades y temáticas
5. Mejorar Home (hover suave + destello aislado)
6. Feature compartir en redes (tipo Spotify Wrapped)
7. Hacer responsive
8. Chequeo oficial de toda la información
9. Crear Chatbot
10. Crear espacio de feedback
11. Subir a Vercel
12. Visionado final + optimización + README

---

## TAREA 1 — Expandir database

**Objetivo:** ampliar masivamente los datos de las 3 temáticas activas (Trabajo,
Salud, Educación) hasta un mínimo de 5 entidades por temática, cada una con ~5
características. Todo con fuentes oficiales reales y contrastadas.

**Foco especial en Salud:** agregar más información concreta como cuántos
hospitales hay, cuánta gente puede acceder a la salud (cobertura), cuánta gente
muere por determinada enfermedad, camas disponibles, médicos por habitante, etc.

**Fuentes oficiales (ya verificadas):**
- ECH 2024 (INE) — fuente madre transversal: https://www4.ine.gub.uy/Anda5/index.php/catalog/767
- Tabulados empleo INE: https://www.ine.gub.uy/actividad-empleo-y-desempleo
- MSP Indicadores ASSE 2010-2025 (.xlsx) e IAMC 2005-2025 (.xlsx): https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos
- MSP Estadísticas Vitales (natalidad, mortalidad): https://www.gub.uy/ministerio-salud-publica/tematica/estadisticas-vitales
- MSP Egresos hospitalarios (datos abiertos): https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos-abiertos
- Anuario Estadístico de Salud 2023 (PAHO): camas por depto, médicos, terapia intensiva
- MEC nivel educativo 2024, ANEP Monitor Educativo, INEEd Informe 2023-2024

**Estructura objetivo (5 entidades × 5 características por temática):**

TRABAJO:
- Departamentos: empleo, desempleo, actividad, informalidad, ingreso medio
- Personas por sexo: empleo M/F, brecha salarial, informalidad, desempleo, actividad
- Grupos de edad: empleo juvenil, desempleo, actividad, informalidad, subempleo
- Sectores (CIIU): ocupados, ingreso, informalidad, empleo, crecimiento
- Nivel educativo: empleo por nivel, ingreso, desempleo, informalidad, retorno

SALUD:
- Departamentos: mortalidad infantil, natalidad, camas/mil, cobertura, egresos
- Prestadores (ASSE/IAMC/privado): afiliados, consultas, cobertura, egresos, satisfacción
- Hospitales e infraestructura: cantidad hospitales, camas totales, terapia intensiva, ambulancias, médicos
- Grupos de edad: cobertura, consultas, vacunación, egresos, esperanza vida
- Serie nacional: mortalidad 2000-2023, natalidad, esperanza vida, vacunación, camas
- (agregar cuando haya dato: muertes por tipo de enfermedad)

EDUCACIÓN:
- Departamentos: nivel máximo, asistencia, desvinculación, años escolaridad, repetición
- Niveles (prim/sec/terc): matrícula, egreso, repetición, desvinculación, cobertura
- Grupos de edad: asistencia, nivel alcanzado, desvinculación, rezago, culminación
- Personas por sexo: nivel M/F, culminación, asistencia, años estudio, egreso terciario
- Nivel socioeconómico: egreso por NSE, asistencia, desvinculación, nivel, brecha

**REGLAS CRÍTICAS:**
- **NUNCA inventar números.** Si un dato no está en la fuente, marcarlo como
  pendiente. En un proyecto de datos oficiales, un número inventado es fatal.
- Cada dataset en JSON con los schemas Zod ya definidos.
- Cada uno con: `fuente`, `fuenteUrl`, `anio`, y el `tipoResultado` (A-E) correcto.
- Asignar tipo de visualización según naturaleza del dato:
  · por departamento → Tipo E (mapa) o B (isotype)
  · distribuciones → Tipo B · series temporales → Tipo C
  · cruces de 2 dimensiones → Tipo D · número único → Tipo A
- Recordar: los tipos B, C, D deben ser ISOTYPE (sprites de personas en
  movimiento), NO gráficas D3 tradicionales, cuando el dato involucra personas.

**Ejecución:** primero armar SOLO Trabajo completo (5×5) como piloto. Validar
con Facundo que los datos son reales y correctos. Después Salud y Educación.

---

## TAREA 2 — Expandir a dos temáticas nuevas (Economía + Seguridad)

**Objetivo:** habilitar Economía y Seguridad como temáticas completas (hoy están
como "Próximamente"). Mismo nivel de datos que las 3 activas: 5 entidades × ~5
características, todo con información contrastada de fuentes oficiales.

**ECONOMÍA — temas a cubrir:**
inflación, PBI, PBI per cápita, costo de vida, canasta básica, pobreza monetaria,
coeficiente de Gini, ingreso familiar, tipo de cambio, tasa de interés, inversión
extranjera, % pobreza infantil.

**Fuentes Economía:**
- BCU (Banco Central) — inflación, tipo de cambio, tasas, PBI: https://www.bcu.gub.uy
- INE — IPC (índice de precios), canasta básica, pobreza: https://www.ine.gub.uy
- INE — Estimación de pobreza y Gini por ECH
- OPP Transparencia Presupuestaria

**SEGURIDAD — temas a cubrir:**
robos, hurtos, homicidios, femicidios, denuncias, rapiñas, violencia doméstica,
percepción de inseguridad, tasa de reincidencia, población penitenciaria.

**Fuentes Seguridad:**
- Ministerio del Interior — Observatorio Nacional sobre Violencia y Criminalidad: https://www.minterior.gub.uy
- INE — victimización y percepción de seguridad (módulo ECH)
- Fiscalía General de la Nación

**CUIDADO ESPECIAL (del Notion):** Seguridad "requiere contextualización cuidadosa
para evitar lecturas distorsionadas del dato". Los datos de criminalidad son
sensibles — presentarlos con contexto, sin sensacionalismo, fiel al tono editorial
de Pica. Femicidios y violencia de género especialmente: tratamiento respetuoso.

**REGLAS:** las mismas de la Tarea 1 — nunca inventar, fuentes citadas, schemas Zod,
tipos de visualización correctos, isotype para datos de personas.

**Ejecución:** una temática a la vez. Economía primero, validar, luego Seguridad.

---

## TAREA 3 — Mejorar flow en características

**Problema:** cuando el usuario selecciona una entidad y accede a visualizar los
datos, no queda claro cómo se "viaja" a través de la información. La navegación
entre características no es intuitiva.

**Objetivo:** hacer el user flow del explorador de datos más claro y guiado.
Que el usuario entienda que está navegando por características de una entidad y
cómo moverse entre ellas.

**Ideas a explorar (validar con Facundo cuál):**
- Indicadores visuales de progreso (ej: "característica 2 de 5")
- Affordances más claras para el scroll horizontal / cambio de característica
- Breadcrumb más visible (Temática › Entidad › Característica)
- Transiciones que refuercen la sensación de "viaje" entre datos
- Hint inicial que enseñe la interacción la primera vez

Respetar: sin microanimaciones si `prefers-reduced-motion` está activo.

---

## TAREA 4 — Mejorar interfaz de entidades y temáticas

**Problema:** la ventana donde se ven las temáticas aisladas (el selector de
temática al que se llega NO desde el Home, sino desde dentro del explorador)
queda pobre visualmente. Además está mal centrada (un poco corrida hacia abajo).

**Objetivo:**
1. Agregar personas caminando en gris en el fondo (mismo sistema de sprites que
   ya usamos en el Home — sprites con palette swap a gris, caminando). Da vida
   a la pantalla.
2. Centrar mejor el contenido — actualmente está desplazado hacia abajo, debe
   quedar visualmente centrado.

Reutilizar: spriteManager.ts y la lógica de movimiento de sprites que ya existe.

---

## TAREA 5 — Mejorar Home

**Dos problemas concretos del hover sobre edificios:**

1. **Hover escalonado:** al hacer hover sobre una edificación, el borde de color
   que aparece se dibuja de forma escalonada/pixelada de golpe. Debe ser SUAVE —
   una transición gradual del borde de color, no un salto escalonado.

2. **Destello contagiado:** al hacer hover sobre el edificio de Educación (IAVA),
   el destello/efecto se "contagia" al Palacio Legislativo (que es decorativo y
   no clickeable). Cada hover debe afectar SOLO a su edificio, sin contaminar a
   los vecinos. Revisar el z-index / las máscaras de las capas.

**Recordar:** respetar `prefers-reduced-motion` — sin animación de hover si está activo.

---

## TAREA 6 — Feature compartir en redes (tipo Spotify Wrapped)

**Objetivo:** una vez que el usuario tiene una estadística seleccionada, poder
generar una imagen tipo "story" (vertical, formato redes) con esa información,
para compartir en Instagram/X/TikTok. Todo se adapta automáticamente al dato
seleccionado, igual que el Spotify Wrapped.

**Formato:** ver apartado 8 "Presentación Comercial" del Notion. El formato es
vertical (story 1080×1920), estética Pica (pixel art, fondo #0A0A0A, tipografía
VT323 + Handjet, colores de la temática). Debe incluir: el dato destacado, su
contexto, la fuente, y branding de Pica (logo).

**Implementación técnica sugerida:**
- Generar la imagen client-side (ej: html-to-image, o canvas render)
- Botón "Compartir" en la vista de visualización
- La imagen se arma con el dato actual + template estándar adaptable
- Descarga directa o share API nativa en mobile

**Respetar:** la identidad visual de Pica. El template debe sentirse parte del
mundo Pica, no genérico.

---

## TAREA 7 — Hacer responsive

**Objetivo:** que toda la web sea accesible en cualquier teléfono. Adaptar todo
lo necesario para mobile SIN modificar la versión desktop.

**Contexto (del Notion):** en mobile, decisiones previas indicaban "por ahora
nada" — pero ahora sí se hace el responsive completo. El desktop queda intacto.

**Puntos críticos a resolver en mobile:**
- Home: el landscape isométrico en pantalla vertical (¿scroll? ¿zoom? ¿reencuadre?)
- Explorador: el scroll H de características se convierte en swipe táctil
- ColorBar, nav, overlays adaptados a viewport chico
- Las visualizaciones isotype re-fluyen para caber en pantalla angosta
- Touch targets mínimo 44px (accesibilidad)
- La feature de compartir es especialmente relevante en mobile

**Regla:** breakpoints claros. Desktop sin tocar. Mobile como capa adicional.

---

## TAREA 8 — Chequeo oficial de toda la información

**Objetivo:** revisar TODA la información de datos de la web buscando errores o
fuentes no confiables. Marcar y solucionar.

**Checklist:**
- Cada dato tiene fuente oficial citada y verificable
- Ningún dato inventado o estimado sin marcar
- Las URLs de fuentes funcionan y llevan al dato correcto
- Los años de cada dato son correctos y consistentes
- No hay contradicciones entre datasets
- Los números tienen sentido (sanity check contra realidad conocida)
- Las unidades son correctas (%, por mil, absolutos, $UYU)

Generar un reporte de lo revisado, lo corregido y lo que quede pendiente.

---

## TAREA 9 — Crear Chatbot

**Objetivo:** un chatbot en el Home (basado en una API key) al que se le pueden
hacer preguntas sobre estadísticas, y que responde redirigiendo a la parte de la
página que muestra ese dato.

**Del Notion (5.4 Implementación de IA):** la IA funciona como forma de interactuar
con los datos. Ej: viendo datos de violencia de género, el usuario pregunta
"¿cuántos de estos casos llegaron a la justicia?" y la IA responde y/o lleva al
dato correspondiente. No es un chat abierto — está acotado a los datos de Pica.

**Consideraciones (ya evaluadas como viables en Notion):**
- Acotar las preguntas a los datos disponibles (no respuestas abiertas)
- Las respuestas deben citar de dónde sale el dato
- Acotar la fuente a los datasets de Pica
- Cuidar el consumo de tokens
- El bot redirige a la sección de la página que muestra el dato

**Implementación:** API key (probablemente Claude o similar), el bot tiene como
contexto el catálogo de datasets de Pica y puede devolver links internos a
`/interactivo?tema=...&entidad=...&caracteristica=...`

---

## TAREA 10 — Crear espacio de feedback

**Objetivo:** una herramienta dentro de "Nosotros" para que las personas puedan
dar feedback de la web (vía mail u otro medio).

**Implementación sugerida:**
- Formulario simple en la pantalla Nosotros
- Envío por email (ej: servicio como Formspree, o mailto, o backend mínimo)
- Respetar la estética Pica
- Accesible (labels, focus visible, validación clara)

---

## TAREA 11 — Subir a Vercel

**Objetivo:** deshabilitar todo el debug y dejar el frontend listo para deploy
en Vercel.

**Checklist:**
- Desactivar todos los flags de debug (DEBUG_HITBOXES, debug de paths, etc.)
- Quitar console.logs de desarrollo
- Verificar variables de entorno (API keys del chatbot fuera del código)
- Optimizar imágenes y assets (el landscape de 4096×2305 pesa — considerar
  formatos optimizados / lazy load)
- Build de producción sin errores ni warnings
- Configurar el proyecto en Vercel
- Verificar que todas las rutas funcionan en producción

---

## TAREA 12 — Visionado final + optimización + README

**Objetivo:** último chequeo integral. Ver toda la página buscando errores o
falta de optimización. Dejar todo listo con un README completo.

**Checklist:**
- Recorrer todas las pantallas y flujos buscando bugs
- Performance: Lighthouse, tiempos de carga, tamaño de bundle
- Accesibilidad: pasar audit WCAG completo
- SEO básico: metadata, títulos, descripciones
- Optimización de assets y código
- **README con:** descripción del proyecto, stack, estructura de carpetas, cómo
  correr localmente, cómo agregar datos, arquitectura de componentes, decisiones
  de diseño, fuentes de datos, y créditos.

---

## Recordatorios transversales (aplican a todas las tareas)

- **TypeScript estricto**, sin `any`, comentarios en español, código en inglés
- **Rutas de assets** siempre desde `src/lib/assets.ts`
- **Colores** siempre desde `picaColors` o CSS vars, nunca hardcodeados
- **Canvas** siempre con `imageRendering: 'pixelated'`
- **Accesibilidad** (`prefers-reduced-motion`, ARIA, contraste, teclado) en cada componente
- **Isotype sobre D3** — los datos de personas se representan con sprites en
  movimiento, no con gráficas abstractas
- **Nunca inventar datos** — solo datos reales de fuentes oficiales citadas
- **Una tarea a la vez**, validar con Facundo antes de avanzar
