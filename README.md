<div align="center">

# Triagem Inteligente — Plataforma de Suporte e Atendimento com IA

**Classificação automatizada de chamados, análise de sentimento, priorização por SLA/urgência e geração de respostas contextualizadas com LLM (Anthropic Claude).**

[![Live Demo](https://img.shields.io/badge/Demonstração_Online-triagem--inteligente--ticia.vercel.app-F39200?style=for-the-badge)](https://triagem-inteligente-ticia.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Anthropic Claude](https://img.shields.io/badge/Anthropic_Claude_SDK-D97757?style=for-the-badge&logo=anthropic&logoColor=white)

</div>

---

## Visão Geral e Problema de Negócio

Equipes de suporte ao cliente lidam diariamente com altos volumes de mensagens vindas de múltiplos canais (`WhatsApp`, `E-mail`, `Chat`, `Instagram` e `Telefone`). A triagem manual gera gargalos operacionais: **chamados críticos de cancelamento ou indisponibilidade técnica demoram a ser identificados**, enquanto solicitações simples consomem tempo valioso dos analistas.

O **Triagem Inteligente** resolve esse desafio aplicando Inteligência Artificial Generativa (**Claude Sonnet 4 — Anthropic**) para processar cada mensagem recebida, entregando em segundos:
1. **Categorização precisa** e **nível de urgência** justificado.
2. **Detecção de sentimento** com acionamento automático de **regra de escalonamento humano** para casos críticos.
3. **Sugestão de resposta pronta para envio**, alinhada dinamicamente ao tom de voz configurado pela empresa.
4. **Visibilidade gerencial** com métricas de produtividade e tempo operacional economizado.

> **Acesse a aplicação em produção:** [https://triagem-inteligente-ticia.vercel.app](https://triagem-inteligente-ticia.vercel.app)

---

## Tecnologias Utilizadas

| Camada | Tecnologia | Papel na Arquitetura |
| :--- | :--- | :--- |
| **Front-end & SSR** | **Next.js 15 (App Router)** + **React 19** | Renderização híbrida, componentização reativa e rotas de API serverless. |
| **Linguagem** | **TypeScript 5 (Strict Mode)** | Tipagem estática ponta a ponta, contratos de dados e prevenção de erros em tempo de compilação. |
| **Estilização & UI** | **Tailwind CSS 3.4** + **Lucide Icons** | Design System responsivo, badges semânticos de urgência e acessibilidade visual. |
| **Inteligência Artificial (Multi-LLM)** | **Anthropic Claude** + **OpenAI** + **Google Gemini** + **Groq** | Arquitetura agnóstica (*Strategy Pattern*) permitindo trocar o provedor de IA nas Configurações. |
| **Persistência & Exportação** | **Web Storage API (`localStorage`) + CSV Blob** | Persistência local imediata de estado e geração de relatórios gerenciais em UTF-8 BOM. |

---

## Fluxo de Arquitetura e Validação de Dados

Para garantir que a interface nunca quebre caso o modelo de linguagem retorne formatações inesperadas (como blocos Markdown ao redor do JSON), o backend implementa um pipeline de sanitização e validação estrita antes de devolver a resposta ao cliente:

```mermaid
flowchart LR
    A["Mensagem do Cliente\n(Front-end Next.js)"] -->|POST /api/triagem| B["Route Handler\n(Serverless API)"]
    B --> C{"ANTHROPIC_API_KEY\nconfigurada?"}
    C -->|Sim| D["Anthropic Claude API\n(System Prompt Estrito)"]
    C -->|Não| E["Motor Fallback Determinístico\n(Zero-Config Demo Mode)"]
    D --> F["Sanitização & Validador JSON\n(lib/validation.ts)"]
    E --> F
    F -->|Contrato AnaliseIA Validado| G["Dashboard & Regra de\nEscalonamento Crítico"]
```

### Contrato JSON Validado (`AnaliseIA`)

```json
{
  "categoria": "Cobrança | Problema técnico | Dúvida | Cancelamento | Elogio | Outro",
  "urgencia": "Alta | Média | Baixa",
  "justificativaUrgencia": "Frase objetiva justificando o grau de prioridade atribuído.",
  "sentimento": "Positivo | Neutro | Negativo",
  "resumo": "Síntese executiva do problema em no máximo 15 palavras.",
  "respostaSugerida": "Texto completo, cordial e adaptado ao tom da empresa configurado."
}
```

---

## Funcionalidades Principais

- **Caixa de Entrada Multicanal**: Listagem com identificação do cliente, canal de origem, horário e resumo executivo gerado pela IA. Inclui adição manual de novos tickets e carregamento em lote de **15 cenários reais de suporte**.
- **Priorização Automática e Filtros Combinados**: Ordenação automática por peso de urgência (`Alta` → `Média` → `Baixa`), busca textual em tempo real e filtros combinados por **Categoria**, **Urgência** e **Status** (*Todos*, *Pendentes*, *Escalar Humano*, *Resolvidos*).
- **Regra de Escalonamento e Atribuição de Responsável (`Human-in-the-Loop`)**: Quando uma mensagem apresenta simultaneamente **`Urgência Alta`** e **`Sentimento Negativo`**, o sistema destaca um alerta visual imediato (**"! Definir o Responsável"**) permitindo atribuir o caso diretamente a um setor especialista (*Supervisor Financeiro*, *Engenharia Nível 2*, *Especialista de Retenção*, *Coordenação de Suporte*).
- **Editor de Resposta com Refinamento Rápido**: Campo editável com a sugestão da IA, botões de ajuste de 1 clique (*"Mais curta"*, *"Mais formal"*, *"+ Pedir CPF/Pedido"*), cópia rápida para a área de transferência e controle de tickets resolvidos.
- **Painel de Métricas e Exportação CSV**: Cálculo em tempo real do total de chamados, distribuição percentual (`%`) por urgência, gráficos de volume por categoria/sentimento, estimativa de **tempo economizado** (base de 4 min por atendimento manual) e exportação para planilha `.csv`.
- **Resiliência e Tratamento de Falhas**: Processamento assíncrono em lotes controlados (*batching*) com captura de erros de rede/API e opção de reprocessamento individual ou em massa (**"Tentar de novo"**).

---

## Decisões Técnicas de Destaque

1. **Arquitetura Multi-LLM com *Strategy Pattern* (`lib/llm-providers.ts`)**:
   - **Motivação**: Diferentes estabelecimentos possuem contratos ou preferências distintas de IA (Anthropic Claude, OpenAI ChatGPT, Google Gemini ou Groq Llama 3).
   - **Solução**: O roteador `executarChamadaLLM()` desacopla a regra de negócio do fornecedor de IA, adaptando o payload para a API selecionada na aba **Configurações** e submetendo qualquer retorno ao mesmo validador de contrato `validarAnaliseIA()`.
2. **Modo Demonstração *Zero-Config* (`lib/fallback.ts`)**:
   - **Motivação**: Em avaliações técnicas de portfólio, recrutadores frequentemente testam a aplicação publicada ou clonada sem possuir uma chave paga de API.
   - **Solução**: Quando nenhuma chave de API é detectada para o provedor ativo, a rota `/api/triagem` aciona automaticamente o motor determinístico contextual em português, garantindo **100% de testabilidade imediata**.
3. **Validação Defensiva de Saída de LLM e Idempotência (`lib/validation.ts`)**:
   - O módulo de validação verifica tipos, garante que `categoria`, `urgencia` e `sentimento` pertençam estritamente aos conjuntos permitidos e aplica truncamento seguro de até 15 palavras no campo `resumo`. O carregamento de exemplos possui trava síncrona atômica (`useRef` mutex) e deduplicação automática para evitar registros duplicados.

---

## Estrutura de Diretórios

```text
├── app/
│   ├── api/
│   │   └── triagem/
│   │       └── route.ts      # Endpoint POST: integração Anthropic SDK, fallback e validação
│   ├── globals.css           # Tokens visuais, componentes utilitários e tema Tailwind
│   ├── layout.tsx            # Metadados SEO e estrutura global da aplicação (pt-BR)
│   └── page.tsx              # Interface principal, gerenciamento de estado, filtros e métricas
├── lib/
│   ├── exemplos.ts           # Dataset com 15 mensagens realistas distribuídas por canal/categoria
│   ├── fallback.ts           # Motor de classificação determinística para modo demonstração sem API Key
│   ├── types.ts              # Interfaces e tipos TypeScript (MensagemCliente, AnaliseIA, etc.)
│   └── validation.ts         # Parser e validador de schema do JSON retornado pela IA
├── .env.example              # Modelo de variáveis de ambiente
├── next.config.ts            # Configurações do Next.js
├── tailwind.config.ts        # Configuração de paleta e extensões do Tailwind CSS
└── tsconfig.json             # Configuração estrita do compilador TypeScript
```

---

## Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** `v18.18+` ou `v20+`
- **npm** (ou `pnpm` / `yarn`)
- Chave da API da Anthropic (*opcional* para testes graças ao Modo Demonstração integrado)

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/ticiacruzcosta/triagem-inteligente.git
   cd triagem-inteligente
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente (Opcional):**
   ```bash
   cp .env.example .env.local
   ```
   Abra o arquivo `.env.local` e insira sua chave da Anthropic:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-sua-chave-aqui
   ```
   > *Nota: Caso não possua uma chave da Anthropic no momento, você pode rodar o projeto normalmente (ele utilizará o Modo Demonstração) ou inserir uma chave a qualquer instante clicando no botão **"Chave API"** no cabeçalho da aplicação.*

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse no navegador:**
   Abra [http://localhost:3000](http://localhost:3000).
