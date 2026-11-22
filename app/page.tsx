"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
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
  detectarInjecaoMaliciosa,
  sanitizarTextoEntrada,
  validarFormatoHorario,
  validarNomeCliente,
} from "@/lib/validation";
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

  // Configurações de Tom, Provedor de IA e Chaves de API por Provedor
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

  // Filtros e Abas
  const [buscaTexto, setBuscaTexto] = useState<string>("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>("Todas");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "resolvidos" | "escalar"
  >("todos");
  const [abaAtiva, setAbaAtiva] = useState<
    "triagem" | "analitico" | "configuracoes"
  >("triagem");

  // Modal Nova Mensagem e Modal Limpar Fila (3 opções)
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [modalLimparAberto, setModalLimparAberto] = useState<boolean>(false);
  const [novoNome, setNovoNome] = useState<string>("");
  const [novoCanal, setNovoCanal] = useState<Canal>("WhatsApp");
  const [novoTexto, setNovoTexto] = useState<string>("");
  const [novoHorario, setNovoHorario] = useState<string>("");
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  // Controle de cópia, lote síncrono atômico e mobile drawer
  const [copiado, setCopiado] = useState<boolean>(false);
  const [carregandoLote, setCarregandoLote] = useState<boolean>(false);
  const lockCarregamentoRef = useRef<boolean>(false);
  const [modalDetalheMobile, setModalDetalheMobile] = useState<boolean>(false);

  const handleSelecionarMensagem = (id: string) => {
    setIdSelecionado(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setModalDetalheMobile(true);
    }
  };

  // Carregar dados salvos no localStorage com deduplicação e filtro de segurança
  useEffect(() => {
    try {
      const salvas = localStorage.getItem(STORAGE_KEY_MENSAGENS);
      if (salvas) {
        const parseadas = JSON.parse(salvas) as MensagemCliente[];
        if (Array.isArray(parseadas)) {
          const vistos = new Set<string>();
          const unicasSeguras = parseadas.filter((m) => {
            if (
              detectarInjecaoMaliciosa(m.nome) ||
              detectarInjecaoMaliciosa(m.texto)
            ) {
              return false;
            }
            const chaveUnica = `${m.nome.trim().toLowerCase()}::${m.texto.trim().toLowerCase()}`;
            if (vistos.has(chaveUnica)) return false;
            vistos.add(chaveUnica);
            return true;
          });
          setMensagens(unicasSeguras);
          const primeiroPendente = unicasSeguras.find((m) => !m.resolvido);
          if (primeiroPendente) {
            setIdSelecionado(primeiroPendente.id);
          } else if (unicasSeguras.length > 0) {
            setIdSelecionado(unicasSeguras[0].id);
          }
        }
      }

      const tomSalvo = localStorage.getItem(STORAGE_KEY_TOM);
      if (tomSalvo && !detectarInjecaoMaliciosa(tomSalvo)) {
        setTomEmpresa(tomSalvo);
      }

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

  useEffect(() => {
    if (!carregadoStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY_MENSAGENS, JSON.stringify(mensagens));
    } catch (e) {
      console.error("Erro ao salvar mensagens no localStorage:", e);
    }
  }, [mensagens, carregadoStorage]);

  useEffect(() => {
    if (!carregadoStorage) return;
    localStorage.setItem(STORAGE_KEY_TOM, tomEmpresa);
  }, [tomEmpresa, carregadoStorage]);

  useEffect(() => {
    if (!carregadoStorage) return;
    localStorage.setItem(STORAGE_KEY_APIS, JSON.stringify(chavesPorProvedor));
  }, [chavesPorProvedor, carregadoStorage]);

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

  // Adicionar nova mensagem manual com validação rigorosa (ISO 27001)
  const handleAdicionarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroFormulario(null);

    const nomeLimpo = sanitizarTextoEntrada(novoNome);
    const textoLimpo = sanitizarTextoEntrada(novoTexto);

    if (!nomeLimpo || !textoLimpo) {
      setErroFormulario("Preencha o nome do cliente e a mensagem.");
      return;
    }

    if (!validarNomeCliente(nomeLimpo)) {
      setErroFormulario(
        "Nome inválido (ISO 27001): utilize apenas letras, espaços, acentos, ponto ou hífen (sem símbolos ou código)."
      );
      return;
    }

    if (
      detectarInjecaoMaliciosa(nomeLimpo) ||
      detectarInjecaoMaliciosa(textoLimpo)
    ) {
      setErroFormulario(
        "Entrada bloqueada por segurança (ISO 27001): código executável, SQL Injection ou script não são permitidos."
      );
      return;
    }

    if (!validarFormatoHorario(novoHorario)) {
      setErroFormulario(
        "Horário inválido. Informe horas e minutos válidos no formato HH:MM (ex: 14:35)."
      );
      return;
    }

    const agora = new Date();
    const horarioFormatado =
      novoHorario.trim() ||
      agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

    const novaMsg: MensagemCliente = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: nomeLimpo,
      canal: novoCanal,
      texto: textoLimpo,
      horario: horarioFormatado,
      resolvido: false,
      statusTriagem: "pendente",
    };

    setMensagens((prev) => [novaMsg, ...prev]);
    setFiltroStatus("todos");
    setIdSelecionado(novaMsg.id);
    setNovoNome("");
    setNovoTexto("");
    setNovoHorario("");
    setErroFormulario(null);
    setModalAberto(false);

    await classificarMensagem(novaMsg, tomEmpresa, apiKeyCustom);
  };

  // Carregar 15 exemplos (operação idempotente e atômica)
  const handleCarregarExemplos = async () => {
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

      setFiltroStatus("todos");
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

  // Tentar novamente mensagens com erro
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

  // Exportar planilha Excel (.xlsx) real com auto-redimensionamento de todas as colunas
  const handleExportarExcel = () => {
    if (mensagens.length === 0) return;

    const linhas = mensagens.map((m) => {
      const definirResp =
        m.analise?.urgencia === "Alta" && m.analise?.sentimento === "Negativo"
          ? "SIM"
          : "NÃO";
      return {
        ID: m.id,
        Cliente: m.nome,
        Canal: m.canal,
        Horário: m.horario,
        Status: m.resolvido ? "Resolvido" : "Pendente",
        Categoria: m.analise?.categoria || "Pendente",
        Urgência: m.analise?.urgencia || "Pendente",
        Sentimento: m.analise?.sentimento || "Pendente",
        "Definir Responsável": definirResp,
        "Responsável Atribuído": m.responsavel || "Não atribuído",
        Resumo: m.analise?.resumo || "",
        "Mensagem Original": m.texto,
        "Resposta Sugerida":
          m.respostaEditada ?? m.analise?.respostaSugerida ?? "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(linhas);

    // Calcula a largura automática ideal para cada coluna sem cortar textos
    const chaves = Object.keys(linhas[0]);
    worksheet["!cols"] = chaves.map((chave) => {
      const maiorTamanho = linhas.reduce((max, linha) => {
        const valor = String(linha[chave as keyof typeof linha] ?? "");
        return Math.max(max, valor.length);
      }, chave.length);

      // Limita entre 12 e 58 caracteres para leitura confortável no Excel
      return { wch: Math.min(Math.max(maiorTamanho + 4, 12), 58) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Triagem Inteligente");
    XLSX.writeFile(
      workbook,
      `relatorio-triagem-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Opções de limpeza da fila (Tudo | Apenas filtro atual)
  const handleLimparTudo = () => {
    setMensagens([]);
    setIdSelecionado(null);
    setModalDetalheMobile(false);
    setModalLimparAberto(false);
    localStorage.removeItem(STORAGE_KEY_MENSAGENS);
  };

  const handleLimparFiltroAtual = () => {
    const idsParaRemover = new Set(
      mensagensFiltradasEOrdenadas.map((m) => m.id)
    );
    const restantes = mensagens.filter((m) => !idsParaRemover.has(m.id));
    setMensagens(restantes);
    setIdSelecionado(restantes.length > 0 ? restantes[0].id : null);
    setModalDetalheMobile(false);
    setModalLimparAberto(false);
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

        if (filtroStatus === "resolvidos") {
          if (!m.resolvido) return false;
        } else {
          if (m.resolvido) return false;
        }

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
        return pesoB - pesoA;
      });
  }, [mensagens, buscaTexto, filtroCategoria, filtroUrgencia, filtroStatus]);

  // Garante que sempre exista uma referência válida selecionada quando o filtro mudar (ex: ao abrir "Resolvidos (15)")
  useEffect(() => {
    if (mensagensFiltradasEOrdenadas.length === 0) {
      if (idSelecionado !== null) setIdSelecionado(null);
      return;
    }
    const aindaVisivel = mensagensFiltradasEOrdenadas.some(
      (m) => m.id === idSelecionado
    );
    if (!aindaVisivel) {
      setIdSelecionado(mensagensFiltradasEOrdenadas[0].id);
    }
  }, [mensagensFiltradasEOrdenadas, idSelecionado]);

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

  // Alternar status de resolvido (puro, sem efeitos colaterais dentro de updater)
  const handleAlternarResolvido = (id: string) => {
    const alvo = mensagens.find((m) => m.id === id);
    if (!alvo) return;
    const novoStatus = !alvo.resolvido;

    setMensagens((prev) =>
      prev.map((m) => (m.id === id ? { ...m, resolvido: novoStatus } : m))
    );

    setModalDetalheMobile(false);
  };

  const handleEditarResposta = (id: string, novoValor: string) => {
    setMensagens((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, respostaEditada: novoValor } : m
      )
    );
  };

  // Refinar resposta de forma cumulativa preservando contexto e ajustes
  const handleRefinarResposta = (
    msg: MensagemCliente,
    tipo: "curta" | "formal" | "dados" | "original"
  ) => {
    const baseOriginal = msg.analise?.respostaSugerida || "";
    if (!baseOriginal) return;

    if (tipo === "original") {
      handleEditarResposta(msg.id, baseOriginal);
      return;
    }

    const textoAtual = (msg.respostaEditada ?? baseOriginal).trim();
    const fraseCPF =
      "Para agilizar seu atendimento, poderia nos informar por gentileza seu CPF/CNPJ ou o número do pedido correspondente?";
    const jaTemCPF =
      textoAtual.toLowerCase().includes("cpf") ||
      textoAtual.toLowerCase().includes("cnpj");

    if (tipo === "dados") {
      if (jaTemCPF) return;
      const paragrafos = textoAtual.split(/\n\n+/);
      if (paragrafos.length >= 2) {
        const antesAssinatura = paragrafos.slice(0, -1).join("\n\n");
        const assinatura = paragrafos[paragrafos.length - 1];
        handleEditarResposta(
          msg.id,
          `${antesAssinatura}\n\n${fraseCPF}\n\n${assinatura}`
        );
      } else {
        handleEditarResposta(msg.id, `${textoAtual}\n\n${fraseCPF}`);
      }
      return;
    }

    const paragrafosOriginais = baseOriginal.split(/\n\n+/);
    const mioloOriginal =
      paragrafosOriginais.length >= 3
        ? paragrafosOriginais[1]
        : paragrafosOriginais[0];

    if (tipo === "curta") {
      const primeiraFrase =
        mioloOriginal.split(/(?<=[.!?])\s+/)[0] || mioloOriginal;
      let novoTexto = `Olá, ${msg.nome.split(" ")[0]}!\n\n${primeiraFrase}`;
      if (jaTemCPF) {
        novoTexto += `\n\n${fraseCPF}`;
      }
      novoTexto += `\n\nSeguimos à disposição pelo ${msg.canal}.\nEquipe de Suporte.`;
      handleEditarResposta(msg.id, novoTexto);
      return;
    }

    if (tipo === "formal") {
      let novoTexto = `Prezado(a) ${msg.nome},\n\n${mioloOriginal}`;
      if (jaTemCPF) {
        novoTexto += `\n\n${fraseCPF}`;
      }
      novoTexto += `\n\nPermanecemos à inteira disposição por meio do canal ${msg.canal}.\nCordialmente,\nCentral de Relacionamento com o Cliente.`;
      handleEditarResposta(msg.id, novoTexto);
    }
  };

  const handleDefinirResponsavel = (id: string, responsavel: string) => {
    setMensagens((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, responsavel: responsavel || undefined }
          : m
      )
    );
  };

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

  const temFiltroAtivo =
    buscaTexto.trim() !== "" ||
    filtroCategoria !== "Todas" ||
    filtroUrgencia !== "Todas" ||
    filtroStatus !== "todos";

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Grade arquitetônica responsiva */}
      <div className="pointer-events-none fixed inset-0 z-0 w-full px-3 sm:px-6 lg:px-8">
        <div className="grid h-full grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 border-x border-[#D8D5CE]/55">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`h-full border-r border-[#D8D5CE]/45 last:border-r-0 ${
                i >= 4 ? "hidden sm:block" : ""
              } ${i >= 6 ? "sm:hidden lg:block" : ""}`}
            />
          ))}
        </div>
      </div>

      <main className="relative z-10 w-full flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-5 sm:space-y-6">
        {/* 1. CABEÇALHO */}
        <header className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 border-b border-[#D8D5CE] pb-5 sm:pb-6 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-2">
            <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-extrabold tracking-[-0.035em] text-[#18191A] leading-[0.95]">
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

          <div className="lg:col-span-6 flex flex-col justify-between items-stretch lg:items-end gap-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCarregarExemplos}
                disabled={carregandoLote || exemplosJaCarregados}
                className="btn btn-primary px-3.5 sm:px-5 py-2.5 w-full sm:w-auto"
                title={
                  exemplosJaCarregados
                    ? "Os 15 exemplos já foram carregados na fila"
                    : "Carregar lote de 15 exemplos"
                }
              >
                {carregandoLote ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span className="truncate">Carregando...</span>
                  </>
                ) : exemplosJaCarregados ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">15 exemplos</span>
                  </>
                ) : (
                  <>
                    <Inbox className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Carregar 15 exemplos</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="btn btn-secondary px-3.5 sm:px-4 py-2.5 w-full sm:w-auto"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Adicionar mensagem</span>
              </button>

              {mensagens.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportarExcel}
                  className="btn btn-secondary px-3.5 py-2.5 w-full sm:w-auto"
                  title="Exportar planilha Excel (.xlsx)"
                >
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span>Exportar Excel</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setAbaAtiva((a) =>
                    a === "configuracoes" ? "triagem" : "configuracoes"
                  )
                }
                className={`btn px-3.5 py-2.5 w-full sm:w-auto ${
                  abaAtiva === "configuracoes"
                    ? "btn-primary"
                    : "btn-secondary"
                } ${mensagens.length === 0 ? "col-span-2 sm:col-span-1" : ""}`}
                title="Configurar Tom da Empresa e Provedor de IA"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                <span>Configurações</span>
              </button>
            </div>

            <div className="flex items-center gap-6 border-b border-[#D8D5CE] w-full lg:w-auto">
              {[
                { id: "triagem", label: "Fila de Atendimento" },
                { id: "analitico", label: "Métricas & Categorias" },
              ].map((tab) => {
                const ativo = abaAtiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setAbaAtiva(tab.id as "triagem" | "analitico")
                    }
                    className={`pb-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px flex-1 sm:flex-initial text-center ${
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

        {/* 2. MÉTRICAS NO TOPO */}
        <section>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
            <div className="lg:col-span-3 rounded-[10px] bg-[#0E4D52] text-[#F7F5F0] p-3.5 sm:p-4 border border-[#08363A] shadow-[0_4px_8px_-2px_rgba(14,77,82,0.25)] flex flex-col justify-between min-h-[104px] sm:min-h-[118px]">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-[#DCE9F2]/80 uppercase tracking-wider">
                <span className="truncate">Total na Fila</span>
              </div>
              <div className="my-1 flex items-baseline justify-between gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {metricas.total}
                </span>
                <span className="text-[11px] sm:text-xs text-[#DCE9F2] truncate">
                  {metricas.totalClassificadas} triadas
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#DCE9F2]/90 font-medium truncate">
                {metricas.qtdResolvidos} resolvidas
              </div>
            </div>

            <div className="lg:col-span-3 card p-3.5 sm:p-4 flex flex-col justify-between min-h-[104px] sm:min-h-[118px]">
              <div className="flex items-center justify-between">
                <span className="section-label text-[10px] sm:text-[11px]">
                  Urgência Alta
                </span>
                <span className="font-mono text-[10px] sm:text-[11px] text-[#787877]">
                  {metricas.pctAlta}%
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#18191A]">
                  {metricas.qtdAlta}
                </span>
                {metricas.qtdEscalar > 0 && (
                  <span className="rounded-full bg-[#EED5D2] border border-[#D4847C] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#7D1D1D] truncate">
                    {metricas.qtdEscalar} s/ resp.
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

            <div className="lg:col-span-3 card p-3.5 sm:p-4 flex flex-col justify-between min-h-[104px] sm:min-h-[118px]">
              <div className="flex items-center justify-between">
                <span className="section-label text-[10px] sm:text-[11px]">
                  % Por Urgência
                </span>
                <span className="font-mono text-[10px] sm:text-[11px] text-[#787877] hidden sm:inline">
                  Dist.
                </span>
              </div>
              <div className="my-1 space-y-0.5 sm:space-y-1 text-[11px] sm:text-xs font-semibold text-[#3D3E40]">
                <div className="flex justify-between">
                  <span>Média:</span>
                  <span className="font-mono font-bold text-[#18191A]">
                    {metricas.pctMedia}% ({metricas.qtdMedia})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Baixa:</span>
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

            <div className="lg:col-span-3 card p-3.5 sm:p-4 flex flex-col justify-between min-h-[104px] sm:min-h-[118px]">
              <div className="flex items-center justify-between">
                <span className="section-label text-[10px] sm:text-[11px] truncate">
                  Tempo Poupado
                </span>
                <Clock className="h-3.5 w-3.5 text-[#0E4D52] shrink-0" />
              </div>
              <div className="my-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0E4D52] tracking-tight">
                  {metricas.tempoFormatado}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#787877] font-medium truncate">
                4 min / resposta
              </div>
            </div>
          </div>
        </section>

        {/* ALERTA GLOBAL DE ERRO DE API */}
        {metricas.qtdErros > 0 && (
          <div className="alert-error px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#C93B3B] shrink-0" />
              <span>
                Falha ao classificar {metricas.qtdErros} mensagem(ns) na API.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRetentarErros}
              disabled={carregandoLote}
              className="btn btn-primary py-1 px-3 text-[11px]"
            >
              <RefreshCw
                className={`h-3 w-3 ${carregandoLote ? "animate-spin" : ""}`}
              />
              Tentar de novo
            </button>
          </div>
        )}

        {/* ABA 1: FILA DE ATENDIMENTO */}
        {abaAtiva === "triagem" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            {/* COLUNA ESQUERDA: CAIXA DE ENTRADA */}
            <div className="lg:col-span-5 flex flex-col space-y-2">
              <div className="flex items-center justify-between h-5">
                <span className="section-label">
                  CAIXA DE ENTRADA ({mensagensFiltradasEOrdenadas.length})
                </span>
                {mensagens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalLimparAberto(true)}
                    className="text-[11px] font-semibold text-[#787877] hover:text-[#7D1D1D] inline-flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Limpar fila
                  </button>
                )}
              </div>

              <div className="card p-3.5 sm:p-4 flex flex-col lg:max-h-[600px]">
                <div className="space-y-3 border-b border-[#D8D5CE] pb-3.5 shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      value={buscaTexto}
                      onChange={(e) => setBuscaTexto(e.target.value)}
                      placeholder="Buscar cliente, canal ou resumo..."
                      className="input-field pr-9"
                    />
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#787877]" />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      { id: "todos", label: "Pendentes" },
                      { id: "escalar", label: "Definir Responsável" },
                      {
                        id: "resolvidos",
                        label: `Resolvidos (${metricas.qtdResolvidos})`,
                      },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setFiltroStatus(
                            st.id as "todos" | "resolvidos" | "escalar"
                          )
                        }
                        className={`chip text-[11px] py-1 px-2.5 whitespace-nowrap shrink-0 ${
                          filtroStatus === st.id
                            ? "chip-active"
                            : "chip-neutral"
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
                        className="input-field py-1.5 text-xs font-medium"
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
                        className="input-field py-1.5 text-xs font-medium"
                      >
                        <option value="Todas">Todas</option>
                        <option value="Alta">Alta (Vermelho)</option>
                        <option value="Média">Média (Amarelo)</option>
                        <option value="Baixa">Baixa (Verde)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="custom-scrollbar flex-1 lg:overflow-y-auto space-y-2.5 pt-3 lg:pr-1.5">
                  {mensagensFiltradasEOrdenadas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <p className="text-sm font-bold text-[#18191A]">
                        {mensagens.length === 0
                          ? "Caixa de Entrada Vazia"
                          : "Nenhum chamado nesta visualização"}
                      </p>
                      <p className="text-xs text-[#787877] max-w-xs leading-relaxed">
                        {mensagens.length === 0
                          ? "Carregue os 15 exemplos de clientes para visualizar a triagem automática em ação."
                          : filtroStatus === "todos" &&
                            metricas.qtdResolvidos > 0
                          ? "Todos os chamados desta fila já foram resolvidos! Confira na aba Resolvidos."
                          : "Ajuste os filtros selecionados acima."}
                      </p>
                      {mensagens.length === 0 && (
                        <button
                          type="button"
                          onClick={handleCarregarExemplos}
                          disabled={carregandoLote}
                          className="btn btn-primary"
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
                          onClick={() => handleSelecionarMensagem(msg.id)}
                          className={`w-full text-left rounded-lg p-3.5 transition-all border flex flex-col gap-1.5 ${
                            ativo
                              ? "border-[#0E4D52] ring-1 ring-[#0E4D52] bg-[#FAF9F5] shadow-xs"
                              : "border-[#D8D5CE] bg-[#F5F3EE] hover:bg-[#EFECE6]"
                          } ${msg.resolvido ? "opacity-75" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="font-bold text-sm text-[#18191A] truncate">
                                {msg.nome}
                              </span>
                              <span className="rounded bg-[#E4E1DA] border border-[#D8D5CE] px-2 py-0.5 text-[10px] font-bold text-[#3D3E40] shrink-0">
                                {msg.canal}
                              </span>
                              {msg.resolvido && (
                                <span className="rounded-full bg-[#DCEADB] border border-[#76B88A] px-2 py-0.5 text-[10px] font-bold text-[#165B31] shrink-0">
                                  ✓ Resolvido
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-[#787877] shrink-0 pt-0.5">
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
                              <span className="chip chip-neutral text-[11px] py-0.5">
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
                                <span className="chip chip-neutral text-[11px] py-0.5">
                                  {msg.analise.categoria}
                                </span>
                                {msg.responsavel ? (
                                  <span className="rounded-full bg-[#0E4D52] text-[#F7F5F0] px-2.5 py-0.5 text-[10px] font-bold">
                                    Resp: {msg.responsavel}
                                  </span>
                                ) : (
                                  escalarHumano && (
                                    <span className="rounded-full bg-[#C93B3B] text-white px-2.5 py-0.5 text-[10px] font-bold">
                                      Definir o Responsável
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

            {/* COLUNA DIREITA: PAINEL DE INSPEÇÃO & RESPOSTA (NO CELULAR ABRE COMO TELA DEDICADA) */}
            <div
              className={`${
                modalDetalheMobile && mensagemSelecionada
                  ? "fixed inset-0 z-50 bg-[#EFECE6] overflow-y-auto p-3.5 sm:p-6 flex flex-col"
                  : "hidden lg:flex"
              } lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:overflow-visible lg:col-span-7 flex-col space-y-2`}
            >
              {modalDetalheMobile && mensagemSelecionada && (
                <div className="flex lg:hidden items-center justify-between border-b border-[#D8D5CE] pb-3 mb-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalDetalheMobile(false)}
                    className="btn btn-primary py-2 px-4"
                  >
                    ← Voltar para a Caixa de Entrada
                  </button>
                  <span className="text-[11px] font-mono text-[#787877]">
                    Atendimento
                  </span>
                </div>
              )}

              <div className="hidden lg:flex items-center justify-between h-5">
                <span className="section-label">
                  PAINEL DE INSPEÇÃO & RESPOSTA
                </span>
                {mensagemSelecionada && (
                  <span className="text-[11px] font-mono text-[#787877]">
                    ID: {mensagemSelecionada.id}
                  </span>
                )}
              </div>

              {!mensagemSelecionada ? (
                <div className="card p-10 min-h-[420px] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="mx-auto h-28 w-full max-w-md rounded-lg bg-[#E4E1DA] border border-[#D8D5CE] flex items-center justify-center text-xs font-mono text-[#787877]">
                    [ Selecione uma mensagem na Caixa de Entrada ]
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-[#18191A]">
                      Painel de Detalhe & Resposta IA
                    </h3>
                    <p className="text-xs text-[#787877] leading-relaxed">
                      Ao selecionar um cliente ao lado, você verá o texto
                      original, a classificação validada, alertas de
                      responsável e o campo editável com a resposta sugerida.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalAberto(true)}
                      className="btn btn-secondary"
                    >
                      Adicionar mensagem
                    </button>
                    <button
                      type="button"
                      onClick={handleCarregarExemplos}
                      disabled={carregandoLote || exemplosJaCarregados}
                      className="btn btn-primary"
                    >
                      {exemplosJaCarregados
                        ? "15 exemplos carregados"
                        : "Carregar 15 exemplos"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card p-5 flex flex-col space-y-3.5">
                  <div className="space-y-4">
                    {mensagemSelecionada.analise?.urgencia === "Alta" &&
                      mensagemSelecionada.analise?.sentimento ===
                        "Negativo" && (
                        <div className="alert-error px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
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
                            className="w-full sm:w-auto rounded-md bg-[#F7F5F0] border border-[#C93B3B]/50 px-2.5 py-1.5 sm:py-1 text-xs font-bold text-[#18191A] focus:outline-none focus:border-[#0E4D52]"
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
                      <div className="alert-success px-4 py-2.5 flex items-center gap-3 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4 text-[#1E8E4E] shrink-0" />
                        <span>
                          Atendimento concluído e marcado como resolvido.
                        </span>
                      </div>
                    )}

                    {mensagemSelecionada.analise?.urgencia === "Média" &&
                      !mensagemSelecionada.resolvido && (
                        <div className="alert-warning px-4 py-2.5 flex items-center gap-3 text-xs font-semibold">
                          <AlertTriangle className="h-4 w-4 text-[#D99B16] shrink-0" />
                          <span>
                            Prioridade Média — responder dentro da janela
                            operacional do dia.
                          </span>
                        </div>
                      )}

                    {mensagemSelecionada.analise?.urgencia === "Baixa" &&
                      !mensagemSelecionada.resolvido && (
                        <div className="alert-info px-4 py-2.5 flex items-center gap-3 text-xs font-semibold">
                          <Info className="h-4 w-4 text-[#1976D2] shrink-0" />
                          <span>
                            Baixa Urgência — resposta automática pronta para
                            envio.
                          </span>
                        </div>
                      )}

                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D5CE] pb-3.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-2xl font-extrabold tracking-tight text-[#18191A]">
                          {mensagemSelecionada.nome}
                        </h2>
                        <span className="rounded bg-[#0E4D52] text-[#F7F5F0] px-2.5 py-0.5 text-xs font-semibold">
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
                        className="btn btn-secondary py-1.5 px-3"
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

                    <div className="space-y-1.5">
                      <span className="section-label">
                        TEXTO ORIGINAL DO CLIENTE
                      </span>
                      <div className="rounded-lg bg-[#E4E1DA] border border-[#D8D5CE] p-3.5 text-sm text-[#18191A] leading-relaxed">
                        &ldquo;{mensagemSelecionada.texto}&rdquo;
                      </div>
                    </div>

                    {mensagemSelecionada.statusTriagem === "processando" && (
                      <div className="alert-info p-4 flex items-center gap-3 text-xs font-semibold">
                        <Loader2 className="h-4 w-4 animate-spin text-[#0E4D52]" />
                        <span>
                          Consultando {INFO_PROVEDORES[provedorIA].nome} e
                          validando estrutura JSON...
                        </span>
                      </div>
                    )}

                    {mensagemSelecionada.statusTriagem === "erro" && (
                      <div className="alert-error p-4 space-y-3">
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
                          className="btn btn-primary py-1.5 px-3"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Tentar de novo
                        </button>
                      </div>
                    )}

                    {mensagemSelecionada.analise && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="section-label">
                            DIAGNÓSTICO DA TRIAGEM
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {renderBadgeUrgencia(
                              mensagemSelecionada.analise.urgencia
                            )}
                            <span className="chip chip-active">
                              Categoria: {mensagemSelecionada.analise.categoria}
                            </span>
                            {renderBadgeSentimento(
                              mensagemSelecionada.analise.sentimento
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 items-stretch">
                            <div className="rounded-lg bg-[#EFECE6] border border-[#D8D5CE] p-3">
                              <span className="section-label block">
                                Resumo (Até 15 palavras)
                              </span>
                              <p className="mt-1 text-xs sm:text-sm font-bold text-[#18191A] leading-snug">
                                {mensagemSelecionada.analise.resumo}
                              </p>
                            </div>

                            <div className="rounded-lg bg-[#EFECE6] border border-[#D8D5CE] p-3">
                              <span className="section-label block">
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

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label
                              htmlFor="campo-resposta-ia"
                              className="section-label"
                            >
                              RESPOSTA SUGERIDA
                            </label>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                { id: "curta", label: "Mais curta" },
                                { id: "formal", label: "Mais formal" },
                                { id: "dados", label: "+ Pedir CPF" },
                                { id: "original", label: "Restaurar" },
                              ].map((acao) => (
                                <button
                                  key={acao.id}
                                  type="button"
                                  onClick={() =>
                                    handleRefinarResposta(
                                      mensagemSelecionada,
                                      acao.id as
                                        | "curta"
                                        | "formal"
                                        | "dados"
                                        | "original"
                                    )
                                  }
                                  className="chip chip-neutral text-[11px] py-0.5 px-2.5"
                                >
                                  {acao.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <textarea
                            id="campo-resposta-ia"
                            rows={7}
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
                            className="input-field custom-scrollbar p-4 text-sm sm:text-[15px] text-[#18191A] font-medium leading-relaxed min-h-[168px] resize-y"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {mensagemSelecionada.analise && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D8D5CE]">
                      <button
                        type="button"
                        onClick={() =>
                          handleAlternarResolvido(mensagemSelecionada.id)
                        }
                        className="btn btn-secondary py-2.5 w-full"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#0E4D52]" />
                        {mensagemSelecionada.resolvido
                          ? "Desmarcar resolvido"
                          : "Marcar como resolvido"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopiarResposta}
                        className="btn btn-primary py-2.5 w-full"
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

        {/* ABA 2: MÉTRICAS & CATEGORIAS */}
        {abaAtiva === "analitico" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 card p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#D8D5CE] pb-3.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#0E4D52]" />
                    <span className="section-label">
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
                      className="rounded-lg bg-[#EFECE6] border border-[#D8D5CE] p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#18191A]">
                          {item.categoria}
                        </span>
                        <span className="chip chip-neutral text-[11px] py-0.5 px-2 font-mono">
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

              <div className="lg:col-span-4 card p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8D5CE] pb-3.5">
                    <span className="section-label">
                      TERMÔMETRO DE SENTIMENTO
                    </span>
                    <span className="text-xs font-mono text-[#787877]">
                      Clientes
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="alert-success p-3.5 flex items-center justify-between">
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

                    <div className="rounded-lg bg-[#E4E1DA] border border-[#D8D5CE] p-3.5 flex items-center justify-between text-[#18191A]">
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

                    <div className="alert-error p-3.5 flex items-center justify-between">
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

                <div className="border-t border-[#D8D5CE] pt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva("triagem")}
                    className="btn btn-secondary py-2 px-3.5"
                  >
                    ← Voltar para a Fila
                  </button>
                  <button
                    type="button"
                    onClick={handleExportarExcel}
                    disabled={mensagens.length === 0}
                    className="btn btn-primary py-2 px-4"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar Excel
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ABA 3: CONFIGURAÇÕES */}
        {abaAtiva === "configuracoes" && (
          <section className="card p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D5CE] pb-4">
              <div>
                <span className="section-label flex items-center gap-2">
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
                className="btn btn-primary py-2 px-5"
              >
                <Check className="h-3.5 w-3.5" />
                Salvar e Voltar para a Fila
              </button>
            </div>

            <div className="space-y-3">
              <span className="section-label block">
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
                      className={`text-left rounded-lg p-4 border transition-all flex flex-col justify-between gap-2 ${
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
                          <span className="chip chip-active text-[10px] py-0 px-2">
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

            <div className="space-y-2">
              <label
                htmlFor="input-tom-empresa"
                className="section-label block"
              >
                2. INSTRUÇÃO PERSONALIZADA DE TOM DE VOZ (ENVIADA NO PROMPT DA IA)
              </label>
              <textarea
                id="input-tom-empresa"
                rows={3}
                maxLength={500}
                value={tomEmpresa}
                onChange={(e) => setTomEmpresa(e.target.value)}
                placeholder="Descreva como a IA deve se comunicar com os clientes do seu estabelecimento..."
                className="input-field text-sm leading-relaxed"
              />
              {!apiKeyCustom.trim() && (
                <div className="alert-info px-3.5 py-2.5 flex items-start gap-2 text-[11px] font-medium">
                  <Info className="h-4 w-4 text-[#1976D2] shrink-0 mt-0.5" />
                  <span>
                    <strong>Modo Demonstração ativo:</strong> sem uma chave de
                    API conectada, o sistema adapta a resposta com base em
                    palavras-chave de estilo (<em>empático</em>,{" "}
                    <em>direto/curto</em>, <em>formal/executivo</em> ou{" "}
                    <em>retenção</em>). Para interpretação 100% livre de
                    qualquer instrução personalizada, informe uma chave de API
                    abaixo.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 border-t border-[#D8D5CE] pt-6">
              <div className="lg:col-span-5 space-y-2">
                <label
                  htmlFor="select-provedor-ia"
                  className="section-label block"
                >
                  3. PROVEDOR DE INTELIGÊNCIA ARTIFICIAL (LLM)
                </label>
                <select
                  id="select-provedor-ia"
                  value={provedorIA}
                  onChange={(e) =>
                    setProvedorIA(e.target.value as ProvedorIA)
                  }
                  className="input-field py-2.5 text-xs font-bold"
                >
                  <option value="anthropic">
                    Anthropic — Claude Sonnet 4 (Recomendado)
                  </option>
                  <option value="openai">OpenAI — ChatGPT (GPT-4o Mini)</option>
                  <option value="gemini">Google — Gemini 2.5 Flash</option>
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
                  className="section-label flex items-center gap-1.5"
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
                  className="input-field py-2.5 font-mono text-xs"
                />
                <p className="text-[11px] text-[#787877]">
                  Se deixado em branco, o aplicativo utiliza a variável do
                  servidor (<code>.env.local</code>) ou o Modo Demonstração.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODAL PARA ADICIONAR MENSAGEM */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18191A]/50 p-4 backdrop-blur-[2px]">
          <div className="card w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#D8D5CE] pb-3">
              <div>
                <span className="section-label">NOVO ATENDIMENTO</span>
                <h3 className="text-lg font-extrabold text-[#18191A]">
                  Adicionar Mensagem de Cliente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="btn-icon p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdicionarMensagem} className="space-y-4">
              {erroFormulario && (
                <div className="alert-error p-3 flex items-start gap-2.5 text-xs font-bold">
                  <AlertCircle className="h-4 w-4 text-[#C93B3B] shrink-0 mt-0.5" />
                  <span>{erroFormulario}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#18191A] mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={novoNome}
                    onChange={(e) => {
                      setNovoNome(e.target.value);
                      if (erroFormulario) setErroFormulario(null);
                    }}
                    placeholder="Ex: Ana Paula Souza"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#18191A] mb-1">
                    Canal de Atendimento
                  </label>
                  <select
                    value={novoCanal}
                    onChange={(e) => setNovoCanal(e.target.value as Canal)}
                    className="input-field"
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
                  Horário (opcional — formato HH:MM)
                </label>
                <input
                  type="time"
                  value={novoHorario}
                  onChange={(e) => {
                    const apenasHora = e.target.value
                      .replace(/[^0-9:]/g, "")
                      .slice(0, 5);
                    setNovoHorario(apenasHora);
                    if (erroFormulario) setErroFormulario(null);
                  }}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18191A] mb-1">
                  Mensagem do Cliente *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={novoTexto}
                  onChange={(e) => {
                    setNovoTexto(e.target.value);
                    if (erroFormulario) setErroFormulario(null);
                  }}
                  placeholder="Digite ou cole aqui a mensagem enviada pelo cliente..."
                  className="input-field resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#D8D5CE]">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="btn btn-secondary py-2.5"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary py-2.5">
                  <Send className="h-3.5 w-3.5" />
                  Adicionar e Classificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA DE FILA COM 3 OPÇÕES */}
      {modalLimparAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18191A]/50 p-4 backdrop-blur-[2px]">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#D8D5CE] pb-3">
              <div>
                <span className="section-label text-[#7D1D1D]">
                  CONFIRMAR EXCLUSÃO
                </span>
                <h3 className="text-lg font-extrabold text-[#18191A]">
                  Como deseja limpar a fila?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalLimparAberto(false)}
                className="btn-icon p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#3D3E40] leading-relaxed">
              Escolha se deseja apagar{" "}
              <strong>apenas os chamados visíveis no filtro atual</strong> (
              {mensagensFiltradasEOrdenadas.length} item(ns)) ou{" "}
              <strong>toda a caixa de entrada</strong> ({mensagens.length}{" "}
              item(ns)).
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              {temFiltroAtivo ||
              mensagensFiltradasEOrdenadas.length < mensagens.length ? (
                <button
                  type="button"
                  onClick={handleLimparFiltroAtual}
                  disabled={mensagensFiltradasEOrdenadas.length === 0}
                  className="btn btn-primary py-2.5 w-full justify-between"
                >
                  <span>Limpar apenas o filtro marcado</span>
                  <span className="font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                    {mensagensFiltradasEOrdenadas.length}
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleLimparTudo}
                className="btn btn-danger py-2.5 w-full justify-between"
              >
                <span>Limpar toda a fila</span>
                <span className="font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                  {mensagens.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalLimparAberto(false)}
                className="btn btn-secondary py-2.5 w-full"
              >
                Não, manter mensagens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
