import { Skeleton } from "@/components/ui/skeleton";

export type IndexSkeletonTab = "barbeiro" | "dono" | "carteira";

type IndexPageSkeletonProps = {
  tab: IndexSkeletonTab;
};

// ✅ Cor centralizada — troca aqui, muda tudo
const S = "bg-zinc-800";

function SkeletonAgendaBarbeiro() {
  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <Skeleton className={`h-8 w-44 ${S}`} />
        <Skeleton className={`h-14 w-full sm:w-52 rounded-[20px] ${S}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className={`h-24 rounded-2xl ${S}`} />
        <Skeleton className={`h-24 rounded-2xl ${S}`} />
      </div>
      <div className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={`h-32 w-full rounded-[24px] ${S}`} />
        ))}
      </div>
    </div>
  );
}

function SkeletonDashboardDono() {
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <Skeleton className={`h-40 w-full rounded-[22px] ${S}`} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className={`h-28 rounded-[22px] ${S}`} />
        <Skeleton className={`h-28 rounded-[22px] ${S}`} />
        <Skeleton className={`h-28 rounded-[22px] ${S}`} />
        <Skeleton className={`h-28 rounded-[22px] ${S}`} />
      </div>
      <div className="space-y-4 pt-2">
        <Skeleton className={`h-5 w-40 ${S}`} />
        <Skeleton className={`h-48 w-full rounded-[22px] ${S}`} />
      </div>
    </div>
  );
}

function SkeletonCarteira() {
  return (
    <div className="space-y-6 w-full">
      <Skeleton className={`h-40 w-full rounded-[32px] ${S}`} />
      <div className="grid gap-4">
        <Skeleton className={`h-24 w-full rounded-[20px] ${S}`} />
        <Skeleton className={`h-24 w-full rounded-[20px] ${S}`} />
      </div>
    </div>
  );
}

export function IndexPageSkeleton({ tab }: IndexPageSkeletonProps) {
  const showDateStrip = tab !== "carteira";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <header className="pt-6 pb-4 px-4 border-b border-zinc-800/50 flex justify-between items-center bg-black shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className={`h-10 w-10 rounded-xl ${S}`} />
          <div className="space-y-2">
            <Skeleton className={`h-4 w-32 ${S}`} />
            <Skeleton className={`h-3 w-20 ${S}`} />
          </div>
        </div>
        <Skeleton className={`h-10 w-10 rounded-full ${S}`} />
      </header>

      {showDateStrip && (
        <div className="bg-black/90 backdrop-blur-md border-b border-zinc-800/50 p-3 flex items-center justify-center gap-3 sticky top-0 z-10 w-full shrink-0">
          <Skeleton className={`h-8 w-8 rounded-full ${S} shrink-0`} />
          <Skeleton className={`h-10 w-[14rem] max-w-full rounded-full ${S}`} />
          <Skeleton className={`h-8 w-14 rounded-full ${S} shrink-0`} />
        </div>
      )}

      <main className="flex-1 p-4 pb-32 max-w-7xl mx-auto w-full md:px-8 space-y-6">
        {tab === "carteira" && <SkeletonCarteira />}
        {tab === "dono" && <SkeletonDashboardDono />}
        {tab === "barbeiro" && <SkeletonAgendaBarbeiro />}
      </main>

      <nav className="fixed bottom-0 w-full bg-black/95 backdrop-blur-xl border-t border-zinc-800 flex justify-around p-2 shadow-2xl z-20 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-2 w-20">
            <Skeleton className={`h-6 w-6 rounded-md ${S}`} />
            <Skeleton className={`h-2 w-12 ${S}`} />
          </div>
        ))}
      </nav>
    </div>
  );
}