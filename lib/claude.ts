const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `Você organiza solicitações de clientes de uma consultoria em cards de Trello.
A partir do título, descrição, prazo e prioridade informados, produza um card claro e acionável para a equipe.
Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"titulo": "string", "descricao": "string", "checklist": ["item 1", "item 2"], "data_entrega": "YYYY-MM-DD ou null"}

Regras:
- "titulo": resuma a solicitação em poucas palavras, objetivo.
- "descricao": reescreva a descrição de forma clara e organizada, preservando todas as informações relevantes.
- "checklist": quebre a solicitação em passos/itens acionáveis para quem for executar (pode ser uma lista vazia se não fizer sentido).
- "data_entrega": use o prazo informado pelo cliente se houver; caso contrário, tente inferir da descrição; se não houver nenhuma indicação, use null.`;

export interface TicketExtraction {
  titulo: string;
  descricao: string;
  checklist: string[];
  data_entrega: string | null;
}

export interface RawTicketInput {
  titulo: string;
  descricao: string;
  prazo?: string | null;
  prioridade?: string | null;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Não foi possível interpretar o JSON retornado pelo Claude.");
    }
    return JSON.parse(match[0]);
  }
}

function isTicketExtraction(value: unknown): value is TicketExtraction {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.titulo === "string" &&
    typeof candidate.descricao === "string" &&
    Array.isArray(candidate.checklist) &&
    candidate.checklist.every((item) => typeof item === "string") &&
    (candidate.data_entrega === null || typeof candidate.data_entrega === "string")
  );
}

export async function extractTicketWithClaude(input: RawTicketInput): Promise<TicketExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  const userContent = [
    `Título/resumo informado: ${input.titulo}`,
    `Descrição detalhada: ${input.descricao}`,
    `Prazo desejado informado pelo cliente: ${input.prazo ?? "não informado"}`,
    `Prioridade: ${input.prioridade ?? "não informada"}`,
  ].join("\n");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na API do Claude (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content?.find((block) => block.type === "text" && block.text);
  if (!textBlock?.text) {
    throw new Error("Resposta da API do Claude sem conteúdo de texto.");
  }

  const parsed = extractJson(textBlock.text);
  if (!isTicketExtraction(parsed)) {
    throw new Error("JSON retornado pelo Claude está incompleto ou em formato inválido.");
  }

  return parsed;
}
