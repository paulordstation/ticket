import { NextRequest, NextResponse } from "next/server";
import { findClient, getDemandTypes } from "@/lib/clients";

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

  const client = findClient(companyName);
  if (!client) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    companyName: client.name,
    demandTypes: getDemandTypes(client.config),
  });
}
