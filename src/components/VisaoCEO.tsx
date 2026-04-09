import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, Users, Store, DollarSign, ChevronDown, ChevronUp,
  BarChart3, ShieldCheck, ArrowUpRight, ClipboardList, CheckCircle,
  XCircle, Lock, Unlock, Download, Megaphone, UserPlus, Eye, Wallet, X, Loader2, Search, AlertTriangle, Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner"; 
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

const MotionButton = motion.create(Button);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

type CEOTab = "dashboard" | "aprovacoes" | "lojas" | "equipe";

export function VisaoCEO({ totalLojas = 0, vendedores = [] }: any) {
  const [tabAtiva, setTabAtiva] = useState<CEOTab>("dashboard");
  const [leadsRecentes, setLeadsRecentes] = useState<any[]>([]);
  const [lojasAtivas, setLojasAtivas] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  
  const [expandido, setExpandido] = useState<string | null>(null);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [planos, setPlanos] = useState<Record<string, string>>({});
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [novoAviso, setNovoAviso] = useState("");
  const [buscaLojas, setBuscaLojas] = useState(""); 

  const [modalConsultorAberto, setModalConsultorAberto] = useState(false);
  const [novoConsultor, setNovoConsultor] = useState({ nome: "", email: "", senha: "" });
  const [isSavingConsultor, setIsSavingConsultor] = useState(false);

  const [historicoMrr, setHistoricoMrr] = useState<any[]>([]);
  const [mrrTotal, setMrrTotal] = useState(0);

  const getValorPlano = (plano: string) => {
    if (plano === 'starter') return 50.00;
    if (plano === 'pro') return 99.90;
    if (plano === 'elite') return 497.00;
    return 99.90; 
  };

  const getComissaoPlano = (plano: string) => {
    if (plano === 'starter') return 50.00 * 0.30;
    if (plano === 'pro') return 99.90 * 0.40;
    if (plano === 'elite') return 497.00 * 0.50;
    return 0;
  };

  const carregarDados = async () => {
    try {
      const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      setLeadsRecentes(leads || []);

      const { data: lojas } = await supabase.from('barbearias').select('*').order('created_at', { ascending: false });
      const lojasData = lojas || [];
      setLojasAtivas(lojasData);

      const { data: vendedoresDB } = await supabase.from('perfis_vendedores').select('*');
      const listaVendedores = vendedoresDB || vendedores;

      let totalReceita = 0;
      lojasData.forEach(l => {
        if (l.ativo !== false) totalReceita += getValorPlano(l.plano);
      });
      setMrrTotal(totalReceita);

      setHistoricoMrr([
        { mes: 'M-5', mrr: totalReceita * 0.3 }, { mes: 'M-4', mrr: totalReceita * 0.45 },
        { mes: 'M-3', mrr: totalReceita * 0.6 }, { mes: 'M-2', mrr: totalReceita * 0.8 },
        { mes: 'M-1', mrr: totalReceita * 0.9 }, { mes: 'Atual', mrr: totalReceita },
      ]);

      const vendasConvertidas = leads?.filter(l => l.status === 'convertido') || [];
      const rankingCalculado = listaVendedores.map((v: any) => {
        const vendasDoCara = vendasConvertidas.filter(lead => lead.vendedor_id === v.id);
        let comissaoTotal = 0;
        vendasDoCara.forEach(venda => {
          comissaoTotal += getComissaoPlano(venda.dados_adicionais?.plano_escolhido || 'pro');
        });

        return {
          ...v, 
          ativo: v.ativo !== false, 
          total_lojas: vendasDoCara.length,
          comissao_pendente: comissaoTotal
        };
      });
      setRanking(rankingCalculado.sort((a, b) => b.comissao_pendente - a.comissao_pendente)); 
    } catch (err) {}
  };

  useEffect(() => { carregarDados(); }, [vendedores]);

  const statVisitas = leadsRecentes.filter(l => l.status === 'visita').length;
  const statPendentes = leadsRecentes.filter(l => l.status === 'pendente').length;
  const statConvertidos = leadsRecentes.filter(l => l.status === 'convertido').length;
  const taxaConversao = leadsRecentes.length > 0 ? ((statConvertidos / leadsRecentes.length) * 100).toFixed(0) : 0;

  const handleAprovarContrato = async (lead: any) => {
    const slugDesejado = slugs[lead.id];
    const planoEscolhido = planos[lead.id] || "pro";
    const extras = lead.dados_adicionais || {};

    if (!slugDesejado) return toast.error("Defina o Slug do link antes de aprovar.");
    if (!extras.email_dono || !extras.senha_temp) return toast.error("Este lead não possui e-mail e senha.");

    toast.loading("Verificando disponibilidade e ativando...", { id: "aprovacao" });

    try {
      const { data: slugExistente } = await supabase.from("barbearias").select("id").eq("slug", slugDesejado).maybeSingle();
      if (slugExistente) {
        throw new Error(`O link '${slugDesejado}' já está sendo usado por outra barbearia. Escolha outro.`);
      }

      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { 
        auth: { persistSession: false, autoRefreshToken: false, storageKey: `temp-loja-${Math.random()}` } 
      });
      
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: extras.email_dono, password: extras.senha_temp });
      if (authError) throw new Error(authError.message);
      
      const novoDonoId = authData.user!.id;
      await supabase.from("user_roles").insert({ user_id: novoDonoId, role: "dono" });

      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 7);

      const { error: barbError } = await supabase.from("barbearias").insert({
        nome: lead.nome_barbearia, slug: slugDesejado, dono_id: novoDonoId,
        cor_primaria: extras.cor_primaria || "#D4AF37", 
        cor_secundaria: extras.cor_secundaria || "#18181B",
        cor_destaque: extras.cor_destaque || "#FFFFFF",
        plano: planoEscolhido, ativo: true,
        data_vencimento: dataVencimento.toISOString() 
      });
      if (barbError) throw new Error(barbError.message);

      await supabase.from("leads").update({ status: 'convertido', dados_adicionais: { ...extras, plano_escolhido: planoEscolhido } }).eq('id', lead.id);

      toast.success("✅ Cliente Ativado com sucesso!", { id: "aprovacao" });
      carregarDados(); 
      setExpandido(null);
    } catch (err: any) {
      toast.error(err.message, { id: "aprovacao" });
    }
  };

  const handleCadastrarConsultor = async () => {
    if (!novoConsultor.nome || !novoConsultor.email || !novoConsultor.senha) {
      return toast.error("Preencha todos os campos do consultor!");
    }

    setIsSavingConsultor(true);
    toast.loading("Registrando consultor...", { id: "novo_consultor" });

    try {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { 
        auth: { persistSession: false, autoRefreshToken: false, storageKey: `temp-consultor-${Math.random()}` } 
      });
      
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ 
        email: novoConsultor.email, password: novoConsultor.senha 
      });
      
      if (authError) throw new Error(authError.message);
      const novoConsultorId = authData.user!.id;

      const { error: roleError } = await supabase.from("user_roles").insert({ 
        user_id: novoConsultorId, role: "vendedor" 
      });
      if (roleError) throw new Error("Erro ao dar permissão: " + roleError.message);

      const { error: perfilError } = await supabase.from("perfis_vendedores").insert({ 
        id: novoConsultorId, nome: novoConsultor.nome, email: novoConsultor.email, ativo: true 
      });
      if (perfilError) throw new Error("Erro ao criar perfil: " + perfilError.message);

      toast.success("✅ Consultor criado com sucesso!", { id: "novo_consultor" });
      carregarDados();
      setModalConsultorAberto(false);
      setNovoConsultor({ nome: "", email: "", senha: "" });

    } catch (err: any) {
      toast.error(err.message, { id: "novo_consultor" });
    } finally {
      setIsSavingConsultor(false);
    }
  };

  const handleRecusarContrato = async (leadId: string) => {
    if (!motivoRecusa) return toast.error("Digite o motivo da recusa para o vendedor.");
    try {
      await supabase.from("leads").update({ status: 'recusado', dados_adicionais: { motivo_recusa: motivoRecusa } }).eq('id', leadId);
      toast.success("Contrato devolvido ao vendedor.");
      carregarDados();
      setMotivoRecusa("");
      setExpandido(null);
    } catch { toast.error("Erro ao recusar."); }
  };

  const toggleStatusLoja = async (lojaId: string, statusAtual: boolean) => {
    try {
      await supabase.from("barbearias").update({ ativo: !statusAtual }).eq('id', lojaId);
      carregarDados();
      toast.success(!statusAtual ? "Acesso liberado!" : "Loja Bloqueada.");
    } catch { toast.error("Falha ao alterar status."); }
  };

  const toggleStatusVendedor = async (vendedorId: string, statusAtual: boolean) => {
    setRanking(prev => prev.map(v => v.id === vendedorId ? { ...v, ativo: !statusAtual } : v));
    try {
      const { error } = await supabase.from("perfis_vendedores").update({ ativo: !statusAtual }).eq('id', vendedorId);
      if (error) throw error;
      toast.success(!statusAtual ? "Acesso do vendedor restaurado." : "Acesso do vendedor cortado!");
      carregarDados(); 
    } catch { 
      toast.error("Erro ao alterar status do vendedor."); 
      carregarDados(); 
    }
  };

  // 🚀 NOVA LÓGICA: Excluir Vendedor (A Lixeira Inteligente)
  const excluirVendedor = async (vendedorId: string) => {
    if (!window.confirm("Deseja realmente EXCLUIR este consultor do sistema? Isso é permanente.")) return;

    toast.loading("Analisando exclusão...", { id: "excluir_vendedor" });
    try {
      // Trava de Segurança: Olha se o vendedor já registrou algum lead na vida
      const { count, error: countError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId);
      
      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error("Este consultor já registrou clientes no funil. Inative a conta no cadeado para não perder o histórico.");
      }

      // Se ele é fantasma (nunca vendeu), apaga de verdade.
      const { error } = await supabase.from("perfis_vendedores").delete().eq('id', vendedorId);
      if (error) throw error;

      toast.success("Consultor apagado definitivamente!", { id: "excluir_vendedor" });
      carregarDados(); 
    } catch (err: any) {
      toast.error(err.message, { id: "excluir_vendedor" });
    }
  };

  const pagarComissao = (vendedorId: string) => {
    toast.success("Pix registrado! Comissão zerada na tela.");
    setRanking(prev => prev.map(v => v.id === vendedorId ? { ...v, comissao_pendente: 0 } : v));
  };

  const dispararAviso = () => {
    if (!novoAviso) return;
    toast.success("Megafone ativado! Aviso será exibido (Simulação).");
    setNovoAviso("");
  };

  const exportarCaixa = () => {
    const header = "Barbearia,Plano,Mensalidade,Status\n";
    const rows = lojasAtivas.map(l => `${l.nome},${l.plano || 'pro'},R$${getValorPlano(l.plano || 'pro')},${l.ativo ? 'Ativa' : 'Bloqueada'}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caixa_cajtech_mes.csv';
    a.click();
    toast.success("Relatório Exportado!");
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const lojasFiltradas = lojasAtivas.filter(l => l.nome.toLowerCase().includes(buscaLojas.toLowerCase()));

  const navItems: { id: CEOTab; icon: any; label: string; badge?: number }[] = [
    { id: "dashboard", icon: BarChart3, label: "Métricas" },
    { id: "aprovacoes", icon: ClipboardList, label: "Aprovações", badge: statPendentes },
    { id: "lojas", icon: Store, label: "Lojas Ativas" },
    { id: "equipe", icon: Users, label: "Equipe Comercial" },
  ];

  return (
    <div className="space-y-6 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen text-white">
      <header className="flex flex-col gap-1 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em]">CAJ TECH Command Center</span>
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Mesa do CEO</h1>
      </header>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar border-b border-white/[0.08]" style={{ scrollbarWidth: 'none' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setTabAtiva(item.id)}
            className={cn("flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap", tabAtiva === item.id ? "border-emerald-500 text-emerald-500 bg-emerald-500/5" : "border-transparent text-zinc-500 hover:text-white")}>
            <item.icon className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-1 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tabAtiva} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

          {/* ================= ABA 1: DASHBOARD ================= */}
          {tabAtiva === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-5 bg-gradient-to-br from-zinc-900 to-black border-emerald-500/20 col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-24 w-24 text-emerald-500" /></div>
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <p className="text-[10px] uppercase font-black text-zinc-400 mb-1 tracking-widest">Receita Recorrente (MRR)</p>
                      <div className="flex items-end gap-2">
                        <p className="text-4xl font-black text-white italic">{formatarMoeda(mrrTotal)}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="icon" onClick={exportarCaixa} className="bg-transparent border-zinc-700 text-zinc-400 hover:text-white"><Download className="h-4 w-4"/></Button>
                  </div>
                  <div className="h-32 mt-6 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicoMrr}>
                        <defs>
                          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="mes" hide />
                        <YAxis hide />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} formatter={(val: number) => `R$${val.toFixed(2)}`} labelStyle={{ display: 'none' }} />
                        <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 bg-zinc-900/40 border-zinc-800">
                  <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Taxa de Conversão</p>
                  <p className="text-2xl font-black text-white italic">{taxaConversao}%</p>
                  <p className="text-[9px] text-emerald-500 font-bold mt-1">Aprovadas / Visitas</p>
                </Card>
                <Card className="p-4 bg-zinc-900/40 border-zinc-800">
                  <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Lojas Pagantes</p>
                  <p className="text-2xl font-black text-white italic">{lojasAtivas.filter(l => l.ativo !== false).length}</p>
                </Card>
              </div>

              <Card className="p-4 bg-blue-500/10 border-blue-500/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Megaphone className="h-4 w-4" />
                  <h3 className="font-black uppercase text-xs tracking-widest">Aviso para toda a rede</h3>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Escreva uma novidade..." className="bg-black/50 border-blue-500/20 text-xs text-white" value={novoAviso} onChange={(e) => setNovoAviso(e.target.value)} />
                  <Button onClick={dispararAviso} className="bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white">Enviar</Button>
                </div>
              </Card>
            </div>
          )}

          {/* ================= ABA 2: APROVAÇÕES ================= */}
          {tabAtiva === "aprovacoes" && (
            <div className="space-y-3">
              {leadsRecentes.filter(l => l.status === 'pendente').map((lead) => (
                <Card key={lead.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden transition-all">
                  <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-800/30" onClick={() => setExpandido(expandido === lead.id ? null : lead.id)}>
                    <div>
                      <h4 className="font-bold text-white text-sm uppercase italic">{lead.nome_barbearia}</h4>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1">👤 Consultor: {ranking.find((v:any) => v.id === lead.vendedor_id)?.nome || "Desconhecido"}</p>
                    </div>
                    {expandido === lead.id ? <ChevronUp className="text-zinc-500" /> : <ChevronDown className="text-zinc-500" />}
                  </div>

                  {expandido === lead.id && (
                    <div className="p-4 bg-black/40 border-t border-zinc-800 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-zinc-400 bg-black p-3 rounded-xl border border-zinc-800/50">
                        <div>E-mail: <span className="text-white lowercase">{lead.dados_adicionais?.email_dono}</span></div>
                        <div>Senha: <span className="text-white">{lead.dados_adicionais?.senha_temp}</span></div>
                        <div>Tel: <span className="text-white">{lead.dados_adicionais?.telefone || '---'}</span></div>
                        <div className="flex items-center gap-2">Cor Primária: <div className="h-3 w-3 rounded-full border border-zinc-700" style={{ backgroundColor: lead.dados_adicionais?.cor_primaria }}/></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase ml-1">Plano Vendido</label>
                          <Select value={planos[lead.id] || lead.dados_adicionais?.plano_escolhido || "pro"} onValueChange={(v) => setPlanos({...planos, [lead.id]: v})}>
                            <SelectTrigger className="bg-zinc-900 border-zinc-700 h-11 rounded-xl text-xs font-bold text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                              <SelectItem value="starter">Starter (R$ 50)</SelectItem>
                              <SelectItem value="pro">Pro (R$ 99,90)</SelectItem>
                              <SelectItem value="elite">Elite (R$ 497)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase ml-1">Slug do Link <span className="text-red-500">*</span></label>
                          <Input placeholder="nome-da-barbearia" className="bg-zinc-900 border-zinc-700 h-11 rounded-xl text-xs font-bold text-white" value={slugs[lead.id] || ""} onChange={e => setSlugs({ ...slugs, [lead.id]: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button onClick={() => handleAprovarContrato(lead)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 rounded-xl text-xs uppercase shadow-lg border-0"><CheckCircle className="h-4 w-4 mr-2"/> Aprovar Sistema</Button>
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t border-zinc-800/50">
                        <Input placeholder="Motivo da recusa para o vendedor..." className="bg-zinc-900 border-zinc-800 text-xs h-10 text-white" value={motivoRecusa} onChange={e => setMotivoRecusa(e.target.value)} />
                        <Button variant="outline" onClick={() => handleRecusarContrato(lead.id)} className="h-10 text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 font-bold uppercase text-[10px]"><XCircle className="h-4 w-4 mr-1"/> Recusar</Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {statPendentes === 0 && <p className="text-center text-xs font-bold text-zinc-600 uppercase italic py-10">Nenhum contrato aguardando aprovação.</p>}
            </div>
          )}

          {/* ================= ABA 3: LOJAS ATIVAS ================= */}
          {tabAtiva === "lojas" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input placeholder="Buscar loja..." value={buscaLojas} onChange={(e) => setBuscaLojas(e.target.value)} className="bg-zinc-900 border-zinc-800 pl-10 text-white rounded-xl h-10" />
              </div>
              <div className="grid gap-3">
                {lojasFiltradas.map(loja => (
                  <Card key={loja.id} className={cn("p-4 border flex flex-col gap-3 transition-colors", loja.ativo === false ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900/40 border-zinc-800")}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", loja.ativo === false ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                          <h4 className={cn("font-bold text-sm uppercase italic", loja.ativo === false ? "text-red-400" : "text-white")}>{loja.nome}</h4>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 flex items-center gap-1">cajtech.net.br/agendar/{loja.slug}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase border", loja.plano === 'elite' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700")}>
                          {loja.plano || 'Pro'}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-bold">{formatarMoeda(getValorPlano(loja.plano || 'pro'))}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-white/[0.05] pt-3">
                      <Button variant="outline" size="sm" onClick={() => toggleStatusLoja(loja.id, loja.ativo !== false)} className={cn("flex-1 h-9 text-[10px] font-bold uppercase border-zinc-700", loja.ativo === false ? "text-emerald-500 hover:text-emerald-400" : "text-red-500 hover:text-red-400")}>
                        {loja.ativo === false ? <Unlock className="h-3 w-3 mr-2" /> : <Lock className="h-3 w-3 mr-2" />}
                        {loja.ativo === false ? "Desbloquear" : "Cortar Acesso"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toast.info("Requer Edge Function configurada para impersonificação de token.")} className="flex-1 h-9 text-[10px] font-bold uppercase text-zinc-400 border-zinc-700 hover:text-white">
                        <Eye className="h-3 w-3 mr-2" /> Acessar Admin
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ================= ABA 4: EQUIPE COMERCIAL ================= */}
          {tabAtiva === "equipe" && (
            <div className="space-y-4">
              
              <Button 
                onClick={() => setModalConsultorAberto(true)} 
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-12 rounded-xl text-xs uppercase border border-zinc-700 border-dashed mb-4"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Novo Consultor
              </Button>
              
              <div className="grid gap-3">
                {ranking.map((v: any, index: number) => (
                  <Card key={v.id} className={cn("p-4 border transition-colors", v.ativo ? "bg-zinc-900/40 border-zinc-800" : "bg-red-900/10 border-red-900/30 opacity-70")}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-sm text-zinc-500">#{index + 1}</div>
                        <div>
                          <p className="font-bold text-white text-sm uppercase italic flex items-center gap-2">
                            {v.nome}
                            {!v.ativo && <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full not-italic">INATIVO</span>}
                          </p>
                          <p className="text-[9px] text-emerald-500 uppercase font-bold">{v.total_lojas} Lojas Vendidas</p>
                        </div>
                      </div>
                      
                      {/* BOTÕES DE CONTROLE: Cadeado e Lixeira */}
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => toggleStatusVendedor(v.id, v.ativo)} className={cn("h-8 w-8 rounded-lg", v.ativo ? "text-zinc-500 hover:text-red-500 hover:bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10")} title={v.ativo ? "Bloquear Acesso" : "Restaurar Acesso"}>
                           {v.ativo ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => excluirVendedor(v.id)} className="h-8 w-8 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10" title="Apagar Vendedor">
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                    </div>
                    
                    <div className="flex justify-between items-center bg-black/50 rounded-xl p-3 border border-zinc-800/50">
                      <div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase">Comissão a Pagar</p>
                        <p className={cn("text-lg font-black italic", v.comissao_pendente > 0 ? "text-emerald-500" : "text-zinc-600")}>{formatarMoeda(v.comissao_pendente)}</p>
                      </div>
                      <Button size="sm" onClick={() => pagarComissao(v.id)} disabled={v.comissao_pendente === 0} className="h-8 text-[10px] uppercase font-bold bg-zinc-800 text-white hover:bg-emerald-600 border border-zinc-700 disabled:opacity-30 transition-colors">
                        <Wallet className="h-3 w-3 mr-1.5" /> Zerar Saldo
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ================= MODAL NOVO CONSULTOR ================= */}
      {modalConsultorAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-black uppercase italic text-xl">Novo Consultor</h2>
              <button onClick={() => setModalConsultorAberto(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800 h-8 w-8 flex items-center justify-center rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">Nome Completo</label>
                <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl focus:border-emerald-500" placeholder="Ex: Carlos Vendas" value={novoConsultor.nome} onChange={e => setNovoConsultor({ ...novoConsultor, nome: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">E-mail de Acesso</label>
                <Input type="email" className="bg-black border-zinc-800 text-white h-12 rounded-xl focus:border-emerald-500" placeholder="carlos@cajtech.net.br" value={novoConsultor.email} onChange={e => setNovoConsultor({ ...novoConsultor, email: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">Senha (Mín. 6 dígitos)</label>
                <Input type="password" className="bg-black border-zinc-800 text-white h-12 rounded-xl focus:border-emerald-500" placeholder="******" value={novoConsultor.senha} onChange={e => setNovoConsultor({ ...novoConsultor, senha: e.target.value })} />
              </div>
            </div>

            <Button onClick={handleCadastrarConsultor} disabled={isSavingConsultor} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-14 rounded-2xl text-sm uppercase italic shadow-lg shadow-emerald-600/20">
              {isSavingConsultor ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar e Liberar Acesso"}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

export default VisaoCEO;