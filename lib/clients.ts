import clientsData from "@/config/clients.json";

export interface ClientBoardConfig {
  boardId: string;
  lists: Record<string, string>;
}

type ClientsMap = Record<string, ClientBoardConfig>;

const clientsMap = clientsData as ClientsMap;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface FoundClient {
  name: string;
  config: ClientBoardConfig;
}

export function findClient(companyName: string): FoundClient | null {
  const target = normalize(companyName);
  if (!target) return null;

  for (const [name, config] of Object.entries(clientsMap)) {
    if (normalize(name) === target) {
      return { name, config };
    }
  }

  return null;
}

export function getDemandTypes(config: ClientBoardConfig): string[] {
  return Object.keys(config.lists);
}
