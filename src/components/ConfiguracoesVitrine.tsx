import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Palette, Image as ImageIcon, Type, Link as LinkIcon } from "lucide-react";

export default function ConfiguracoesVitrine() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    id: "",
    nome: "",
    slug: "",
    cor_primaria: "#D4AF37",
    url_fundo: ""
  });

  // 1. CARREGAR OS DADOS ATUAIS DA BARBEARIA DO DONO LOGADO
  useEffect(() => {
    async function carregarConfiguracoes() {
      if (!user) return;
      
      // Assumindo que você busca a barbearia pelo ID do dono (ajuste conforme seu banco)
      const { data, error } = await supabase
        .from("barbearias")
        .select("*")
        .eq("dono_id", user.id) 
        .single();

      if (data) {
        setConfig({
          id: data.id,
          nome: data.nome || "",
          slug: data.slug || "",
          cor_primaria: data.cor_primaria || "#D4AF37",
          url_fundo: data.url_fundo || ""
        });
      }
    }
    carregarConfiguracoes();
  }, [user]);

  // 2. SALVAR AS ALTERAÇÕES NO BANCO DE DADOS
  const handleSalvar = async () => {
    setLoading(true);
    const toastId = toast.loading("Salvando sua vitrine...");

    const { error } = await supabase
      .from("barbearias")
      .update({
        nome: config.nome,
        cor_primaria: config.cor_primaria,
        url_fundo: config.url_fundo
      })
      .eq("id", config.id);

    setLoading(false);
    toast.dismiss(toastId);

    if (error) {
      toast.error("Erro ao salvar alterações.");
      console.error(error);
    } else {
      toast.success("Vitrine atualizada com sucesso!");
    }
  };

  return (
    <Card className="p-6 max-w-2xl bg-zinc-900 border-zinc-800 text-white shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-black uppercase italic tracking-tight">Personalizar Vitrine</h2>
        <p className="text-sm text-zinc-400">Deixe a página de agendamento com a cara da sua barbearia.</p>
      </div>

      <div className="space-y-6">
        {/* NOME DA BARBEARIA */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
            <Type className="w-4 h-4" /> Nome da Barbearia
          </label>
          <Input 
            className="bg-black/50 border-zinc-700 h-12"
            value={config.nome}
            onChange={(e) => setConfig({ ...config, nome: e.target.value })}
            placeholder="Ex: Barbearia do João"
          />
        </div>

        {/* LINK DA BARBEARIA (BLOQUEADO POR SEGURANÇA) */}
        <div className="space-y-2 opacity-70">
          <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Link de Agendamento (Fixo)
          </label>
          <Input 
            disabled
            className="bg-zinc-800/50 border-zinc-700 h-12 text-zinc-500 cursor-not-allowed"
            value={`seusite.com/agendar/${config.slug}`}
          />
          <p className="text-[10px] text-zinc-500">Para alterar seu link, entre em contato com o suporte para não quebrar seus agendamentos atuais.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COR PRIMÁRIA */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
              <Palette className="w-4 h-4" /> Cor Tema
            </label>
            <div className="flex gap-3 items-center">
              <Input 
                type="color" 
                className="w-14 h-14 p-1 bg-black/50 border-zinc-700 rounded-lg cursor-pointer"
                value={config.cor_primaria}
                onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
              />
              <Input 
                className="bg-black/50 border-zinc-700 h-12 flex-1 font-mono text-sm"
                value={config.cor_primaria}
                onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
              />
            </div>
          </div>

          {/* URL DA IMAGEM DE FUNDO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Imagem de Fundo (Link)
            </label>
            <Input 
              className="bg-black/50 border-zinc-700 h-12"
              value={config.url_fundo}
              onChange={(e) => setConfig({ ...config, url_fundo: e.target.value })}
              placeholder="Cole o link de uma imagem aqui..."
            />
          </div>
        </div>

        {/* PREVIEW DO FUNDO */}
        {config.url_fundo && (
          <div 
            className="w-full h-32 rounded-xl bg-cover bg-center border border-zinc-800 mt-4 relative overflow-hidden"
            style={{ backgroundImage: `url(${config.url_fundo})` }}
          >
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-black italic uppercase" style={{ color: config.cor_primaria }}>
                {config.nome || "Sua Barbearia"}
              </span>
            </div>
          </div>
        )}

        <Button 
          className="w-full h-12 font-bold uppercase tracking-wider text-black mt-4 transition-transform active:scale-95"
          style={{ backgroundColor: config.cor_primaria }}
          disabled={loading}
          onClick={handleSalvar}
        >
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </Card>
  );
}