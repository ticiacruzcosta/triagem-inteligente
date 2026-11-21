import { AnaliseIA, Categoria, Sentimento, Urgencia } from "./types";

const CATEGORIAS_VALIDAS: Categoria[] = [
  "Cobrança",
  "Problema técnico",
  "Dúvida",
  "Cancelamento",
  "Elogio",
  "Outro",
];

const URGENCIAS_VALIDAS: Urgencia[] = ["Alta", "Média", "Baixa"];

const SENTIMENTOS_VALIDOS: Sentimento[] = ["Positivo", "Neutro", "Negativo"];

const REGEX_HORARIO_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Padrões clássicos de SQL Injection, XSS e Prompt Injection malicioso
const PADROES_INJECAO_MALICIOSA: RegExp[] = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC)\b[\s\S]*\b(FROM|INTO|TABLE|DATABASE|WHERE|SET|VALUES|ALL)\b/i,
  /('|"|;)\s*(OR|AND)\s+('|"|\d+|\w+)\s*=\s*('|"|\d+|\w+)/i,
  /--\s*$/m,
  /;\s*(DROP|DELETE|UPDATE|INSERT|SELECT)\b/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover)\s*=/i,
];

/**
 * Verifica se um texto contém tentativas de SQL Injection ou XSS.
 */
export function detectarInjecaoMaliciosa(texto: string): boolean {
  if (!texto) return false;
  return PADROES_INJECAO_MALICIOSA.some((regex) => regex.test(texto));
}

/**
 * Sanitiza texto removendo tags HTML/scripts perigosos.
 */
export function sanitizarTextoEntrada(texto: string): string {
  return texto
    .replace(/<[^>]*>?/gm, "")
    .trim();
}

/**
 * Valida se o horário está estritamente no formato HH:MM (00:00 a 23:59).
 */
export function validarFormatoHorario(horario: string): boolean {
  if (!horario.trim()) return true; // Vazio usa o horário atual do sistema
  return REGEX_HORARIO_24H.test(horario.trim());
}

export function validarAnaliseIA(dados: unknown): AnaliseIA {
  if (!dados || typeof dados !== "object") {
    throw new Error("A resposta da IA não é um objeto JSON válido.");
  }

  const obj = dados as Record<string, unknown>;

  const categoria = String(obj.categoria || "").trim() as Categoria;
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    throw new Error(
      `Categoria inválida retornada pela IA: "${obj.categoria}". Esperado uma de: ${CATEGORIAS_VALIDAS.join(", ")}.`
    );
  }

  const urgencia = String(obj.urgencia || "").trim() as Urgencia;
  if (!URGENCIAS_VALIDAS.includes(urgencia)) {
    throw new Error(
      `Urgência inválida retornada pela IA: "${obj.urgencia}". Esperado: Alta, Média ou Baixa.`
    );
  }

  const justificativaUrgencia = String(obj.justificativaUrgencia || "").trim();
  if (!justificativaUrgencia) {
    throw new Error("Justificativa de urgência ausente na resposta da IA.");
  }

  const sentimento = String(obj.sentimento || "").trim() as Sentimento;
  if (!SENTIMENTOS_VALIDOS.includes(sentimento)) {
    throw new Error(
      `Sentimento inválido retornado pela IA: "${obj.sentimento}". Esperado: Positivo, Neutro ou Negativo.`
    );
  }

  const resumoBruto = String(obj.resumo || "").trim();
  if (!resumoBruto) {
    throw new Error("Resumo ausente na resposta da IA.");
  }
  // Garante limite de até 15 palavras
  const palavrasResumo = resumoBruto.split(/\s+/);
  const resumo =
    palavrasResumo.length > 15
      ? palavrasResumo.slice(0, 15).join(" ") + "..."
      : resumoBruto;

  const respostaSugerida = String(obj.respostaSugerida || "").trim();
  if (!respostaSugerida) {
    throw new Error("Resposta sugerida ausente na resposta da IA.");
  }

  return {
    categoria,
    urgencia,
    justificativaUrgencia,
    sentimento,
    resumo,
    respostaSugerida,
  };
}
