import { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { useCountUp } from "@/hooks/useCountUp";

interface StatCardProps {
  label: string;
  value: number;
  brand?: string;
  highlight?: boolean;
  delay?: number;
}

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0);
};

function StatCardComponent({ label, value, brand = "#D4AF37", highlight = false, delay = 0 }: StatCardProps) {
  const animated = useCountUp(value);
  const ctaFg = contrastTextOnBrand(brand);

  const valorFormatado = useMemo(() => `R$ ${formatarMoedaBR(animated)}`, [animated]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay }}
      className="w-full"
    >
      <Card
        className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-2xl h-full flex flex-col justify-center"
        style={{
          backgroundColor: highlight ? brand : hexToRgba(brand, 0.1),
          backdropFilter: "blur(14px)",
        }}
        role="status"
        aria-label={`${label}: ${valorFormatado}`}
      >
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em] mb-2",
            highlight ? "text-black/55" : "text-white/50"
          )}
        >
          {label}
        </p>
        <p
          className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight"
          style={{ color: highlight ? ctaFg : "#fff" }}
        >
          {valorFormatado}
        </p>
      </Card>
    </motion.div>
  );
}

export const StatCard = memo(StatCardComponent);