// Skeleton mientras carga el dataset (ver pica-ui).
export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="font-sans text-pica-paragraph text-text-secondary">
        Cargando datos…
      </p>
    </main>
  );
}
