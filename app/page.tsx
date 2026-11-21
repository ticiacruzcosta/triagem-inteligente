"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Canal,
  Categoria,
  MensagemCliente,
  ProvedorIA,
  Urgencia,
} from "@/lib/types";
import { INFO_PROVEDORES } from "@/lib/llm-providers";
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
  Trash2,
  X,
  Check,
  AlertCircle,
  Info,
} from "lucide-react";

const STORAGE_KEY_MENSAGENS = "triagem_inteligente_mensagens_v1";
const STORAGE_KEY_TOM = "triagem_inteligente_tom_v1";
const STORAGE_KEY_APIS = "triagem_inteligente_apikeys_map_v1";
const STORAGE_KEY_API_LEGADO = "triagem_inteligente_apikey_v1";
const STORAGE_KEY_PROVEDOR = "triagem_inteligente_provedor_v1";

interface PresetPersonalidade {
  id: string;
  rotulo: string;
  valor: string;
}

const PRESETS_PERSONALIDADE: PresetPersonalidade[] = [
  {
    id: "empatico",
    rotulo: "Tom: Empático",
    valor:
      "Empático, acolhedor, profissional e focado em resolver o problema do cliente com transparência e agilidade.",
  },
  {
    id: "objetivo",
    rotulo: "Tom: Objetivo",
    valor:
      "Direto ao ponto, conciso, prático e focado em instruções claras e resolução imediata sem rodeios.",
  },
  {
    id: "formal",
    rotulo: "Tom: Executivo",
    valor:
      "Estritamente formal, corporativo, respeitoso, utilizando linguagem executiva culta e transmitindo alta credibilidade institucional.",
  },
  {
    id: "retencao",
    rotulo: "Tom: Retenção",
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

  // Configurações de Tom, Provedor de IA e Mapa de Chaves de API por Provedor
  const [tomEmpresa, setTomEmpresa] = useState<string>(
    PRESETS_PERSONALIDADE[0].valor
  );
  const [provedorIA, setProvedorIA] = useState<ProvedorIA>("anthropic");
  const [chavesPorProvedor, setChavesPorProvedor] = useState<
    Record<ProvedorIA, string>
  >({
    anthropic: "",
    openai: "",
    gemini: "",
    groq: "",
  });
  const [modoExecucao, setModoExecucao] = useState<string | null>(null);

  const apiKeyCustom = chavesPorProvedor[provedorIA] || "";
  const setApiKeyCustom = (novaChave: string) => {
    setChavesPorProvedor((prev) => ({
      ...prev,
      [provedorIA]: novaChave,
    }));
  };

  // Filtros e Tabs
  const [buscaTexto, setBuscaTexto] = useState<string>("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>("Todas");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pendentes" | "resolvidos" | "escalar"
  >("todos");
  const [abaAtiva, setAbaAtiva] = useState<
    "triagem" | "analitico" | "configuracoes"
  >("triagem");

  // Modal Nova Mensagem
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [novoNome, setNovoNome] = useState<string>("");
  const [novoCanal, setNovoCanal] = useState<Canal>("WhatsApp");
  const [novoTexto, setNovoTexto] = useState<string>("");
  const [novoHorario, setNovoHorario] = useState<string>("");

  // Estado de cópia e processamento em lote + Lock Síncrono Atômico (useRef)
  const [copiado, setCopiado] = useState<boolean>(false);
  const [carregandoLote, setCarregandoLote] = useState<boolean>(false);
  const lockCarregamentoRef = useRef<boolean>(false);

  // Carregar dados do localStorage na montagem e deduplicar automaticamente registros antigos
  useEffect(() => {
    try {
      const salvas = localStorage.getItem(STORAGE_KEY_MENSAGENS);
      if (salvas) {
        const parseadas = JSON.parse(salvas) as MensagemCliente[];
        if (Array.isArray(parseadas)) {
          // Deduplicação atômica por (nome + texto) caso o navegador tenha 30 itens antigos salvos
          const vistos = new Set<string>();
          const unicas = parseadas.filter((m) => {
            const chaveUnica = `${m.nome.trim().toLowerCase()}::${m.texto.trim().toLowerCase()}`;
            if (vistos.has(chaveUnica)) return false;
            vistos.add(chaveUnica);
            return true;
          });
          setMensagens(unicas);
          if (unicas.length > 0) {
            setIdSelecionado(unicas[0].id);
          }
        }
      }
      const tomSalvo = localStorage.getItem(STORAGE_KEY_TOM);
      if (tomSalvo) setTomEmpresa(tomSalvo);

      const mapaApisSalvo = localStorage.getItem(STORAGE_KEY_APIS);
      if (mapaApisSalvo) {
        const parsedMapa = JSON.parse(mapaApisSalvo);
        if (parsedMapa && typeof parsedMapa === "object") {
          setChavesPorProvedor((prev) => ({ ...prev, ...parsedMapa }));
        }
      } else {
        const apiLegada = localStorage.getItem(STORAGE_KEY_API_LEGADO);
        if (apiLegada) {
          setChavesPorProvedor((prev) => ({ ...prev, anthropic: apiLegada }));
        }
      }

      const provedorSalvo = localStorage.getItem(
        STORAGE_KEY_PROVEDOR
      ) as ProvedorIA | null;
      if (provedorSalvo && provedorSalvo in INFO_PROVEDORES) {
        setProvedorIA(provedorSalvo);
      }
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

  // Salvar mapa de API keys por provedor
  useEffect(() => {
    if (!carregadoStorage) return;
    localStorage.setItem(STORAGE_KEY_APIS, JSON.stringify(chavesPorProvedor));
  }, [chavesPorProvedor, carregadoStorage]);

  // Salvar Provedor de IA escolhido
  useEffect(() => {
    if (!carregadoStorage) return;
    localStorage.setItem(STORAGE_KEY_PROVEDOR, provedorIA);
  }, [provedorIA, carregadoStorage]);

  // Classificar mensagem na API
  const classificarMensagem = async (
    msg: MensagemCliente,
    tomAtual: string,
    chaveAtual: string,
    instrucaoRefinamento?: string,
    provedorAtual: ProvedorIA = provedorIA
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
          provedor: provedorAtual,
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

  // Carregar 15 exemplos (Com Lock Síncrono Atômico via useRef contra duplo clique e deduplicação)
  const handleCarregarExemplos = async () => {
    // Trava síncrona imediata: bloqueia 100% um duplo clique rápido antes mesmo do React re-renderizar
    if (lockCarregamentoRef.current || carregandoLote) return;
    lockCarregamentoRef.current = true;
    setCarregandoLote(true);

    try {
      const novasMensagens: MensagemCliente[] = EXEMPLOS_MENSAGENS.map(
        (ex, idx) => ({
          id: `ex-padrao-${idx}`,
          nome: ex.nome,
          canal: ex.canal,
          texto: ex.texto,
          horario: ex.horario,
          resolvido: false,
          statusTriagem: "pendente",
        })
      );

      setMensagens((prev) => {
        // Remove qualquer exemplo anterior (por ID ou por texto idêntico) mantendo apenas mensagens manuais inéditas
        const textosExemplos = new Set(
          EXEMPLOS_MENSAGENS.map((e) => e.texto.trim().toLowerCase())
        );
        const apenasManuais = prev.filter(
          (m) =>
            !m.id.startsWith("ex-") &&
            !textosExemplos.has(m.texto.trim().toLowerCase())
        );
        return [...novasMensagens, ...apenasManuais];
      });

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
    } finally {
      setCarregandoLote(false);
      lockCarregamentoRef.current = false;
    }
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
      "Definir_Responsavel",
      "Responsavel_Atribuido",
      "Resumo",
      "Mensagem_Original",
      "Resposta_Sugerida",
    ];

    const escaparCSV = (val: string) =>
      `"${(val || "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

    const linhas = mensagens.map((m) => {
      const definirResp =
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
        escaparCSV(definirResp),
        escaparCSV(m.responsavel || "Nao atribuido"),
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

  // Métricas e estatísticas
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

    const minutosEconomizados = total * 4;
    const horas = Math.floor(minutosEconomizados / 60);
    const minutosRestantes = minutosEconomizados % 60;
    const tempoFormatado =
      horas > 0
        ? `${horas}h ${String(minutosRestantes).padStart(2, "0")}m`
        : `${minutosEconomizados} min`;

    const qtdErros = mensagens.filter((m) => m.statusTriagem === "erro").length;
    const qtdResolvidos = mensagens.filter((m) => m.resolvido).length;

    const qtdEscalar = classificadas.filter(
      (m) =>
        m.analise?.urgencia === "Alta" &&
        m.analise?.sentimento === "Negativo" &&
        !m.responsavel
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
      qtdResolvidos,
      porCategoria,
      sentPositivo,
      sentNeutro,
      sentNegativo,
    };
  }, [mensagens]);

  // Lista filtrada e ordenada por urgência
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

  // Definir responsável pelo chamado
  const handleDefinirResponsavel = (id: string, responsavel: string) => {
    setMensagens((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, responsavel: responsavel || undefined }
          : m
      )
    );
  };

  // Helper de badge de urgência (Estilo ALERTS do Pin: Vermelho/Amarelo/Verde pastel)
  const renderBadgeUrgencia = (urgencia?: Urgencia) => {
    if (!urgencia) return null;
    const estilos: Record<Urgencia, string> = {
      Alta: "bg-[#EED5D2] text-[#7D1D1D] border-[#D4847C]",
      Média: "bg-[#F3E8C8] text-[#6B4D08] border-[#D9B45B]",
      Baixa: "bg-[#DCEADB] text-[#165B31] border-[#76B88A]",
    };
    const dot: Record<Urgencia, string> = {
      Alta: "bg-[#C93B3B]",
      Média: "bg-[#D99B16]",
      Baixa: "bg-[#1E8E4E]",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${estilos[urgencia]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot[urgencia]}`} />
        Urgência: {urgencia}
      </span>
    );
  };

  // Helper de badge de sentimento
  const renderBadgeSentimento = (sentimento?: string) => {
    if (!sentimento) return null;
    const estilos: Record<string, string> = {
      Positivo: "bg-[#DCEADB] text-[#165B31] border-[#76B88A]",
      Neutro: "bg-[#E4E1DA] text-[#3D3E40] border-[#D8D5CE]",
      Negativo: "bg-[#EED5D2] text-[#7D1D1D] border-[#D4847C]",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${
          estilos[sentimento] || estilos.Neutro
        }`}
      >
        Sentimento: {sentimento}
      </span>
    );
  };

  const exemplosJaCarregados = useMemo(
    () => mensagens.some((m) => m.id.startsWith("ex-")),
    [mensagens]
  );

  const rotuloTomAtivo =
    PRESETS_PERSONALIDADE.find((p) => p.valor === tomEmpresa)?.rotulo.replace(
      "Tom: ",
      ""
    ) || "Personalizado";

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* GRADE ARQUITETÔNICA REAL DE 12 COLUNAS EM TELA CHEIA (FULL-WIDTH) */}
      <div className="pointer-events-none fixed inset-0 z-0 w-full px-4 sm:px-6 lg:px-8">
        <div className="grid h-full grid-cols-12 border-x border-[#D8D5CE]/55">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-full border-r border-[#D8D5CE]/45 last:border-r-0"
            />
          ))}
        </div>
      </div>

      {/* CONTAINER PRINCIPAL EDITORIAL EM LARGURA TOTAL */}
      <main className="relative z-10 w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* 1. CABEÇALHO EDITORIAL EQUILIBRADO NOS 4 CANTOS (TOPO COM TOPO, BASE COM BASE) */}
        <header className="grid grid-cols-1 gap-6 lg:grid-cols-12 border-b border-[#D8D5CE] pb-6 items-stretch">
          {/* Esquerda (Cols 1-6): Título Display + Status da API quando conectada */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-2">
            <h1 className="text-4xl sm:text-[56px] font-extrabold tracking-[-0.035em] text-[#18191A] leading-[0.94]">
              Triagem
              <br />
              Inteligente
            </h1>
            {(apiKeyCustom.trim() ||
              (modoExecucao && modoExecucao !== "demonstracao")) && (
              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[#0E4D52]">
                <span className="h-2 w-2 rounded-full bg-[#1E8E4E]" />
                <span>
                  API Conectada: {INFO_PROVEDORES[provedorIA].nome}
                </span>
              </div>
            )}
          </div>

          {/* Direita (Cols 7-12): Botões alinhados no Topo + Tabs alinhadas na Base */}
          <div className="lg:col-span-6 flex flex-col justify-between items-start lg:items-end gap-4">
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCarregarExemplos}
                disabled={carregandoLote || exemplosJaCarregados}
                className="btn btn-principal px-5 py-2.5 text-xs"
                title={
                  exemplosJaCarregados
                    ? "Os 15 exemplos já foram carregados na fila"
                    : "Carregar lote de 15 exemplos"
                }
              >
                {carregandoLote ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando exemplos...
                  </>
                ) : exemplosJaCarregados ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    15 exemplos carregados
                  </>
                ) : (
                  <>
                    <Inbox className="h-3.5 w-3.5" />
                    Carregar 15 exemplos
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="btn btn-secundario px-4 py-2.5 text-xs"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Adicionar mensagem
              </button>

              {mensagens.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportarCSV}
                  className="btn btn-secundario px-3.5 py-2.5 text-xs"
                  title="Exportar relatório CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setAbaAtiva((a) =>
                    a === "configuracoes" ? "triagem" : "configuracoes"
                  )
                }
                className={`btn px-3.5 py-2.5 text-xs ${
                  abaAtiva === "configuracoes"
                    ? "btn-principal"
                    : "btn-secundario"
                }`}
                title="Configurar Tom da Empresa e Chave da API Anthropic"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Configurações
              </button>
            </div>

            {/* TABS MINIMALISTAS */}
            <div className="flex items-center gap-6 border-b border-[#D8D5CE] w-full lg:w-auto">
              {[
                { id: "triagem", label: "Overview & Fila" },
                { id: "analitico", label: "Métricas & Categorias" },
                { id: "configuracoes", label: "Configurações" },
              ].map((tab) => {
                const ativo = abaAtiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setAbaAtiva(
                        tab.id as "triagem" | "analitico" | "configuracoes"
                      )
                    }
                    className={`pb-2 text-xs font-bold transition-all border-b-2 -mb-px ${
                      ativo
                        ? "border-[#0E4D52] text-[#18191A]"
                        : "border-transparent text-[#787877] hover:text-[#3D3E40]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* 2. MÉTRICAS NO TOPO (CADA CARD OCUPA EXATAMENTE 3 COLUNAS DA GRADE DE 12) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="tabela-cab">MÉTRICAS & ELEVATION TOKENS</span>
            <span className="text-[11px] font-mono text-[#787877]">
              SLA Base: 4 min / resposta manual
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            {/* Card 1 (Cols 1-3): Primary Action Token Style */}
            <div className="lg:col-span-3 rounded-[10px] bg-[#0E4D52] text-[#F7F5F0] p-4 border border-[#08363A] shadow-[0_4px_8px_-2px_rgba(14,77,82,0.25)] flex flex-col justify-between min-h-[118px]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#DCE9F2]/80 uppercase tracking-wider">
                <span>Total de Mensagens</span>
                <span className="font-mono">Level 1</span>
              </div>
              <div className="my-1 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight">
                  {metricas.total}
                </span>
                <span className="text-xs text-[#DCE9F2]">
                  {metricas.totalClassificadas} triadas
                </span>
              </div>
              <div className="text-[11px] text-[#DCE9F2]/90 font-medium">
                Primary Action • {metricas.qtdResolvidos} resolvidas
              </div>
            </div>

            {/* Card 2 (Cols 4-6): Urgência Alta */}
            <div className="lg:col-span-3 cartao p-4 flex flex-col justify-between min-h-[118px]">
              <div className="flex items-center justify-between">
                <span className="tabela-cab">Urgência Alta</span>
                <span className="font-mono text-[11px] text-[#787877]">
                  {metricas.pctAlta}%
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#18191A]">
                  {metricas.qtdAlta}
                </span>
                {metricas.qtdEscalar > 0 && (
                  <span className="rounded-full bg-[#EED5D2] border border-[#D4847C] px-2 py-0.5 text-[10px] font-bold text-[#7D1D1D]">
                    {metricas.qtdEscalar} s/ responsável
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4E1DA]">
                <div
                  className="h-full bg-[#C93B3B] transition-all duration-300"
                  style={{ width: `${metricas.pctAlta}%` }}
                />
              </div>
            </div>

            {/* Card 3 (Cols 7-9): % por Urgência */}
            <div className="lg:col-span-3 cartao p-4 flex flex-col justify-between min-h-[118px]">
              <div className="flex items-center justify-between">
                <span className="tabela-cab">% Por Urgência</span>
                <span className="font-mono text-[11px] text-[#787877]">
                  Dist.
                </span>
              </div>
              <div className="my-1 space-y-1 text-xs font-semibold text-[#3D3E40]">
                <div className="flex justify-between">
                  <span>Média (Amarelo):</span>
                  <span className="font-mono font-bold text-[#18191A]">
                    {metricas.pctMedia}% ({metricas.qtdMedia})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Baixa (Verde):</span>
                  <span className="font-mono font-bold text-[#18191A]">
                    {metricas.pctBaixa}% ({metricas.qtdBaixa})
                  </span>
                </div>
              </div>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#E4E1DA]">
                <div
                  className="bg-[#C93B3B] transition-all duration-300"
                  style={{ width: `${metricas.pctAlta}%` }}
                />
                <div
                  className="bg-[#D99B16] transition-all duration-300"
                  style={{ width: `${metricas.pctMedia}%` }}
                />
                <div
                  className="bg-[#1E8E4E] transition-all duration-300"
                  style={{ width: `${metricas.pctBaixa}%` }}
                />
              </div>
            </div>

            {/* Card 4 (Cols 10-12): Tempo Economizado */}
            <div className="lg:col-span-3 cartao p-4 flex flex-col justify-between min-h-[118px]">
              <div className="flex items-center justify-between">
                <span className="tabela-cab">Tempo Economizado</span>
                <Clock className="h-3.5 w-3.5 text-[#0E4D52]" />
              </div>
              <div className="my-1">
                <span className="text-3xl font-extrabold text-[#0E4D52] tracking-tight">
                  {metricas.tempoFormatado}
                </span>
              </div>
              <div className="text-[11px] text-[#787877] font-medium">
                Estimativa: 4 min por resposta
              </div>
            </div>
          </div>
        </section>

        {/* ALERTA GLOBAL DE ERRO DE API (SE HOUVER) */}
        {metricas.qtdErros > 0 && (
          <div className="alerta-erro px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#C93B3B] shrink-0" />
              <span>
                Error: Falha ao classificar {metricas.qtdErros} mensagem(ns) na
                API.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRetentarErros}
              disabled={carregandoLote}
              className="btn btn-principal py-1 px-3 text-[11px]"
            >
              <RefreshCw
                className={`h-3 w-3 ${carregandoLote ? "animate-spin" : ""}`}
              />
              Tentar de novo
            </button>
          </div>
        )}

        {/* =======================================================================
            ABA 1: OVERVIEW & FILA (CAIXA DE ENTRADA + PAINEL DE INSPEÇÃO & RESPOSTA)
           ======================================================================= */}
        {abaAtiva === "triagem" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch animate-in fade-in duration-150">
          {/* COLUNA ESQUERDA (Cols 1-5): RÓTULO + CARD UNIFICADO DE CAIXA DE ENTRADA */}
          <div className="lg:col-span-5 flex flex-col space-y-2">
            <div className="flex items-center justify-between h-5">
              <span className="tabela-cab">
                CAIXA DE ENTRADA ({mensagensFiltradasEOrdenadas.length})
              </span>
              {mensagens.length > 0 && (
                <button
                  type="button"
                  onClick={handleLimparTudo}
                  className="text-[11px] font-semibold text-[#787877] hover:text-[#7D1D1D] inline-flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpar fila
                </button>
              )}
            </div>

            {/* Card Unificado da Esquerda */}
            <div className="cartao p-4 flex flex-col max-h-[580px]">
              {/* Topo Fixo: Busca + Chips de Status + Seletores */}
              <div className="space-y-3 border-b border-[#D8D5CE] pb-3.5 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    placeholder="Buscar cliente, canal ou resumo..."
                    className="campo pr-9"
                  />
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#787877]" />
                </div>

                {/* Chips de Status integrados diretamente na Caixa de Entrada */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "pendentes", label: "Pendentes" },
                    { id: "escalar", label: "! Definir Responsável" },
                    { id: "resolvidos", label: "Resolvidos" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setFiltroStatus(
                          st.id as
                            | "todos"
                            | "pendentes"
                            | "resolvidos"
                            | "escalar"
                        )
                      }
                      className={`chip text-[11px] py-0.5 px-2.5 ${
                        filtroStatus === st.id ? "chip-ativo" : "chip-neutro"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D3E40] mb-1">
                      Categoria
                    </label>
                    <select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                      className="campo py-1.5 text-xs font-medium"
                    >
                      <option value="Todas">Todas</option>
                      {TODAS_CATEGORIAS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D3E40] mb-1">
                      Urgência
                    </label>
                    <select
                      value={filtroUrgencia}
                      onChange={(e) => setFiltroUrgencia(e.target.value)}
                      className="campo py-1.5 text-xs font-medium"
                    >
                      <option value="Todas">Todas</option>
                      <option value="Alta">Alta (Vermelho)</option>
                      <option value="Média">Média (Amarelo)</option>
                      <option value="Baixa">Baixa (Verde)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista Rolável com Scrollbar Editorial Fina */}
              <div className="scroll-editorial flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1.5">
                {mensagensFiltradasEOrdenadas.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <p className="text-sm font-bold text-[#18191A]">
                      {mensagens.length === 0
                        ? "Caixa de Entrada Vazia"
                        : "Nenhum chamado encontrado"}
                    </p>
                    <p className="text-xs text-[#787877] max-w-xs leading-relaxed">
                      {mensagens.length === 0
                        ? "Carregue os 15 exemplos de clientes para visualizar a triagem automática em ação."
                        : "Ajuste os filtros selecionados acima."}
                    </p>
                    {mensagens.length === 0 && (
                      <button
                        type="button"
                        onClick={handleCarregarExemplos}
                        disabled={carregandoLote}
                        className="btn btn-principal"
                      >
                        Carregar 15 exemplos
                      </button>
                    )}
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
                        className={`w-full text-left rounded-[8px] p-3.5 transition-all border flex flex-col gap-1.5 ${
                          ativo
                            ? "border-[#0E4D52] ring-1 ring-[#0E4D52] bg-[#FAF9F5] shadow-xs"
                            : "border-[#D8D5CE] bg-[#F5F3EE] hover:bg-[#EFECE6]"
                        } ${msg.resolvido ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#18191A]">
                              {msg.nome}
                            </span>
                            <span className="rounded-[4px] bg-[#E4E1DA] border border-[#D8D5CE] px-2 py-0.5 text-[10px] font-bold text-[#3D3E40]">
                              {msg.canal}
                            </span>
                            {msg.resolvido && (
                              <span className="rounded-full bg-[#DCEADB] border border-[#76B88A] px-2 py-0.5 text-[10px] font-bold text-[#165B31]">
                                ✓ Resolvido
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-[#787877] shrink-0">
                            {msg.horario}
                          </span>
                        </div>

                        <p className="text-xs text-[#3D3E40] line-clamp-2 leading-relaxed">
                          {msg.analise?.resumo ? (
                            <span className="font-semibold text-[#18191A]">
                              {msg.analise.resumo}
                            </span>
                          ) : (
                            msg.texto
                          )}
                        </p>

                        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                          {msg.statusTriagem === "processando" && (
                            <span className="chip chip-neutro text-[11px] py-0.5">
                              <Loader2 className="h-3 w-3 animate-spin text-[#0E4D52]" />
                              Classificando...
                            </span>
                          )}

                          {msg.statusTriagem === "erro" && (
                            <span className="rounded-full bg-[#EED5D2] border border-[#D4847C] px-2.5 py-0.5 text-[10px] font-bold text-[#7D1D1D]">
                              Erro API
                            </span>
                          )}

                          {msg.statusTriagem === "concluido" && msg.analise && (
                            <>
                              {renderBadgeUrgencia(msg.analise.urgencia)}
                              <span className="chip chip-neutro text-[11px] py-0.5">
                                {msg.analise.categoria}
                              </span>
                              {msg.responsavel ? (
                                <span className="rounded-full bg-[#0E4D52] text-[#F7F5F0] px-2.5 py-0.5 text-[10px] font-bold">
                                  Resp: {msg.responsavel}
                                </span>
                              ) : (
                                escalarHumano && (
                                  <span className="rounded-full bg-[#C93B3B] text-white px-2.5 py-0.5 text-[10px] font-bold">
                                    ! Definir o Responsável
                                  </span>
                                )
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
          </div>

          {/* COLUNA DIREITA (Cols 6-12): RÓTULO NA MESMA LINHA Y + CARD DE MESMA ALTURA */}
          <div className="lg:col-span-7 flex flex-col space-y-2">
            <div className="flex items-center justify-between h-5">
              <span className="tabela-cab">PAINEL DE INSPEÇÃO & RESPOSTA</span>
              {mensagemSelecionada && (
                <span className="text-[11px] font-mono text-[#787877]">
                  ID: {mensagemSelecionada.id}
                </span>
              )}
            </div>

            {!mensagemSelecionada ? (
              <div className="cartao p-10 min-h-[420px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="mx-auto h-28 w-full max-w-md rounded-[8px] bg-[#E4E1DA] border border-[#D8D5CE] flex items-center justify-center text-xs font-mono text-[#787877]">
                  [ Selecione uma mensagem na Caixa de Entrada ]
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-[#18191A]">
                    Painel de Detalhe & Resposta IA
                  </h3>
                  <p className="text-xs text-[#787877] leading-relaxed">
                    Ao selecionar um cliente ao lado, você verá o texto
                    original, a classificação validada em JSON, alertas de
                    escalonamento e o campo editável com a resposta sugerida.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAberto(true)}
                    className="btn btn-secundario"
                  >
                    Adicionar mensagem
                  </button>
                  <button
                    type="button"
                    onClick={handleCarregarExemplos}
                    disabled={carregandoLote || exemplosJaCarregados}
                    className="btn btn-principal"
                  >
                    {exemplosJaCarregados
                      ? "15 exemplos carregados"
                      : "Carregar 15 exemplos"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="cartao p-5 flex flex-col space-y-3.5">
                <div className="space-y-4">
                  {/* ALERTA INTEGRADO DENTRO DO TOPO DO CARD (COM SELETOR DE RESPONSÁVEL) */}
                  {mensagemSelecionada.analise?.urgencia === "Alta" &&
                    mensagemSelecionada.analise?.sentimento === "Negativo" && (
                      <div className="alerta-erro px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C93B3B] text-white text-[11px] font-extrabold">
                            !
                          </span>
                          <span>
                            Definir o Responsável: Urgência Alta combinada com
                            Sentimento Negativo.
                          </span>
                        </div>

                        <select
                          value={mensagemSelecionada.responsavel || ""}
                          onChange={(e) =>
                            handleDefinirResponsavel(
                              mensagemSelecionada.id,
                              e.target.value
                            )
                          }
                          className="rounded-[6px] bg-[#F7F5F0] border border-[#C93B3B]/50 px-2.5 py-1 text-xs font-bold text-[#18191A] focus:outline-none focus:border-[#0E4D52]"
                        >
                          <option value="">Selecionar responsável...</option>
                          <option value="Supervisor Financeiro">
                            Supervisor Financeiro
                          </option>
                          <option value="Engenharia Nível 2">
                            Engenharia Nível 2
                          </option>
                          <option value="Especialista de Retenção">
                            Especialista de Retenção
                          </option>
                          <option value="Coordenação de Suporte">
                            Coordenação de Suporte
                          </option>
                        </select>
                      </div>
                    )}

                  {mensagemSelecionada.resolvido && (
                    <div className="alerta-sucesso px-4 py-2.5 flex items-center gap-3 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 text-[#1E8E4E] shrink-0" />
                      <span>
                        Success: Este atendimento foi marcado como resolvido.
                      </span>
                    </div>
                  )}

                  {mensagemSelecionada.analise?.urgencia === "Média" &&
                    !mensagemSelecionada.resolvido && (
                      <div className="alerta-aviso px-4 py-2.5 flex items-center gap-3 text-xs font-semibold">
                        <AlertTriangle className="h-4 w-4 text-[#D99B16] shrink-0" />
                        <span>
                          Warning: Prioridade Média — responder dentro da janela
                          operacional do dia.
                        </span>
                      </div>
                    )}

                  {mensagemSelecionada.analise?.urgencia === "Baixa" &&
                    !mensagemSelecionada.resolvido && (
                      <div className="alerta-info px-4 py-2.5 flex items-center gap-3 text-xs font-semibold">
                        <Info className="h-4 w-4 text-[#1976D2] shrink-0" />
                        <span>
                          Info: Chamado de baixa urgência — resposta automática
                          pronta para envio.
                        </span>
                      </div>
                    )}

                  {/* Cabeçalho do Cliente */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D5CE] pb-3.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-2xl font-extrabold tracking-tight text-[#18191A]">
                        {mensagemSelecionada.nome}
                      </h2>
                      <span className="rounded-[4px] bg-[#0E4D52] text-[#F7F5F0] px-2.5 py-0.5 text-xs font-semibold">
                        {mensagemSelecionada.canal}
                      </span>
                      <span className="font-mono text-xs text-[#787877]">
                        {mensagemSelecionada.horario}
                      </span>
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
                      disabled={
                        mensagemSelecionada.statusTriagem === "processando"
                      }
                      className="btn btn-secundario py-1.5 px-3 text-xs"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          mensagemSelecionada.statusTriagem === "processando"
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                      Reanalisar
                    </button>
                  </div>

                  {/* Texto Original do Cliente */}
                  <div className="space-y-1.5">
                    <span className="tabela-cab">TEXTO ORIGINAL DO CLIENTE</span>
                    <div className="rounded-[8px] bg-[#E4E1DA] border border-[#D8D5CE] p-3.5 text-sm text-[#18191A] leading-relaxed">
                      &ldquo;{mensagemSelecionada.texto}&rdquo;
                    </div>
                  </div>

                  {/* Estado Processando ou Erro */}
                  {mensagemSelecionada.statusTriagem === "processando" && (
                    <div className="alerta-info p-4 flex items-center gap-3 text-xs font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0E4D52]" />
                      <span>
                        Consultando {INFO_PROVEDORES[provedorIA].nome} e
                        validando estrutura JSON...
                      </span>
                    </div>
                  )}

                  {mensagemSelecionada.statusTriagem === "erro" && (
                    <div className="alerta-erro p-4 space-y-3">
                      <div className="flex items-start gap-2.5 text-xs">
                        <AlertCircle className="h-4 w-4 text-[#C93B3B] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            Falha na comunicação com a API
                          </p>
                          <p className="mt-0.5">
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
                        className="btn btn-principal py-1.5 px-3 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Tentar de novo
                      </button>
                    </div>
                  )}

                  {/* Análise Estruturada e Campo Editável */}
                  {mensagemSelecionada.analise && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="tabela-cab">
                          ANÁLISE ESTRUTURADA (JSON VALIDADO)
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {renderBadgeUrgencia(
                            mensagemSelecionada.analise.urgencia
                          )}
                          <span className="chip chip-ativo">
                            Categoria: {mensagemSelecionada.analise.categoria}
                          </span>
                          {renderBadgeSentimento(
                            mensagemSelecionada.analise.sentimento
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 items-stretch">
                          <div className="rounded-[8px] bg-[#EFECE6] border border-[#D8D5CE] p-3">
                            <span className="tabela-cab block">
                              Resumo (Até 15 palavras)
                            </span>
                            <p className="mt-1 text-xs sm:text-sm font-bold text-[#18191A] leading-snug">
                              {mensagemSelecionada.analise.resumo}
                            </p>
                          </div>

                          <div className="rounded-[8px] bg-[#EFECE6] border border-[#D8D5CE] p-3">
                            <span className="tabela-cab block">
                              Justificativa de Urgência
                            </span>
                            <p className="mt-1 text-xs sm:text-sm text-[#3D3E40] leading-snug">
                              {
                                mensagemSelecionada.analise
                                  .justificativaUrgencia
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Campo Editável de Resposta sem scrollbar grossa */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor="campo-resposta-ia"
                            className="tabela-cab"
                          >
                            RESPOSTA SUGERIDA (CAMPO EDITÁVEL)
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
                                className="chip chip-neutro text-[11px] py-0.5 px-2.5"
                              >
                                {acao.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          id="campo-resposta-ia"
                          rows={4}
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
                          className="campo scroll-editorial text-xs sm:text-sm leading-relaxed resize-y"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÕES LOGO ABAIXO DO CAMPO DE RESPOSTA (SEM BURACO EM BRANCO) */}
                {mensagemSelecionada.analise && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D8D5CE]">
                    <button
                      type="button"
                      onClick={() =>
                        handleAlternarResolvido(mensagemSelecionada.id)
                      }
                      className="btn btn-secundario py-2.5 text-xs w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#0E4D52]" />
                      {mensagemSelecionada.resolvido
                        ? "Desmarcar resolvido"
                        : "Marcar como resolvido"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopiarResposta}
                      className="btn btn-principal py-2.5 text-xs w-full"
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
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
        )}

        {/* =======================================================================
            ABA 2: MÉTRICAS & CATEGORIAS (VISÃO DEDICADA DE ANÁLISE GERENCIAL)
           ======================================================================= */}
        {abaAtiva === "analitico" && (
          <section className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Distribuição por Categoria (8 Colunas) */}
              <div className="lg:col-span-8 cartao p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#D8D5CE] pb-3.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#0E4D52]" />
                    <span className="tabela-cab">
                      VOLUME E DISTRIBUIÇÃO POR CATEGORIA
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#787877]">
                    {metricas.totalClassificadas} chamados classificados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metricas.porCategoria.map((item) => (
                    <div
                      key={item.categoria}
                      className="rounded-[8px] bg-[#EFECE6] border border-[#D8D5CE] p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#18191A]">
                          {item.categoria}
                        </span>
                        <span className="chip chip-neutro text-[11px] py-0.5 px-2 font-mono">
                          {item.pct}%
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-[#18191A]">
                          {item.count}
                        </span>
                        <span className="text-xs text-[#787877]">
                          atendimentos
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#D8D5CE]">
                        <div
                          className="h-full bg-[#0E4D52] transition-all duration-300"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balanço de Sentimento e Resolução (4 Colunas) */}
              <div className="lg:col-span-4 cartao p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8D5CE] pb-3.5">
                    <span className="tabela-cab">
                      TERMÔMETRO DE SENTIMENTO
                    </span>
                    <span className="text-xs font-mono text-[#787877]">
                      Clientes
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="alerta-sucesso p-3.5 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold">
                          Sentimento Positivo
                        </span>
                        <span className="text-[11px] opacity-85">
                          Elogios e satisfação
                        </span>
                      </div>
                      <span className="text-xl font-extrabold">
                        {metricas.sentPositivo}
                      </span>
                    </div>

                    <div className="rounded-[8px] bg-[#E4E1DA] border border-[#D8D5CE] p-3.5 flex items-center justify-between text-[#18191A]">
                      <div>
                        <span className="block text-xs font-bold">
                          Sentimento Neutro
                        </span>
                        <span className="text-[11px] text-[#787877]">
                          Dúvidas e solicitações comuns
                        </span>
                      </div>
                      <span className="text-xl font-extrabold">
                        {metricas.sentNeutro}
                      </span>
                    </div>

                    <div className="alerta-erro p-3.5 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold">
                          Sentimento Negativo
                        </span>
                        <span className="text-[11px] opacity-85">
                          Reclamações e risco de atrito
                        </span>
                      </div>
                      <span className="text-xl font-extrabold">
                        {metricas.sentNegativo}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#D8D5CE] pt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#3D3E40]">
                    Exportar dados consolidados:
                  </span>
                  <button
                    type="button"
                    onClick={handleExportarCSV}
                    disabled={mensagens.length === 0}
                    className="btn btn-principal py-2 px-4 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar CSV
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =======================================================================
            ABA 3: CONFIGURAÇÕES (TOM DA EMPRESA, PROVEDOR DE IA E CHAVE DE API)
           ======================================================================= */}
        {abaAtiva === "configuracoes" && (
          <section className="cartao p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D5CE] pb-4">
              <div>
                <span className="tabela-cab flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#0E4D52]" />
                  CONFIGURAÇÕES DO ESTABELECIMENTO & MOTOR DE IA
                </span>
                <p className="text-xs text-[#787877] mt-1">
                  Personalize o tom de voz utilizado pela inteligência
                  artificial nas respostas e escolha o provedor de LLM.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAbaAtiva("triagem")}
                className="btn btn-principal py-2 px-5 text-xs"
              >
                <Check className="h-3.5 w-3.5" />
                Salvar e Voltar para a Fila
              </button>
            </div>

            {/* Escolha Rápida de Modelos de Tom */}
            <div className="space-y-3">
              <span className="tabela-cab block">
                1. MODELOS PREDEFINIDOS DE TOM DA EMPRESA
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PRESETS_PERSONALIDADE.map((preset) => {
                  const ativo = tomEmpresa === preset.valor;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTomEmpresa(preset.valor)}
                      className={`text-left rounded-[8px] p-4 border transition-all flex flex-col justify-between gap-2 ${
                        ativo
                          ? "border-[#0E4D52] ring-1 ring-[#0E4D52] bg-[#FAF9F5]"
                          : "border-[#D8D5CE] bg-[#EFECE6] hover:bg-[#E4E1DA]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#18191A]">
                          {preset.rotulo}
                        </span>
                        {ativo && (
                          <span className="chip chip-ativo text-[10px] py-0 px-2">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#3D3E40] leading-relaxed">
                        {preset.valor}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo Editável do Prompt de Tom */}
            <div className="space-y-2">
              <label
                htmlFor="input-tom-empresa"
                className="tabela-cab block"
              >
                2. INSTRUÇÃO PERSONALIZADA DE TOM DE VOZ (ENVIADA NO PROMPT DA IA)
              </label>
              <textarea
                id="input-tom-empresa"
                rows={3}
                value={tomEmpresa}
                onChange={(e) => setTomEmpresa(e.target.value)}
                placeholder="Descreva como a IA deve se comunicar com os clientes do seu estabelecimento..."
                className="campo text-sm leading-relaxed"
              />
            </div>

            {/* Seleção do Provedor de IA e Chave de API */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 border-t border-[#D8D5CE] pt-6">
              <div className="lg:col-span-5 space-y-2">
                <label
                  htmlFor="select-provedor-ia"
                  className="tabela-cab block"
                >
                  3. PROVEDOR DE INTELIGÊNCIA ARTIFICIAL (LLM)
                </label>
                <select
                  id="select-provedor-ia"
                  value={provedorIA}
                  onChange={(e) =>
                    setProvedorIA(e.target.value as ProvedorIA)
                  }
                  className="campo py-2.5 text-xs font-bold"
                >
                  <option value="anthropic">
                    Anthropic — Claude Sonnet 4 (Recomendado)
                  </option>
                  <option value="openai">OpenAI — ChatGPT (GPT-4o Mini)</option>
                  <option value="gemini">
                    Google — Gemini 2.5 Flash
                  </option>
                  <option value="groq">
                    Groq — Llama 3.3 70B (Alta Velocidade)
                  </option>
                </select>
                <p className="text-[11px] text-[#787877]">
                  O sistema adapta automaticamente o formato da requisição para
                  a API escolhida.
                </p>
              </div>

              <div className="lg:col-span-7 space-y-2">
                <label
                  htmlFor="input-api-key"
                  className="tabela-cab flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5 text-[#0E4D52]" />
                  4. CHAVE DE ACESSO DA API ({INFO_PROVEDORES[provedorIA].envVar})
                </label>
                <input
                  id="input-api-key"
                  type="password"
                  value={apiKeyCustom}
                  onChange={(e) => setApiKeyCustom(e.target.value)}
                  placeholder={INFO_PROVEDORES[provedorIA].placeholderKey}
                  className="campo py-2.5 font-mono text-xs"
                />
                <p className="text-[11px] text-[#787877]">
                  Se deixado em branco, o aplicativo utiliza a variável do
                  servidor (<code>.env.local</code>) ou o Modo Demonstração
                  Zero-Config.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODAL PARA ADICIONAR MENSAGEM */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18191A]/50 p-4 backdrop-blur-[2px]">
          <div className="cartao w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#D8D5CE] pb-3">
              <div>
                <span className="tabela-cab">NOVO ATENDIMENTO</span>
                <h3 className="text-lg font-extrabold text-[#18191A]">
                  Adicionar Mensagem de Cliente
                </h3>
              </div>
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
                  <label className="block text-xs font-bold text-[#18191A] mb-1">
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
                  <label className="block text-xs font-bold text-[#18191A] mb-1">
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
                <label className="block text-xs font-bold text-[#18191A] mb-1">
                  Horário (opcional)
                </label>
                <input
                  type="text"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  placeholder="Ex: 14:35 (vazio = horário atual)"
                  className="campo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18191A] mb-1">
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

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#D8D5CE]">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="btn btn-secundario py-2.5"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-principal py-2.5">
                  <Send className="h-3.5 w-3.5" />
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
