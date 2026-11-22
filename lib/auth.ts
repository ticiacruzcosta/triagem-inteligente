import crypto from "crypto";

export interface UsuarioSessao {
  email: string;
  nome: string;
  cargo: string;
}

const USUARIOS_PERMITIDOS: Array<UsuarioSessao & { senha: string }> = [
  {
    email: "atendente@triagem.com",
    senha: "Triagem@2026",
    nome: "Equipe de Suporte",
    cargo: "Atendente de Suporte",
  },
  {
    email: "supervisor@triagem.com",
    senha: "Supervisor@2026",
    nome: "Coordenação",
    cargo: "Supervisor de Operações",
  },
];

export const NOME_COOKIE_SESSAO = "triagem_sessao";

function getSegredoSessao(): string {
  return (
    process.env.SESSION_SECRET ||
    "triagem-inteligente-chave-sessao-local-2026"
  );
}

export function validarEmailFormato(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function autenticarCredenciais(
  email: string,
  senha: string
): UsuarioSessao | null {
  const emailNorm = email.trim().toLowerCase();
  const encontrado = USUARIOS_PERMITIDOS.find(
    (u) => u.email === emailNorm && u.senha === senha
  );
  if (!encontrado) return null;
  return {
    email: encontrado.email,
    nome: encontrado.nome,
    cargo: encontrado.cargo,
  };
}

export function assinarTokenSessao(usuario: UsuarioSessao): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...usuario,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 dias
    })
  ).toString("base64url");

  const assinatura = crypto
    .createHmac("sha256", getSegredoSessao())
    .update(payload)
    .digest("base64url");

  return `${payload}.${assinatura}`;
}

export function verificarTokenSessao(token?: string): UsuarioSessao | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 2) return null;

  const [payload, assinaturaRecebida] = partes;
  const assinaturaEsperada = crypto
    .createHmac("sha256", getSegredoSessao())
    .update(payload)
    .digest("base64url");

  if (assinaturaRecebida !== assinaturaEsperada) return null;

  try {
    const dados = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    ) as UsuarioSessao & { exp: number };

    if (!dados.exp || dados.exp < Date.now()) return null;

    return {
      email: dados.email,
      nome: dados.nome,
      cargo: dados.cargo,
    };
  } catch {
    return null;
  }
}
