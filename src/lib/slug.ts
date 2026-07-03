// ─────────────────────────────────────────────────────────────────────────────
// PICA — slugs para URLs
// El estado de /interactivo vive en la URL (?tema=&entidad=&caracteristica=).
// Las entidades son strings con acentos y espacios → se sluggifican.
// ─────────────────────────────────────────────────────────────────────────────

/** 'Jóvenes de 21 a 23 años' → 'jovenes-de-21-a-23-anos' */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Busca en una lista el string cuyo slug coincide. */
export function findBySlug(items: readonly string[], slug: string): string | undefined {
  return items.find((item) => slugify(item) === slug);
}
