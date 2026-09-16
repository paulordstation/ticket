const TRELLO_API_URL = "https://api.trello.com/1";

function getAuth(): { key: string; token: string } {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) {
    throw new Error("TRELLO_API_KEY / TRELLO_TOKEN não configurados.");
  }
  return { key, token };
}

async function trelloPost<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const { key, token } = getAuth();
  const url = new URL(`${TRELLO_API_URL}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(name, value);
    }
  }

  const response = await fetch(url.toString(), { method: "POST" });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na API do Trello (${response.status}) em ${path}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

interface TrelloCard {
  id: string;
}

interface TrelloChecklist {
  id: string;
}

export interface CreateCardWithChecklistInput {
  idList: string;
  name: string;
  desc: string;
  due: string | null;
  checklist: string[];
  pos?: string;
}

export async function createCardWithChecklist(
  input: CreateCardWithChecklistInput,
): Promise<{ cardId: string }> {
  const card = await trelloPost<TrelloCard>("/cards", {
    idList: input.idList,
    name: input.name,
    desc: input.desc,
    due: input.due ?? undefined,
    pos: input.pos ?? "top",
  });

  if (input.checklist.length > 0) {
    const checklist = await trelloPost<TrelloChecklist>("/checklists", {
      idCard: card.id,
      name: "Checklist",
    });

    for (const item of input.checklist) {
      await trelloPost(`/checklists/${checklist.id}/checkItems`, { name: item });
    }
  }

  return { cardId: card.id };
}
