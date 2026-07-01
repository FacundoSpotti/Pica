import Link from 'next/link';

// Home — ruta /
// En esta fase es un placeholder. El Canvas de puntos, el CityLandscape,
// el ThemeOverlay y la convergencia se construyen en tareas posteriores.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="font-display text-pica-heading text-text-primary">PICA</h1>
      <p className="font-sans text-pica-paragraph text-text-secondary max-w-md">
        Los datos estaban escondidos en PDFs y planillas. Pica los encuentra y
        los revela.
      </p>
      <nav aria-label="Navegación principal" className="flex gap-6">
        <Link
          href="/interactivo"
          className="font-display text-pica-button text-text-primary underline underline-offset-4"
        >
          Explorar
        </Link>
        <Link
          href="/nosotros"
          className="font-display text-pica-button text-text-secondary underline underline-offset-4"
        >
          Sobre nosotros
        </Link>
      </nav>
    </main>
  );
}
