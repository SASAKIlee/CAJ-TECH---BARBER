import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, Users, Store, DollarSign, ChevronDown, ChevronUp,
  BarChart3, ShieldCheck, ArrowUpRight, ClipboardList, CheckCircle,
  XCircle, Lock, Unlock, Download, Megaphone, UserPlus, Eye, Wallet, X, Loader2, Search, AlertTriangle, Trash2, Smartphone, Calendar, CreditCard, Filter, ArrowRight, Activity, Bot, Settings, Edit3, PieChart as PieChartIcon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { cn } from "@/lib/utils";
import type { Vendedor, CarteiraComissao, ComissaoTipo } from "@/types/vendedor";

// Variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

type CEOTab = "dashboard" | "aprovacoes" | "lojas" | "equipe" | "comissoes";
type FiltroLoja = "todas" | "ativas" | "bloqueadas" | "trial";

export function VisaoCEO({ totalLojas = 0, vendedores = [] }: any) {
  const [tabAtiva, setTabAtiva] = useState<CEOTab>("dashboard");
  const [leadsRecentes, setLeadsRecentes] = useState<any[]>([]);
  const [lojasAtivas, setLojasAtivas] = useState<any[]>([]);
  const [ranking, setRanking] = useState<Vendedor[]>([]);
  const [carteira, setCarteira] = useState<CarteiraComissao[]>([]);
  const [loadingCarteira, setLoadingCarteira] = useState(false);

  const [expandido, setExpandido] = useState<string | null>(null);
  const [lojaExpandida, setLojaExpandida] = useState<string | null>(null);
  const [vendedorExpandido, setVendedorExpandido] = useState<string | null>(null);

  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [planos, setPlanos] = useState<Record<string, string>>({});
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [novoAviso, setNovoAviso] = useState("");
  const [enviandoAviso, setEnviandoAviso] = useState(false);

  const [buscaLojas, setBuscaLojas] = useState("");
  const [filtroLojas, setFiltroLojas] = useState<FiltroLoja>("todas");

  const [buscaAprovacoes, setBuscaAprovacoes] = useState("");

  const [modalConsultorAberto, setModalConsultorAberto] = useState(false);
  const [novoConsultor, setNovoConsultor] = useState({ nome: "", email: "", senha: "" });
  
  // Modal de edição de comissão
  const [modalComissaoAberto, setModalComissaoAberto] = useState(false);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<Vendedor | null>(null);
  
  // New state for plan-specific commissions
  const [comissaoStarter, setComissaoStarter] = useState("");
  const [comissaoPro, setComissaoPro] = useState("");
  const [comissaoElite, setComissaoElite] = useState("");

  const [isSavingConsultor, setIsSavingConsultor] = useState(false);
  const [isPagarComissao, setIsPagarComissao] = useState(false);

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
      const leadsData = leads || [];
      setLeadsRecentes(leadsData);

      const { data: lojas } = await supabase.from('barbearias').select('*').order('created_at', { ascending: false });
      const lojasData = lojas || [];
      
      const hoje = new Date();
      const lojasEnriquecidas = lojasData.map(loja => {
        const vencimento = loja.data_vencimento ? new Date(loja.data_vencimento) : null;
        const diffDias = vencimento ? Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 3600 * 24)) : 0;
        
        const criacao = new Date(loja.created_at);
        const diasDesdeCriacao = Math.ceil((hoje.getTime() - criacao.getTime()) / (1000 * 3600 * 24));
        const isTrial = diasDesdeCriacao <= 7;

        return { ...loja, diffDias, isTrial };
      });
      
      setLojasAtivas(lojasEnriquecidas);

      const { data: vendedoresDB } = await supabase
        .from('perfis_vendedores')
        .select('*');
      const listaVendedores = vendedoresDB || vendedores;

      // Buscar carteira de comissões
      setLoadingCarteira(true);
      const { data: carteiraDB } = await supabase
        .from('carteira_comissoes')
        .select(`
          *,
          vendedor:perfis_vendedores(nome)
        `)
        .order('mes_referencia', { ascending: false });
      
      if (carteiraDB) {
        const carteiraFormatada: CarteiraComissao[] = carteiraDB.map(c => ({
          id: c.id,
          vendedor_id: c.vendedor_id,
          mes_referencia: c.mes_referencia,
          valor_acumulado: Number(c.valor_acumulado || 0),
          status: c.status,
          data_fechamento: c.data_fechamento,
          data_pagamento: c.data_pagamento,
          vendedor_nome: (c as any).vendedor?.nome || 'Desconhecido'
        }));
        setCarteira(carteiraFormatada);
      }
      setLoadingCarteira(false);

      let totalReceita = 0;
      lojasEnriquecidas.forEach(l => {
        if (l.ativo !== false) totalReceita += getValorPlano(l.plano);
      });
      setMrrTotal(totalReceita);

      setHistoricoMrr([
        { mes: 'M-5', mrr: totalReceita * 0.3 }, { mes: 'M-4', mrr: totalReceita * 0.45 },
        { mes: 'M-3', mrr: totalReceita * 0.6 }, { mes: 'M-2', mrr: totalReceita * 0.8 },
        { mes: 'M-1', mrr: totalReceita * 0.9 }, { mes: 'Atual', mrr: totalReceita },
      ]);

      const rankingCalculado = listaVendedores.map((v: any) => {
        const leadsDoVendedor = leadsData.filter(lead => lead.vendedor_id === v.id);

        let comissaoPendente = 0;
        let mrrGerado = 0;
        let qtdVisita = 0;
        let qtdPendente = 0;
        let qtdConvertido = 0;

        leadsDoVendedor.forEach(lead => {
          if (lead.status === 'visita') qtdVisita++;
          if (lead.status === 'pendente') qtdPendente++;
          if (lead.status === 'convertido') {
            qtdConvertido++;
            const plano = lead.dados_adicionais?.plano_escolhido || 'pro';
            const valorPlano = getValorPlano(plano);
            mrrGerado += valorPlano;
            
            // Lógica Nova: Comissão específica por plano
            if (!lead.dados_adicionais?.comissao_paga) {
              let taxaAplicada = 30; // Padrão PRO

              if (plano === 'starter') {
                taxaAplicada = Number(v.comissao_starter || 20);
              } else if (plano === 'elite') {
                taxaAplicada = Number(v.comissao_elite || 40);
              } else {
                // Fallback para PRO ou legado
                taxaAplicada = Number(v.comissao_pro || v.comissao_valor || 30);
              }

              comissaoPendente += (valorPlano * taxaAplicada) / 100;
            }
          }
        });

        return {
          ...v,
          ativo: v.ativo !== false,
          leads_visita: qtdVisita,
          leads_pendente: qtdPendente,
          leads_convertido: qtdConvertido,
          mrr_gerado: mrrGerado,
          comissao_pendente: comissaoPendente
        };
      });

      setRanking(rankingCalculado.sort((a, b) => b.mrr_gerado - a.mrr_gerado));
    } catch (err) {
      console.error("Erro ao carregar dados do CEO:", err);
    }
  };

  const salvarComissao = async () => {
    if (!vendedorSelecionado) return;
    const valStarter = Number(comissaoStarter);
    const valPro = Number(comissaoPro);
    const valElite = Number(comissaoElite);

    if (isNaN(valStarter) || isNaN(valPro) || isNaN(valElite) || 
        valStarter < 0 || valPro < 0 || valElite < 0) {
      return toast.error("Valores inválidos. Verifique as porcentagens.");
    }

    try {
      const { error } = await supabase
        .from('perfis_vendedores')
        .update({ 
          comissao_starter: valStarter, 
          comissao_pro: valPro,
          comissao_elite: valElite
        })
        .eq('id', vendedorSelecionado.id);

      if (error) throw error;

      toast.success("Comissões por plano atualizadas!");
      setModalComissaoAberto(false);
      carregarDados();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
  };

  useEffect(() => { carregarDados(); }, [vendedores]);

  // KPIs
  const statVisitas = leadsRecentes.filter(l => l.status === 'visita').length;
  const statPendentes = leadsRecentes.filter(l => l.status === 'pendente').length;
  const statConvertidos = leadsRecentes.filter(l => l.status === 'convertido').length;
  const taxaConversao = leadsRecentes.length > 0 ? ((statConvertidos / leadsRecentes.length) * 100).toFixed(0) : 0;
  
  const countStarter = lojasAtivas.filter(l => l.plano === 'starter' && l.ativo !== false).length;
  const countPro = lojasAtivas.filter(l => (l.plano === 'pro' || !l.plano) && l.ativo !== false).length;
  const countElite = lojasAtivas.filter(l => l.plano === 'elite' && l.ativo !== false).length;

  const totalLojasNaBase = lojasAtivas.length;
  const lojasInativas = lojasAtivas.filter(l => l.ativo === false).length;
  const taxaChurn = totalLojasNaBase > 0 ? (lojasInativas / totalLojasNaBase) * 100 : 0;

  // 🤖 MOTOR DA I.A DE DIAGNÓSTICO
  const getDiagnosticoIA = () => {
    if (totalLojasNaBase === 0 && leadsRecentes.length === 0) {
      return { titulo: "SISTEMA ZERADO", cor: "text-zinc-400", bg: "bg-zinc-900/50", border: "border-zinc-800", texto: "Sua base está limpa. Cadastre vendedores e comece a prospectar." };
    }
    if (Number(taxaConversao) >= 25 && taxaChurn <= 10) {
      return { titulo: "OPERAÇÃO DE ELITE", cor: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", texto: `Sua máquina está voando! Conversão alta (${taxaConversao}%) e pouquíssimos cancelamentos. Pise no acelerador do marketing!` };
    } else if (Number(taxaConversao) < 15 && leadsRecentes.length > 5) {
      return { titulo: "ALERTA DE VENDAS", cor: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", texto: `A equipe visita, mas converte pouco (${taxaConversao}%). Revise o script de vendas com seus consultores urgentemente.` };
    } else if (taxaChurn > 20) {
      return { titulo: "RISCO DE CHURN", cor: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", texto: `Atenção! Você está perdendo muitos clientes (${taxaChurn.toFixed(0)}% bloqueados). Revise o atendimento pós-venda e retenção.` };
    } else {
      return { titulo: "CRESCIMENTO SAUDÁVEL", cor: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", texto: "A empresa está caminhando bem. Foque em converter os leads pendentes e treinar os vendedores para fechar planos Elite." };
    }
  };

  const diagnostico = getDiagnosticoIA();

  const dataPlanos = [
    { name: 'Starter', value: countStarter, color: '#a1a1aa' },
    { name: 'Pro', value: countPro, color: '#10b981' },
    { name: 'Elite', value: countElite, color: '#eab308' },
  ].filter(d => d.value > 0);

  const dataFunil = [
    { name: 'Visitas', value: statVisitas, fill: '#3f3f46' },
    { name: 'Negociação', value: statPendentes, fill: '#3b82f6' },
    { name: 'Fechados', value: statConvertidos, fill: '#10b981' },
  ];

  const handleAprovarContrato = async (lead: any) => {
    const slugDesejado = slugs[lead.id];
    const planoEscolhido = planos[lead.id] || lead.dados_adicionais?.plano_escolhido || "pro";
    const extras = lead.dados_adicionais || {};

    if (!slugDesejado) return toast.error("Defina o Slug do link antes de aprovar.");
    if (!extras.email_dono || !extras.senha_temp) return toast.error("Este lead não possui e-mail e senha.");

    toast.loading("Verificando disponibilidade e ativando...", { id: "aprovacao" });

    try {
      const { data: slugExistente } = await supabase.from("barbearias").select("id").eq("slug", slugDesejado).maybeSingle();
      if (slugExistente) {
        throw new Error(`O link '${slugDesejado}' já está sendo usado. Escolha outro.`);
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

      if (extras.telefone) {
        const msg = `Fala mestre, tudo bem? Aqui é da equipe CAJ TECH! 🚀\n\nSeu aplicativo exclusivo para a *${lead.nome_barbearia}* acabou de ser criado e já está no ar.\n\n🔗 *Link de Agendamento:* cajtech.net.br/agendar/${slugDesejado}\n\n🔒 *Acesso do Dono:*\nE-mail: ${extras.email_dono}\nSenha: ${extras.senha_temp}\n\nAcesse o sistema, configure seus serviços e bora lotar essa agenda! Qualquer dúvida, estamos aqui.`;
        window.open(`https://wa.me/55${extras.telefone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

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

  const renovarLojaManual = async (lojaId: string, dataAtual: string) => {
    toast.loading("Renovando assinatura...", { id: "renovacao" });
    try {
      const baseDate = dataAtual && new Date(dataAtual) > new Date() ? new Date(dataAtual) : new Date();
      baseDate.setDate(baseDate.getDate() + 30);
      
      await supabase.from("barbearias").update({ data_vencimento: baseDate.toISOString(), ativo: true }).eq('id', lojaId);
      carregarDados();
      toast.success("✅ Assinatura renovada por +30 dias!", { id: "renovacao" });
    } catch {
      toast.error("Erro ao renovar loja.", { id: "renovacao" });
    }
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

  const excluirVendedor = async (vendedorId: string) => {
    if (!window.confirm("Deseja realmente EXCLUIR este consultor do sistema? Isso é permanente.")) return;

    toast.loading("Analisando exclusão...", { id: "excluir_vendedor" });
    try {
      const { count, error: countError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId);
      
      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error("Este consultor já registrou clientes no funil. Inative a conta no cadeado para não perder o histórico.");
      }

      const { error } = await supabase.from("perfis_vendedores").delete().eq('id', vendedorId);
      if (error) throw error;

      toast.success("Consultor apagado definitivamente!", { id: "excluir_vendedor" });
      carregarDados(); 
    } catch (err: any) {
      toast.error(err.message, { id: "excluir_vendedor" });
    }
  };

  const pagarComissao = async (vendedorId: string) => {
    const vendedor = ranking.find(v => v.id === vendedorId)
    if (!vendedor || vendedor.comissao_pendente <= 0) return

    if (!confirm(`Confirmar pagamento de ${formatarMoeda(vendedor.comissao_pendente)} para ${vendedor.nome}?\n\nO valor será transferido via Mercado Pago.`)) return

    setIsPagarComissao(true)
    toast.loading("Processando pagamento...", { id: "pagamento" })
    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pagar-comissao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({
          vendedor_id: vendedorId,
          valor: vendedor.comissao_pendente,
          vendedor_email: vendedor.email
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Falha na comunicação com o gateway de pagamento")

      // Marca as comissões como pagas no banco
      const leadsParaPagar = leadsRecentes.filter(l => l.vendedor_id === vendedorId && l.status === 'convertido' && !l.dados_adicionais?.comissao_paga)

      for (const lead of leadsParaPagar) {
        const novosDadosAdicionais = {
          ...lead.dados_adicionais,
          comissao_paga: true,
          data_pagamento_comissao: new Date().toISOString()
        }
        await supabase.from("leads").update({ dados_adicionais: novosDadosAdicionais }).eq("id", lead.id)
      }

      toast.success(`Pagamento de ${formatarMoeda(vendedor.comissao_pendente)} realizado com sucesso para ${vendedor.nome}!`, { id: "pagamento" })
      carregarDados()
    } catch (err: any) {
      toast.error("Erro ao pagar: " + err.message, { id: "pagamento" })
    } finally {
      setIsPagarComissao(false)
    }
  }

  const dispararAviso = async () => {
    if (!novoAviso.trim()) return;
    
    setEnviandoAviso(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('avisos_rede')
        .insert({ 
          mensagem: novoAviso,
          criado_por: user?.id,
          ativo: true
        });

      if (error) throw error;

      toast.success("Aviso enviado para toda a rede! 📢");
      setNovoAviso("");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setEnviandoAviso(false);
    }
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
  const formatarData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '---';

  let lojasFiltradas = lojasAtivas.filter(l => l.nome.toLowerCase().includes(buscaLojas.toLowerCase()));
  if (filtroLojas === 'ativas') lojasFiltradas = lojasFiltradas.filter(l => l.ativo);
  if (filtroLojas === 'bloqueadas') lojasFiltradas = lojasFiltradas.filter(l => !l.ativo);
  if (filtroLojas === 'trial') lojasFiltradas = lojasFiltradas.filter(l => l.isTrial);
  
  const aprovacoesFiltradas = leadsRecentes.filter(l => l.status === 'pendente' && l.nome_barbearia.toLowerCase().includes(buscaAprovacoes.toLowerCase()));

  const navItems: { id: CEOTab; icon: any; label: string; badge?: number }[] = [
    { id: "dashboard", icon: BarChart3, label: "Métricas" },
    { id: "aprovacoes", icon: ClipboardList, label: "Aprovações", badge: statPendentes },
    { id: "lojas", icon: Store, label: "Lojas Ativas" },
    { id: "equipe", icon: Users, label: "Equipe Comercial" },
    { id: "comissoes", icon: Wallet, label: "Comissões" },
  ];

  return (
    <div className="space-y-6 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen text-white font-sans">
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
            <div className="space-y-4">
              
              {/* 🤖 PAINEL DA IA - DIAGNÓSTICO */}
              <div className={cn("p-4 rounded-2xl border", diagnostico.bg, diagnostico.border)}>
                 <div className="flex items-center gap-2 mb-2">
                    <Bot className={cn("h-5 w-5", diagnostico.cor)} />
                    <h3 className={cn("text-[11px] font-black uppercase tracking-widest", diagnostico.cor)}>{diagnostico.titulo}</h3>
                 </div>
                 <p className="text-sm font-medium text-white/90 leading-relaxed">{diagnostico.texto}</p>
              </div>

              {/* GRÁFICO MRR */}
              <Card className="p-5 bg-gradient-to-br from-zinc-900 to-black border-emerald-500/20 relative overflow-hidden">
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
                <div className="h-40 mt-6 -mx-2">
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

              {/* KPIS */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-zinc-900/40 border-zinc-800">
                  <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Taxa de Conversão</p>
                  <p className="text-2xl font-black text-white italic">{taxaConversao}%</p>
                  <p className="text-[9px] text-emerald-500 font-bold mt-1">Aprovadas / Visitas</p>
                </Card>
                <Card className="p-4 bg-zinc-900/40 border-zinc-800">
                  <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Lojas Pagantes</p>
                  <p className="text-2xl font-black text-white italic">{lojasAtivas.filter(l => l.ativo !== false).length}</p>
                  <p className="text-[9px] text-red-500 font-bold mt-1">{lojasInativas} Bloqueadas</p>
                </Card>
              </div>

              {/* NOVOS GRÁFICOS: ROSCA E BARRAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {/* GRÁFICO DE PLANOS */}
                 <Card className="p-5 bg-zinc-900/40 border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 text-center">Distribuição de Planos</p>
                    {dataPlanos.length === 0 ? (
                      <p className="text-xs text-center text-zinc-600 italic py-10">Sem assinaturas ativas</p>
                    ) : (
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={dataPlanos} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                              {dataPlanos.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                 </Card>

                 {/* GRÁFICO DO FUNIL GERAL */}
                 <Card className="p-5 bg-zinc-900/40 border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 text-center">Saúde do Funil (Todas as Vendas)</p>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataFunil} margin={{ left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#777" fontSize={10} axisLine={false} tickLine={false} dy={5} />
                          <YAxis hide />
                          <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                          <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
                            {dataFunil.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </Card>
              </div>

              <Card className="p-4 bg-blue-500/10 border-blue-500/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Megaphone className="h-4 w-4" />
                  <h3 className="font-black uppercase text-xs tracking-widest">Aviso para toda a rede</h3>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Escreva uma novidade..." className="bg-black/50 border-blue-500/20 text-xs text-white" value={novoAviso} onChange={(e) => setNovoAviso(e.target.value)} />
                  <Button onClick={dispararAviso} disabled={enviandoAviso} className="bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white">
                    {enviandoAviso ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ================= ABA 2: APROVAÇÕES (ONBOARDING VIP) ================= */}
          {tabAtiva === "aprovacoes" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input placeholder="Buscar contrato pendente..." value={buscaAprovacoes} onChange={(e) => setBuscaAprovacoes(e.target.value)} className="bg-zinc-900 border-zinc-800 pl-10 text-white rounded-xl h-12" />
              </div>

              <div className="grid gap-3">
                {aprovacoesFiltradas.map((lead) => (
                  <Card key={lead.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden transition-all">
                    <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-800/30" onClick={() => setExpandido(expandido === lead.id ? null : lead.id)}>
                      <div>
                        <h4 className="font-bold text-white text-sm uppercase italic">{lead.nome_barbearia}</h4>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-1">👤 Consultor: <span className="text-emerald-400">{ranking.find((v:any) => v.id === lead.vendedor_id)?.nome || "Desconhecido"}</span></p>
                      </div>
                      {expandido === lead.id ? <ChevronUp className="text-zinc-500" /> : <ChevronDown className="text-zinc-500" />}
                    </div>

                    {expandido === lead.id && (
                      <div className="p-4 bg-black/40 border-t border-zinc-800 space-y-5">
                        
                        <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-zinc-400 bg-black p-4 rounded-2xl border border-zinc-800/50">
                          <div className="col-span-2 border-b border-zinc-800 pb-2 mb-1">Acesso Solicitado</div>
                          <div>E-mail: <span className="text-white lowercase block mt-0.5 break-all">{lead.dados_adicionais?.email_dono}</span></div>
                          <div>Senha: <span className="text-white block mt-0.5">{lead.dados_adicionais?.senha_temp}</span></div>
                          <div>Tel: <span className="text-white block mt-0.5">{lead.dados_adicionais?.telefone || 'Não informado'}</span></div>
                          <div>Bairro: <span className="text-white block mt-0.5">{lead.bairro || '---'}</span></div>
                        </div>

                        {/* 🚀 PREVIEW DO APP - COMPONENTE VISUAL */}
                        <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/30 relative overflow-hidden">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-500"/> Preview das Cores</p>
                          
                          <div className="rounded-xl p-4 flex flex-col gap-3 shadow-inner" style={{ backgroundColor: lead.dados_adicionais?.cor_secundaria || '#18181B' }}>
                            <div className="h-4 w-1/3 rounded bg-white/10" />
                            <h3 className="font-black italic text-lg" style={{ color: lead.dados_adicionais?.cor_destaque || '#FFFFFF' }}>{lead.nome_barbearia}</h3>
                            <Button className="w-full font-black uppercase text-xs h-10 border-0" style={{ backgroundColor: lead.dados_adicionais?.cor_primaria || '#D4AF37', color: '#000' }}>
                              Agendar Horário
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-zinc-500 uppercase ml-1">Plano Vendido</label>
                            <Select value={planos[lead.id] || lead.dados_adicionais?.plano_escolhido || "pro"} onValueChange={(v) => setPlanos({...planos, [lead.id]: v})}>
                              <SelectTrigger className="bg-zinc-900 border-zinc-700 h-12 rounded-xl text-xs font-bold text-white"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700 text-white rounded-xl">
                                <SelectItem value="starter">Starter (R$ 50)</SelectItem>
                                <SelectItem value="pro">Pro (R$ 99,90)</SelectItem>
                                <SelectItem value="elite">Elite (R$ 497)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-zinc-500 uppercase ml-1">Slug do Link <span className="text-red-500">*</span></label>
                            <Input placeholder="nome-da-barbearia" className="bg-zinc-900 border-zinc-700 h-12 rounded-xl text-xs font-bold text-white" value={slugs[lead.id] || ""} onChange={e => setSlugs({ ...slugs, [lead.id]: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3">
                          <Button onClick={() => handleAprovarContrato(lead)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black h-14 rounded-xl text-xs uppercase shadow-lg border-0"><CheckCircle className="h-5 w-5 mr-2"/> Aprovar & Enviar Zap</Button>
                        </div>
                        
                        <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800/50">
                          <label className="text-[9px] font-black text-red-500 uppercase ml-1">Devolver ao Vendedor</label>
                          <div className="flex gap-2">
                            <Input placeholder="Ex: Telefone inválido, corrija." className="bg-red-500/5 border-red-500/20 text-xs h-12 text-white placeholder:text-red-500/50 rounded-xl" value={motivoRecusa} onChange={e => setMotivoRecusa(e.target.value)} />
                            <Button variant="outline" onClick={() => handleRecusarContrato(lead.id)} className="h-12 px-6 text-red-500 border-red-500/20 bg-red-500/10 hover:bg-red-500 hover:text-white font-black uppercase text-[10px] rounded-xl transition-colors"><XCircle className="h-4 w-4 mr-2"/> Recusar</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
                {statPendentes === 0 && <p className="text-center text-xs font-bold text-zinc-600 uppercase italic py-10">Fila de aprovação limpa. 🚀</p>}
                {statPendentes > 0 && aprovacoesFiltradas.length === 0 && <p className="text-center text-xs font-bold text-zinc-600 uppercase italic py-10">Nenhuma barbearia com esse nome.</p>}
              </div>
            </div>
          )}

          {/* ================= ABA 3: LOJAS ATIVAS ================= */}
          {tabAtiva === "lojas" && (
            <div className="space-y-4">
              
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
                  <Input placeholder="Buscar loja ou slug..." value={buscaLojas} onChange={(e) => setBuscaLojas(e.target.value)} className="bg-zinc-900/80 border-zinc-800 pl-12 text-white rounded-2xl h-12" />
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
                  {(['todas', 'ativas', 'trial', 'bloqueadas'] as FiltroLoja[]).map(f => (
                    <Button key={f} size="sm" variant={filtroLojas === f ? "default" : "outline"} onClick={() => setFiltroLojas(f)}
                      className={cn("rounded-xl h-8 text-[10px] uppercase font-black tracking-widest whitespace-nowrap", 
                        filtroLojas === f ? "bg-white text-black border-transparent" : "bg-black text-zinc-500 border-zinc-800")}>
                      {f === 'trial' && "Em Teste"}
                      {f !== 'trial' && f}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {lojasFiltradas.map(loja => (
                  <Card key={loja.id} className={cn("p-0 border overflow-hidden transition-all", loja.ativo === false ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900/40 border-zinc-800")}>
                    
                    <div className="p-4 cursor-pointer" onClick={() => setLojaExpandida(lojaExpandida === loja.id ? null : loja.id)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", loja.ativo === false ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                            <h4 className={cn("font-bold text-base uppercase italic", loja.ativo === false ? "text-red-400" : "text-white")}>{loja.nome}</h4>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1.5 flex items-center gap-1">cajtech.net.br/agendar/{loja.slug}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase border", loja.plano === 'elite' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700")}>
                            {loja.plano || 'Pro'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {loja.isTrial && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Trial 7 Dias</span>}
                        {loja.diffDias > 0 && loja.diffDias <= 3 && loja.ativo && <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1"><AlertTriangle className="h-2 w-2"/> Vence em {loja.diffDias} dias</span>}
                        {loja.diffDias <= 0 && loja.ativo && <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Fatura Vencida</span>}
                      </div>
                    </div>

                    {lojaExpandida === loja.id && (
                      <div className="p-4 bg-black/40 border-t border-zinc-800/50 space-y-4">
                        
                        <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-zinc-400 bg-black p-3 rounded-xl border border-zinc-800/50">
                          <div>Cadastro: <span className="text-white block mt-0.5">{formatarData(loja.created_at)}</span></div>
                          <div>Vencimento: <span className={cn("block mt-0.5", loja.diffDias <= 0 ? "text-red-500" : "text-white")}>{formatarData(loja.data_vencimento)}</span></div>
                          <div>Mensalidade: <span className="text-emerald-500 block mt-0.5">{formatarMoeda(getValorPlano(loja.plano || 'pro'))}</span></div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                          <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest ml-1">Gestão da Assinatura</p>
                          <Button onClick={() => renovarLojaManual(loja.id, loja.data_vencimento)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black h-12 rounded-xl text-xs uppercase flex items-center justify-between px-4 border border-zinc-700">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-500" /> Renovar Manualmente (+30 Dias)</span>
                            <span className="text-[9px] text-zinc-500">Apenas se pagou por fora</span>
                          </Button>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" onClick={() => toggleStatusLoja(loja.id, loja.ativo !== false)} className={cn("flex-1 h-12 text-[10px] font-black uppercase rounded-xl", loja.ativo === false ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-red-500 border-red-500/20 bg-red-500/5")}>
                            {loja.ativo === false ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                            {loja.ativo === false ? "Religar Sistema" : "Bloquear Acesso"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // Salva o slug da barbearia para impersonação
                              localStorage.setItem("ceo_impersonate_slug", loja.slug);
                              localStorage.setItem("ceo_impersonate_name", loja.nome);

                              toast.success(`Abrindo painel de "${loja.nome}"...`);

                              // Redireciona para o dashboard como se fosse o dono
                              setTimeout(() => {
                                window.location.href = "/";
                              }, 800);
                            }}
                            className="flex-1 h-12 text-[10px] font-black uppercase text-zinc-400 border-zinc-700 bg-black rounded-xl hover:bg-zinc-800"
                          >
                            <Eye className="h-4 w-4 mr-2" /> Acessar Painel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
                {lojasFiltradas.length === 0 && <p className="text-center text-xs font-bold text-zinc-600 uppercase italic py-10">Nenhuma loja encontrada neste filtro.</p>}
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
                  <Card key={v.id} className={cn("p-0 border transition-all overflow-hidden", v.ativo ? "bg-zinc-900/40 border-zinc-800" : "bg-red-900/5 border-red-900/30 opacity-80")}>
                    
                    <div className="p-4 flex justify-between items-start cursor-pointer hover:bg-zinc-800/30" onClick={() => setVendedorExpandido(vendedorExpandido === v.id ? null : v.id)}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-sm text-emerald-500 shadow-inner">#{index + 1}</div>
                        <div>
                          <p className="font-bold text-white text-sm uppercase italic flex items-center gap-2">
                            {v.nome}
                            {!v.ativo && <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full not-italic">INATIVO</span>}
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">MRR Gerado: <span className="text-white">{formatarMoeda(v.mrr_gerado)}</span></p>
                        </div>
                      </div>
                      {vendedorExpandido === v.id ? <ChevronUp className="text-zinc-500 mt-2" /> : <ChevronDown className="text-zinc-500 mt-2" />}
                    </div>
                    
                    {vendedorExpandido === v.id && (
                      <div className="p-4 bg-black/40 border-t border-zinc-800/50 space-y-4">
                        
                        {/* MINI-FUNIL DO VENDEDOR */}
                        <div>
                          <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mb-2 flex items-center gap-1"><Activity className="h-3 w-3" /> Funil do Consultor</p>
                          <div className="flex bg-zinc-900 rounded-xl border border-zinc-800 p-1">
                            <div className="flex-1 text-center py-2">
                              <p className="text-lg font-black text-white">{v.leads_visita}</p>
                              <p className="text-[8px] font-bold text-zinc-500 uppercase">Visitas</p>
                            </div>
                            <div className="w-px bg-zinc-800" />
                            <div className="flex-1 text-center py-2">
                              <p className="text-lg font-black text-blue-500">{v.leads_pendente}</p>
                              <p className="text-[8px] font-bold text-blue-500/70 uppercase">Negociação</p>
                            </div>
                            <div className="w-px bg-zinc-800" />
                            <div className="flex-1 text-center py-2">
                              <p className="text-lg font-black text-emerald-500">{v.leads_convertido}</p>
                              <p className="text-[8px] font-bold text-emerald-500/70 uppercase">Fechados</p>
                            </div>
                          </div>
                        </div>

                        {/* CONFIGURAÇÃO DE COMISSÃO */}
                        <div className="flex items-center justify-between bg-blue-500/5 rounded-xl p-3 border border-blue-500/20 mb-3">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-blue-400" />
                            <p className="text-[10px] text-blue-400 font-bold uppercase">
                              Config: S {v.comissao_starter || 20}% | P {v.comissao_pro || 30}% | E {v.comissao_elite || 40}%
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setVendedorSelecionado(v);
                              setComissaoStarter(String(v.comissao_starter || 20));
                              setComissaoPro(String(v.comissao_pro || 30));
                              setComissaoElite(String(v.comissao_elite || 40));
                              setModalComissaoAberto(true);
                            }}
                            className="h-8 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Edit3 className="h-3 w-3 mr-1" /> Configurar
                          </Button>
                        </div>

                        {/* FECHAMENTO DE COMISSÃO */}
                        <div className="flex justify-between items-center bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                          <div>
                            <p className="text-[9px] text-emerald-500/70 font-black uppercase">Comissão a Pagar</p>
                            <p className={cn("text-2xl font-black italic", v.comissao_pendente > 0 ? "text-emerald-500" : "text-zinc-600")}>{formatarMoeda(v.comissao_pendente)}</p>
                          </div>
                          <Button size="sm" onClick={() => pagarComissao(v.id)} disabled={v.comissao_pendente === 0 || isPagarComissao} className="h-12 px-4 text-[10px] uppercase font-black bg-emerald-600 text-black hover:bg-emerald-500 border-0 disabled:opacity-30 transition-colors shadow-lg">
                            {isPagarComissao ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4 mr-2" /> Liquidar</>}
                          </Button>
                        </div>

                        {/* BOTÕES DE PERIGO */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                          <Button variant="outline" onClick={() => toggleStatusVendedor(v.id, v.ativo)} className={cn("flex-1 h-10 text-[9px] font-black uppercase tracking-widest rounded-xl", v.ativo ? "text-zinc-400 border-zinc-700 bg-zinc-900 hover:text-red-500" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5")}>
                            {v.ativo ? <Lock className="h-3 w-3 mr-2" /> : <Unlock className="h-3 w-3 mr-2" />}
                            {v.ativo ? "Bloquear Acesso" : "Restaurar Acesso"}
                          </Button>
                          <Button variant="outline" onClick={() => excluirVendedor(v.id)} className="h-10 px-4 text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl" title="Apagar Vendedor">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ================= ABA 5: COMISSÕES (CARTEIRA) ================= */}
          {tabAtiva === "comissoes" && (
            <div className="space-y-6">
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-xl font-black uppercase italic text-white flex items-center gap-2 mb-2">
                  <Wallet className="h-6 w-6 text-emerald-500" /> Carteira de Comissões
                </h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Acompanhe os valores acumulados e gerencie os pagamentos mensais.
                </p>

                {loadingCarteira ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500 h-8 w-8" /></div>
                ) : carteira.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500">Nenhuma comissão registrada ainda.</div>
                ) : (
                  <div className="space-y-4">
                    {carteira.map((item) => (
                      <Card key={item.id} className="bg-black/40 border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-white text-sm">{item.vendedor_nome}</p>
                            <Badge className={cn(
                              "text-[9px] px-1.5 py-0",
                              item.status === 'acumulando' ? "bg-blue-500/20 text-blue-400" :
                              item.status === 'fechado' ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-emerald-500/20 text-emerald-400"
                            )}>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Referência: {item.mes_referencia}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] text-zinc-500 font-black uppercase">Saldo Acumulado</p>
                            <p className="text-xl font-black text-emerald-500 italic">{formatarMoeda(item.valor_acumulado)}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
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

      {/* ================= MODAL EDITAR COMISSÃO ================= */}
      {modalComissaoAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-black uppercase italic text-xl">Comissão por Plano</h2>
              <button onClick={() => setModalComissaoAberto(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800 h-8 w-8 flex items-center justify-center rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-400">
              Configurando para: <span className="text-white font-bold">{vendedorSelecionado?.nome}</span>
            </p>

            <div className="space-y-4">
              {/* Starter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Plano Starter (%)</label>
                <Input 
                  type="number" 
                  className="bg-black border-zinc-800 text-white h-12 rounded-xl focus:border-zinc-500" 
                  value={comissaoStarter} 
                  onChange={e => setComissaoStarter(e.target.value)} 
                />
              </div>

              {/* PRO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">Plano PRO (%)</label>
                <Input 
                  type="number" 
                  className="bg-black border-emerald-500/30 text-white h-12 rounded-xl focus:border-emerald-500" 
                  value={comissaoPro} 
                  onChange={e => setComissaoPro(e.target.value)} 
                />
              </div>

              {/* Elite */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-yellow-500 uppercase ml-1">Plano Elite (%)</label>
                <Input 
                  type="number" 
                  className="bg-black border-yellow-500/30 text-white h-12 rounded-xl focus:border-yellow-500" 
                  value={comissaoElite} 
                  onChange={e => setComissaoElite(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalComissaoAberto(false)} className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancelar</Button>
              <Button onClick={salvarComissao} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 rounded-2xl text-sm uppercase italic shadow-lg shadow-emerald-600/20">
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}