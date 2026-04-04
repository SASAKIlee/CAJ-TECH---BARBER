/** Mesma referência visual da página pública de agendamento (hero + overlay premium). */
export const APP_HERO_FALLBACK_BG =
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=85&w=2400";

export function AppHeroBackdrop({ imageUrl }: { imageUrl: string }) {
  return (
    <>
      <div className="fixed inset-0 -z-30 bg-zinc-950" aria-hidden />
      <div
        className="fixed inset-0 -z-20 bg-zinc-950 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden
      />
      <div className="fixed inset-0 -z-10 bg-black/70 backdrop-blur-sm" aria-hidden />
    </>
  );
}
