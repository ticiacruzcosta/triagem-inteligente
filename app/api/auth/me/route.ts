import { NextRequest, NextResponse } from "next/server";
import { NOME_COOKIE_SESSAO, verificarTokenSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(NOME_COOKIE_SESSAO)?.value;
  const usuario = verificarTokenSessao(token);

  if (!usuario) {
    return NextResponse.json({ usuario: null }, { status: 401 });
  }

  return NextResponse.json({ usuario });
}
