import Anthropic from "@anthropic-ai/sdk";
import { ProvedorIA } from "./types";

export interface OpcoesChamadaLLM {
  provedor: ProvedorIA;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}

export const INFO_PROVEDORES: Record<
  ProvedorIA,
  {
    nome: string;
    modelo: string;
    placeholderKey: string;
    envVar: string;
  }
> = {
  anthropic: {
    nome: "Anthropic (Claude Sonnet 4)",
    modelo: "claude-sonnet-4-20250514",
    placeholderKey: "sk-ant-api03-... (vazio = Modo Demonstração)",
    envVar: "ANTHROPIC_API_KEY",
  },
  openai: {
    nome: "OpenAI (GPT-4o Mini)",
    modelo: "gpt-4o-mini",
    placeholderKey: "sk-proj-... (vazio = Modo Demonstração)",
    envVar: "OPENAI_API_KEY",
  },
  gemini: {
    nome: "Google (Gemini 2.5 Flash)",
    modelo: "gemini-2.5-flash",
    placeholderKey: "AIzaSy... (vazio = Modo Demonstração)",
    envVar: "GEMINI_API_KEY",
  },
  groq: {
    nome: "Groq (Llama 3.3 70B)",
    modelo: "llama-3.3-70b-versatile",
    placeholderKey: "gsk_... (vazio = Modo Demonstração)",
    envVar: "GROQ_API_KEY",
  },
};

/**
 * Strategy / Adapter Pattern para execução agnóstica de LLM.
 * Recebe o provedor escolhido pelo estabelecimento e retorna a string JSON bruta da IA.
 */
export async function executarChamadaLLM({
  provedor,
  apiKey,
  systemPrompt,
  userPrompt,
}: OpcoesChamadaLLM): Promise<string> {
  switch (provedor) {
    case "anthropic": {
      const anthropic = new Anthropic({ apiKey });
      const msg = await anthropic.messages.create({
        model: INFO_PROVEDORES.anthropic.modelo,
        max_tokens: 800,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const blocoTexto = msg.content.find((b) => b.type === "text");
      if (!blocoTexto || blocoTexto.type !== "text") {
        throw new Error("A API da Anthropic não retornou conteúdo textual.");
      }
      return blocoTexto.text;
    }

    case "openai": {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: INFO_PROVEDORES.openai.modelo,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      const dados = await resp.json();
      if (!resp.ok) {
        throw new Error(
          dados?.error?.message ||
            `Erro HTTP ${resp.status} ao comunicar com a API da OpenAI.`
        );
      }

      const texto = dados?.choices?.[0]?.message?.content;
      if (!texto) {
        throw new Error("A API da OpenAI retornou uma resposta vazia.");
      }
      return texto;
    }

    case "groq": {
      const resp = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: INFO_PROVEDORES.groq.modelo,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );

      const dados = await resp.json();
      if (!resp.ok) {
        throw new Error(
          dados?.error?.message ||
            `Erro HTTP ${resp.status} ao comunicar com a API da Groq.`
        );
      }

      const texto = dados?.choices?.[0]?.message?.content;
      if (!texto) {
        throw new Error("A API da Groq retornou uma resposta vazia.");
      }
      return texto;
    }

    case "gemini": {
      const modelo = INFO_PROVEDORES.gemini.modelo;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      const dados = await resp.json();
      if (!resp.ok) {
        throw new Error(
          dados?.error?.message ||
            `Erro HTTP ${resp.status} ao comunicar com a API do Google Gemini.`
        );
      }

      const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!texto) {
        throw new Error("A API do Google Gemini retornou uma resposta vazia.");
      }
      return texto;
    }

    default:
      throw new Error(`Provedor de IA não suportado: ${provedor}`);
  }
}
