import { Suspense } from 'react';
import InteractiveLayout from '@/components/interactive/InteractiveLayout';

// /interactivo — explorador de datos.
// InteractiveLayout usa useSearchParams (estado en la URL) → necesita Suspense.
export default function InteractivoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-bg-base">
          <p className="font-sans text-pica-paragraph text-text-secondary">Cargando…</p>
        </main>
      }
    >
      <InteractiveLayout />
    </Suspense>
  );
}
