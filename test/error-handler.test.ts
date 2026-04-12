import { describe, it, expect } from "vitest";
import { classifyError, getErrorMessage, getErrorCategory, logError } from "@/lib/error-handler";

describe("error-handler", () => {
  describe("classifyError", () => {
    it("deve classificar erro de rede", () => {
      const error = new TypeError("Failed to fetch");
      const result = classifyError(error);
      expect(result.category).toBe("network");
      expect(result.userMessage).toContain("Sem conexão");
    });

    it("deve classificar erro de autenticação (login inválido)", () => {
      const error = { message: "Invalid login credentials", code: "auth" };
      const result = classifyError(error);
      expect(result.category).toBe("auth");
      expect(result.userMessage).toContain("Email ou senha");
    });

    it("deve classificar erro de email duplicado", () => {
      const error = { message: "User already registered" };
      const result = classifyError(error);
      expect(result.category).toBe("auth");
      expect(result.userMessage).toContain("já está cadastrado");
    });

    it("deve classificar erro de permissão (RLS)", () => {
      const error = { message: "new row violates row-level security policy", code: "42501" };
      const result = classifyError(error);
      expect(result.category).toBe("permission");
      expect(result.userMessage).toContain("permissão");
    });

    it("deve classificar erro de duplicidade", () => {
      const error = { message: "duplicate key value", code: "23505" };
      const result = classifyError(error);
      expect(result.category).toBe("validation");
      expect(result.userMessage).toContain("já existe");
    });

    it("deve classificar foreign key violation", () => {
      const error = { message: "foreign key violation", code: "23503" };
      const result = classifyError(error);
      expect(result.category).toBe("database");
      expect(result.userMessage).toContain("vinculado");
    });

    it("deve classificar erro de timeout", () => {
      const error = { message: "canceling statement due to statement timeout", code: "57014" };
      const result = classifyError(error);
      expect(result.category).toBe("network");
      expect(result.userMessage).toContain("demorou");
    });

    it("deve classificar erro desconhecido", () => {
      const error = { message: "Algum erro estranho" };
      const result = classifyError(error);
      expect(result.category).toBe("unknown");
    });

    it("deve classificar valor nulo", () => {
      const result = classifyError(null);
      expect(result.category).toBe("unknown");
    });
  });

  describe("getErrorMessage", () => {
    it("deve retornar mensagem amigável", () => {
      const error = new TypeError("Failed to fetch");
      expect(getErrorMessage(error)).toContain("Sem conexão");
    });
  });

  describe("getErrorCategory", () => {
    it("deve retornar categoria correta", () => {
      const error = { message: "permission denied", code: "42501" };
      expect(getErrorCategory(error)).toBe("permission");
    });
  });

  describe("logError", () => {
    it("não deve lançar erro", () => {
      expect(() => logError(new Error("test"), "contexto")).not.toThrow();
    });
  });
});
