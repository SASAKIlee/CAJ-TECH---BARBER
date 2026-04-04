import { useEffect, useRef, useState } from "react";
import {
  Users,
  Scissors,
  Trash2,
  Plus,
  Power,
  PowerOff,
  Link as LinkIcon,
  Copy,
  LayoutDashboard,
  Settings2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { barbeiroSchema, servicoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { motion, AnimatePresence } from "framer-motion";

const MotionButton = motion.create(Button);

function useCountUp(target: number, duration = 900) {
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

function StatCard({
  label,
  value,
  brand,
  highlight,
  delay = 0,
}: {
  label: string;
  value: number;
  brand: string;
  highlight?: boolean;
  delay?: number;
}) {
  const animated = useCountUp(value);
  const ctaFg = contrastTextOnBrand(brand);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay }}
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.2)]",
        )}
        style={{
          backgroundColor: highlight ? brand : hexToRgba(brand, 0.1),
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em] mb-2",
            highlight ? "text-black/55" : "text-white/50",
          )}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold tabular-nums tracking-tight"
          style={{ color: highlight ? ctaFg : "#fff" }}
        >
          R$ {animated.toFixed(2)}
        </p>
      </Card>
    </motion.div>
  );
}

type DonoSubTab = "dashboard" | "config";

export function VisaoDono({
  faturamentoHoje = 0,
  comissoesAPagarHoje = 0,
  lucroRealHoje = 0,
  faturamentoMensal = 0,
  comissaoPorBarbeiroHoje = [],
  barbeiros = [],
  servicos = [],
  onAddBarbeiro,
  onRemoveBarbeiro,
  onAddServico,
  onRemoveServico,
  onToggleBarbeiroStatus,
  corPrimaria = "#D4AF37",
}: any) {
  const [nBarbeiro, setNBarbeiro] = useState({
    nome: "",
    comissao: "50",
    email: "",
    senha: "",
  });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });
  const [subTab, setSubTab] = useState<DonoSubTab>("dashboard");
  const [subDir, setSubDir] = useState(1);

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = {
    backgroundColor: hexToRgba(brand, 0.1),
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  } as const;

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  const switchSub = (next: DonoSubTab) => {
    const order: DonoSubTab[] = ["dashboard", "config"];
    setSubDir(order.indexOf(next) > order.indexOf(subTab) ? 1 : -1);
    setSubTab(next);
  };

  const handleAddBarbeiro = () => {
    const validacao = barbeiroSchema.safeParse(nBarbeiro);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

    onAddBarbeiro(
      validacao.data.nome,
      Number(validacao.data.comissao),
      validacao.data.email,
      validacao.data.senha,
    );
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  const handleAddServico = () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

    onAddServico(validacao.data.nome, Number(validacao.data.preco));
    setNServico({ nome: "", preco: "" });
  };

  const tabVariants = {
    enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
  };

  return (
    <div className="space-y-6 pb-32 w-full max-w-full overflow-x-hidden text-white">
      {/* Segmented control — Dashboard / Configurações */}
      <div
        className="flex rounded-2xl border border-white/[0.08] p-1 gap-1"
        style={glass}
      >
        {(
          [
            { id: "dashboard" as const, label: "Dashboard", Icon: LayoutDashboard },
            { id: "config" as const, label: "Configurações", Icon: Settings2 },
          ] as const
        ).map(({ id, label, Icon }) => (
          <MotionButton
            key={id}
            type="button"
            variant="ghost"
            whileTap={{ scale: 0.95 }}
            onClick={() => switchSub(id)}
            className={cn(
              "flex-1 h-11 rounded-xl text-[11px] font-bold uppercase tracking-wide gap-2",
              subTab === id
                ? "shadow-lg border-0"
                : "text-white/60 hover:text-white hover:bg-white/[0.06]",
            )}
            style={
              subTab === id
                ? { backgroundColor: brand, color: ctaFg }
                : undefined
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </MotionButton>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={subDir}>
        <motion.div
          key={subTab}
          custom={subDir}
          variants={tabVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 400, damping: 36 }}
          className="space-y-8"
        >
          {subTab === "dashboard" && (
            <>
              <section>
                <Card
                  className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
                  style={glass}
                >
                  <div className="absolute -right-4 -top-4 opacity-[0.07]">
                    <Scissors className="h-24 w-24 rotate-12" style={{ color: brand }} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="h-2 w-2 rounded-full animate-pulse"
                        style={{ backgroundColor: brand }}
                      />
                      <p
                        className="text-[10px] uppercase font-bold tracking-[0.25em]"
                        style={{ color: brand }}
                      >
                        Link de Agendamento Online
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3 flex items-center justify-between gap-2 backdrop-blur-md">
                        <code className="text-[11px] text-zinc-300 font-mono truncate">
                          cajtech.net.br/agendar/{barbeiros[0]?.barbearia_slug || "seu-slug"}
                        </code>
                        <MotionButton
                          size="sm"
                          whileTap={{ scale: 0.95 }}
                          className="h-8 px-4 rounded-xl shrink-0 font-bold uppercase text-[10px] border-0"
                          style={{ backgroundColor: brand, color: ctaFg }}
                          onClick={() => {
                            const slugAtivo = barbeiros[0]?.barbearia_slug || "seu-slug";
                            const linkCompleto = `https://cajtech.net.br/agendar/${slugAtivo}`;
                            void navigator.clipboard.writeText(linkCompleto);
                            toast.success("Link copiado!");
                          }}
                        >
                          <Copy className="h-3 w-3 mr-2" /> Copiar
                        </MotionButton>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Entradas hoje"
                  value={Number(faturamentoHoje) || 0}
                  brand={brand}
                  delay={0}
                />
                <StatCard
                  label="Lucro real hoje"
                  value={Number(lucroRealHoje) || 0}
                  brand={brand}
                  highlight
                  delay={0.06}
                />
                <StatCard
                  label="Faturamento mês"
                  value={Number(faturamentoMensal) || 0}
                  brand={brand}
                  delay={0.1}
                />
                <StatCard
                  label="Comissões hoje"
                  value={Number(comissoesAPagarHoje) || 0}
                  brand={brand}
                  delay={0.14}
                />
              </div>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <LinkIcon className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">
                    Produção de hoje
                  </h3>
                </div>
                <div className="grid gap-2">
                  {comissaoPorBarbeiroHoje.map((item: any, i: number) => (
                    <motion.div
                      key={item.barbeiro?.id ?? i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 360,
                        damping: 30,
                        delay: 0.05 * i,
                      }}
                    >
                      <Card
                        className={cn(
                          "p-4 rounded-[20px] border border-white/[0.08] flex justify-between items-center shadow-lg",
                          !item.barbeiro?.ativo && "opacity-60",
                        )}
                        style={glass}
                      >
                        <div>
                          <p className="font-semibold text-white uppercase text-xs tracking-tight">
                            {item.barbeiro?.nome}
                          </p>
                          <p className="text-[9px] text-white/45 font-bold uppercase tracking-tighter">
                            {item.cortes} atendimentos
                          </p>
                        </div>
                        <p
                          className="text-lg font-bold tabular-nums"
                          style={{ color: brand }}
                        >
                          R$ {formatarMoeda(item.total)}
                        </p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            </>
          )}

          {subTab === "config" && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Users className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">
                    Equipe
                  </h3>
                </div>
                <Card
                  className="p-4 rounded-[22px] border border-white/[0.08] space-y-3 shadow-xl"
                  style={glass}
                >
                  <input
                    placeholder="Nome do Barbeiro"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm"
                    value={nBarbeiro.nome}
                    onChange={(e) => setNBarbeiro({ ...nBarbeiro, nome: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      placeholder="Email"
                      className="flex-1 rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm"
                      value={nBarbeiro.email}
                      onChange={(e) => setNBarbeiro({ ...nBarbeiro, email: e.target.value })}
                    />
                    <input
                      placeholder="%"
                      type="number"
                      className="w-20 rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm"
                      value={nBarbeiro.comissao}
                      onChange={(e) => setNBarbeiro({ ...nBarbeiro, comissao: e.target.value })}
                    />
                  </div>
                  <input
                    placeholder="Senha"
                    type="password"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm"
                    value={nBarbeiro.senha}
                    onChange={(e) => setNBarbeiro({ ...nBarbeiro, senha: e.target.value })}
                  />
                  <MotionButton
                    className="w-full h-12 rounded-xl font-bold uppercase border-0"
                    style={{ backgroundColor: brand, color: ctaFg }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddBarbeiro}
                  >
                    Cadastrar Barbeiro
                  </MotionButton>
                </Card>

                <div className="grid gap-2">
                  {barbeiros.map((b: any) => (
                    <div
                      key={b.id}
                      className={cn(
                        "flex justify-between items-center rounded-xl border border-white/[0.08] p-3 transition-all",
                        !b.ativo && "opacity-50 grayscale",
                      )}
                      style={glass}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            b.ativo
                              ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                              : "bg-red-500",
                          )}
                        />
                        <span className="text-xs font-semibold text-white uppercase tracking-tight">
                          {b.nome} ({b.comissao_pct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MotionButton
                          variant="ghost"
                          size="sm"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)}
                          className={cn(
                            "h-8 w-8 p-0 rounded-full",
                            b.ativo ? "text-zinc-400 hover:text-red-400" : "text-green-400",
                          )}
                        >
                          {b.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </MotionButton>
                        <MotionButton
                          variant="ghost"
                          size="sm"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onRemoveBarbeiro(b.id)}
                          className="h-8 w-8 p-0 rounded-full text-zinc-500 hover:text-red-400"
                          disabled={b.ativo}
                        >
                          <Trash2 className="h-4 w-4" />
                        </MotionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Scissors className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">
                    Serviços e preços
                  </h3>
                </div>

                <Card
                  className="p-4 rounded-[22px] border border-white/[0.08] shadow-xl space-y-3"
                  style={glass}
                >
                  <input
                    placeholder="Nome do Serviço"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm"
                    value={nServico.nome}
                    onChange={(e) => setNServico({ ...nServico, nome: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-3 text-zinc-500 text-sm">R$</span>
                      <input
                        placeholder="0,00"
                        type="number"
                        className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 pl-9 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm"
                        value={nServico.preco}
                        onChange={(e) => setNServico({ ...nServico, preco: e.target.value })}
                      />
                    </div>
                    <MotionButton
                      className="h-12 w-14 shrink-0 rounded-xl border-0 p-0"
                      style={{ backgroundColor: brand, color: ctaFg }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddServico}
                    >
                      <Plus className="h-6 w-6 stroke-[3px]" />
                    </MotionButton>
                  </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {servicos.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center rounded-xl border border-white/[0.08] p-3"
                      style={glass}
                    >
                      <div className="text-[11px]">
                        <p className="font-semibold text-white uppercase tracking-tight">{s.nome}</p>
                        <p className="font-bold italic tabular-nums" style={{ color: brand }}>
                          R$ {formatarMoeda(s.preco)}
                        </p>
                      </div>
                      <MotionButton
                        variant="ghost"
                        size="icon"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRemoveServico(s.id)}
                        className="h-9 w-9 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </MotionButton>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
