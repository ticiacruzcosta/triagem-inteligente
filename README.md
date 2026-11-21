# Triagem Inteligente — Central de Suporte com IA (Claude / Anthropic)

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Anthropic Claude](https://img.shields.io/badge/Anthropic_Claude-D97757?style=for-the-badge&logo=anthropic&logoColor=white)

Aplicação web full-stack desenvolvida com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** e a **API da Anthropic (Claude)** para automatizar a triagem de atendimento ao cliente. O sistema classifica cada mensagem recebida, identifica sentimento e nível de urgência, aciona regras críticas de escalonamento humano e sugere respostas personalizadas alinhadas ao tom de voz da empresa.

---

## Destaques para Avaliadores e Recrutadores (Zero-Config Demo)

> **Teste imediatamente sem precisar de chave paga da API!**
> Caso você clone este repositório e não configure uma `ANTHROPIC_API_KEY` no `.env.local`, o backend ativa automaticamente o **Modo Demonstração Inteligente (`lib/fallback.ts`)**, que analisa o conteúdo em português das mensagens, classifica urgência, sentimento e gera respostas contextualizadas passando pelo mesmo validador estrito de schema JSON (`lib/validation.ts`).
> Se uma chave `ANTHROPIC_API_KEY` válida for informada (via `.env.local` ou pelo botão **"Chave API"** na interface), o sistema utiliza diretamente o modelo `claude-sonnet-4-20250514`.

---

## Funcionalidades Implementadas

1. **Caixa de Entrada Multicanal**:
   - Recebimento e listagem de mensagens com nome do cliente, canal (`WhatsApp`, `E-mail`, `Chat`, `Instagram`, `Telefone`), texto original e horário.
   - Botão **"Adicionar mensagem"** (modal com formulário validado) e botão **"Carregar 15 exemplos"** com processamento em lotes assíncronos.
2. **Triagem Automática Estruturada (JSON Schema Validation)**:
   - O prompt do sistema instrui o Claude a responder **exclusivamente em JSON válido**, que é sanitizado e validado no servidor (`lib/validation.ts`) antes de chegar ao front-end:
     - `categoria`: `Cobrança` | `Problema técnico` | `Dúvida` | `Cancelamento` | `Elogio` | `Outro`
     - `urgencia`: `Alta` | `Média` | `Baixa` + `justificativaUrgencia` em uma frase
     - `sentimento`: `Positivo` | `Neutro` | `Negativo`
     - `resumo`: síntese objetiva limitada a até 15 palavras
     - `respostaSugerida`: resposta cordial adaptada ao **Tom da Empresa** configurado pelo usuário
3. **Priorização Visual, Busca e Filtros Combinados**:
   - Ordenação automática por peso de urgência (`Alta` → `Média` → `Baixa`).
   - Badges semânticos coloridos (**Vermelho** = Alta, **Amarelo** = Média, **Verde** = Baixa).
   - Busca textual em tempo real por cliente ou palavra-chave + filtros por **Categoria**, **Urgência** e **Status** (*Todos*, *Pendentes*, *Escalar Humano*, *Resolvidos*).
4. **Painel de Detalhe e Refinamento Rápido de Resposta**:
   - Visualização da mensagem original, diagnóstico completo da IA e campo editável para a resposta sugerida.
   - Botões de ajuste rápido de 1 clique (*"Mais curta"*, *"Mais formal"*, *"+ Pedir CPF/Pedido"*).
   - Ações **"Copiar resposta"** (com feedback visual) e **"Marcar como resolvido"**.
5. **Regra de Negócio de Escalonamento Crítico**:
   - Sempre que um atendimento apresenta **`Urgência Alta` + `Sentimento Negativo`**, o sistema exibe automaticamente um banner de alerta crítico: **"Escalar para humano"**.
6. **Dashboard de Métricas e Exportação CSV**:
   - Indicadores em tempo real no topo: Total de mensagens, distribuição percentual (`%`) por urgência e **tempo médio estimado economizado** (base de 4 minutos por resposta manual).
   - Painel analítico expansível com volume por categoria e termômetro de sentimento.
   - Exportação com 1 clique para planilha **CSV (UTF-8 com BOM)** pronta para Excel.

---

## Arquitetura do Projeto

```text
├── app/
│   ├── api/
│   │   └── triagem/
│   │       └── route.ts      # Route Handler (POST) integrando SDK da Anthropic + Fallback Demo
│   ├── globals.css           # Design System institucional e utilitários Tailwind
│   ├── layout.tsx            # Layout raiz em pt-BR
│   └── page.tsx              # Dashboard interativo, filtros, métricas e gerenciamento de estado
├── lib/
│   ├── exemplos.ts           # 15 casos reais variados para teste em lote
│   ├── fallback.ts           # Motor heurístico para Modo Demonstração sem API Key
│   ├── types.ts              # Contratos e interfaces TypeScript estritos
│   └── validation.ts         # Validação e sanitização do JSON retornado pela IA
├── .env.example              # Exemplo de configuração de variáveis de ambiente
└── README.md                 # Documentação do projeto
```

---

## Como Executar Localmente

### Pré-requisitos
- **Node.js** 18.18 ou superior
- Chave da API da Anthropic (*opcional* — o sistema possui Modo Demonstração automático)

### Passo a passo

1. **Clone o repositório e instale as dependências**:
   ```bash
   git clone https://github.com/ticiacruzcosta/triagem-inteligente.git
   cd triagem-inteligente
   npm install
   ```

2. **Configure a variável de ambiente (Opcional)**:
   ```bash
   cp .env.example .env.local
   ```
   Abra o arquivo `.env.local` e adicione sua chave da Anthropic:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-sua-chave-aqui
   ```
   *(Se preferir testar sem chave, basta pular esta etapa ou inserir a chave depois diretamente pelo botão **"Chave API"** na interface).*

3. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Acesse no navegador**:
   Abra [http://localhost:3000](http://localhost:3000) e clique em **"Carregar 15 exemplos"**.
