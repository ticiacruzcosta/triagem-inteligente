"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { detectarInjecaoMaliciosa } from "@/lib/validation";

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const realizarLogin = async (emailAlvo: string, senhaAlvo: string) => {
    setErro(null);

    if (!emailAlvo.trim() || !senhaAlvo) {
      setErro("Preencha o e-mail e a senha para acessar.");
      return;
    }

    if (
      detectarInjecaoMaliciosa(emailAlvo) ||
      detectarInjecaoMaliciosa(senhaAlvo)
    ) {
      setErro(
        "Entrada bloqueada por segurança (ISO 27001): padrão não permitido."
      );
      return;
    }

    setCarregando(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAlvo.trim(), senha: senhaAlvo }),
      });

      const dados = await resp.json();
      if (!resp.ok) {
        throw new Error(dados.erro || "Falha ao autenticar.");
      }

      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      setErro(
        e instanceof Error ? e.message : "Erro ao conectar com o servidor."
      );
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await realizarLogin(email, senha);
  };

  const entrarComPerfilDemo = async (emailDemo: string, senhaDemo: string) => {
    setEmail(emailDemo);
    setSenha(senhaDemo);
    await realizarLogin(emailDemo, senhaDemo);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-x-hidden">
      {/* Grade arquitetônica de fundo */}
      <div className="pointer-events-none fixed inset-0 z-0 w-full px-3 sm:px-6 lg:px-8">
        <div className="grid h-full grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 border-x border-[#D8D5CE]/55">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`h-full border-r border-[#D8D5CE]/45 last:border-r-0 ${
                i >= 4 ? "hidden sm:block" : ""
              } ${i >= 6 ? "sm:hidden lg:block" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Cabeçalho Editorial */}
        <div className="text-center space-y-2">
          <span className="chip chip-active text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acesso Restrito • Central de Suporte
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.035em] text-[#18191A] leading-[0.95] pt-1">
            Triagem Inteligente
          </h1>
          <p className="text-xs sm:text-sm text-[#3D3E40]">
            Entre com suas credenciais para gerenciar a fila de atendimento.
          </p>
        </div>

        {/* Card Principal de Login */}
        <div className="card p-6 sm:p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="alert-error p-3 flex items-start gap-2.5 text-xs font-bold">
                <AlertCircle className="h-4 w-4 text-[#C93B3B] shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="section-label block">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787877]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (erro) setErro(null);
                  }}
                  placeholder="seuemail@empresa.com"
                  className="input-field pl-10 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-senha" className="section-label block">
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787877]" />
                <input
                  id="login-senha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (erro) setErro(null);
                  }}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787877] hover:text-[#18191A]"
                  tabIndex={-1}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="btn btn-primary w-full py-3 text-sm"
            >
              {carregando ? "Validando acesso..." : "Entrar no Sistema"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Acesso Rápido para Demonstração / Recrutadores */}
          <div className="border-t border-[#D8D5CE] pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="section-label flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-[#0E4D52]" />
                Acesso Rápido (Demonstração)
              </span>
              <span className="text-[10px] font-mono text-[#787877]">
                1 clique
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={carregando}
                onClick={() =>
                  entrarComPerfilDemo("atendente@triagem.com", "Triagem@2026")
                }
                className="btn btn-secondary py-2 px-3 flex-col items-start gap-0.5 text-left"
              >
                <span className="text-xs font-extrabold text-[#18191A]">
                  Atendente
                </span>
                <span className="text-[10px] font-mono text-[#787877] truncate w-full">
                  atendente@triagem.com
                </span>
              </button>

              <button
                type="button"
                disabled={carregando}
                onClick={() =>
                  entrarComPerfilDemo(
                    "supervisor@triagem.com",
                    "Supervisor@2026"
                  )
                }
                className="btn btn-secondary py-2 px-3 flex-col items-start gap-0.5 text-left"
              >
                <span className="text-xs font-extrabold text-[#18191A]">
                  Supervisor
                </span>
                <span className="text-[10px] font-mono text-[#787877] truncate w-full">
                  supervisor@triagem.com
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
