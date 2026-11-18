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
