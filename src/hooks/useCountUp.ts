import { useState, useEffect, useRef } from "react";

/**
 * Hook para animação suave de contagem numérica usando requestAnimationFrame.
 * @param target Valor final alvo
 * @param duration Duração da animação em ms (padrão: 900)
 * @returns Valor animado atual
 */
export function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    const from = displayRef.current;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
