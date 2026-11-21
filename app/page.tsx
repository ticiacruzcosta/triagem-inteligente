"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Canal,
  Categoria,
  MensagemCliente,
  Urgencia,
} from "@/lib/types";
import { EXEMPLOS_MENSAGENS } from "@/lib/exemplos";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Inbox,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

const STORAGE_KEY_MENSAGENS = "triagem_inteligente_mensagens_v1";
const STORAGE_KEY_TOM = "triagem_inteligente_tom_v1";
const STORAGE_KEY_API = "triagem_inteligente_apikey_v1";

interface PresetPersonalidade {
  id: string;
  rotulo: string;
  valor: string;
}

const PRESETS_PERSONALIDADE: PresetPersonalidade[] = [
  {
    id: "empatico",
    rotulo: "Empático e Acolhedor",
    valor:
      "Empático, acolhedor, profissional e focado em resolver o problema do cliente com transparência e agilidade.",
  },
  {
    id: "objetivo",
    rotulo: "Rápido e Objetivo",
    valor:
      "Direto ao ponto, conciso, prático e focado em instruções claras e resolução imediata sem rodeios.",
  },
  {
    id: "formal",
    rotulo: "Formal Executivo",
    valor:
      "Estritamente formal, corporativo, respeitoso, utilizando linguagem executiva culta e transmitindo alta credibilidade institucional.",
  },
  {
    id: "retencao",
    rotulo: "Retenção",
    valor:
      "Consultivo, altamente persuasivo e diplomático, focado em reverter insatisfações, valorizar o cliente e evitar cancelamentos.",
  },
];

const PESO_URGENCIA: Record<Urgencia, number> = {
  Alta: 3,
  Média: 2,
  Baixa: 1,
};

const TODAS_CATEGORIAS: Categoria[] = [
  "Cobrança",
  "Problema técnico",
  "Dúvida",
  "Cancelamento",
  "Elogio",
  "Outro",
];

export default function PaginaTriagemInteligente() {
  const [mensagens, setMensagens] = useState<MensagemCliente[]>([]);
  const [carregadoStorage, setCarregadoStorage] = useState(false);
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);

  // Configurações de Tom e API
  const [tomEmpresa, setTomEmpresa] = useState<string>(
    PRESETS_PERSONALIDADE[0].valor
  );
  const [mostrarEditorTom, setMostrarEditorTom] = useState<boolean>(false);
  const [apiKeyCustom, setApiKeyCustom] = useState<string>("");
  const [mostrarConfigApi, setMostrarConfigApi] = useState<boolean>(false);
  const [modoExecucao, setModoExecucao] = useState<
    "anthropic" | "demonstracao" | null
  >(null);

  // Filtros e Busca
  const [buscaTexto, setBuscaTexto] = useState<string>("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>("Todas");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pendentes" | "resolvidos" | "escalar"
  >("todos");
  const [mostrarGraficos, setMostrarGraficos] = useState<boolean>(false);

  // Modal Nova Mensagem
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [novoNome, setNovoNome] = useState<string>("");
  const [novoCanal, setNovoCanal] = useState<Canal>("WhatsApp");
  const [novoTexto, setNovoTexto] = useState<string>("");
  const [novoHorario, setNovoHorario] = useState<string>("");

  // Estado de cópia e processamento em lote
  const [copiado, setCopiado] = useState<boolean>(false);
  const [carregandoLote, setCarregandoLote] = useState<boolean>(false);

  // Carregar dados do localStorage na montagem
  useEffect(() => {
    try {
      const salvas = localStorage.getItem(STORAGE_KEY_MENSAGENS);
      if (salvas) {
        const parseadas = JSON.parse(salvas) as MensagemCliente[];
        if (Array.isArray(parseadas)) {
          setMensagens(parseadas);
          if (parseadas.length > 0) {
            setIdSelecionado(parseadas[0].id);
          }
        }
      }
      const tomSalvo = localStorage.getItem(STORAGE_KEY_TOM);
      if (tomSalvo) setTomEmpresa(tomSalvo);

      const apiSalva = localStorage.getItem(STORAGE_KEY_API);
      if (apiSalva) setApiKeyCustom(apiSalva);
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
    } finally {
      setCarregadoStorage(true);
    }
  }, []);

  // Salvar mensagens no localStorage
  useEffect(() => {
    if (!carregadoStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY_MENSAGENS, JSON.stringify(mensagens));
    } catch (e) {
      console.error("Erro ao salvar mensagens no localStorage:", e);
    }
  }, [mensagens, carregadoStorage]);

  // Salvar tom da empresa
  useEffect(() => {
    if (!carregadoStorage) return;
    localStorage.setItem(STORAGE_KEY_TOM, tomEmpresa);
  }, [tomEmpresa, carregadoStorage]);

  // Salvar API key opcional
  useEffect(() => {
    if (!carregadoStorage) return;
    localStorage.setItem(STORAGE_KEY_API, apiKeyCustom);
  }, [apiKeyCustom, carregadoStorage]);

  // Função para classificar uma mensagem individual na API da Anthropic (ou Fallback Demo)
  const classificarMensagem = async (
    msg: MensagemCliente,
    tomAtual: string,
    chaveAtual: string,
    instrucaoRefinamento?: string
  ) => {
    setMensagens((prev) =>
      prev.map((item) =>
        item.id === msg.id
          ? { ...item, statusTriagem: "processando", erroMensagem: undefined }
          : item
      )
    );

    try {
      const resp = await fetch("/api/triagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: msg.nome,
          canal: msg.canal,
          texto: msg.texto,
          tomEmpresa: tomAtual,
          apiKey: chaveAtual,
          instrucaoRefinamento,
        }),
      });

      const dados = await resp.json();

      if (!resp.ok || !dados.analise) {
        throw new Error(
          dados.erro || `Erro HTTP ${resp.status} ao classificar mensagem.`
        );
      }

      if (dados.modo) {
        setModoExecucao(dados.modo);
      }

      setMensagens((prev) =>
        prev.map((item) =>
          item.id === msg.id
            ? {
                ...item,
                statusTriagem: "concluido",
                erroMensagem: undefined,
                analise: dados.analise,
                respostaEditada: dados.analise.respostaSugerida,
              }
            : item
        )
      );
    } catch (erro: unknown) {
      const msgErro =
        erro instanceof Error
          ? erro.message
          : "Falha de comunicação com a API.";
      setMensagens((prev) =>
        prev.map((item) =>
          item.id === msg.id
            ? {
                ...item,
                statusTriagem: "erro",
                erroMensagem: msgErro,
              }
            : item
        )
      );
    }
  };

  // Adicionar nova mensagem manual
  const handleAdicionarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoTexto.trim()) return;

    const agora = new Date();
    const horarioFormatado =
      novoHorario.trim() ||
      agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

    const novaMsg: MensagemCliente = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: novoNome.trim(),
      canal: novoCanal,
      texto: novoTexto.trim(),
      horario: horarioFormatado,
      resolvido: false,
      statusTriagem: "pendente",
    };

    setMensagens((prev) => [novaMsg, ...prev]);
    setIdSelecionado(novaMsg.id);
    setNovoNome("");
    setNovoTexto("");
    setNovoHorario("");
    setModalAberto(false);

    await classificarMensagem(novaMsg, tomEmpresa, apiKeyCustom);
  };

  // Carregar 15 exemplos e disparar triagem automática
  const handleCarregarExemplos = async () => {
    if (carregandoLote) return;
    setCarregandoLote(true);

    const timestampBase = Date.now();
    const novasMensagens: MensagemCliente[] = EXEMPLOS_MENSAGENS.map(
      (ex, idx) => ({
        id: `ex-${timestampBase}-${idx}`,
        nome: ex.nome,
        canal: ex.canal,
        texto: ex.texto,
        horario: ex.horario,
        resolvido: false,
        statusTriagem: "pendente",
      })
    );

    setMensagens((prev) => [...novasMensagens, ...prev]);
    if (novasMensagens.length > 0) {
      setIdSelecionado(novasMensagens[0].id);
    }

    const tamanhoLote = 3;
    for (let i = 0; i < novasMensagens.length; i += tamanhoLote) {
      const lote = novasMensagens.slice(i, i + tamanhoLote);
      await Promise.all(
        lote.map((m) => classificarMensagem(m, tomEmpresa, apiKeyCustom))
      );
    }

    setCarregandoLote(false);
  };

  // Tentar novamente todas com erro
  const handleRetentarErros = async () => {
    const comErro = mensagens.filter((m) => m.statusTriagem === "erro");
    if (comErro.length === 0) return;
    setCarregandoLote(true);
    const tamanhoLote = 3;
    for (let i = 0; i < comErro.length; i += tamanhoLote) {
      const lote = comErro.slice(i, i + tamanhoLote);
      await Promise.all(
        lote.map((m) => classificarMensagem(m, tomEmpresa, apiKeyCustom))
      );
    }
    setCarregandoLote(false);
  };

  // Exportar relatório CSV
  const handleExportarCSV = () => {
    if (mensagens.length === 0) return;

    const cabecalho = [
      "ID",
      "Cliente",
      "Canal",
      "Horario",
      "Status",
      "Categoria",
      "Urgencia",
      "Sentimento",
      "Escalar_Humano",
      "Resumo",
      "Mensagem_Original",
      "Resposta_Sugerida",
    ];

    const escaparCSV = (val: string) =>
      `"${(val || "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

    const linhas = mensagens.map((m) => {
      const escalar =
        m.analise?.urgencia === "Alta" && m.analise?.sentimento === "Negativo"
          ? "SIM"
          : "NAO";
      return [
        escaparCSV(m.id),
        escaparCSV(m.nome),
        escaparCSV(m.canal),
        escaparCSV(m.horario),
        escaparCSV(m.resolvido ? "Resolvido" : "Pendente"),
        escaparCSV(m.analise?.categoria || "N/A"),
        escaparCSV(m.analise?.urgencia || "N/A"),
        escaparCSV(m.analise?.sentimento || "N/A"),
        escaparCSV(escalar),
        escaparCSV(m.analise?.resumo || ""),
        escaparCSV(m.texto),
        escaparCSV(m.respostaEditada ?? m.analise?.respostaSugerida ?? ""),
      ].join(",");
    });

    const conteudoCSV = "\uFEFF" + [cabecalho.join(","), ...linhas].join("\n");
    const blob = new Blob([conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `relatorio-triagem-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Limpar todas as mensagens
  const handleLimparTudo = () => {
    setMensagens([]);
    setIdSelecionado(null);
    localStorage.removeItem(STORAGE_KEY_MENSAGENS);
  };

  // Métricas do topo e estatísticas por categoria
  const metricas = useMemo(() => {
    const total = mensagens.length;
    const classificadas = mensagens.filter(
      (m) => m.statusTriagem === "concluido" && m.analise
    );
    const totalClassificadas = classificadas.length;

    const qtdAlta = classificadas.filter(
      (m) => m.analise?.urgencia === "Alta"
    ).length;
    const qtdMedia = classificadas.filter(
      (m) => m.analise?.urgencia === "Média"
    ).length;
    const qtdBaixa = classificadas.filter(
      (m) => m.analise?.urgencia === "Baixa"
    ).length;

    const pctAlta =
      totalClassificadas > 0
        ? Math.round((qtdAlta / totalClassificadas) * 100)
        : 0;
    const pctMedia =
      totalClassificadas > 0
        ? Math.round((qtdMedia / totalClassificadas) * 100)
        : 0;
    const pctBaixa =
      totalClassificadas > 0
        ? Math.round((qtdBaixa / totalClassificadas) * 100)
        : 0;

    // 4 minutos economizados por mensagem triada/respondida
    const minutosEconomizados = total * 4;
    const horas = Math.floor(minutosEconomizados / 60);
    const minutosRestantes = minutosEconomizados % 60;
    const tempoFormatado =
      horas > 0
        ? `${horas}h ${String(minutosRestantes).padStart(2, "0")}min`
        : `${minutosEconomizados} min`;

    const qtdErros = mensagens.filter((m) => m.statusTriagem === "erro").length;

    const qtdEscalar = classificadas.filter(
      (m) =>
        m.analise?.urgencia === "Alta" && m.analise?.sentimento === "Negativo"
    ).length;

    const porCategoria = TODAS_CATEGORIAS.map((cat) => {
      const count = classificadas.filter(
        (m) => m.analise?.categoria === cat
      ).length;
      const pct =
        totalClassificadas > 0
          ? Math.round((count / totalClassificadas) * 100)
          : 0;
      return { categoria: cat, count, pct };
    });

    const sentPositivo = classificadas.filter(
      (m) => m.analise?.sentimento === "Positivo"
    ).length;
    const sentNeutro = classificadas.filter(
      (m) => m.analise?.sentimento === "Neutro"
    ).length;
    const sentNegativo = classificadas.filter(
      (m) => m.analise?.sentimento === "Negativo"
    ).length;

    return {
      total,
      totalClassificadas,
      qtdAlta,
      qtdMedia,
      qtdBaixa,
      pctAlta,
      pctMedia,
      pctBaixa,
      minutosEconomizados,
      tempoFormatado,
      qtdErros,
      qtdEscalar,
      porCategoria,
      sentPositivo,
      sentNeutro,
      sentNegativo,
    };
  }, [mensagens]);

  // Lista filtrada e ordenada por urgência (Alta -> Média -> Baixa)
  const mensagensFiltradasEOrdenadas = useMemo(() => {
    const termo = buscaTexto.trim().toLowerCase();

    return mensagens
      .filter((m) => {
        if (termo) {
          const bateNome = m.nome.toLowerCase().includes(termo);
          const bateTexto = m.texto.toLowerCase().includes(termo);
          const bateResumo =
            m.analise?.resumo.toLowerCase().includes(termo) ?? false;
          if (!bateNome && !bateTexto && !bateResumo) return false;
        }
        if (filtroCategoria !== "Todas") {
          if (m.analise?.categoria !== filtroCategoria) return false;
        }
        if (filtroUrgencia !== "Todas") {
          if (m.analise?.urgencia !== filtroUrgencia) return false;
        }
        if (filtroStatus === "pendentes" && m.resolvido) return false;
        if (filtroStatus === "resolvidos" && !m.resolvido) return false;
        if (filtroStatus === "escalar") {
          const ehEscalar =
            m.analise?.urgencia === "Alta" &&
            m.analise?.sentimento === "Negativo";
          if (!ehEscalar) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pesoA = a.analise ? PESO_URGENCIA[a.analise.urgencia] : 0;
        const pesoB = b.analise ? PESO_URGENCIA[b.analise.urgencia] : 0;
        if (pesoB !== pesoA) return pesoB - pesoA;
        return 0;
      });
  }, [mensagens, buscaTexto, filtroCategoria, filtroUrgencia, filtroStatus]);

  const mensagemSelecionada = useMemo(
    () => mensagens.find((m) => m.id === idSelecionado) || null,
    [mensagens, idSelecionado]
  );

  // Copiar resposta sugerida/editada
  const handleCopiarResposta = async () => {
    if (!mensagemSelecionada) return;
    const textoParaCopiar =
      mensagemSelecionada.respostaEditada ??
      mensagemSelecionada.analise?.respostaSugerida ??
      "";
    if (!textoParaCopiar) return;

    await navigator.clipboard.writeText(textoParaCopiar);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Alternar status de resolvido
  const handleAlternarResolvido = (id: string) => {
    setMensagens((prev) =>
      prev.map((m) => (m.id === id ? { ...m, resolvido: !m.resolvido } : m))
    );
  };

  // Atualizar texto editado da resposta
  const handleEditarResposta = (id: string, novoValor: string) => {
    setMensagens((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, respostaEditada: novoValor } : m
      )
    );
  };

  // Helper de badge de urgência (Vermelho / Amarelo / Verde) — igual ao mockup
  const renderBadgeUrgencia = (urgencia?: Urgencia) => {
    if (!urgencia) return null;
    const estilos: Record<Urgencia, string> = {
      Alta: "bg-red-700 text-white border-red-800 shadow-xs",
      Média: "bg-amber-300/90 text-amber-950 border-amber-400",
      Baixa: "bg-emerald-600 text-white border-emerald-700",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${estilos[urgencia]}`}
      >
        Urgência {urgencia}
      </span>
    );
  };

  // Helper de badge de canal colorido suave (como no mockup)
  const renderBadgeCanal = (canal: Canal) => {
    const estilos: Record<Canal, string> = {
      WhatsApp: "bg-emerald-100 text-emerald-800",
      "E-mail": "bg-sky-100 text-sky-800",
      Chat: "bg-indigo-100 text-indigo-800",
      Instagram: "bg-pink-100 text-pink-800",
      Telefone: "bg-amber-100 text-amber-800",
    };
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
          estilos[canal] || "bg-slate-100 text-slate-700"
        }`}
      >
        {canal}
      </span>
    );
  };

  // Helper de badge de sentimento
  const renderBadgeSentimento = (sentimento?: string) => {
    if (!sentimento) return null;
    const estilos: Record<string, string> = {
      Positivo: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Neutro: "bg-slate-100 text-slate-700 border-slate-200",
      Negativo: "bg-rose-100 text-rose-800 border-rose-200",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
          estilos[sentimento] || estilos.Neutro
        }`}
      >
        Sentimento: {sentimento}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-12">
      {/* CONTAINER PRINCIPAL */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-5">
        {/* 1. BANNER INSTITUCIONAL SAGA (ALTO CONTRASTE E LINHA ÚNICA DE BOTÕES) */}
        <header className="relative overflow-hidden rounded-3xl bg-[linear-gradient(110deg,#1A2332_0%,#1A2332_45%,#7C2D12_78%,#C2410C_100%)] px-6 py-7 sm:px-8 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rotate-12 rounded-3xl bg-[#F39200]/15 blur-2xl" />
          <div className="pointer-events-none absolute right-24 -bottom-20 h-56 w-56 -rotate-12 rounded-3xl bg-[#F39200]/10 blur-xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wider text-slate-100 backdrop-blur-xs uppercase">
                  <span>MOTOR CLAUDE ANTHROPIC</span>
                </div>

                {modoExecucao === "demonstracao" && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-1 text-[11px] font-semibold text-amber-200"
                    title="Funcionando sem chave paga da Anthropic para facilitar avaliação de portfólio"
                  >
                    <Info className="h-3.5 w-3.5 text-amber-300" />
                    Modo Demonstração Ativo
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Triagem Inteligente de Suporte
              </h1>
              <p className="text-sm sm:text-base text-slate-200/90">
                Classificação automática e priorização de chamados com IA
              </p>
            </div>

            {/* Botões alinhados em linha única como no Mockup */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCarregarExemplos}
                disabled={carregandoLote}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F39200] hover:bg-[#ff9f14] text-[#1A2332] font-bold px-5 py-2.5 text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {carregandoLote ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1A2332]" />
                ) : null}
                Simular 15 atendimentos
              </button>

              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/35 font-semibold px-5 py-2.5 text-sm backdrop-blur-xs transition-all active:scale-[0.98]"
              >
                <span>+ Novo chamado</span>
              </button>

              {mensagens.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setMostrarGraficos((v) => !v)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-white/30 px-3.5 py-2.5 text-xs font-bold transition-all ${
                      mostrarGraficos
                        ? "bg-white text-[#1A2332]"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    title="Ver gráficos por categoria e sentimento"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Análise</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportarCSV}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3.5 py-2.5 text-xs font-bold transition-all"
                    title="Exportar planilha CSV"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">CSV</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setMostrarConfigApi((v) => !v)}
                className={`inline-flex items-center justify-center rounded-full border border-white/35 px-3.5 py-2.5 text-xs font-bold transition-all ${
                  mostrarConfigApi
                    ? "bg-white text-[#1A2332]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Configurar Chave da API Anthropic"
              >
                API
              </button>
            </div>
          </div>
        </header>

        {/* 2. PAINEL DE 4 MÉTRICAS NO TOPO (IGUAL AO MOCKUP) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: CHAMADOS NA FILA */}
          <div className="cartao p-5 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              CHAMADOS NA FILA
            </p>
            <p className="mt-1 text-4xl font-extrabold text-[#1A2332]">
              {metricas.total}
            </p>
            <p className="mt-1.5 text-xs font-medium text-slate-600">
              {metricas.totalClassificadas} analisados •{" "}
              <span
                className={
                  metricas.qtdEscalar > 0
                    ? "font-bold text-red-700"
                    : "text-slate-500"
                }
              >
                {metricas.qtdEscalar} p/ escalar
              </span>
            </p>
          </div>

          {/* Card 2: URGÊNCIA ALTA */}
          <div className="cartao p-5 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              URGÊNCIA ALTA
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <span
                className={`text-4xl font-extrabold ${
                  metricas.qtdAlta > 0 ? "text-red-700" : "text-slate-400"
                }`}
              >
                {metricas.qtdAlta}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  metricas.qtdAlta > 0
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {metricas.pctAlta}%
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-red-100/70">
              <div
                className="h-full rounded-full bg-red-700 transition-all duration-300"
                style={{ width: `${metricas.pctAlta}%` }}
              />
            </div>
          </div>

          {/* Card 3: TRIAGEM POR PRIORIDADE */}
          <div className="cartao p-5 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              TRIAGEM POR PRIORIDADE
            </p>
            <div className="mt-1.5 space-y-0.5 text-sm font-semibold text-[#1A2332]">
              <p>
                Média: {metricas.pctMedia}% ({metricas.qtdMedia})
              </p>
              <p>
                Baixa: {metricas.pctBaixa}% ({metricas.qtdBaixa})
              </p>
            </div>
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-red-700 transition-all duration-300"
                style={{ width: `${metricas.pctAlta}%` }}
                title={`Alta: ${metricas.pctAlta}%`}
              />
              <div
                className="bg-[#F39200] transition-all duration-300"
                style={{ width: `${metricas.pctMedia}%` }}
                title={`Média: ${metricas.pctMedia}%`}
              />
              <div
                className="bg-emerald-600 transition-all duration-300"
                style={{ width: `${metricas.pctBaixa}%` }}
                title={`Baixa: ${metricas.pctBaixa}%`}
              />
            </div>
          </div>

          {/* Card 4: TEMPO POUPADO */}
          <div className="cartao p-5 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              TEMPO POUPADO
            </p>
            <p className="mt-1 text-4xl font-extrabold text-[#D97706]">
              {metricas.tempoFormatado}
            </p>
            <p className="mt-1.5 text-xs font-medium text-slate-600">
              Base: 4 min por chamado
            </p>
          </div>
        </section>

        {/* PAINEL ANALÍTICO EXPANSÍVEL */}
        {mostrarGraficos && mensagens.length > 0 && (
          <section className="cartao p-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#F39200]" />
                Volume por Categoria de Atendimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {metricas.porCategoria.map((item) => (
                  <div
                    key={item.categoria}
                    className="rounded-2xl bg-[#F4F6F9] p-3 border border-slate-200/60"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#1A2332]">
                      <span>{item.categoria}</span>
                      <span>
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-[#1A2332] transition-all duration-300"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Termômetro de Sentimento
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
                  <span>Positivo</span>
                  <span>{metricas.sentPositivo} chamados</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700">
                  <span>Neutro</span>
                  <span>{metricas.sentNeutro} chamados</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-800">
                  <span>Negativo</span>
                  <span>{metricas.sentNegativo} chamados</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. BARRA COMPACTA DE PERSONALIDADE DA IA (PÍLULAS SELECIONÁVEIS COMO NO MOCKUP) */}
        <section className="cartao px-5 py-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1A2332] mr-1">
                PERSONALIDADE DA IA:
              </span>

              {PRESETS_PERSONALIDADE.map((preset) => {
                const selecionado = tomEmpresa === preset.valor;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTomEmpresa(preset.valor)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      selecionado
                        ? "bg-[#1A2332] text-[#F39200] ring-2 ring-[#F39200]"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {preset.rotulo}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setMostrarEditorTom((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#1A2332] transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#F39200]" />
              <span>Personalizar tom</span>
              {mostrarEditorTom ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {mostrarEditorTom && (
            <div className="pt-2 border-t border-slate-100">
              <input
                type="text"
                value={tomEmpresa}
                onChange={(e) => setTomEmpresa(e.target.value)}
                placeholder="Descreva o tom de voz personalizado da sua empresa..."
                className="campo text-xs"
              />
            </div>
          )}

          {mostrarConfigApi && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label
                htmlFor="campo-api-key"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1A2332]"
              >
                <KeyRound className="h-3.5 w-3.5 text-[#C2410C]" />
                Chave da API Anthropic (Opcional — deixe vazio para Modo
                Demonstração)
              </label>
              <input
                id="campo-api-key"
                type="password"
                value={apiKeyCustom}
                onChange={(e) => setApiKeyCustom(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="campo font-mono text-xs"
              />
            </div>
          )}

          {metricas.qtdErros > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>
                  Existem <strong>{metricas.qtdErros}</strong> mensagem(ns) com
                  falha na classificação.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetentarErros}
                disabled={carregandoLote}
                className="btn bg-red-600 text-white hover:bg-red-700 py-1.5 px-4 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    carregandoLote ? "animate-spin" : ""
                  }`}
                />
                Tentar novamente
              </button>
            </div>
          )}
        </section>

        {/* 4. ÁREA PRINCIPAL: FILA DE ATENDIMENTO (ESQUERDA) + PAINEL DE DETALHE (DIREITA) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* COLUNA ESQUERDA: FILA DE ATENDIMENTO (5 COLUNAS) */}
          <div className="lg:col-span-5 cartao p-4 space-y-3.5 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#1A2332]">
                Fila de Atendimento ({mensagensFiltradasEOrdenadas.length})
              </h2>

              {mensagens.length > 0 && (
                <button
                  type="button"
                  onClick={handleLimparTudo}
                  className="text-xs font-semibold text-slate-400 hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                  title="Limpar fila"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </button>
              )}
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                placeholder="Buscar cliente ou assunto..."
                className="w-full rounded-full bg-white border border-slate-200 pl-9 pr-4 py-2 text-xs text-[#1A2332] placeholder-slate-400 focus:border-[#F39200] focus:outline-none"
              />
            </div>

            {/* Pílulas de Filtro Rápido: Status | Urgência (exatamente como no Mockup) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "todos", rotulo: "Todos" },
                { id: "pendentes", rotulo: "Pendentes" },
                { id: "escalar", rotulo: "Escalar Humano" },
                { id: "resolvidos", rotulo: "Resolvidos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setFiltroStatus(
                      tab.id as
                        | "todos"
                        | "pendentes"
                        | "resolvidos"
                        | "escalar"
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    filtroStatus === tab.id
                      ? "bg-[#1A2332] text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.rotulo}
                </button>
              ))}

              <span className="mx-0.5 h-4 w-px bg-slate-200" />

              {(["Alta", "Média", "Baixa"] as Urgencia[]).map((urg) => {
                const ativo = filtroUrgencia === urg;
                return (
                  <button
                    key={urg}
                    type="button"
                    onClick={() =>
                      setFiltroUrgencia((atual) =>
                        atual === urg ? "Todas" : urg
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                      ativo
                        ? "bg-[#F39200] text-[#1A2332] font-bold"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {urg}
                  </button>
                );
              })}
            </div>

            {/* Filtro discreto de categoria quando houver mensagens */}
            {mensagens.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] font-bold uppercase text-slate-400">
                  Categoria:
                </span>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="rounded-full bg-[#F4F6F9] border border-slate-200 px-3 py-1 text-xs font-semibold text-[#1A2332] focus:outline-none focus:border-[#F39200]"
                >
                  <option value="Todas">Todas as categorias</option>
                  {TODAS_CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista de Cards de Chamados com Barra Lateral Colorida (Estilo Mockup) */}
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-0.5 pt-1">
              {mensagensFiltradasEOrdenadas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-[#F39200]">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#1A2332]">
                      {mensagens.length === 0
                        ? "Sua fila está vazia"
                        : "Nenhum chamado corresponde ao filtro"}
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {mensagens.length === 0
                        ? "Experimente simular 15 casos reais de suporte com 1 clique para ver a triagem da IA em ação."
                        : "Altere os filtros acima para visualizar outros atendimentos."}
                    </p>
                  </div>
                  {mensagens.length === 0 && (
                    <button
                      type="button"
                      onClick={handleCarregarExemplos}
                      disabled={carregandoLote}
                      className="inline-flex items-center gap-2 rounded-full bg-[#F39200] hover:bg-[#e08600] text-[#1A2332] font-bold px-4 py-2 text-xs shadow-xs transition-all"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Simular 15 atendimentos agora
                    </button>
                  )}
                </div>
              ) : (
                mensagensFiltradasEOrdenadas.map((msg) => {
                  const ativo = msg.id === idSelecionado;
                  const escalarHumano =
                    msg.analise?.urgencia === "Alta" &&
                    msg.analise?.sentimento === "Negativo";

                  const corBarraLateral =
                    msg.analise?.urgencia === "Alta"
                      ? "bg-red-700"
                      : msg.analise?.urgencia === "Média"
                      ? "bg-[#F39200]"
                      : msg.analise?.urgencia === "Baixa"
                      ? "bg-emerald-600"
                      : "bg-slate-300";

                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => setIdSelecionado(msg.id)}
                      className={`group relative w-full text-left rounded-2xl p-3.5 pl-5 transition-all border overflow-hidden flex flex-col gap-1.5 ${
                        ativo
                          ? "bg-[#FDF3E7] border-[#E5A962] shadow-xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60"
                      } ${msg.resolvido ? "opacity-65" : ""}`}
                    >
                      {/* Barra Vertical Semântica à Esquerda */}
                      <span
                        className={`absolute left-1.5 top-2.5 bottom-2.5 w-1.5 rounded-full ${corBarraLateral}`}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-[#1A2332]">
                            {msg.nome}
                          </span>
                          {renderBadgeCanal(msg.canal)}
                          {msg.resolvido && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolvido
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 shrink-0">
                          {msg.horario}
                        </span>
                      </div>

                      {/* Resumo da IA ou texto truncado */}
                      <p className="text-xs text-[#1A2332] line-clamp-1 font-medium">
                        {msg.analise?.resumo || msg.texto}
                      </p>

                      {/* Badges inferiores */}
                      <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                        {msg.statusTriagem === "processando" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analisando...
                          </span>
                        )}

                        {msg.statusTriagem === "erro" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                            <AlertCircle className="h-3 w-3" />
                            Falha na API
                          </span>
                        )}

                        {msg.statusTriagem === "concluido" && msg.analise && (
                          <>
                            {renderBadgeUrgencia(msg.analise.urgencia)}
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              {msg.analise.categoria}
                            </span>
                            {escalarHumano && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-red-800 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold">
                                <AlertTriangle className="h-3 w-3 text-red-700" />
                                Escalar
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: PAINEL DE DETALHE DO CHAMADO (7 COLUNAS) */}
          <div className="lg:col-span-7">
            {!mensagemSelecionada ? (
              <div className="cartao p-10 sm:p-12 text-center space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#F39200]">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-extrabold text-[#1A2332]">
                    Pronto para acelerar seu suporte
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Simule 15 atendimentos reais ou adicione uma mensagem para
                    ver a IA classificar urgência, detectar sentimento e redigir
                    a resposta ideal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCarregarExemplos}
                    disabled={carregandoLote}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F39200] hover:bg-[#e08600] text-[#1A2332] font-bold px-6 py-2.5 text-sm shadow-sm transition-all"
                  >
                    {carregandoLote ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Simular 15 atendimentos
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAberto(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F1F3F6] hover:bg-slate-200 text-[#1A2332] font-semibold px-5 py-2.5 text-sm transition-all"
                  >
                    + Novo chamado manual
                  </button>
                </div>
              </div>
            ) : (
              <div className="cartao p-6 space-y-5">
                {/* BANNER DE ESCALONAMENTO COMPACTO E ELEGANTE (IGUAL AO MOCKUP) */}
                {mensagemSelecionada.analise?.urgencia === "Alta" &&
                  mensagemSelecionada.analise?.sentimento === "Negativo" && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-rose-100/90 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-[#1A2332]">
                      <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                      <p>
                        <strong className="font-extrabold text-red-800 uppercase">
                          AÇÃO CRÍTICA:
                        </strong>{" "}
                        <strong className="font-bold">
                          Escalar para humano
                        </strong>{" "}
                        — Urgência Alta combinada com Sentimento Negativo.
                      </p>
                    </div>
                  )}

                {/* CABEÇALHO DO CLIENTE */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-extrabold text-[#1A2332]">
                        {mensagemSelecionada.nome}
                      </h2>
                      {renderBadgeCanal(mensagemSelecionada.canal)}
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Recebido às {mensagemSelecionada.horario}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        classificarMensagem(
                          mensagemSelecionada,
                          tomEmpresa,
                          apiKeyCustom
                        )
                      }
                      disabled={
                        mensagemSelecionada.statusTriagem === "processando"
                      }
                      className="rounded-full bg-white border border-slate-200 hover:bg-slate-50 px-4 py-1.5 text-xs font-bold text-[#1A2332] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          mensagemSelecionada.statusTriagem === "processando"
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                      Reanalisar IA
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAlternarResolvido(mensagemSelecionada.id)
                      }
                      className={`rounded-full px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                        mensagemSelecionada.resolvido
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-white border border-slate-200 hover:bg-slate-50 text-[#1A2332]"
                      }`}
                    >
                      {mensagemSelecionada.resolvido
                        ? "✓ Resolvido"
                        : "Marcar como resolvido"}
                    </button>
                  </div>
                </div>

                {/* MENSAGEM ORIGINAL DO CLIENTE */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1A2332]">
                    MENSAGEM ORIGINAL DO CLIENTE
                  </h3>
                  <div className="rounded-xl bg-[#EEF2F7] p-4 text-sm text-[#1A2332] leading-relaxed">
                    &ldquo;{mensagemSelecionada.texto}&rdquo;
                  </div>
                </div>

                {/* ESTADO DE CARREGAMENTO OU ERRO DA IA */}
                {mensagemSelecionada.statusTriagem === "processando" && (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-6 text-center space-y-2">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#F39200]" />
                    <p className="text-sm font-bold text-[#1A2332]">
                      Classificando mensagem e gerando resposta...
                    </p>
                  </div>
                )}

                {mensagemSelecionada.statusTriagem === "erro" && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-red-900">
                          Falha ao processar triagem na API
                        </h4>
                        <p className="text-xs text-red-700">
                          {mensagemSelecionada.erroMensagem}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        classificarMensagem(
                          mensagemSelecionada,
                          tomEmpresa,
                          apiKeyCustom
                        )
                      }
                      className="btn bg-red-600 text-white hover:bg-red-700 py-1.5 px-4 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tentar de novo
                    </button>
                  </div>
                )}

                {/* DIAGNÓSTICO DA IA + RESPOSTA SUGERIDA (IGUAL AO MOCKUP) */}
                {mensagemSelecionada.analise && (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1A2332] mr-1">
                          DIAGNÓSTICO DA IA
                        </h3>
                        {renderBadgeUrgencia(
                          mensagemSelecionada.analise.urgencia
                        )}
                        <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                          Categoria: {mensagemSelecionada.analise.categoria}
                        </span>
                        {renderBadgeSentimento(
                          mensagemSelecionada.analise.sentimento
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-[#EFECE6] p-3.5">
                          <span className="block text-xs font-extrabold text-[#1A2332]">
                            Resumo
                          </span>
                          <p className="mt-1 text-xs sm:text-sm text-[#1A2332] leading-snug">
                            {mensagemSelecionada.analise.resumo}
                          </p>
                        </div>

                        <div className="rounded-xl bg-[#F4E3D7] p-3.5">
                          <span className="block text-xs font-extrabold text-[#1A2332]">
                            Justificativa de Urgência
                          </span>
                          <p className="mt-1 text-xs sm:text-sm text-[#1A2332] leading-snug">
                            {mensagemSelecionada.analise.justificativaUrgencia}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RESPOSTA SUGERIDA EDITÁVEL COM BOTÃO COPIAR INTEGRADO */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor="resposta-editavel"
                          className="text-xs font-extrabold uppercase tracking-wider text-[#1A2332]"
                        >
                          RESPOSTA SUGERIDA (EDITÁVEL)
                        </label>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { id: "curta", label: "Mais curta" },
                            { id: "formal", label: "Mais formal" },
                            { id: "dados", label: "+ Pedir CPF" },
                          ].map((acao) => (
                            <button
                              key={acao.id}
                              type="button"
                              onClick={() =>
                                classificarMensagem(
                                  mensagemSelecionada,
                                  tomEmpresa,
                                  apiKeyCustom,
                                  acao.id
                                )
                              }
                              className="rounded-full bg-slate-100 hover:bg-orange-100 hover:text-[#C2410C] border border-slate-200 px-3 py-0.5 text-[11px] font-bold text-slate-700 transition-colors"
                            >
                              {acao.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          id="resposta-editavel"
                          rows={5}
                          value={
                            mensagemSelecionada.respostaEditada ??
                            mensagemSelecionada.analise.respostaSugerida
                          }
                          onChange={(e) =>
                            handleEditarResposta(
                              mensagemSelecionada.id,
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl bg-white border border-slate-200 p-3.5 pb-14 text-sm text-[#1A2332] leading-relaxed focus:border-[#F39200] focus:outline-none focus:ring-2 focus:ring-[#F39200]/20 resize-y"
                        />

                        <div className="absolute right-3 bottom-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopiarResposta}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#1A2332] hover:bg-[#253247] text-[#F39200] ring-2 ring-[#F39200] px-4 py-1.5 text-xs font-extrabold shadow-sm transition-all active:scale-95"
                          >
                            {copiado ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Copiada!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copiar resposta
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA ADICIONAR NOVO CHAMADO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/60 p-4 backdrop-blur-xs">
          <div className="cartao w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#1A2332] flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-[#F39200]" />
                Novo Chamado de Suporte
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="btn-icone p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdicionarMensagem} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Ana Paula Souza"
                    className="campo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Canal de Atendimento
                  </label>
                  <select
                    value={novoCanal}
                    onChange={(e) => setNovoCanal(e.target.value as Canal)}
                    className="campo"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Chat">Chat</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Telefone">Telefone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Horário (opcional)
                </label>
                <input
                  type="text"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  placeholder="Ex: 14:35 (deixe em branco para horário atual)"
                  className="campo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Mensagem do Cliente *
                </label>
                <textarea
                  required
                  rows={4}
                  value={novoTexto}
                  onChange={(e) => setNovoTexto(e.target.value)}
                  placeholder="Digite ou cole aqui a mensagem enviada pelo cliente..."
                  className="campo resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="btn btn-secundario"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#F39200] hover:bg-[#e08600] text-[#1A2332] font-bold px-5 py-2.5 text-sm shadow-sm transition-all"
                >
                  <Send className="h-4 w-4" />
                  Analisar com IA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
