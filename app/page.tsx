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
  CheckCircle2,
  Clock,
  Copy,
  Filter,
  Inbox,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

const STORAGE_KEY_MENSAGENS = "triagem_inteligente_mensagens_v1";
const STORAGE_KEY_TOM = "triagem_inteligente_tom_v1";
const STORAGE_KEY_API = "triagem_inteligente_apikey_v1";

const TOM_PADRAO =
  "Empático, acolhedor, profissional e focado em resolver o problema do cliente com transparência e agilidade.";

const PESO_URGENCIA: Record<Urgencia, number> = {
  Alta: 3,
  Média: 2,
  Baixa: 1,
};

export default function PaginaTriagemInteligente() {
  const [mensagens, setMensagens] = useState<MensagemCliente[]>([]);
  const [carregadoStorage, setCarregadoStorage] = useState(false);
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);

  // Configurações
  const [tomEmpresa, setTomEmpresa] = useState<string>(TOM_PADRAO);
  const [apiKeyCustom, setApiKeyCustom] = useState<string>("");
  const [mostrarConfigApi, setMostrarConfigApi] = useState<boolean>(false);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>("Todas");

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

  // Função para classificar uma mensagem individual na API da Anthropic
  const classificarMensagem = async (
    msg: MensagemCliente,
    tomAtual: string,
    chaveAtual: string
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
        }),
      });

      const dados = await resp.json();

      if (!resp.ok || !dados.analise) {
        throw new Error(
          dados.erro || `Erro HTTP ${resp.status} ao classificar mensagem.`
        );
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

    // Processa em pequenos lotes de 3 para evitar rate limit brusco e dar feedback ágil
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

  // Limpar todas as mensagens
  const handleLimparTudo = () => {
    setMensagens([]);
    setIdSelecionado(null);
    localStorage.removeItem(STORAGE_KEY_MENSAGENS);
  };

  // Métricas do topo
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
        ? `${horas}h ${minutosRestantes}min`
        : `${minutosEconomizados} min`;

    const qtdErros = mensagens.filter((m) => m.statusTriagem === "erro").length;

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
    };
  }, [mensagens]);

  // Lista filtrada e ordenada por urgência (Alta -> Média -> Baixa)
  const mensagensFiltradasEOrdenadas = useMemo(() => {
    return mensagens
      .filter((m) => {
        if (filtroCategoria !== "Todas") {
          if (m.analise?.categoria !== filtroCategoria) return false;
        }
        if (filtroUrgencia !== "Todas") {
          if (m.analise?.urgencia !== filtroUrgencia) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pesoA = a.analise ? PESO_URGENCIA[a.analise.urgencia] : 0;
        const pesoB = b.analise ? PESO_URGENCIA[b.analise.urgencia] : 0;
        if (pesoB !== pesoA) return pesoB - pesoA;
        return 0;
      });
  }, [mensagens, filtroCategoria, filtroUrgencia]);

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

  // Helper de badge de urgência (Vermelho / Amarelo / Verde)
  const renderBadgeUrgencia = (urgencia?: Urgencia) => {
    if (!urgencia) return null;
    const estilos: Record<Urgencia, string> = {
      Alta: "bg-red-100 text-red-800 border-red-200",
      Média: "bg-amber-100 text-amber-800 border-amber-200",
      Baixa: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
    const pontoCor: Record<Urgencia, string> = {
      Alta: "bg-red-600",
      Média: "bg-amber-500",
      Baixa: "bg-emerald-600",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${estilos[urgencia]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${pontoCor[urgencia]}`} />
        Urgência {urgencia}
      </span>
    );
  };

  // Helper de badge de sentimento
  const renderBadgeSentimento = (sentimento?: string) => {
    if (!sentimento) return null;
    const estilos: Record<string, string> = {
      Positivo: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Neutro: "bg-slate-100 text-slate-700 border-slate-200",
      Negativo: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${
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
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* BANNER INSTITUCIONAL SAGA */}
        <header className="relative overflow-hidden rounded-3xl bg-[linear-gradient(110deg,#1A2332_0%,#1A2332_45%,#7C2D12_78%,#C2410C_100%)] p-6 sm:p-8 text-white shadow-lg">
          {/* Formas diagonais laranjas sutis */}
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rotate-12 rounded-3xl bg-[#F39200]/15 blur-2xl" />
          <div className="pointer-events-none absolute right-24 -bottom-20 h-56 w-56 -rotate-12 rounded-3xl bg-[#F39200]/10 blur-xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold tracking-wide text-orange-100 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#F39200]" />
                <span>MOTOR CLAUDE ANTHROPIC • ATENDIMENTO INTELIGENTE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Triagem Inteligente de Suporte
              </h1>
              <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
                Classificação automática de mensagens, análise de sentimento,
                priorização por urgência e geração de respostas personalizadas
                no tom da sua empresa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="btn btn-principal"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Adicionar mensagem
              </button>

              <button
                type="button"
                onClick={handleCarregarExemplos}
                disabled={carregandoLote}
                className="btn bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/20"
              >
                {carregandoLote ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#F39200]" />
                ) : (
                  <Inbox className="h-4 w-4 text-[#F39200]" />
                )}
                Carregar 15 exemplos
              </button>

              <button
                type="button"
                onClick={() => setMostrarConfigApi((v) => !v)}
                className="btn bg-white/10 text-white hover:bg-white/20 border border-white/15 px-3.5"
                title="Configurar Chave da API Anthropic"
              >
                <KeyRound className="h-4 w-4 text-orange-300" />
                <span className="hidden sm:inline">Chave API</span>
              </button>
            </div>
          </div>
        </header>

        {/* PAINEL DE MÉTRICAS NO TOPO */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total de mensagens */}
          <div className="cartao p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total na Caixa
              </p>
              <p className="mt-1 text-3xl font-extrabold text-[#1A2332]">
                {metricas.total}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metricas.totalClassificadas} analisadas pela IA
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A2332]/5 text-[#1A2332]">
              <Inbox className="h-6 w-6" />
            </div>
          </div>

          {/* Urgência Alta */}
          <div className="cartao p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Urgência Alta
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {metricas.pctAlta}%
              </span>
            </div>
            <p className="mt-1 text-3xl font-extrabold text-red-600">
              {metricas.qtdAlta}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${metricas.pctAlta}%` }}
              />
            </div>
          </div>

          {/* Urgência Média e Baixa (% por urgência) */}
          <div className="cartao p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Distribuição (Média / Baixa)
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-slate-700">
                  Média: {metricas.pctMedia}% ({metricas.qtdMedia})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-slate-700">
                  Baixa: {metricas.pctBaixa}% ({metricas.qtdBaixa})
                </span>
              </div>
            </div>
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${metricas.pctAlta}%` }}
                title={`Alta: ${metricas.pctAlta}%`}
              />
              <div
                className="bg-amber-400 transition-all duration-300"
                style={{ width: `${metricas.pctMedia}%` }}
                title={`Média: ${metricas.pctMedia}%`}
              />
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${metricas.pctBaixa}%` }}
                title={`Baixa: ${metricas.pctBaixa}%`}
              />
            </div>
          </div>

          {/* Tempo médio estimado economizado */}
          <div className="cartao p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tempo Economizado
              </p>
              <p className="mt-1 text-3xl font-extrabold text-[#C2410C]">
                {metricas.tempoFormatado}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Base: 4 min por resposta manual
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F39200]">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </section>

        {/* CONFIGURAÇÃO DE TOM DA EMPRESA E API KEY */}
        <section className="cartao p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="campo-tom-empresa"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1A2332]"
              >
                <SlidersHorizontal className="h-4 w-4 text-[#F39200]" />
                Tom de Voz da Empresa (usado no prompt da IA)
              </label>
              <input
                id="campo-tom-empresa"
                type="text"
                value={tomEmpresa}
                onChange={(e) => setTomEmpresa(e.target.value)}
                placeholder="Ex: Empático, formal, direto ao ponto, usando saudação calorosa..."
                className="campo"
              />
            </div>

            {mostrarConfigApi && (
              <div className="flex-1 space-y-1.5">
                <label
                  htmlFor="campo-api-key"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1A2332]"
                >
                  <KeyRound className="h-4 w-4 text-[#C2410C]" />
                  Chave da API Anthropic (Opcional se definida no .env.local)
                </label>
                <input
                  id="campo-api-key"
                  type="password"
                  value={apiKeyCustom}
                  onChange={(e) => setApiKeyCustom(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="campo font-mono"
                />
              </div>
            )}
          </div>

          {metricas.qtdErros > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>
                  Existem <strong>{metricas.qtdErros}</strong> mensagem(ns) com
                  falha na classificação da API. Verifique sua chave{" "}
                  <code>ANTHROPIC_API_KEY</code> ou tente novamente.
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
                Tentar todos novamente
              </button>
            </div>
          )}
        </section>

        {/* ÁREA PRINCIPAL: CAIXA DE ENTRADA (ESQUERDA) + PAINEL DE DETALHE (DIREITA) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* COLUNA ESQUERDA: LISTA E FILTROS (5 COLUNAS) */}
          <div className="lg:col-span-5 cartao overflow-hidden flex flex-col">
            {/* Cabeçalho da Lista e Filtros */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1A2332] flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#F39200]" />
                  Caixa de Entrada ({mensagensFiltradasEOrdenadas.length})
                </h2>

                {mensagens.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLimparTudo}
                    className="text-xs font-semibold text-slate-400 hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                    title="Limpar todas as mensagens"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Limpar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="campo py-2 px-3 text-xs font-medium"
                  >
                    <option value="Todas">Todas as categorias</option>
                    <option value="Cobrança">Cobrança</option>
                    <option value="Problema técnico">Problema técnico</option>
                    <option value="Dúvida">Dúvida</option>
                    <option value="Cancelamento">Cancelamento</option>
                    <option value="Elogio">Elogio</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Urgência
                  </label>
                  <select
                    value={filtroUrgencia}
                    onChange={(e) => setFiltroUrgencia(e.target.value)}
                    className="campo py-2 px-3 text-xs font-medium"
                  >
                    <option value="Todas">Todas as urgências</option>
                    <option value="Alta">Alta (Vermelho)</option>
                    <option value="Média">Média (Amarelo)</option>
                    <option value="Baixa">Baixa (Verde)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Mensagens Ordenada por Urgência */}
            <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
              {mensagensFiltradasEOrdenadas.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Nenhuma mensagem encontrada
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Clique em &ldquo;Carregar 15 exemplos&rdquo; ou &ldquo;Adicionar
                    mensagem&rdquo; no topo para iniciar a triagem inteligente.
                  </p>
                </div>
              ) : (
                mensagensFiltradasEOrdenadas.map((msg) => {
                  const ativo = msg.id === idSelecionado;
                  const escalarHumano =
                    msg.analise?.urgencia === "Alta" &&
                    msg.analise?.sentimento === "Negativo";

                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => setIdSelecionado(msg.id)}
                      className={`w-full text-left p-4 transition-colors hover:bg-slate-50/90 flex flex-col gap-2 ${
                        ativo
                          ? "bg-orange-50/60 ring-1 ring-inset ring-[#F39200]/40"
                          : ""
                      } ${msg.resolvido ? "opacity-65" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#1A2332]">
                            {msg.nome}
                          </span>
                          <span className="rounded-full bg-[#F1F3F6] px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {msg.canal}
                          </span>
                          {msg.resolvido && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolvido
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-400 shrink-0">
                          {msg.horario}
                        </span>
                      </div>

                      {/* Resumo ou texto original truncado */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {msg.analise?.resumo ? (
                          <span className="font-medium text-[#1A2332]">
                            {msg.analise.resumo}
                          </span>
                        ) : (
                          msg.texto
                        )}
                      </p>

                      {/* Badges de status / urgência / categoria */}
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        {msg.statusTriagem === "processando" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analisando com Claude...
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
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              {msg.analise.categoria}
                            </span>
                            {escalarHumano && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                <AlertTriangle className="h-3 w-3" />
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

          {/* COLUNA DIREITA: PAINEL DE DETALHE (7 COLUNAS) */}
          <div className="lg:col-span-7">
            {!mensagemSelecionada ? (
              <div className="cartao p-12 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F6] text-[#1A2332]">
                  <Sparkles className="h-7 w-7 text-[#F39200]" />
                </div>
                <h3 className="text-lg font-bold text-[#1A2332]">
                  Selecione uma mensagem para visualizar a triagem
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Clique em qualquer atendimento na lista ao lado para inspecionar
                  a análise da inteligência artificial, justificativa de
                  urgência e editar a resposta sugerida.
                </p>
              </div>
            ) : (
              <div className="cartao p-6 sm:p-7 space-y-6">
                {/* REGRA DE ESCALONAMENTO: Urgência Alta E Sentimento Negativo */}
                {mensagemSelecionada.analise?.urgencia === "Alta" &&
                  mensagemSelecionada.analise?.sentimento === "Negativo" && (
                    <div className="flex items-start gap-3.5 rounded-2xl bg-red-600 p-4 text-white shadow-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                            Ação Crítica Necessária
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold">
                          Escalar para humano
                        </h4>
                        <p className="text-xs text-red-100 leading-relaxed">
                          Esta mensagem apresenta{" "}
                          <strong>Urgência Alta</strong> combinada com{" "}
                          <strong>Sentimento Negativo</strong>. Recomenda-se
                          intervenção imediata de um especialista sênior ou
                          supervisor.
                        </p>
                      </div>
                    </div>
                  )}

                {/* CABEÇALHO DO CLIENTE */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-extrabold text-[#1A2332]">
                        {mensagemSelecionada.nome}
                      </h2>
                      <span className="rounded-full bg-[#1A2332] px-3 py-0.5 text-xs font-semibold text-white">
                        {mensagemSelecionada.canal}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        Recebido às {mensagemSelecionada.horario}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      ID do atendimento: {mensagemSelecionada.id}
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
                      className="btn btn-secundario py-2 px-4 text-xs"
                      title="Reclassificar com o tom atual"
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
                      className={`btn py-2 px-4 text-xs ${
                        mensagemSelecionada.resolvido
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "btn-escuro"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {mensagemSelecionada.resolvido
                        ? "Resolvido"
                        : "Marcar como resolvido"}
                    </button>
                  </div>
                </div>

                {/* TEXTO ORIGINAL DO CLIENTE */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Mensagem Original do Cliente
                  </h3>
                  <div className="rounded-2xl bg-[#F4F6F9] p-4 text-sm text-[#1A2332] leading-relaxed border border-slate-200/70">
                    &ldquo;{mensagemSelecionada.texto}&rdquo;
                  </div>
                </div>

                {/* ESTADO DE CARREGAMENTO OU ERRO DA IA */}
                {mensagemSelecionada.statusTriagem === "processando" && (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-6 text-center space-y-2">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#F39200]" />
                    <p className="text-sm font-bold text-[#1A2332]">
                      Classificando mensagem e gerando resposta...
                    </p>
                    <p className="text-xs text-slate-500">
                      Consultando a API da Anthropic (Claude) em formato JSON
                      estruturado.
                    </p>
                  </div>
                )}

                {mensagemSelecionada.statusTriagem === "erro" && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
                    <div className="flex items-start gap-3">
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
                      className="btn bg-red-600 text-white hover:bg-red-700 py-2 px-4 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tentar de novo
                    </button>
                  </div>
                )}

                {/* RESULTADO DA ANÁLISE DA IA */}
                {mensagemSelecionada.analise && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Diagnóstico da Triagem Automática
                      </h3>

                      <div className="flex flex-wrap items-center gap-2">
                        {renderBadgeUrgencia(
                          mensagemSelecionada.analise.urgencia
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A2332]/10 px-3 py-0.5 text-xs font-bold text-[#1A2332]">
                          Categoria: {mensagemSelecionada.analise.categoria}
                        </span>
                        {renderBadgeSentimento(
                          mensagemSelecionada.analise.sentimento
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                        <div className="rounded-2xl bg-[#F4F6F9] p-3.5 border border-slate-200/60">
                          <span className="block text-[11px] font-bold uppercase text-slate-400">
                            Resumo (até 15 palavras)
                          </span>
                          <p className="mt-1 text-sm font-semibold text-[#1A2332]">
                            {mensagemSelecionada.analise.resumo}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#F4F6F9] p-3.5 border border-slate-200/60">
                          <span className="block text-[11px] font-bold uppercase text-slate-400">
                            Justificativa de Urgência
                          </span>
                          <p className="mt-1 text-sm text-slate-700">
                            {mensagemSelecionada.analise.justificativaUrgencia}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RESPOSTA SUGERIDA EDITÁVEL */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="resposta-editavel"
                          className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"
                        >
                          <UserCheck className="h-4 w-4 text-[#F39200]" />
                          Resposta Sugerida (Editável)
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Ajuste livremente antes de copiar
                        </span>
                      </div>

                      <textarea
                        id="resposta-editavel"
                        rows={6}
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
                        className="campo leading-relaxed resize-y"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCopiarResposta}
                          className="btn btn-principal"
                        >
                          {copiado ? (
                            <>
                              <Check className="h-4 w-4" />
                              Resposta copiada!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copiar resposta
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleAlternarResolvido(mensagemSelecionada.id)
                          }
                          className="btn btn-secundario"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {mensagemSelecionada.resolvido
                            ? "Desmarcar resolvido"
                            : "Marcar como resolvido"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA ADICIONAR NOVA MENSAGEM */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/60 p-4 backdrop-blur-xs">
          <div className="cartao w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#1A2332] flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-[#F39200]" />
                Adicionar Mensagem de Cliente
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
                <button type="submit" className="btn btn-principal">
                  <Send className="h-4 w-4" />
                  Adicionar e Classificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
