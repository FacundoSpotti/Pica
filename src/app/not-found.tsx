import Link from 'next/link';

// 404
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-pica-heading text-text-primary">404</h1>
      <p className="font-sans text-pica-paragraph text-text-secondary">
        Esta página se escondió demasiado bien. No la encontramos.
      </p>
      <Link
        href="/"
        className="font-display text-pica-button text-text-primary underline underline-offset-4"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
