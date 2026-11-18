import { Canal } from "./types";

export interface ExemploMensagem {
  nome: string;
  canal: Canal;
  texto: string;
  horario: string;
}

export const EXEMPLOS_MENSAGENS: ExemploMensagem[] = [
  {
    nome: "Mariana Costa",
    canal: "WhatsApp",
    texto: "Vocês cobraram duas vezes a mensalidade de novembro no meu cartão de crédito! Preciso do estorno urgente porque estourou meu limite e tenho contas para pagar hoje!",
    horario: "09:12",
  },
  {
    nome: "Carlos Eduardo Mendes",
    canal: "E-mail",
    texto: "O sistema está fora do ar desde as 8h da manhã com erro 500 ao tentar emitir notas fiscais. Nossa operação inteira está parada e estamos perdendo vendas a cada minuto!",
    horario: "09:18",
  },
  {
    nome: "Fernanda Oliveira",
    canal: "Chat",
    texto: "Bom dia! Gostaria de saber se o plano Profissional permite cadastrar mais de 5 usuários simultâneos ou se preciso fazer upgrade para o plano Corporativo.",
    horario: "09:25",
  },
  {
    nome: "Roberto Almeida",
    canal: "Telefone",
    texto: "Já é a terceira vez que abro chamado sobre lentidão no módulo financeiro e ninguém resolve. Quero cancelar minha assinatura imediatamente sem pagar multa!",
    horario: "09:34",
  },
  {
    nome: "Juliana Santos",
    canal: "Instagram",
    texto: "Passando para elogiar a nova atualização do painel de relatórios! Ficou super rápido e intuitivo, economizou horas do meu fechamento mensal. Parabéns à equipe!",
    horario: "09:40",
  },
  {
    nome: "Pedro Henrique Lima",
    canal: "WhatsApp",
    texto: "Meu boleto venceu ontem e não consigo gerar a segunda via atualizada pelo portal do cliente. Poderiam me enviar o código PIX ou boleto atualizado?",
    horario: "09:52",
  },
  {
    nome: "Camila Rodrigues",
    canal: "Chat",
    texto: "Não estou conseguindo exportar a planilha de estoque para Excel, o botão de download simplesmente não faz nada quando clico nele no navegador Chrome.",
    horario: "10:05",
  },
  {
    nome: "Lucas Ferreira",
    canal: "E-mail",
    texto: "Olá, somos uma consultoria contábil e gostaríamos de apresentar uma proposta de parceria comercial para indicar o software de vocês aos nossos clientes.",
    horario: "10:15",
  },
  {
    nome: "Patrícia Gomes",
    canal: "WhatsApp",
    texto: "Absurdo! Cancelei minha conta no mês passado, tenho o protocolo salvo aqui e mesmo assim veio uma cobrança de R$ 299 na minha fatura de hoje! Vou acionar o Procon!",
    horario: "10:22",
  },
  {
    nome: "Gustavo Ribeiro",
    canal: "Chat",
    texto: "Como faço para configurar a autenticação em duas etapas (2FA) para todos os colaboradores da minha equipe dentro do painel de segurança?",
    horario: "10:30",
  },
  {
    nome: "Amanda Martins",
    canal: "E-mail",
    texto: "Infelizmente vamos encerrar as atividades da nossa loja física neste mês e por isso gostaria de solicitar o cancelamento tranquilo do nosso plano atual ao fim do ciclo.",
    horario: "10:41",
  },
  {
    nome: "Thiago Barbosa",
    canal: "WhatsApp",
    texto: "A integração com a API dos Correios parou de calcular o frete no checkout da nossa loja virtual agora mesmo! Os clientes estão abandonando o carrinho, socorro!",
    horario: "10:48",
  },
  {
    nome: "Beatriz Carvalho",
    canal: "Instagram",
    texto: "O atendimento do suporte técnico ontem à noite foi impecável! Resolveram minha dúvida sobre importação de XML em menos de 5 minutos. Muito obrigada!",
    horario: "11:02",
  },
  {
    nome: "Rafael Teixeira",
    canal: "E-mail",
    texto: "Notei que o valor da minha fatura deste mês veio R$ 18 acima do contratado. Poderiam me explicar se houve reajuste anual ou cobrança de algum pacote adicional?",
    horario: "11:14",
  },
  {
    nome: "Larissa Nascimento",
    canal: "Chat",
    texto: "Vocês oferecem treinamento gravado ou documentação em vídeo para novos funcionários que estão começando a operar o sistema de gestão agora?",
    horario: "11:25",
  },
];
