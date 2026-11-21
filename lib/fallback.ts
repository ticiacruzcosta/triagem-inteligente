import { AnaliseIA, Categoria, Sentimento, Urgencia } from "./types";

/**
 * Motor heurístico determinístico de demonstração (Fallback)
 * Permite que recrutadores e avaliadores testem 100% do fluxo da aplicação
 * mesmo sem possuir uma chave paga da API da Anthropic (ANTHROPIC_API_KEY).
 */
export function gerarAnaliseDemonstracao(
  nome: string,
  canal: string,
  texto: string,
  tomEmpresa: string
): AnaliseIA {
  const t = texto.toLowerCase();
  const primeiroNome = (nome || "Cliente").split(" ")[0];

  let categoria: Categoria = "Outro";
  let urgencia: Urgencia = "Baixa";
  let sentimento: Sentimento = "Neutro";
  let justificativaUrgencia =
    "Solicitação informativa padrão sem impacto crítico imediato na operação do cliente.";
  let resumo = "Contato geral recebido pela central de atendimento ao cliente.";
  let corpoResposta = "";

  // 0. Detectar texto incompreensível / teste aleatório de teclado (ex: "jhroegww", "asdfg")
  const palavrasValidas = t
    .replace(/[^a-záàâãéêíóôõúç\s]/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const temVogal = /[aeiouáàâãéêíóôõú]/i.test(t);
  const pareceAleatoria =
    t.trim().length < 4 ||
    !temVogal ||
    (palavrasValidas.length === 1 &&
      palavrasValidas[0].length >= 5 &&
      !/[aeiou]{1,2}[^aeiou]{1,2}[aeiou]/i.test(palavrasValidas[0]));

  if (pareceAleatoria) {
    categoria = "Outro";
    urgencia = "Baixa";
    sentimento = "Neutro";
    justificativaUrgencia =
      "Mensagem curta ou sem contexto claro identificada; requer confirmação do cliente antes de prosseguir.";
    resumo = "Mensagem sem contexto claro recebida; necessário solicitar detalhes ao cliente.";
    corpoResposta = `Recebemos seu contato, porém não conseguimos identificar os detalhes da sua solicitação na mensagem enviada. Poderia nos explicar com mais detalhes como podemos ajudar você hoje?`;
  } else if (
    // 1. Detectar Categoria e contexto
    t.includes("cobr") ||
    t.includes("fatura") ||
    t.includes("boleto") ||
    t.includes("estorno") ||
    t.includes("cartão") ||
    t.includes("pix") ||
    t.includes("valor") ||
    t.includes("r$") ||
    t.includes("reajuste")
  ) {
    categoria = "Cobrança";
    if (
      t.includes("duas vezes") ||
      t.includes("procon") ||
      t.includes("urgente") ||
      t.includes("absurdo") ||
      t.includes("cancelei")
    ) {
      urgencia = "Alta";
      sentimento = "Negativo";
      justificativaUrgencia =
        "Risco financeiro e jurídico imediato devido a cobrança indevida relatada com alta insatisfação.";
      resumo = "Cliente relata cobrança indevida na fatura e exige estorno imediato.";
      corpoResposta = `Sentimos muito pelo transtorno com essa cobrança. Já acionamos nossa equipe financeira em caráter de prioridade máxima para verificar a transação, realizar o estorno devido e enviar o comprovante atualizado hoje mesmo.`;
    } else {
      urgencia = "Média";
      sentimento = "Neutro";
      justificativaUrgencia =
        "Solicitação financeira pontual (segunda via ou esclarecimento de fatura) que requer atenção no dia.";
      resumo = "Solicitação de segunda via ou esclarecimento sobre valores da fatura.";
      corpoResposta = `Verificamos seu cadastro e já estamos gerando os detalhes atualizados da sua fatura e opção de pagamento via PIX/boleto para que você possa regularizar com total comodidade.`;
    }
  } else if (
    t.includes("cancelar") ||
    t.includes("cancelamento") ||
    t.includes("encerrar") ||
    t.includes("multa")
  ) {
    categoria = "Cancelamento";
    if (
      t.includes("imediatamente") ||
      t.includes("terceira vez") ||
      t.includes("ninguém resolve") ||
      t.includes("lentidão")
    ) {
      urgencia = "Alta";
      sentimento = "Negativo";
      justificativaUrgencia =
        "Risco iminente de churn motivado por falhas técnicas recorrentes não solucionadas.";
      resumo = "Pedido de cancelamento imediato por insatisfação com problemas técnicos recorrentes.";
      corpoResposta = `Compreendemos totalmente sua frustração com os chamados anteriores. Antes de prosseguirmos com o cancelamento sem ônus, nosso coordenador técnico revisou seu ambiente e aplicou uma correção definitiva; podemos agendar um retorno rápido ou prefere concluir o encerramento agora?`;
    } else {
      urgencia = "Média";
      sentimento = "Neutro";
      justificativaUrgencia =
        "Pedido formal de encerramento de ciclo contratual que exige acompanhamento da equipe de retenção.";
      resumo = "Solicitação amigável de cancelamento de assinatura ao final do ciclo.";
      corpoResposta = `Agradecemos pela parceria durante todo esse período! Já registramos o agendamento do encerramento da sua assinatura ao final do ciclo atual, sem cobranças adicionais, e enviamos a confirmação por protocolo.`;
    }
  } else if (
    t.includes("erro") ||
    t.includes("fora do ar") ||
    t.includes("parou") ||
    t.includes("não estou conseguindo") ||
    t.includes("botão") ||
    t.includes("integração") ||
    t.includes("socorro") ||
    t.includes("parada")
  ) {
    categoria = "Problema técnico";
    if (
      t.includes("fora do ar") ||
      t.includes("500") ||
      t.includes("parada") ||
      t.includes("perdendo vendas") ||
      t.includes("abandonando") ||
      t.includes("socorro")
    ) {
      urgencia = "Alta";
      sentimento = "Negativo";
      justificativaUrgencia =
        "Indisponibilidade crítica que paralisa as vendas ou emissão fiscal do cliente em tempo real.";
      resumo = "Falha crítica de sistema impactando vendas e operação em produção.";
      corpoResposta = `Identificamos a instabilidade relatada e nossa engenharia já aplicou a contingência para restabelecer o serviço imediatamente. Pedimos desculpas pelo impacto na sua operação e permaneceremos monitorando sua conta com prioridade.`;
    } else {
      urgencia = "Média";
      sentimento = "Negativo";
      justificativaUrgencia =
        "Funcionalidade específica apresenta falha que dificulta a rotina, mas não paralisa todo o sistema.";
      resumo = "Dificuldade técnica ao utilizar funcionalidade específica da plataforma no navegador.";
      corpoResposta = `Lamentamos pelo inconveniente ao utilizar essa função. Nossa equipe técnica já identificou o comportamento no navegador e liberou um ajuste; recomendamos atualizar a página (Ctrl + F5) e nos confirmar se voltou ao normal.`;
    }
  } else if (
    t.includes("elogiar") ||
    t.includes("parabéns") ||
    t.includes("impecável") ||
    t.includes("muito obrigada") ||
    t.includes("rápido e intuitivo")
  ) {
    categoria = "Elogio";
    urgencia = "Baixa";
    sentimento = "Positivo";
    justificativaUrgencia =
      "Feedback positivo de satisfação que não demanda resolução técnica urgente.";
    resumo = "Elogio do cliente destacando satisfação com o sistema e atendimento.";
    corpoResposta = `Ficamos imensamente felizes em receber seu carinho e feedback! Compartilhamos sua mensagem com toda a nossa equipe de produto e suporte. Conte sempre conosco para impulsionar seus resultados!`;
  } else if (
    t.includes("gostaria de saber") ||
    t.includes("como faço") ||
    t.includes("oferecem") ||
    t.includes("permite") ||
    t.includes("treinamento") ||
    t.includes("?")
  ) {
    categoria = "Dúvida";
    urgencia = "Baixa";
    sentimento = "Neutro";
    justificativaUrgencia =
      "Dúvida operacional ou comercial de rotina que pode ser respondida com documentação padrão.";
    resumo = "Dúvida sobre funcionalidades, planos ou materiais de treinamento do sistema.";
    corpoResposta = `Será um prazer esclarecer sua dúvida! Enviamos abaixo o passo a passo detalhado e os links da nossa central de ajuda para que você e sua equipe aproveitem todos os recursos com segurança.`;
  } else {
    categoria = "Outro";
    urgencia = "Baixa";
    sentimento = "Neutro";
    justificativaUrgencia =
      "Contato comercial ou institucional sem impacto em suporte técnico ativo.";
    resumo = "Proposta comercial de parceria ou contato institucional externo.";
    corpoResposta = `Agradecemos pelo interesse em construir uma parceria conosco! Encaminhamos sua apresentação para o nosso time de Novos Negócios e Parcerias, que entrará em contato em breve pelo canal ${canal}.`;
  }

  const assinaturaTom =
    tomEmpresa && tomEmpresa.toLowerCase().includes("formal")
      ? "Atenciosamente, Equipe de Suporte Especializado."
      : "Um abraço, Equipe de Suporte.";

  const respostaSugerida = `Olá, ${primeiroNome}! Tudo bem?\n\n${corpoResposta}\n\nQualquer dúvida adicional, seguimos à disposição pelo ${canal}.\n${assinaturaTom}`;

  return {
    categoria,
    urgencia,
    justificativaUrgencia,
    sentimento,
    resumo,
    respostaSugerida,
  };
}
