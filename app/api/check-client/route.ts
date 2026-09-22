import { NextRequest, NextResponse } from "next/server";
import { findClient, getAllClientNames, getDemandTypes } from "@/lib/clients";
import { resolveClientName } from "@/lib/groq";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const companyName =
    typeof body === "object" && body !== null && "companyName" in body
      ? String((body as Record<string, unknown>).companyName ?? "")
      : "";

  if (!companyName.trim()) {
    return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
  }

  let client = findClient(companyName);

  if (!client) {
    const knownNames = getAllClientNames();
    let resolvedName: string | null = null;
    try {
      resolvedName = await resolveClientName(companyName, knownNames);
    } catch (error) {
      console.error("Erro ao resolver nome da empresa via Groq:", error);
    }

    if (resolvedName) {
      client = findClient(resolvedName);
    }
  }

  if (!client) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    companyName: client.name,
    demandTypes: getDemandTypes(client.config),
  });
}
