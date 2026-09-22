"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inputClass } from "./ui";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const PANEL_WIDTH = 288;

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePicker({ id, value, onChange, placeholder = "Selecionar data" }: DatePickerProps) {
  const selected = useMemo(() => (value ? parseISODate(value) : null), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function updateCoords() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      let left = rect.left;
      if (left + PANEL_WIDTH > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - PANEL_WIDTH - 16);
      }
      setCoords({ top: rect.bottom + 8, left });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    updateCoords();
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const today = new Date();

  function goToMonth(offset: number) {
    setViewDate(new Date(year, month + offset, 1));
  }

  function selectDay(day: Date) {
    onChange(toISODate(day));
    setIsOpen(false);
  }

  function openPicker() {
    if (!isOpen) setViewDate(selected ?? new Date());
    setIsOpen(!isOpen);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={openPicker}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={selected ? "text-foreground" : "text-muted/70"}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <CalendarGlyph />
      </button>

      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: PANEL_WIDTH }}
            className="z-50 rounded-xl border border-border bg-surface-2 p-3 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-accent/15 hover:text-accent"
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-foreground">
                {MONTH_LABELS[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-accent/15 hover:text-accent"
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-xs font-semibold text-muted">
              {WEEKDAY_LABELS.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((day, di) => {
                    if (!day) return <span key={di} />;
                    const isSelected = selected !== null && isSameDay(day, selected);
                    const isToday = isSameDay(day, today);
                    return (
                      <button
                        key={di}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={[
                          "aspect-square rounded-md text-sm transition",
                          isSelected
                            ? "bg-accent font-semibold text-accent-foreground"
                            : isToday
                              ? "border border-accent/50 text-foreground hover:bg-accent/20"
                              : "text-foreground/90 hover:bg-accent/15",
                        ].join(" ")}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs font-medium text-muted transition hover:text-foreground"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toISODate(today));
                  setIsOpen(false);
                }}
                className="text-xs font-medium text-accent transition hover:text-accent-hover"
              >
                Hoje
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10h18" strokeLinecap="round" />
      <path d="M8 3v4M16 3v4" strokeLinecap="round" />
      <rect x="7" y="13.5" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
