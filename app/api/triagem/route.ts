import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { validarAnaliseIA } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, canal, texto, tomEmpresa, apiKey } = body as {
      nome?: string;
      canal?: string;
      texto?: string;
      tomEmpresa?: string;
      apiKey?: string;
    };

    if (!texto || !texto.trim()) {
      return NextResponse.json(
        { erro: "O texto da mensagem do cliente é obrigatório." },
        { status: 400 }
      );
    }

    const chaveApi = (apiKey?.trim() || process.env.ANTHROPIC_API_KEY || "").trim();

    if (!chaveApi) {
      return NextResponse.json(
        {
          erro: "Chave da API da Anthropic (ANTHROPIC_API_KEY) não configurada. Defina no arquivo .env.local ou informe no painel de configuração.",
        },
        { status: 401 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: chaveApi,
    });

    const tomFormatado =
      tomEmpresa?.trim() ||
      "Empático, prestativo, profissional, claro e orientado à solução rápida.";

    const systemPrompt = `Você é um especialista em triagem inteligente de suporte ao cliente.
Sua tarefa é analisar a mensagem recebida de um cliente e retornar EXCLUSIVAMENTE um objeto JSON válido, sem blocos de código markdown (\`\`\`json), sem texto adicional antes ou depois.

O JSON deve seguir estritamente esta estrutura e valores permitidos:
{
  "categoria": "Cobrança" | "Problema técnico" | "Dúvida" | "Cancelamento" | "Elogio" | "Outro",
  "urgencia": "Alta" | "Média" | "Baixa",
  "justificativaUrgencia": "Uma única frase explicando o motivo deste nível de urgência.",
  "sentimento": "Positivo" | "Neutro" | "Negativo",
  "resumo": "Resumo objetivo do caso em até 15 palavras.",
  "respostaSugerida": "Resposta completa, educada, em português do Brasil, seguindo o tom da empresa."
}

Regras obrigatórias:
1. "categoria" deve ser exatamente uma das 6 opções: "Cobrança", "Problema técnico", "Dúvida", "Cancelamento", "Elogio" ou "Outro".
2. "urgencia" deve ser exatamente "Alta", "Média" ou "Baixa".
3. "justificativaUrgencia" deve ter apenas uma frase concisa em português do Brasil.
4. "sentimento" deve ser exatamente "Positivo", "Neutro" ou "Negativo".
5. "resumo" deve ter no máximo 15 palavras.
6. "respostaSugerida" deve saudar o cliente pelo nome (${nome || "Cliente"}) e adotar o seguinte tom da empresa: "${tomFormatado}".
7. Responda SOMENTE com o JSON puro.`;

    const userPrompt = `Cliente: ${nome || "Não informado"}
Canal de atendimento: ${canal || "Não informado"}
Mensagem do cliente: "${texto}"`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const blocoTexto = msg.content.find((b) => b.type === "text");
    if (!blocoTexto || blocoTexto.type !== "text") {
      return NextResponse.json(
        { erro: "A IA não retornou conteúdo textual." },
        { status: 502 }
      );
    }

    let textoLimpo = blocoTexto.text.trim();
    // Caso a IA inclua crases markdown apesar da instrução, extrai o bloco JSON
    const matchJson = textoLimpo.match(/\{[\s\S]*\}/);
    if (matchJson) {
      textoLimpo = matchJson[0];
    }

    let jsonParseado: unknown;
    try {
      jsonParseado = JSON.parse(textoLimpo);
    } catch {
      return NextResponse.json(
        {
          erro: "A resposta retornada pela IA não é um JSON válido. Tente classificar novamente.",
        },
        { status: 502 }
      );
    }

    const analiseValidada = validarAnaliseIA(jsonParseado);

    return NextResponse.json({ analise: analiseValidada });
  } catch (err: unknown) {
    const mensagemErro =
      err instanceof Error
        ? err.message
        : "Falha inesperada ao comunicar com a API da Anthropic.";
    return NextResponse.json({ erro: mensagemErro }, { status: 500 });
  }
}
