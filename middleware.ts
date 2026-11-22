import { NextRequest, NextResponse } from "next/server";

const NOME_COOKIE_SESSAO = "triagem_sessao";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Libera rotas de API, arquivos estáticos e assets do Next.js
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(NOME_COOKIE_SESSAO)?.value;
  const temTokenValido = Boolean(token && token.includes("."));

  if (pathname === "/login") {
    if (temTokenValido) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!temTokenValido) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
