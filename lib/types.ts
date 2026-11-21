export type Categoria =
  | "Cobrança"
  | "Problema técnico"
  | "Dúvida"
  | "Cancelamento"
  | "Elogio"
  | "Outro";

export type Urgencia = "Alta" | "Média" | "Baixa";

export type Sentimento = "Positivo" | "Neutro" | "Negativo";

export type Canal = "WhatsApp" | "E-mail" | "Chat" | "Instagram" | "Telefone";

export interface AnaliseIA {
  categoria: Categoria;
  urgencia: Urgencia;
  justificativaUrgencia: string;
  sentimento: Sentimento;
  resumo: string;
  respostaSugerida: string;
}

export interface MensagemCliente {
  id: string;
  nome: string;
  canal: Canal;
  texto: string;
  horario: string;
  resolvido: boolean;
  responsavel?: string;
  statusTriagem: "pendente" | "processando" | "concluido" | "erro";
  erroMensagem?: string;
  analise?: AnaliseIA;
  respostaEditada?: string;
}
