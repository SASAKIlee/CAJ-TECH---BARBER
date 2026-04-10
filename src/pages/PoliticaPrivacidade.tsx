import { Link } from "react-router-dom";
import { Shield, Lock, Eye, Trash2, Mail } from "lucide-react";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-emerald-500" />
          <h1 className="text-3xl font-black uppercase tracking-tight">Política de Privacidade</h1>
        </div>
        
        <p className="text-zinc-400 text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-8 text-zinc-300">
          <Section
            icon={Eye}
            title="1. Dados Coletados"
            content="Coletamos apenas os dados necessários para realizar agendamentos e gerenciar sua barbearia: nome completo, número de WhatsApp, e-mail (quando aplicável) e histórico de serviços. Nenhum dado sensível ou financeiro é armazenado em nossos servidores além do necessário para a operação."
          />

          <Section
            icon={Lock}
            title="2. Finalidade do Tratamento"
            content="Seus dados são utilizados exclusivamente para: confirmar agendamentos, enviar lembretes via WhatsApp, gerar relatórios gerenciais para o dono da barbearia e cumprir obrigações legais. Não compartilhamos seus dados com terceiros, exceto quando exigido por lei."
          />

          <Section
            icon={Trash2}
            title="3. Direito ao Esquecimento (LGPD)"
            content="Você pode solicitar a exclusão ou anonimização dos seus dados a qualquer momento. Para isso, entre em contato com a barbearia onde realizou o agendamento ou envie um e-mail para nosso Encarregado de Dados. Seus dados serão removidos em até 15 dias úteis."
          />

          <Section
            icon={Mail}
            title="4. Contato do Encarregado"
            content={
              <>
                Em caso de dúvidas sobre privacidade ou para exercer seus direitos, contate:
                <br />
                📧 <a href="mailto:privacidade@cajtech.net.br" className="text-emerald-500 underline">privacidade@cajtech.net.br</a>
                <br />
                📞 (17) 99205-1576 (César)
              </>
            }
          />

          <Section
            icon={Shield}
            title="5. Segurança"
            content="Adotamos medidas técnicas e organizacionais para proteger seus dados contra acessos não autorizados, perda ou alteração. Utilizamos criptografia em trânsito (HTTPS) e controles de acesso rigorosos no banco de dados."
          />
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800 text-center">
          <Link to="/" className="text-emerald-500 font-black uppercase text-sm tracking-widest hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, content }: { icon: any; title: string; content: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}