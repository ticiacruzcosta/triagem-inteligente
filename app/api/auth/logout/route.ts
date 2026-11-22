import { NextResponse } from "next/server";
import { NOME_COOKIE_SESSAO } from "@/lib/auth";

export async function POST() {
  const resp = NextResponse.json({ ok: true });
  resp.cookies.set(NOME_COOKIE_SESSAO, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return resp;
}
