import { NextRequest, NextResponse } from "next/server";
import { findClient } from "@/lib/clients";
import { extractTicketWithGroq } from "@/lib/groq";
import { createCardWithChecklist } from "@/lib/trello";

interface SubmitTicketBody {
  companyName?: string;
  demandType?: string;
  titulo?: string;
  descricao?: string;
  prazo?: string;
  prioridade?: string;
}

export async function POST(request: NextRequest) {
  let body: SubmitTicketBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { companyName, demandType, titulo, descricao, prazo, prioridade } = body;

  if (!companyName?.trim() || !demandType?.trim() || !titulo?.trim() || !descricao?.trim()) {
    return NextResponse.json(
      { error: "Preencha todos os campos obrigatórios." },
      { status: 400 },
    );
  }

  const client = findClient(companyName);
  if (!client) {
    return NextResponse.json({ error: "Empresa não localizada." }, { status: 404 });
  }

  const idList = client.config.lists[demandType];
  if (!idList) {
    return NextResponse.json(
      { error: "Tipo de demanda inválido para esta empresa." },
      { status: 400 },
    );
  }

  try {
    const extracted = await extractTicketWithGroq({
      titulo,
      descricao,
      prazo: prazo || null,
      prioridade: prioridade || null,
    });

    const dueDateSource = prazo || extracted.data_entrega;
    const due = dueDateSource ? new Date(`${dueDateSource}T12:00:00`).toISOString() : null;

    const card = await createCardWithChecklist({
      idList,
      name: extracted.titulo,
      desc: extracted.descricao,
      due,
      checklist: extracted.checklist,
    });

    return NextResponse.json({ success: true, cardId: card.cardId });
  } catch (error) {
    console.error("Erro ao processar ticket:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar a solicitação. Tente novamente mais tarde." },
      { status: 502 },
    );
  }
}
