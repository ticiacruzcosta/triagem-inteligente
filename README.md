# Triagem Inteligente

Aplicação web desenvolvida com **Next.js**, **TypeScript**, **Tailwind CSS** e a **API da Anthropic (Claude)** para receber mensagens de clientes, classificar automaticamente cada atendimento e sugerir uma resposta personalizada para equipes de suporte.

## Funcionalidades

1. **Caixa de Entrada**:
   - Lista de mensagens de clientes contendo nome, canal (`WhatsApp`, `E-mail`, `Chat`, `Instagram`, `Telefone`), texto e horário.
   - Botão **"Adicionar mensagem"** para inserção manual e botão **"Carregar 15 exemplos"** com casos reais variados.
2. **Triagem Automática com IA (Claude)**:
   - Classificação em JSON estritamente validado antes da exibição:
     - `categoria`: *Cobrança, Problema técnico, Dúvida, Cancelamento, Elogio, Outro*
     - `urgencia`: *Alta, Média, Baixa* com justificativa de uma frase
     - `sentimento`: *Positivo, Neutro, Negativo*
     - `resumo`: resumo objetivo em até 15 palavras
     - `respostaSugerida`: resposta educada alinhada ao **tom da empresa** configurado
3. **Visualização e Filtros**:
   - Lista ordenada automaticamente por nível de urgência (`Alta` → `Média` → `Baixa`).
   - Selos coloridos semânticos (Vermelho para Alta, Amarelo para Média, Verde para Baixa).
   - Filtros combinados por **categoria** e **urgência**.
4. **Painel de Detalhe**:
   - Exibição do texto original, diagnóstico completo da IA e campo editável com a resposta sugerida.
   - Botões **"Copiar resposta"** e **"Marcar como resolvido"**.
5. **Regra de Escalonamento**:
   - Quando uma mensagem apresenta **Urgência Alta** E **Sentimento Negativo**, o sistema exibe automaticamente o alerta de destaque **"Escalar para humano"**.
6. **Métricas no Topo**:
   - Total de mensagens, distribuição percentual (`%`) por urgência e tempo médio estimado economizado (considerando 4 minutos por resposta manual).
7. **Persistência e Resiliência**:
   - Armazenamento automático em `localStorage`.
   - Tratamento de erros da API com botão **"Tentar de novo"** individual ou em lote.

---

## Pré-requisitos

- **Node.js** 18.18+ instalado
- Uma chave de API da Anthropic (`ANTHROPIC_API_KEY`) obtida no [Console da Anthropic](https://console.anthropic.com/)

---

## Como rodar o projeto

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Configure a variável de ambiente**:
   Crie um arquivo `.env.local` na raiz do projeto (você pode copiar o `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
   Edite o arquivo `.env.local` e insira sua chave da Anthropic:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-sua-chave-real-aqui
   ```
   > **Dica**: Você também pode informar ou alterar a chave diretamente na interface clicando no botão **"Chave API"** no cabeçalho superior.

3. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Acesse no navegador**:
   Abra [http://localhost:3000](http://localhost:3000).
