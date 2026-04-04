import { z } from "zod";

// 1. Regra para Novo Agendamento
export const agendamentoSchema = z.object({
  nome: z.string().min(3, "O nome do cliente deve ter pelo menos 3 letras."),
  telefone: z.string().min(10, "Telefone inválido. Coloque o DDD e o número."),
  servicoId: z.string().min(1, "Selecione um serviço."),
  barbeiroId: z.string().min(1, "Selecione um barbeiro responsável."),
  data: z.string().min(1, "Escolha uma data."),
  horario: z.string().min(1, "Escolha um horário.")
});

// 2. Regra para Novo Barbeiro
export const barbeiroSchema = z.object({
  nome: z.string().min(2, "Nome do barbeiro é muito curto."),
  email: z.string().email("Digite um e-mail válido (ex: email@teste.com)."),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  comissao: z.coerce.number().min(0).max(100, "A comissão deve ser entre 0 e 100%."),
  ativo: z.boolean().optional().default(true)
});

// 3. Regra para Novo Serviço (🚀 Turbinado com a duração)
export const servicoSchema = z.object({
  nome: z.string().min(3, "O nome do serviço precisa de pelo menos 3 letras."),
  preco: z.coerce.number().positive("O preço do serviço deve ser maior que zero."),
  duracao_minutos: z.coerce.number().min(15, "Tempo mínimo de 15 min.").max(300, "Tempo máximo de 5 horas.").default(30)
});