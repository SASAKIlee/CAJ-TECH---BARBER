import { Skeleton } from "@/components/ui/skeleton";

export type IndexSkeletonTab = "barbeiro" | "dono" | "carteira";

type IndexPageSkeletonProps = {
  /** Aba ativa no Index — espelha faixa de data e conteúdo principal. */
  tab: IndexSkeletonTab;
};

function SkeletonAgendaBarbeiro() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-12 w-full sm:w-52 rounded-full" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </>
  );
}

function SkeletonDashboardDono() {
  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden">
      <Skeleton className="h-36 w-full rounded-2xl" />

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonCarteiraBarbeiro() {
  return (
    <div className="space-y-6 w-full">
      <Skeleton className="h-28 w-full rounded-2xl" />

      <div className="grid gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

/**
 * Espelha a estrutura do Index (header, faixa de data opcional, área principal, nav inferior)
 * para reduzir layout shift durante o carregamento.
 */
export function IndexPageSkeleton({ tab }: IndexPageSkeletonProps) {
  const showDateStrip = tab !== "carteira";

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b flex justify-between items-center bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 w-36" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </header>

      {showDateStrip && (
        <div className="bg-card border-b p-3 flex items-center justify-center gap-3 sticky top-0 z-10 w-full shrink-0">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-9 w-[11rem] max-w-full rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full shrink-0" />
        </div>
      )}

      <main className="flex-1 p-4 pb-28 max-w-7xl mx-auto w-full md:px-8 space-y-6">
        {tab === "carteira" && <SkeletonCarteiraBarbeiro />}
        {tab === "dono" && <SkeletonDashboardDono />}
        {tab === "barbeiro" && <SkeletonAgendaBarbeiro />}
      </main>

      <nav className="fixed bottom-0 w-full bg-card border-t flex justify-around p-2 shadow-2xl z-20 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-1 p-2 w-20">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <div className="flex flex-col items-center gap-1 p-2 w-20">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </nav>
    </div>
  );
}
