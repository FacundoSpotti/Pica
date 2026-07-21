// ─────────────────────────────────────────────────────────────────────────────
// PICA — capturas.mjs
// Genera las 9 capturas de la documentación formal con Playwright (Chromium).
// Requisitos: server de PRODUCCIÓN corriendo (pnpm build && pnpm start) y
// SIN flags de debug (NEXT_PUBLIC_CALIBRATORS apagado, DEBUG_* en false).
// Uso: node scripts/capturas.mjs   (BASE_URL para otro puerto)
//
// Decisiones:
// · Viewport 1600×900 @2x → PNG 3200×1800, viewport completo (con contexto).
// · Waits generosos (4-8 s): los sprites deben estar FORMADOS, no caminando.
// · La bienvenida del Home se espera hasta que desaparece (es el loader real).
// · El widget del chat se oculta en las vistas de datos (tapa la fuente);
//   en el Home queda (está sobre el margen oscuro y es parte del estado real).
// · El hover/click de edificios usa el CENTROIDE real del polígono de hitbox
//   (leído de src/lib/assets.ts) — el centro del bounding box cae fuera del
//   clip-path y el hover no dispararía.
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = 'docs/capturas';
// Re-run selectivo: `node scripts/capturas.mjs viz-tipo-e` (las 3 del Home van juntas)
const ONLY = process.argv[2] ?? null;
const quiere = (nombre) => !ONLY || nombre.startsWith(ONLY) || (ONLY === 'home' && nombre.startsWith('home'));
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Centroide del polígono de hitbox (shoelace, igual que la app) ────────────

function polygonOf(tema) {
  const src = readFileSync('src/lib/assets.ts', 'utf8');
  const block = src.match(
    new RegExp(`${tema}:\\s*\\[((?:\\s*\\[[0-9.\\s,]+\\],?)+)\\s*\\]`, 'm'),
  );
  if (!block) throw new Error(`no encontré el polígono de ${tema}`);
  const pts = [...block[1].matchAll(/\[([0-9.]+),\s*([0-9.]+)\]/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  if (pts.length < 3) throw new Error(`polígono de ${tema} inválido`);
  return pts;
}

function centroid(pts) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

// ── Helpers de página ────────────────────────────────────────────────────────

/** Espera a que la bienvenida (loader) desaparezca y las fuentes estén listas. */
async function esperarHomeListo(page) {
  await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 15000 });
  // La bienvenida dura mín. 2 s + fade; tope 6 s + margen
  await page
    .waitForSelector('[aria-label="Bienvenido a Pica — cargando"]', {
      state: 'detached',
      timeout: 12000,
    })
    .catch(() => {});
  await sleep(1000);
}

/** Oculta el widget del chat (vistas de datos: tapa la fuente/tabla). */
async function ocultarChat(page) {
  await page.addStyleTag({
    content:
      'button[aria-label*="asistente de datos"], section[aria-label="Asistente de datos de Pica"] { display: none !important; }',
  });
}

/** Punto en coordenadas de pantalla para un (x,y) en % del landscape. */
async function puntoDelStage(page, fx, fy) {
  const img = page.locator('img[alt^="Ciudad de Montevideo"]').first();
  const box = await img.boundingBox();
  if (!box) throw new Error('no encontré el stage del landscape');
  return { x: box.x + fx * box.width, y: box.y + fy * box.height };
}

/** Verifica que un texto esté presente (el dato REAL cargó) antes de capturar. */
async function verificar(page, texto) {
  await page.waitForSelector(`text=${texto}`, { timeout: 15000 });
}

async function captura(page, nombre) {
  await page.screenshot({ path: join(OUT, nombre), type: 'png' });
  console.log(`  ✓ ${OUT}/${nombre}`);
}

// ── Las nueve capturas ───────────────────────────────────────────────────────

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  if (quiere('home')) {
  // 1 — Home por defecto: ciudad viva (puntos circulando, grises deambulando)
  console.log('1. home-default…');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await esperarHomeListo(page);
  await sleep(6000); // puntos repartidos por las calles, ventanas titilando
  await captura(page, 'home-default.png');

  // 2 — Hover sostenido sobre la Intendencia (Trabajo): destello amarillo
  console.log('2. home-hover…');
  const cTrabajo = centroid(polygonOf('trabajo'));
  const pHover = await puntoDelStage(page, cTrabajo.x, cTrabajo.y);
  await page.mouse.move(pHover.x, pHover.y, { steps: 8 });
  await sleep(1500); // transición del destello (350 ms) bien asentada
  await captura(page, 'home-hover.png');

  // 3 — Overlay de temática: click en el IAVA (Educación)
  console.log('3. home-overlay…');
  const cEducacion = centroid(polygonOf('educacion'));
  const pClick = await puntoDelStage(page, cEducacion.x, cEducacion.y);
  await page.mouse.click(pClick.x, pClick.y);
  await sleep(6000); // grayscale + convergencia + overlay abierto + personaje girando
  await verificar(page, 'Explorar');
  await captura(page, 'home-overlay.png');
  }

  if (quiere('interactivo-explorador')) {
  // 4 — Explorador: grilla de entidades de Economía (íconos pixel nuevos)
  console.log('4. interactivo-explorador…');
  await page.goto(`${BASE}/interactivo?tema=economia`, { waitUntil: 'networkidle' });
  await ocultarChat(page);
  await verificar(page, '¿Qué querés explorar?');
  await sleep(4000); // stagger de las tarjetas terminado
  await captura(page, 'interactivo-explorador.png');
  }

  if (quiere('viz-tipo-a')) {
  // 5 — Tipo A: ingreso medio mensual del hogar (count-up + multitud contexto)
  console.log('5. viz-tipo-a…');
  await page.goto(
    `${BASE}/interactivo?tema=trabajo&entidad=hogares&caracteristica=ingreso-medio-hogares`,
    { waitUntil: 'networkidle' },
  );
  await ocultarChat(page);
  await verificar(page, 'Ingreso medio mensual del hogar');
  await sleep(6000); // count-up terminado, multitud formada
  await captura(page, 'viz-tipo-a.png');
  }

  if (quiere('viz-tipo-b')) {
  // 6 — Tipo B: máximo nivel educativo alcanzado (multitud isotype clásica)
  console.log('6. viz-tipo-b…');
  await page.goto(
    `${BASE}/interactivo?tema=educacion&entidad=personas-de-25-anos-o-mas&caracteristica=nivel-educativo`,
    { waitUntil: 'networkidle' },
  );
  await ocultarChat(page);
  await verificar(page, 'Máximo nivel educativo alcanzado');
  await sleep(8000); // ~800 figuras YA formadas en su grilla
  await captura(page, 'viz-tipo-b.png');
  }

  if (quiere('viz-tipo-c')) {
  // 7 — Tipo C: culminación de media superior (isotype por período + rail de años)
  console.log('7. viz-tipo-c…');
  await page.goto(
    `${BASE}/interactivo?tema=educacion&entidad=jovenes-de-21-a-23-anos&caracteristica=egreso-media-superior`,
    { waitUntil: 'networkidle' },
  );
  await ocultarChat(page);
  await verificar(page, 'Culminación de la educación media superior');
  await sleep(8000);
  await captura(page, 'viz-tipo-c.png');
  }

  if (quiere('viz-tipo-e')) {
  // 8 — Tipo E: tasa de empleo por departamento (coropleta + panel con multitud)
  console.log('8. viz-tipo-e…');
  await page.goto(
    `${BASE}/interactivo?tema=trabajo&entidad=departamentos&caracteristica=empleo-por-departamento`,
    { waitUntil: 'networkidle' },
  );
  await ocultarChat(page);
  await verificar(page, 'Tasa de empleo');
  await sleep(5000);
  // El estado inicial arranca con el departamento top SELECCIONADO (resto en
  // gris). Para documentar la coropleta completa de los 19, lo des-seleccionamos:
  // click en el path más "encendido" (el seleccionado) y mouse afuera.
  await page.evaluate(() => {
    const paths = [...document.querySelectorAll('svg path')];
    // el seleccionado es el único path que NO está en gris (#3B3B36) ni sin dato
    const sel = paths.find((p) => {
      const f = p.getAttribute('fill') ?? '';
      return f && f !== '#3B3B36' && f !== '#26262A';
    });
    sel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.mouse.move(80, 450); // afuera del mapa: sin hover
  await sleep(2500); // transición de colores asentada
  await captura(page, 'viz-tipo-e.png');
  }

  if (quiere('viz-isotype-multitud')) {
  // 9 — La multitud más impactante: matriculados en terciaria (10 colores,
  //     "1 figura = 500 estudiantes" visible)
  console.log('9. viz-isotype-multitud…');
  await page.goto(
    `${BASE}/interactivo?tema=educacion&entidad=areas-de-conocimiento&caracteristica=matriculados-terciaria-por-area`,
    { waitUntil: 'networkidle' },
  );
  await ocultarChat(page);
  await verificar(page, 'Matriculados en educación terciaria');
  await verificar(page, '1 figura = 500 estudiantes');
  await sleep(8000);
  await captura(page, 'viz-isotype-multitud.png');
  }

  await browser.close();
  console.log('\nListo: 9 capturas en docs/capturas/ (3200×1800 PNG).');
};

run().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
