import { NextRequest, NextResponse } from "next/server";
import {
  detectarInjecaoMaliciosa,
  sanitizarTextoEntrada,
  validarAnaliseIA,
  validarNomeCliente,
} from "@/lib/validation";
import { gerarAnaliseDemonstracao } from "@/lib/fallback";
import { executarChamadaLLM, INFO_PROVEDORES } from "@/lib/llm-providers";
import { ProvedorIA } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nome,
      canal,
      texto,
      tomEmpresa,
      apiKey,
      provedor = "anthropic",
      instrucaoRefinamento,
    } = body as {
      nome?: string;
      canal?: string;
      texto?: string;
      tomEmpresa?: string;
      apiKey?: string;
      provedor?: ProvedorIA;
      instrucaoRefinamento?: string;
    };

    if (!texto || !texto.trim()) {
      return NextResponse.json(
        { erro: "O texto da mensagem do cliente é obrigatório." },
        { status: 400 }
      );
    }

    // Bloqueio de segurança contra SQL Injection, XSS e Code Injection (ISO/IEC 27001)
    if (
      detectarInjecaoMaliciosa(texto) ||
      (nome && (!validarNomeCliente(nome) || detectarInjecaoMaliciosa(nome))) ||
      (tomEmpresa && detectarInjecaoMaliciosa(tomEmpresa))
    ) {
      return NextResponse.json(
        {
          erro: "Entrada bloqueada pelo filtro de segurança (ISO 27001): código executável, SQL Injection ou script não permitido.",
        },
        { status: 400 }
      );
    }

    const nomeSanitizado = sanitizarTextoEntrada(nome || "Cliente");
    const textoSanitizado = sanitizarTextoEntrada(texto);

    const provedorSelecionado: ProvedorIA =
      provedor in INFO_PROVEDORES ? provedor : "anthropic";

    const tomFormatado =
      tomEmpresa?.trim() ||
      "Empático, prestativo, profissional, claro e orientado à solução rápida.";

    const envVarName = INFO_PROVEDORES[provedorSelecionado].envVar;
    const chaveEnv = process.env[envVarName] || "";
    const chaveApi = (apiKey?.trim() || chaveEnv).trim();

    // Se nenhuma chave foi informada para o provedor escolhido, utiliza o Modo Demonstração Zero-Config
    if (!chaveApi || chaveApi === "sk-ant-api03-sua-chave-aqui") {
      await new Promise((r) => setTimeout(r, 400));
      const analiseDemo = gerarAnaliseDemonstracao(
        nomeSanitizado,
        canal || "Atendimento",
        textoSanitizado,
        tomFormatado
      );

      if (instrucaoRefinamento) {
        if (instrucaoRefinamento === "curta") {
          analiseDemo.respostaSugerida = `Olá, ${(nome || "Cliente").split(" ")[0]}! Recebemos sua solicitação sobre ${analiseDemo.categoria.toLowerCase()} e já estamos resolvendo com prioridade pelo ${canal || "suporte"}. Retornaremos em instantes!`;
        } else if (instrucaoRefinamento === "formal") {
          analiseDemo.respostaSugerida = `Prezado(a) ${nome || "Cliente"},\n\nAcusamos o recebimento de sua manifestação referente a "${analiseDemo.categoria}". Informamos que as providências cabíveis já foram adotadas por nosso departamento responsável.\n\nCordialmente,\nCentral de Relacionamento com o Cliente.`;
        } else if (instrucaoRefinamento === "dados") {
          analiseDemo.respostaSugerida += `\n\nPara agilizar a tratativa, poderia nos confirmar por gentileza seu CPF/CNPJ ou o número do pedido correspondente?`;
        }
      }

      const validada = validarAnaliseIA(analiseDemo);
      return NextResponse.json({
        analise: validada,
        modo: "demonstracao",
        provedor: provedorSelecionado,
      });
    }

    const complementoRefinamento = instrucaoRefinamento
      ? `\nInstrução extra para a respostaSugerida: Ajuste a resposta para ser "${instrucaoRefinamento}".`
      : "";

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
6. "respostaSugerida" deve saudar o cliente pelo nome (${nome || "Cliente"}) e adotar o seguinte tom da empresa: "${tomFormatado}".${complementoRefinamento}
7. Responda SOMENTE com o JSON puro.`;

    const userPrompt = `Cliente: ${nomeSanitizado}
Canal de atendimento: ${canal || "Não informado"}
Mensagem do cliente: "${textoSanitizado}"`;

    const respostaBruta = await executarChamadaLLM({
      provedor: provedorSelecionado,
      apiKey: chaveApi,
      systemPrompt,
      userPrompt,
    });

    let textoLimpo = respostaBruta.trim();
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
          erro: `A resposta retornada pelo provedor ${INFO_PROVEDORES[provedorSelecionado].nome} não é um JSON válido. Tente classificar novamente.`,
        },
        { status: 502 }
      );
    }

    const analiseValidada = validarAnaliseIA(jsonParseado);

    return NextResponse.json({
      analise: analiseValidada,
      modo: provedorSelecionado,
      provedor: provedorSelecionado,
    });
  } catch (err: unknown) {
    const mensagemErro =
      err instanceof Error
        ? err.message
        : "Falha inesperada ao comunicar com o provedor de IA.";
    return NextResponse.json({ erro: mensagemErro }, { status: 500 });
  }
}
