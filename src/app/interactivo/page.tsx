import Link from 'next/link';

// /interactivo — explorador de datos.
// Placeholder: EntityScroller, CharacteristicExplorer y VizRouter llegan
// en tareas posteriores. El estado (tema/entidad/característica) vivirá en la URL.
export default function InteractivoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-pica-heading-2 text-text-primary">
        Explorador
      </h1>
      <p className="font-sans text-pica-paragraph text-text-secondary max-w-md">
        Scroll vertical para elegir una entidad, horizontal para recorrer sus
        características.
      </p>
      <Link
        href="/"
        className="font-display text-pica-button text-text-secondary underline underline-offset-4"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
