# App de Tickets → Trello (via Claude API)

## Visão geral

Aplicação web simples, sem login. O cliente acessa a página, informa o **nome da empresa**, o sistema localiza o board correto do Trello, e o cliente preenche um formulário de demanda. O conteúdo é interpretado pela API do Claude e vira um card no Trello, na lista e posição corretas.

Deploy: **Vercel**.

## Fluxo end-to-end

1. Cliente acessa a página e digita o nome da empresa
2. Sistema procura a empresa no arquivo de mapeamento (`config/clients.json`)
   - Encontrou → libera o formulário de demanda
   - Não encontrou → mostra mensagem de erro ("empresa não localizada, entre em contato")
3. Cliente preenche o formulário de demanda (ver campos sugeridos abaixo)
4. Frontend envia os dados para uma API route
5. A API route chama a **API do Claude**, pedindo que o conteúdo seja transformado em JSON estruturado: título, descrição, checklist (lista de itens) e data de entrega
6. A API route valida o JSON retornado
7. A API route chama a **API REST do Trello** diretamente (sem MCP/agente):
   - `POST /1/cards` → cria o card no board/lista certos, com `pos` (ex: `top`)
   - `POST /1/checklists` + `POST /1/checklists/{id}/checkItems` → cria a checklist e os itens
8. Cliente recebe confirmação na tela ("Solicitação registrada com sucesso")

## Stack técnica

- **Framework**: Next.js (App Router), com API Routes/Route Handlers fazendo o papel de backend serverless — um único projeto, ideal para deploy na Vercel sem custo extra de infraestrutura
- **Frontend**: React (dentro do próprio Next.js), estilização simples (Tailwind opcional)
- **Sem banco de dados**: o mapeamento cliente → board/lista fica em um arquivo JSON versionado no repositório (`config/clients.json`), editado manualmente quando entra um cliente novo
- **Sem autenticação**: o nome da empresa é a única chave de busca

### Variáveis de ambiente (configuradas na Vercel)

```
ANTHROPIC_API_KEY=
TRELLO_API_KEY=
TRELLO_TOKEN=
```

## Mapeamento cliente → board/lista

Arquivo `config/clients.json`, seguindo as convenções do Board Modelo (board = cliente, lista = etapa):

```json
{
  "Nome da Empresa": {
    "boardId": "ID_DO_BOARD_NO_TRELLO",
    "lists": {
      "Acessos": "ID_DA_LISTA",
      "RD Marketing": "ID_DA_LISTA",
      "Estratégia": "ID_DA_LISTA",
      "Relatoria": "ID_DA_LISTA",
      "Finalizado": "ID_DA_LISTA"
    }
  }
}
```

A busca pelo nome da empresa deve ser case-insensitive e tolerar pequenas variações (trim de espaços, etc.).

## Formulário de demanda (campos sugeridos — ajustar conforme necessário)

- Nome da empresa (já preenchido, vindo da etapa anterior)
- Tipo de demanda (select — mapeia para a lista do Trello, ex: "RD Marketing", "Estratégia")
- Título/resumo da solicitação
- Descrição detalhada (texto livre — é o que o Claude vai interpretar)
- Prazo desejado (data, opcional)
- Prioridade (opcional: baixa/média/alta)

## Chamada à API do Claude

- Endpoint: `https://api.anthropic.com/v1/messages`
- Modelo sugerido: `claude-haiku-4-5-20251001` (tarefa de extração estruturada simples — mais barato e rápido; migrar para um modelo maior só se a qualidade da interpretação não for suficiente)
- Prompt de sistema deve pedir **apenas JSON**, sem texto adicional, no formato:

```json
{
  "titulo": "string",
  "descricao": "string",
  "checklist": ["item 1", "item 2"],
  "data_entrega": "YYYY-MM-DD ou null"
}
```

- A chave da API fica **somente no backend** (variável de ambiente), nunca exposta no frontend

## Chamadas à API do Trello

- `POST https://api.trello.com/1/cards`
  - Parâmetros: `idList`, `name`, `desc`, `due`, `pos`, `key`, `token`
- `POST https://api.trello.com/1/checklists`
  - Parâmetros: `idCard`, `name`, `key`, `token`
- `POST https://api.trello.com/1/checklists/{id}/checkItems`
  - Parâmetros: `name` (um por item da checklist), `key`, `token`
- Rate limits: 300 req/10s por key, 100 req/10s por token — irrelevante para esse volume

## Estrutura de pastas sugerida

```
/app
  /page.tsx                  → formulário (empresa → demanda)
  /api
    /submit-ticket/route.ts  → orquestra Claude + Trello
/config
  /clients.json               → mapeamento empresa → board/lista
/lib
  /claude.ts                  → chamada à API do Claude
  /trello.ts                  → chamadas à API do Trello
.env.local
```

## Passos sugeridos para o Claude Code

1. Inicializar projeto Next.js (App Router, TypeScript)
2. Criar página com etapa 1 (nome da empresa → valida contra `clients.json`) e etapa 2 (formulário de demanda)
3. Criar `app/api/submit-ticket/route.ts`
4. Implementar `lib/claude.ts` (chamada à Messages API, parse do JSON)
5. Implementar `lib/trello.ts` (criar card, criar checklist, adicionar itens)
6. Popular `config/clients.json` com os primeiros clientes/boards reais
7. Testar o fluxo completo localmente
8. Configurar variáveis de ambiente na Vercel e fazer o deploy
