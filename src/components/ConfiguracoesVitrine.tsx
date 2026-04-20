import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Palette, Image as ImageIcon, Type, Link as LinkIcon, Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";

export default function ConfiguracoesVitrine() {
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [config, setConfig] = useState({
    id: "",
    nome: "",
    slug: "",
    cor_primaria: "#D4AF37",
    url_fundo: "",
    url_logo: "",
  });

  const brand = config.cor_primaria || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);

  // Carregar configurações da barbearia
  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function carregarConfiguracoes() {
      try {
        const { data, error } = await supabase
          .from("barbearias")
          .select("*")
          .eq("dono_id", user.id)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;

        if (data) {
          setConfig({
            id: data.id,
            nome: data.nome || "",
            slug: data.slug || "",
            cor_primaria: data.cor_primaria || "#D4AF37",
            url_fundo: data.url_fundo || "",
            url_logo: data.url_logo || "",
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Erro ao carregar configurações:", err);
          toast.error("Não foi possível carregar os dados da vitrine.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setFetching(false);
        }
      }
    }

    carregarConfiguracoes();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [user]);

  // Salvar alterações
  const handleSalvar = useCallback(async () => {
    if (!config.id) {
      toast.error("Erro ao identificar barbearia.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Atualizando sua vitrine...");

    try {
      const { error } = await supabase
        .from("barbearias")
        .update({
          nome: config.nome,
          cor_primaria: config.cor_primaria,
          url_fundo: config.url_fundo,
          url_logo: config.url_logo || null,
        })
        .eq("id", config.id);

      if (error) throw error;

      toast.success("Vitrine atualizada com sucesso! 🚀", { id: toastId });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [config]);

  if (fetching) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
      {/* COLUNA DE EDIÇÃO */}
      <Card className="lg:col-span-3 p-6 bg-zinc-900 border-zinc-800 text-white shadow-2xl rounded-[24px]">
        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <Palette className="text-primary h-6 w-6" /> Personalizar Vitrine
          </h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Sua marca, suas regras.</p>
        </div>

        <div className="space-y-6">
          {/* NOME */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Type className="w-3 h-3" /> Nome de Exibição
            </label>
            <Input
              className="bg-black/50 border-zinc-800 h-14 rounded-xl text-base focus:border-primary transition-all"
              value={config.nome}
              onChange={(e) => setConfig({ ...config, nome: e.target.value })}
              placeholder="Ex: Barbearia Elite"
            />
          </div>

          {/* LINK FIXO */}
          <div className="space-y-1.5 opacity-60">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <LinkIcon className="w-3 h-3" /> Endereço do seu App (Slug)
            </label>
            <div className="relative">
              <Input
                disabled
                className="bg-zinc-800/30 border-zinc-800 h-14 rounded-xl text-zinc-500 cursor-not-allowed pl-4"
                value={`cajtech.net.br/agendar/${config.slug}`}
              />
            </div>
            <p className="text-[9px] text-zinc-600 italic font-medium">* Para alterar o link, contate o suporte.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COR TEMA */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2">
                <Palette className="w-3 h-3" /> Cor da Marca
              </label>
              <div className="flex gap-2">
                <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-zinc-800 bg-black/50">
                  <input
                    type="color"
                    className="absolute inset-0 h-[150%] w-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer bg-transparent border-none"
                    value={config.cor_primaria}
                    onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                  />
                </div>
                <Input
                  className="bg-black/50 border-zinc-800 h-14 flex-1 font-mono text-sm uppercase rounded-xl"
                  value={config.cor_primaria}
                  onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                />
              </div>
            </div>

            {/* LOGO URL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Link da Logo (PNG)
              </label>
              <Input
                className="bg-black/50 border-zinc-800 h-14 rounded-xl"
                value={config.url_logo}
                onChange={(e) => setConfig({ ...config, url_logo: e.target.value })}
                placeholder="Link da imagem..."
              />
            </div>
          </div>

          {/* BACKGROUND URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <ImageIcon className="w-3 h-3" /> Link da Imagem de Fundo (Wallpaper)
            </label>
            <Input
              className="bg-black/50 border-zinc-800 h-14 rounded-xl"
              value={config.url_fundo}
              onChange={(e) => setConfig({ ...config, url_fundo: e.target.value })}
              placeholder="Ex: https://imagens.com/fundo.jpg"
            />
          </div>

          <Button
            className="w-full h-16 font-black uppercase tracking-widest text-black mt-6 rounded-2xl transition-all active:scale-95 shadow-xl disabled:opacity-50"
            style={{
              backgroundColor: brand,
              color: ctaFg,
              boxShadow: `0 10px 30px ${hexToRgba(brand, 0.2)}`,
            }}
            disabled={loading}
            onClick={handleSalvar}
          >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Salvar Mudanças"}
          </Button>
        </div>
      </Card>

      {/* COLUNA DE PREVIEW */}
      <div className="lg:col-span-2 space-y-4">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
          <Smartphone className="h-4 w-4" /> Live Preview (Celular do Cliente)
        </p>

        <div className="relative mx-auto w-full max-w-[280px] aspect-[9/18] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Notch do Celular */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-20" />

          {/* Conteúdo Interno da Vitrine */}
          <div className="relative flex-1 flex flex-col">
            {/* Imagem de Fundo */}
            <div className="absolute inset-0 z-0">
              {config.url_fundo ? (
                <img src={config.url_fundo} className="h-full w-full object-cover" alt="fundo" />
              ) : (
                <div className="h-full w-full bg-zinc-900" />
              )}
              <div className="absolute inset-0 bg-black/60" />
            </div>

            {/* Elementos UI */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
              {/* Logo Preview */}
              <div className="h-20 w-20 rounded-full border-2 border-white/10 bg-black/40 backdrop-blur-md mb-4 overflow-hidden flex items-center justify-center">
                {config.url_logo ? (
                  <img src={config.url_logo} className="max-h-12 max-w-12 object-contain" alt="logo" />
                ) : (
                  <ImageIcon className="h-8 w-8" style={{ color: brand }} />
                )}
              </div>

              <h1 className="text-xl font-black uppercase italic text-white leading-tight mb-6">
                {config.nome || "Sua Barbearia"}
              </h1>

              {/* Botão de Exemplo */}
              <div className="w-full space-y-3">
                <div
                  className="w-full h-12 rounded-xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest shadow-lg"
                  style={{ backgroundColor: brand, color: ctaFg }}
                >
                  Agendar Horário
                </div>
                <div className="w-full h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/40 uppercase tracking-widest">
                  Ver Serviços
                </div>
              </div>
            </div>

            {/* Footer Mock */}
            <div className="relative z-10 p-4 border-t border-white/5 bg-black/20 backdrop-blur-md text-[8px] text-center text-zinc-500 font-bold uppercase tracking-widest">
              Powered by CAJ TECH
            </div>
          </div>
        </div>

        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20 rounded-2xl">
          <p className="text-[10px] text-emerald-500 font-black uppercase flex items-center gap-2 leading-tight">
            <CheckCircle2 className="h-4 w-4" />
            As cores e fotos são atualizadas instantaneamente para seus clientes.
          </p>
        </Card>
      </div>
    </div>
  );
}