import React, { useRef } from "react";
import { Camera, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/branding";

const MotionButton = motion.create(Button);

interface BarbeiroAcoesProps {
  isDono: boolean;
  barbeiros: any[];
  barbeiroSelecionadoId: string;
  setBarbeiroSelecionadoId: (id: string) => void;
  brand: string;
  ctaFg: string;
  isScanning: boolean;
  onOpenScanner: () => void;
  onScannerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scannerRef: React.RefObject<HTMLInputElement>;
  onOpenModal: () => void;
}

export function BarbeiroAcoes({
  isDono, barbeiros, barbeiroSelecionadoId, setBarbeiroSelecionadoId,
  brand, ctaFg, isScanning, onOpenScanner, onScannerChange, scannerRef, onOpenModal
}: BarbeiroAcoesProps) {
  return (
    <div className="flex flex-col gap-4 mb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Agenda do Dia</h2>
          {isDono && (
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: brand }}>
              Visão Administrativa
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input ref={scannerRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={onScannerChange} aria-hidden />
          <MotionButton
            type="button"
            variant="outline"
            className="rounded-[20px] border-white/10 bg-white/5 h-14 px-6 font-black uppercase text-xs text-white hover:bg-white/10 disabled:opacity-50"
            whileTap={{ scale: 0.95 }}
            onClick={onOpenScanner}
            disabled={isScanning}
          >
            {isScanning ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Camera className="h-5 w-5 mr-2" />}
            Scanner
          </MotionButton>

          <MotionButton
            className="rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] gap-2 h-14 px-8 font-black uppercase text-xs border-0"
            style={{ backgroundColor: brand, color: ctaFg }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenModal}
          >
            <Plus className="h-5 w-5 stroke-[3px]" /> Novo Agendamento
          </MotionButton>
        </div>
      </div>

      {isDono && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          <MotionButton
            variant={barbeiroSelecionadoId === "" ? "default" : "outline"}
            size="sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => setBarbeiroSelecionadoId("")}
            className={cn("rounded-xl text-[10px] font-black uppercase h-10 px-5 border-white/[0.08] transition-colors", barbeiroSelecionadoId === "" && "border-0 shadow-lg")}
            style={barbeiroSelecionadoId === "" ? { backgroundColor: brand, color: ctaFg } : { backgroundColor: hexToRgba(brand, 0.05) }}
          >
            Todos
          </MotionButton>
          {barbeiros.map((b) => (
            <MotionButton
              key={b.id}
              variant={barbeiroSelecionadoId === b.id ? "default" : "outline"}
              size="sm"
              whileTap={{ scale: 0.95 }}
              onClick={() => setBarbeiroSelecionadoId(b.id)}
              className={cn("rounded-xl text-[10px] font-black uppercase h-10 px-5 whitespace-nowrap border-white/[0.08] transition-colors", barbeiroSelecionadoId === b.id && "border-0 shadow-lg", !b.ativo && "opacity-40 grayscale")}
              style={barbeiroSelecionadoId === b.id ? { backgroundColor: brand, color: ctaFg } : { backgroundColor: hexToRgba(brand, 0.05) }}
            >
              {b.nome} {!b.ativo && "(INATIVO)"}
            </MotionButton>
          ))}
        </div>
      )}
    </div>
  );
}