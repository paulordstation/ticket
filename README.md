# Central de Tickets — Flecha Consultoria

Aplicação web (Next.js) sem login: o cliente informa o nome da empresa, preenche um formulário de demanda, e a solicitação é interpretada pela API do Groq e registrada como card no Trello.

Ver [STACK.md](./STACK.md) para o desenho completo do projeto.

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.local.example` para `.env.local` e preencha as chaves:

   ```
   GROQ_API_KEY=
   TRELLO_API_KEY=
   TRELLO_TOKEN=
   ```

3. Popule `config/clients.json` com os clientes reais (veja `config/clients.example.json` para o formato esperado):

   ```json
   {
     "Nome da Empresa": {
       "boardId": "ID_DO_BOARD_NO_TRELLO",
       "lists": {
         "Acessos": "ID_DA_LISTA",
         "RD Marketing": "ID_DA_LISTA"
       }
     }
   }
   ```

   As chaves de `lists` viram as opções de "tipo de demanda" no formulário e determinam em qual lista do Trello o card é criado.

4. Rode o projeto localmente:

   ```bash
   npm run dev
   ```

## Estrutura

```
/app
  /page.tsx                     → fluxo em duas etapas (empresa → demanda)
  /api/check-client/route.ts    → valida a empresa contra config/clients.json
  /api/submit-ticket/route.ts   → orquestra Groq + Trello
/config
  /clients.json                 → mapeamento empresa → board/lista (editar manualmente)
/lib
  /clients.ts                   → busca de cliente (case-insensitive)
  /groq.ts                      → chamada à API do Groq (chat completions)
  /trello.ts                    → criação de card + checklist no Trello
```

## Deploy

Deploy recomendado: **Vercel**. Configure as três variáveis de ambiente do passo 2 nas configurações do projeto na Vercel.
