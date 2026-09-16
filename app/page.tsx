"use client";

import { useState, type FormEvent } from "react";

type Step = "company" | "form" | "success";

interface DemandFormState {
  demandType: string;
  titulo: string;
  descricao: string;
  prazo: string;
  prioridade: string;
}

const EMPTY_FORM: DemandFormState = {
  demandType: "",
  titulo: "",
  descricao: "",
  prazo: "",
  prioridade: "",
};

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

const labelClass = "mb-1.5 block text-sm font-medium text-muted";

const primaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-foreground";

export default function HomePage() {
  const [step, setStep] = useState<Step>("company");

  const [companyInput, setCompanyInput] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [demandTypes, setDemandTypes] = useState<string[]>([]);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const [form, setForm] = useState<DemandFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  async function handleCompanySubmit(event: FormEvent) {
    event.preventDefault();
    setCompanyError(null);

    if (!companyInput.trim()) {
      setCompanyError("Informe o nome da empresa.");
      return;
    }

    setCompanyLoading(true);
    try {
      const response = await fetch("/api/check-client", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName: companyInput }),
      });
      const data = await response.json();

      if (!response.ok) {
        setCompanyError(data.error ?? "Não foi possível verificar a empresa.");
        return;
      }

      if (!data.found) {
        setCompanyError("Empresa não localizada, entre em contato com a Flecha Consultoria.");
        return;
      }

      setCompanyName(data.companyName as string);
      setDemandTypes(data.demandTypes as string[]);
      setForm({ ...EMPTY_FORM, demandType: (data.demandTypes as string[])[0] ?? "" });
      setStep("form");
    } catch {
      setCompanyError("Erro de conexão. Tente novamente.");
    } finally {
      setCompanyLoading(false);
    }
  }

  async function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.demandType || !form.titulo.trim() || !form.descricao.trim()) {
      setFormError("Preencha os campos obrigatórios.");
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch("/api/submit-ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName,
          demandType: form.demandType,
          titulo: form.titulo,
          descricao: form.descricao,
          prazo: form.prazo || undefined,
          prioridade: form.prioridade || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error ?? "Não foi possível registrar a solicitação.");
        return;
      }

      setStep("success");
    } catch {
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setFormLoading(false);
    }
  }

  function handleNewTicket() {
    setForm({ ...EMPTY_FORM, demandType: demandTypes[0] ?? "" });
    setFormError(null);
    setStep("form");
  }

  function handleChangeCompany() {
    setCompanyInput("");
    setCompanyName("");
    setDemandTypes([]);
    setCompanyError(null);
    setForm(EMPTY_FORM);
    setStep("company");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <BrandHeader />

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40 sm:p-8">
          {step === "company" && (
            <CompanyStep
              value={companyInput}
              onChange={setCompanyInput}
              onSubmit={handleCompanySubmit}
              error={companyError}
              loading={companyLoading}
            />
          )}

          {step === "form" && (
            <TicketFormStep
              companyName={companyName}
              demandTypes={demandTypes}
              form={form}
              onChange={setForm}
              onSubmit={handleFormSubmit}
              onBack={handleChangeCompany}
              error={formError}
              loading={formLoading}
            />
          )}

          {step === "success" && (
            <SuccessStep onNewTicket={handleNewTicket} onChangeCompany={handleChangeCompany} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Flecha Consultoria &middot; Central de Tickets
        </p>
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
        <ArrowIcon />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
        Flecha <span className="text-accent">Consultoria</span>
      </h1>
      <p className="mt-1 text-sm text-muted">Abra uma solicitação de demanda</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="9 5 19 5 19 15" />
    </svg>
  );
}

interface CompanyStepProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  error: string | null;
  loading: boolean;
}

function CompanyStep({ value, onChange, onSubmit, error, loading }: CompanyStepProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="companyName" className={labelClass}>
          Nome da empresa
        </label>
        <input
          id="companyName"
          type="text"
          className={inputClass}
          placeholder="Digite o nome da sua empresa"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button type="submit" className={primaryButtonClass} disabled={loading}>
        {loading ? "Verificando..." : "Continuar"}
      </button>
    </form>
  );
}

interface TicketFormStepProps {
  companyName: string;
  demandTypes: string[];
  form: DemandFormState;
  onChange: (form: DemandFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
  error: string | null;
  loading: boolean;
}

function TicketFormStep({
  companyName,
  demandTypes,
  form,
  onChange,
  onSubmit,
  onBack,
  error,
  loading,
}: TicketFormStepProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <span className={labelClass}>Empresa</span>
        <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-foreground">
          {companyName}
        </div>
      </div>

      <div>
        <label htmlFor="demandType" className={labelClass}>
          Tipo de demanda
        </label>
        <select
          id="demandType"
          className={inputClass}
          value={form.demandType}
          onChange={(event) => onChange({ ...form, demandType: event.target.value })}
        >
          {demandTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="titulo" className={labelClass}>
          Título/resumo da solicitação
        </label>
        <input
          id="titulo"
          type="text"
          className={inputClass}
          placeholder="Ex: Atualizar campanha de tráfego pago"
          value={form.titulo}
          onChange={(event) => onChange({ ...form, titulo: event.target.value })}
        />
      </div>

      <div>
        <label htmlFor="descricao" className={labelClass}>
          Descrição detalhada
        </label>
        <textarea
          id="descricao"
          className={`${inputClass} min-h-32 resize-y`}
          placeholder="Descreva a solicitação com o máximo de detalhes possível"
          value={form.descricao}
          onChange={(event) => onChange({ ...form, descricao: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prazo" className={labelClass}>
            Prazo desejado
          </label>
          <input
            id="prazo"
            type="date"
            className={inputClass}
            value={form.prazo}
            onChange={(event) => onChange({ ...form, prazo: event.target.value })}
          />
        </div>

        <div>
          <label htmlFor="prioridade" className={labelClass}>
            Prioridade
          </label>
          <select
            id="prioridade"
            className={inputClass}
            value={form.prioridade}
            onChange={(event) => onChange({ ...form, prioridade: event.target.value })}
          >
            <option value="">Não informar</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="mt-2 flex flex-col gap-3">
        <button type="submit" className={primaryButtonClass} disabled={loading}>
          {loading ? "Enviando..." : "Enviar solicitação"}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onBack} disabled={loading}>
          Voltar
        </button>
      </div>
    </form>
  );
}

interface SuccessStepProps {
  onNewTicket: () => void;
  onChangeCompany: () => void;
}

function SuccessStep({ onNewTicket, onChangeCompany }: SuccessStepProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">Solicitação registrada com sucesso</h2>
      <p className="text-sm text-muted">
        Sua demanda foi enviada para a equipe da Flecha Consultoria e já está no quadro de trabalho.
      </p>
      <div className="mt-2 flex w-full flex-col gap-3">
        <button type="button" className={primaryButtonClass} onClick={onNewTicket}>
          Abrir nova solicitação
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onChangeCompany}>
          Trocar empresa
        </button>
      </div>
    </div>
  );
}
