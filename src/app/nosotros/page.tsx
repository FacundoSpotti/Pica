import Link from 'next/link';

// /nosotros — quiénes somos, fuentes, valores.
// Placeholder: las 5 cards y el logo centrado animado llegan en tareas posteriores.
export default function NosotrosPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-pica-heading-2 text-text-primary">
        Sobre nosotros
      </h1>
      <p className="font-sans text-pica-paragraph text-text-secondary max-w-md">
        Pica es un proyecto académico de Diseño Interactivo (ORT Uruguay) que
        transforma datos oficiales en experiencias visuales accesibles.
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
