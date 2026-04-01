import { z } from "zod";

// 1. Regra para Novo Agendamento
export const agendamentoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 letras."),
  telefone: z.string().min(10, "Telefone inválido. Ex: 11999998888"),
  servicoId: z.string().min(1, "Selecione um serviço."),
  barbeiroId: z.string().min(1, "Selecione um barbeiro."),
  data: z.string().min(1, "Escolha uma data."),
  horario: z.string().min(1, "Escolha um horário.")
});

// 2. Regra para Novo Barbeiro
export const barbeiroSchema = z.object({
  nome: z.string().min(2, "Nome muito curto."),
  email: z.string().email("Digite um e-mail válido."),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  comissao: z.coerce.number().min(0).max(100, "A comissão deve ser entre 0 e 100%.") // coerce transforma string em número automaticamente
});

// 3. Regra para Novo Serviço
export const servicoSchema = z.object({
  nome: z.string().min(3, "O nome do serviço precisa de pelo menos 3 letras."),
  preco: z.coerce.number().positive("O preço não pode ser negativo.")
});