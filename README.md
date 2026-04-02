TODO: Document your project here
✂️ CAJ TECH - Barber Management System
CAJ TECH é uma plataforma de gestão de barbearias de alto desempenho, desenvolvida para oferecer controle total aos donos de barbearia e praticidade para os barbeiros. O sistema opera como um PWA (Progressive Web App), garantindo uma experiência nativa no mobile com sincronização em tempo real.

🚀 Funcionalidades Principais
👑 Painel do Dono (Dashboard)
Faturamento em Tempo Real: Visualização de entradas diárias e lucro real (líquido).

Faturamento Mensal: Cálculo automático do faturamento acumulado no mês vigente.

Gestão de Equipe: Cadastro e controle de comissões customizadas por barbeiro.

Controle de Saídas: Registro de despesas operacionais direto no caixa.

✂️ Visão do Barbeiro
Agenda Inteligente: Sistema de agendamento blindado contra fuso horário.

Status de Atendimento: Controle de horários pendentes, finalizados e cancelados.

Integração WhatsApp: Envio de lembretes e confirmações com um clique.

💼 Carteira Digital
Comissões Acumuladas: O barbeiro acompanha em tempo real quanto já faturou no mês.

Histórico de Cortes: Contador de atendimentos realizados.

🛠️ Stack Tecnológica
Frontend: React + Vite (Fast Refresh & Optimized Build).

Estilização: TailwindCSS + Shadcn UI (Design System Moderno).

Gerenciamento de Estado & Cache: TanStack Query (React Query) v5.

Backend-as-a-Service: Supabase (PostgreSQL + Auth + RLS).

Validação de Dados: Zod (Schemas rigorosos para integridade de dados).

Instalável: PWA integrado para uso como aplicativo nativo.

🛡️ Segurança e Performance (Foco Técnico)
Este projeto foi auditado e atualizado para atender requisitos comerciais:

Row Level Security (RLS): O banco de dados PostgreSQL utiliza políticas rigorosas onde um barbeiro ou dono só tem acesso aos dados vinculados ao seu slug de barbearia.

Data Blindada: Implementação de lógica de data local (sv-SE) para evitar bugs de fuso horário (UTC) em fechamentos de caixa noturnos.

Otimização de Query: Filtros server-side implementados para carregar apenas agendamentos do mês vigente, evitando overfetching e lentidão.

Strict Mode: Execução em modo estrito para garantir a integridade das renderizações e evitar vazamentos de memória.