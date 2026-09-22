const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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

interface GroqChoice {
  message?: { content?: string };
}

interface GroqResponse {
  choices: GroqChoice[];
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

export async function extractTicketWithGroq(input: RawTicketInput): Promise<TicketExtraction> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  const userContent = [
    `Título/resumo informado: ${input.titulo}`,
    `Descrição detalhada: ${input.descricao}`,
    `Prazo desejado informado pelo cliente: ${input.prazo ?? "não informado"}`,
    `Prioridade: ${input.prioridade ?? "não informada"}`,
  ].join("\n");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na API do Groq (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as GroqResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Resposta da API do Groq sem conteúdo.");
  }

  const parsed = JSON.parse(content);
  if (!isTicketExtraction(parsed)) {
    throw new Error("JSON retornado pelo Groq está incompleto ou em formato inválido.");
  }

  return parsed;
}
