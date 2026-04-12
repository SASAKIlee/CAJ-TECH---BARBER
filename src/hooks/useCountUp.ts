import { useState, useEffect, useRef } from "react";

/**
 * Hook para animação suave de contagem numérica usando requestAnimationFrame.
 * Ideal para exibir valores monetários ou estatísticas com efeito visual.
 *
 * @module useCountUp
 * @author CAJ TECH
 * @param target Valor final alvo da animação
 * @param duration Duração da animação em milissegundos (padrão: 900ms)
 * @returns Valor animado atual para exibição
 *
 * @example
 * const valor = useCountUp(1500); // Anima de 0 até 1500
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
