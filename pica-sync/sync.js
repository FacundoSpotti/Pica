// ─────────────────────────────────────────────────────────────────────────────
// PICA-SYNC — Sincroniza Notion → Antigravity Skills
//
// Uso:
//   node sync.js --once     → sincroniza una vez y sale
//   node sync.js --watch    → sincroniza cada 5 minutos (daemon)
//
// Requiere la variable de entorno NOTION_TOKEN.
// Leer README.md para instrucciones de configuración.
// ─────────────────────────────────────────────────────────────────────────────

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ── Configuración ─────────────────────────────────────────────────────────────

const PAGE_ID = '375bca9a-cf2d-80c2-bd1d-ca6e203e8eca'; // Pica en Notion

// Ruta del skill en Antigravity (global scope)
const SKILL_DIR = path.join(os.homedir(), '.gemini', 'config', 'skills', 'pica');
const SKILL_PATH = path.join(SKILL_DIR, 'SKILL.md');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// ── Clientes de Notion ────────────────────────────────────────────────────────

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('❌  Falta la variable de entorno NOTION_TOKEN.');
  console.error('   Ejecutá: export NOTION_TOKEN=tu_token_aquí');
  process.exit(1);
}

const notion = new Client({ auth: token });
const n2m = new NotionToMarkdown({ notionClient: notion });

// ── Lógica principal ──────────────────────────────────────────────────────────

async function fetchNotionAsMarkdown() {
  const mdBlocks = await n2m.pageToMarkdown(PAGE_ID);
  return n2m.toMarkdownString(mdBlocks)?.parent ?? '';
}

function buildSkillFile(notionMarkdown, timestamp) {
  // Extraemos las secciones más relevantes para Antigravity.
  // El skill no es una copia completa del Notion — es una síntesis
  // enfocada en lo que el agente necesita para trabajar en el código.

  return `---
name: pica
description: >
  Cargar siempre que se trabaje en el proyecto Pica: componentes React,
  animaciones Canvas, visualizaciones de datos, sistema de sprites,
  decisiones de arquitectura, stack tecnológico, o cualquier tarea de
  desarrollo. Contiene el contexto completo del proyecto actualizado desde Notion.
---

# Pica — Contexto de proyecto

> **Última sincronización:** ${timestamp}
> Fuente: Notion — actualizado automáticamente por pica-sync.

---

## Qué es Pica

Plataforma web interactiva que transforma datos oficiales uruguayos en
experiencias visuales accesibles, estéticas y significativas para el público
general. Inspirado en The Pudding. No es un dashboard — es un explorador
editorial de datos con identidad visual fuerte.

**Slogan:** "Poniendo el problema en el centro del tema"

---

## Stack tecnológico (definitivo)

| Capa | Herramienta |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS + CSS custom properties |
| Animaciones | Framer Motion |
| Visualizaciones | D3.js + React Simple Maps |
| Home screen | HTML5 Canvas |
| Datos | JSON estático + Zod |
| Package manager | pnpm |
| Deploy | Vercel |

---

## Estructura de directorios

\`\`\`
src/
  app/                    → rutas Next.js (App Router)
  components/
    home/                 → HomeCanvas.tsx y componentes del home
    interactive/          → pantalla de exploración de datos
    shared/               → componentes reutilizables
  hooks/                  → custom hooks (useHomeCanvas, etc.)
  lib/                    → utilidades puras sin React
    spriteManager.ts
    personaSimulation.ts
    canvasRenderer.ts
  types/                  → tipos TypeScript globales
    sprites.ts
  data/                   → archivos JSON de datos por temática
public/
  sprites/                → spritesheets PNG de los 48 personajes
\`\`\`

---

## Sistema de sprites (home screen)

- 48 modelos de personas en pixel art (17×43px por frame)
- Escenario A: frente + espalda. Izquierda/derecha = flip horizontal
- Spritesheet por modelo: 68×172px (4 filas × 4 frames)
- Fila 0: idle frente (2 frames) | Fila 1: walk frente (4 frames)
- Fila 2: idle espalda (2 frames) | Fila 3: walk espalda (4 frames)
- Renderizado con HTML5 Canvas, \`imageRendering: pixelated\`
- Componentes: HomeCanvas.tsx → useHomeCanvas.ts → canvasRenderer.ts + personaSimulation.ts

---

## Temáticas y estado

**V1 — Lanzamiento completo:**
- Educación
- Trabajo  
- Salud

**V2 — Segunda etapa (arquitectura lista, datos limitados):**
- Economía
- Seguridad

---

## Sistema de datos

Taxonomía: **Entidad × Característica → Tipo de Resultado**

Tipos de resultado:
- Tipo A: Escalar (un número)
- Tipo B: Distribución categórica (gráfico de barras/dona)
- Tipo C: Serie temporal (línea de tiempo)
- Tipo D: Matriz comparativa (heatmap / tabla visual)
- Tipo E: Datos espaciales (mapa de Uruguay por departamento)

Datos: JSON estático en \`/src/data/\`, validados con Zod.
Fuentes: INE Uruguay + datos.gub.uy

---

## Convenciones de código

- **TypeScript estricto** — sin \`any\`, interfaces explícitas para todo
- **Componentes** en \`/src/components/[feature]/NombreComponente.tsx\`
- **Hooks** en \`/src/hooks/useNombreHook.ts\`
- **Tipos** en \`/src/types/\`
- **Utilidades puras** (sin React, sin efectos) en \`/src/lib/\`
- **Canvas**: toda la lógica de dibujo va en \`/src/lib/canvasRenderer.ts\`, nunca en el componente
- **Animaciones**: Framer Motion para UI, Canvas directo para sprites y partículas
- Comentarios en español, código en inglés
- Sin \`default export\` en utilidades — solo en componentes React

---

## Documento completo de Notion

Lo que sigue es el contenido actual del documento de planificación de Pica:

---

${notionMarkdown}
`;
}

async function sync() {
  const timestamp = new Date().toLocaleString('es-UY', {
    timeZone: 'America/Montevideo',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  console.log(`[${timestamp}] Sincronizando Notion → Antigravity...`);

  try {
    const markdown = await fetchNotionAsMarkdown();
    const skillContent = buildSkillFile(markdown, timestamp);

    // Crear el directorio si no existe
    await fs.mkdir(SKILL_DIR, { recursive: true });

    // Escribir el archivo
    await fs.writeFile(SKILL_PATH, skillContent, 'utf-8');

    const lines = skillContent.split('\n').length;
    console.log(`✅  Skill actualizado: ${SKILL_PATH} (${lines} líneas)`);
  } catch (err) {
    console.error('❌  Error al sincronizar:', err.message);
  }
}

// ── Modo de ejecución ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.includes('--watch') ? 'watch' : 'once';

if (mode === 'once') {
  // Sincronizar una vez y salir
  await sync();
} else {
  // Modo daemon: sincronizar inmediatamente y luego cada 5 minutos
  console.log(`🔄  pica-sync iniciado — sincronizando cada ${POLL_INTERVAL_MS / 60000} minutos`);
  console.log(`    Skill: ${SKILL_PATH}`);
  console.log('    Ctrl+C para detener\n');

  await sync();

  setInterval(async () => {
    await sync();
  }, POLL_INTERVAL_MS);
}
