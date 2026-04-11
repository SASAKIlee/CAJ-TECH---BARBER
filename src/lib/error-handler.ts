/**
 * Utilitário para tratamento padronizado de erros do Supabase.
 * Retorna mensagens amigáveis e específicas por tipo de erro.
 */

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export type ErrorCategory =
  | "auth"
  | "database"
  | "network"
  | "validation"
  | "permission"
  | "unknown";

/**
 * Classifica o erro por categoria para tratamento adequado.
 */
export function classifyError(error: unknown): {
  category: ErrorCategory;
  userMessage: string;
  technicalDetails?: string;
} {
  // Erro de rede/offline
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      category: "network",
      userMessage:
        "Sem conexão com a internet. Verifique sua rede e tente novamente.",
      technicalDetails: error.message,
    };
  }

  // Erro do Supabase
  if (error && typeof error === "object" && "message" in error) {
    const supabaseError = error as SupabaseError;
    const msg = supabaseError.message.toLowerCase();
    const code = supabaseError.code?.toLowerCase() || "";

    // Erros de autenticação
    if (
      msg.includes("invalid login") ||
      msg.includes("email not confirmed") ||
      msg.includes("invalid credentials") ||
      code.includes("auth")
    ) {
      return {
        category: "auth",
        userMessage:
          "Email ou senha incorretos. Verifique suas credenciais e tente novamente.",
        technicalDetails: supabaseError.message,
      };
    }

    // Email já cadastrado
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return {
        category: "auth",
        userMessage: "Este email já está cadastrado. Tente fazer login.",
        technicalDetails: supabaseError.message,
      };
    }

    // Senha fraca
    if (msg.includes("password")) {
      return {
        category: "validation",
        userMessage:
          "Senha muito fraca. Use pelo menos 6 caracteres com letras e números.",
        technicalDetails: supabaseError.message,
      };
    }

    // Erros de permissão (RLS)
    if (
      msg.includes("permission denied") ||
      msg.includes("row-level security") ||
      code.includes("42501")
    ) {
      return {
        category: "permission",
        userMessage:
          "Você não tem permissão para realizar esta ação. Entre em contato com o administrador.",
        technicalDetails: supabaseError.message,
      };
    }

    // Violação de constraint (duplicidade, foreign key)
    if (
      code.includes("23505") ||
      msg.includes("duplicate") ||
      msg.includes("unique")
    ) {
      return {
        category: "validation",
        userMessage: "Este registro já existe. Verifique os dados e tente novamente.",
        technicalDetails: supabaseError.message,
      };
    }

    // Foreign key violation
    if (code.includes("23503")) {
      return {
        category: "database",
        userMessage:
          "Não foi possível excluir este item pois ele está vinculado a outros registros.",
        technicalDetails: supabaseError.message,
      };
    }

    // Timeout
    if (msg.includes("timeout") || code.includes("57014")) {
      return {
        category: "network",
        userMessage:
          "A operação demorou muito. Tente novamente em alguns instantes.",
        technicalDetails: supabaseError.message,
      };
    }

    // Erro genérico do banco
    if (
      msg.includes("database") ||
      msg.includes("relation") ||
      msg.includes("column")
    ) {
      return {
        category: "database",
        userMessage:
          "Erro ao acessar o banco de dados. Tente novamente ou entre em contato com o suporte.",
        technicalDetails: supabaseError.message,
      };
    }

    // Erro conhecido do Supabase
    return {
      category: "unknown",
      userMessage: supabaseError.message || "Ocorreu um erro inesperado. Tente novamente.",
      technicalDetails: supabaseError.message,
    };
  }

  // Erro desconhecido
  return {
    category: "unknown",
    userMessage: "Ocorreu um erro inesperado. Tente novamente.",
    technicalDetails: String(error),
  };
}

/**
 * Retorna uma mensagem de erro amigável para o usuário.
 */
export function getErrorMessage(error: unknown): string {
  return classifyError(error).userMessage;
}

/**
 * Retorna a categoria do erro para logging/analytics.
 */
export function getErrorCategory(error: unknown): ErrorCategory {
  return classifyError(error).category;
}

/**
 * Log de erro para debugging (usar apenas em desenvolvimento).
 */
export function logError(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`[ERROR${context ? ` - ${context}` : ""}]`, error);
  }
}
