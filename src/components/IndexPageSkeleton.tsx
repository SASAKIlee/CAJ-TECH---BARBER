import { Skeleton } from "@/components/ui/skeleton";

export type IndexSkeletonTab = "barbeiro" | "dono" | "carteira";

type IndexPageSkeletonProps = {
  /** Aba ativa no Index — espelha faixa de data e conteúdo principal. */
  tab: IndexSkeletonTab;
};

function SkeletonAgendaBarbeiro() {
  return (
    // 🚀 CORREÇÃO: Adicionado o wrapper div com space-y-6 para manter o ritmo da página
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <Skeleton className="h-8 w-44 bg-zinc-800" />
        <Skeleton className="h-14 w-full sm:w-52 rounded-[20px] bg-zinc-800" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl bg-zinc-800" />
        <Skeleton className="h-24 rounded-2xl bg-zinc-800" />
      </div>

      <div className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-[24px] bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}

function SkeletonDashboardDono() {
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <Skeleton className="h-40 w-full rounded-[22px] bg-zinc-800" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28 rounded-[22px] bg-zinc-800" />
        <Skeleton className="h-28 rounded-[22px] bg-zinc-800" />
        <Skeleton className="h-28 rounded-[22px] bg-zinc-800" />
        <Skeleton className="h-28 rounded-[22px] bg-zinc-800" />
      </div>

      <div className="space-y-4 pt-2">
        <Skeleton className="h-5 w-40 bg-zinc-800" />
        <Skeleton className="h-48 w-full rounded-[22px] bg-zinc-800" />
      </div>
    </div>
  );
}

function SkeletonCarteiraBarbeiro() {
  return (
    <div className="space-y-6 w-full">
      <Skeleton className="h-40 w-full rounded-[32px] bg-zinc-800" />

      <div className="grid gap-4">
        <Skeleton className="h-24 w-full rounded-[20px] bg-zinc-800" />
        <Skeleton className="h-24 w-full rounded-[20px] bg-zinc-800" />
      </div>
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
    // 🚀 CORREÇÃO: Fundo 100% Dark para não dar flash branco no celular
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      
      <header className="pt-6 pb-4 px-4 border-b border-zinc-800/50 flex justify-between items-center bg-black shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-zinc-800" />
            <Skeleton className="h-3 w-16 bg-zinc-800" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-full bg-zinc-800" />
      </header>

      {showDateStrip && (
        <div className="bg-black/90 backdrop-blur-md border-b border-zinc-800/50 p-3 flex items-center justify-center gap-3 sticky top-0 z-10 w-full shrink-0">
          <Skeleton className="h-8 w-8 rounded-full bg-zinc-800 shrink-0" />
          <Skeleton className="h-10 w-[14rem] max-w-full rounded-full bg-zinc-800" />
          <Skeleton className="h-8 w-14 rounded-full bg-zinc-800 shrink-0" />
        </div>
      )}

      <main className="flex-1 p-4 pb-32 max-w-7xl mx-auto w-full md:px-8 space-y-6">
        {tab === "carteira" && <SkeletonCarteiraBarbeiro />}
        {tab === "dono" && <SkeletonDashboardDono />}
        {tab === "barbeiro" && <SkeletonAgendaBarbeiro />}
      </main>

      <nav className="fixed bottom-0 w-full bg-black/95 backdrop-blur-xl border-t border-zinc-800 flex justify-around p-2 shadow-2xl z-20 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* 🚀 CORREÇÃO: 3 ícones na barra de baixo para simular a Nav real perfeitamente */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-2 w-20">
            <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
            <Skeleton className="h-2 w-12 bg-zinc-800" />
          </div>
        ))}
      </nav>
    </div>
  );
}