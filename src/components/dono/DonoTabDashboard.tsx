import { Filter, TrendingUp, Award, Activity, Users, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { hexToRgba } from "@/lib/branding";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie, Legend } from "recharts";
import { DonoTabDashboardProps } from "@/types/dono";

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
};

export function DonoTabDashboard({ stats, barbeiros, barbeiroFiltroId, onFiltroChange, brand, glass }: DonoTabDashboardProps) {
  const COLORS = [brand, hexToRgba(brand, 0.25)];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-white/50" />
        <select
          value={barbeiroFiltroId}
          onChange={(e) => onFiltroChange(e.target.value)}
          className="rounded-full border border-white/[0.12] bg-black/35 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 color-scheme-dark text-white backdrop-blur-sm"
        >
          <option value="">Todos os barbeiros</option>
          {barbeiros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-[20px] border border-white/[0.08]" style={glass}>
          <div className="flex items-center gap-1.5 mb-2 opacity-60">
            <TrendingUp className="h-3 w-3" />
            <p className="text-[9px] font-black uppercase tracking-widest">Margem de Lucro</p>
          </div>
          <p className="text-xl font-black tabular-nums" style={{ color: brand }}>
            {stats.margemLucro}%
          </p>
        </Card>

        <Card className="p-4 rounded-[20px] border border-white/[0.08]" style={glass}>
          <div className="flex items-center gap-1.5 mb-2 opacity-60">
            <Award className="h-3 w-3" />
            <p className="text-[9px] font-black uppercase tracking-widest">Destaque do Dia</p>
          </div>
          <p className="text-xl font-black truncate text-white">{stats.topBarbeiro ? stats.topBarbeiro.name : "-"}</p>
        </Card>

        <Card className="p-4 rounded-[20px] border border-white/[0.08] col-span-2 sm:col-span-1" style={glass}>
          <div className="flex items-center gap-1.5 mb-2 opacity-60">
            <Activity className="h-3 w-3" />
            <p className="text-[9px] font-black uppercase tracking-widest">Média / Profissional</p>
          </div>
          <p className="text-xl font-black text-white tabular-nums">R$ {stats.mediaPorBarbeiro}</p>
        </Card>
      </div>

      <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl relative" style={glass}>
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-4 w-4 opacity-50" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produção por Profissional</p>
        </div>
        {!stats.hasDataEquipe ? (
          <div className="flex flex-col items-center justify-center h-40 text-center space-y-3 opacity-60">
            <BarChart3 className="h-8 w-8 text-zinc-600 mb-1" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum corte registrado hoje</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.dataEquipe} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#777" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#777" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ backgroundColor: "#000", border: "1px solid #333", borderRadius: "16px", fontSize: "12px" }}
                  itemStyle={{ color: brand }}
                  formatter={(value: number) => [`R$ ${formatarMoedaBR(value)}`, "Produção"]}
                />
                <Bar dataKey="Total" radius={[6, 6, 6, 6]} maxBarSize={45}>
                  {stats.dataEquipe.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? brand : hexToRgba(brand, 0.4)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl relative" style={glass}>
        <div className="flex items-center gap-2 mb-2">
          <PieChartIcon className="h-4 w-4 opacity-50" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Distribuição (Lucro vs Comissão)</p>
        </div>
        {!stats.hasDataFinanceiro ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-60">
            <PieChartIcon className="h-8 w-8 text-zinc-600 mb-1" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sem faturamento no momento</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.dataFinanceiro} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {stats.dataFinanceiro.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#000", border: "1px solid #333", borderRadius: "16px", fontSize: "12px" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: number) => [`R$ ${formatarMoedaBR(value)}`, ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
