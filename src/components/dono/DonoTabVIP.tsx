import { Zap, Crown, Trophy, Users, Lock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DonoTabVIPProps } from "@/types/dono";

export function DonoTabVIP({
  planoAtual,
  vipRemindersEnabled,
  vipClubEnabled,
  onVipRemindersChange,
  onVipClubChange,
  onUpgradeClick,
  brand,
  glass,
}: DonoTabVIPProps) {
  // Apenas plano PRO tem acesso VIP. Starter e Elite estão bloqueados.
  const temVIP = planoAtual === "pro";
  const isElite = planoAtual === "elite";

  return (
    <section className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" style={{ color: brand }} />
          <h3 className="font-black text-white uppercase text-xl italic">Central VIP</h3>
        </div>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Gerencie os recursos premium da sua barbearia: lembretes automáticos, clube de assinaturas e ativos VIP para clientes com maior retenção.
        </p>
      </div>

      {/* RESUMO CLIENTES VIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Card className="p-4 rounded-[20px] border border-white/[0.08] bg-yellow-950/20" style={{ ...glass, borderColor: "rgba(234,179,8,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Crown className="h-3 w-3 text-yellow-500" />
            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600">Clientes VIP</p>
          </div>
          <p className="text-2xl font-black text-yellow-300 tabular-nums">-</p>
          <p className="text-[9px] text-yellow-600/60 mt-1 uppercase font-bold">Carregando...</p>
        </Card>

        <Card className="p-4 rounded-[20px] border border-white/[0.08]" style={glass}>
          <div className="flex items-center gap-1.5 mb-2 opacity-60">
            <Trophy className="h-3 w-3" />
            <p className="text-[9px] font-black uppercase tracking-widest">Ativos VIP</p>
          </div>
          <p className="text-xl font-black text-white">
            {vipRemindersEnabled && vipClubEnabled ? "2/2" : vipRemindersEnabled || vipClubEnabled ? "1/2" : "0/2"}
          </p>
        </Card>

        <Card className="p-4 rounded-[20px] border border-white/[0.08] col-span-2 sm:col-span-1" style={glass}>
          <div className="flex items-center gap-1.5 mb-2 opacity-60">
            <Users className="h-3 w-3" />
            <p className="text-[9px] font-black uppercase tracking-widest">Plano VIP</p>
          </div>
          <p className="text-lg font-black text-white italic uppercase">{planoAtual}</p>
        </Card>
      </div>

      {!temVIP ? (
        <Card className="p-8 rounded-[22px] border border-white/[0.08] text-center flex flex-col items-center gap-4" style={glass}>
          <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
            {isElite ? <Lock className="h-8 w-8 text-yellow-500" /> : <Lock className="h-8 w-8 text-zinc-600" />}
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-white uppercase italic">
              {isElite ? "Plano Elite - Em Breve" : "Acesso VIP necessário"}
            </h4>
            <p className="text-sm text-zinc-400 max-w-[260px] mx-auto">
              {isElite
                ? "O plano Elite está sendo preparado. Aguarde novidades sobre Marketing e Tráfego Pago."
                : "Seu plano atual não permite ativar automações e clube de assinatura. Faça upgrade para PRO para liberar esses recursos."}
            </p>
          </div>
          {!isElite && (
            <>
              <div className="space-y-3 w-full text-left bg-black/30 p-5 rounded-2xl border border-white/5">
                <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Lembretes WhatsApp
                </p>
                <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Dashboard de Ganhos{" "}
                  <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full tracking-widest">NOVO</span>
                </p>
                <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Cliente VIP{" "}
                  <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full tracking-widest">NOVO</span>
                </p>
                <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Recados do Cliente{" "}
                  <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full tracking-widest">NOVO</span>
                </p>
                <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Barbeiros Ilimitados
                </p>
                <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Relatórios Avançados{" "}
                  <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full tracking-widest">NOVO</span>
                </p>
              </div>
              <Button
                onClick={onUpgradeClick}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase h-14 rounded-xl shadow-lg shadow-emerald-600/20 text-sm"
              >
                Evoluir para PRO
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="p-6 rounded-3xl border border-white/[0.08] bg-zinc-950/80">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black">Automação</p>
                <h4 className="text-xl font-black text-white">Lembretes VIP</h4>
                <p className="text-sm text-zinc-400 mt-2">Notifique clientes VIP automaticamente antes do agendamento e reduza faltas.</p>
              </div>
              <Switch
                checked={vipRemindersEnabled}
                onCheckedChange={(checked) => {
                  onVipRemindersChange(!!checked);
                }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-2">Frequência</p>
                <p className="text-sm text-zinc-300">2 horas antes do horário agendado, com mensagem personalizada por WhatsApp.</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-2">Status</p>
                <p className="text-sm text-zinc-300">{vipRemindersEnabled ? "Ativo para todos os clientes VIP" : "Desativado"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border border-white/[0.08] bg-zinc-950/80">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black">Clube</p>
                <h4 className="text-xl font-black text-white">Clube de Assinatura</h4>
                <p className="text-sm text-zinc-400 mt-2">Crie um programa de fidelidade com receita recorrente para clientes VIP.</p>
              </div>
              <Switch
                checked={vipClubEnabled}
                onCheckedChange={(checked) => {
                  onVipClubChange(!!checked);
                }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-2">Plano</p>
                <p className="text-sm text-zinc-300">Até 50 membros no clube de assinatura</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-2">Valor</p>
                <p className="text-sm text-zinc-300">Crie até 50 assinaturas recorrentes</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
