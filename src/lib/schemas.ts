import { z } from "zod";

// ============================================================================
// 1. Regra para Novo Agendamento
// ============================================================================
export const agendamentoSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "O nome do cliente deve ter pelo menos 3 letras.")
    .max(50, "Nome muito longo."),
  telefone: z.string()
    .transform((val) => val.replace(/\D/g, "")) // Remove parênteses e traços antes de validar
    .refine((val) => val.length >= 10 && val.length <= 11, {
      message: "Telefone inválido. Coloque o DDD e o número (10 ou 11 dígitos).",
    }),
  servicoId: z.string().min(1, "Selecione um serviço."),
  barbeiroId: z.string().min(1, "Selecione um barbeiro responsável."),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data em formato inválido."),
  horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário em formato inválido.")
});

// ============================================================================
// 2. Regra para Novo Barbeiro
// ============================================================================
export const barbeiroSchema = z.object({
  nome: z.string()
    .trim()
    .min(2, "Nome do barbeiro é muito curto."),
  email: z.string()
    .trim()
    .email("Digite um e-mail válido (ex: email@teste.com)")
    .toLowerCase(), // Garante que o e-mail sempre seja salvo em minúsculo
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  comissao: z.coerce.number()
    .min(0, "Comissão mínima é 0%")
    .max(100, "A comissão não pode passar de 100%."),
  ativo: z.boolean().optional().default(true)
});

// ============================================================================
// 3. Regra para Novo Serviço (🚀 Turbinado)
// ============================================================================
export const servicoSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "O nome do serviço precisa de pelo menos 3 letras."),
  preco: z.coerce.number()
    .positive("O preço do serviço deve ser maior que zero.")
    .max(10000, "Valor acima do limite permitido."),
  duracao_minutos: z.coerce.number()
    .min(1, "Duração mínima de 1 minuto.")
    .max(480, "Duração máxima de 8 horas.")
    .default(30)
});

// ============================================================================
// 4. Regra para Lançamento de Despesas (Caixa)
// ============================================================================
export const despesaSchema = z.object({
  descricao: z.string()
    .trim()
    .min(3, "Descreva a despesa (mínimo 3 letras)."),
  valor: z.coerce.number()
    .positive("O valor da despesa deve ser maior que zero."),
  data: z.union([z.date(), z.string()]) // Aceita tanto objeto Date quanto string ISO
});