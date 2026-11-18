import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triagem Inteligente | Suporte ao Cliente com IA",
  description:
    "Sistema de triagem automática de mensagens de clientes, classificação de urgência e sugestão de respostas com Claude (Anthropic).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#F4F6F9] text-[#1A2332]">
        {children}
      </body>
    </html>
  );
}
