import { NextRequest, NextResponse } from "next/server";
import {
  assinarTokenSessao,
  autenticarCredenciais,
  NOME_COOKIE_SESSAO,
  validarEmailFormato,
} from "@/lib/auth";
import { detectarInjecaoMaliciosa } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, senha } = body as { email?: string; senha?: string };

    if (!email || !senha) {
      return NextResponse.json(
        { erro: "Informe e-mail e senha para entrar." },
        { status: 400 }
      );
    }

    if (detectarInjecaoMaliciosa(email) || detectarInjecaoMaliciosa(senha)) {
      return NextResponse.json(
        {
          erro: "Entrada bloqueada por segurança (ISO 27001): caracteres ou comandos não permitidos.",
        },
        { status: 400 }
      );
    }

    if (!validarEmailFormato(email)) {
      return NextResponse.json(
        { erro: "Formato de e-mail inválido." },
        { status: 400 }
      );
    }

    const usuario = autenticarCredenciais(email, senha);
    if (!usuario) {
      return NextResponse.json(
        { erro: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const token = assinarTokenSessao(usuario);
    const resp = NextResponse.json({ usuario });

    resp.cookies.set(NOME_COOKIE_SESSAO, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return resp;
  } catch {
    return NextResponse.json(
      { erro: "Erro inesperado ao processar login." },
      { status: 500 }
    );
  }
}
