const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

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

async function callGroqJson(systemPrompt: string, userContent: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

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
        { role: "system", content: systemPrompt },
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

  return JSON.parse(content);
}

export async function extractTicketWithGroq(input: RawTicketInput): Promise<TicketExtraction> {
  const userContent = [
    `Título/resumo informado: ${input.titulo}`,
    `Descrição detalhada: ${input.descricao}`,
    `Prazo desejado informado pelo cliente: ${input.prazo ?? "não informado"}`,
    `Prioridade: ${input.prioridade ?? "não informada"}`,
  ].join("\n");

  const parsed = await callGroqJson(SYSTEM_PROMPT, userContent);
  if (!isTicketExtraction(parsed)) {
    throw new Error("JSON retornado pelo Groq está incompleto ou em formato inválido.");
  }

  return parsed;
}

const CLIENT_MATCH_SYSTEM_PROMPT = `Você identifica a qual cliente de uma lista um texto digitado por um usuário se refere.
O usuário pode digitar o nome certo, com erros de digitação, sem acentos, abreviado, parcial ou mais completo que o nome oficial (ex: com "Ltda", razão social, etc).
Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"match": "Nome Exato Da Lista"}
ou, se não houver nenhuma correspondência razoável:
{"match": null}

Regras:
- "match" deve ser EXATAMENTE uma das strings da lista fornecida (cópia literal), ou null.
- Considere abreviações, erros de digitação, remoção de acentos, nomes parciais ou com palavras extras.
- Só retorne null se o texto claramente não corresponder a nenhum cliente da lista.`;

function isClientMatchResult(value: unknown): value is { match: string | null } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.match === null || typeof candidate.match === "string";
}

export async function resolveClientName(
  rawInput: string,
  knownNames: string[],
): Promise<string | null> {
  const userContent = [
    "Lista de clientes:",
    ...knownNames.map((name) => `- ${name}`),
    "",
    `Texto digitado pelo usuário: "${rawInput}"`,
  ].join("\n");

  const parsed = await callGroqJson(CLIENT_MATCH_SYSTEM_PROMPT, userContent);
  if (!isClientMatchResult(parsed) || parsed.match === null) {
    return null;
  }

  return knownNames.includes(parsed.match) ? parsed.match : null;
}
