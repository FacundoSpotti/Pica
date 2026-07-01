# Pica — Paquete de Skills para Antigravity

Este paquete contiene los 6 skills de Pica y la configuración de colores,
listos para instalar en Antigravity.

---

## Contenido

```
skills/
  pica/SKILL.md              → overview general (cargar siempre)
  pica-home/SKILL.md         → Canvas, landscape, puntos, overlay, ThemeCard
  pica-interactive/SKILL.md  → pantalla de datos, scroll, D3, mapas
  pica-data/SKILL.md         → JSON, Zod, taxonomía, fuentes de datos
  pica-ui/SKILL.md           → colores, tipografía, logo, componentes
  pica-accessibility/SKILL.md → WCAG, reduced-motion, ARIA
config/
  tailwind.colors.ts         → 64 variables de color (8 paletas × 8 tonos)
```

---

## Instalación de los skills

### Paso 1 — Copiar los skills a la carpeta de Antigravity

Copiá la carpeta `skills/` completa a:

```
C:\Users\facus\.gemini\config\skills\
```

La estructura final debe quedar:

```
C:\Users\facus\.gemini\config\skills\
  pica\SKILL.md
  pica-home\SKILL.md
  pica-interactive\SKILL.md
  pica-data\SKILL.md
  pica-ui\SKILL.md
  pica-accessibility\SKILL.md
```

### Paso 2 — Colocar tailwind.colors.ts en el proyecto

Cuando el proyecto Next.js esté inicializado, copiá `config/tailwind.colors.ts`
a la raíz del proyecto:

```
C:\Users\facus\Desktop\PROYECTOS\Pica\tailwind.colors.ts
```

---

## Nota sobre pica-sync

Si tenés pica-sync configurado, el skill `pica/SKILL.md` se regenera
automáticamente desde Notion cada 5 minutos. Los otros 5 skills son estáticos
y solo se actualizan manualmente (o regenerándolos desde una conversación con Claude).

---

## Verificación

Antigravity carga automáticamente cada skill cuando la tarea coincide con su
descripción. Para verificar que están bien instalados, pedile a Antigravity
algo relacionado con Pica y confirmá que menciona el contexto correcto
(stack, colores, arquitectura).
