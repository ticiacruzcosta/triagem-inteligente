import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triagem Inteligente | Suporte ao Cliente com IA",
  description:
    "Sistema de triagem automática de mensagens de clientes, classificação de urgência e sugestão de respostas com IA Multi-LLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
