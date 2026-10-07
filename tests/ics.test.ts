import { describe, expect, it } from "vitest";
import { spDe } from "@/lib/fuso";
import { dobrar, escapar, serializarCalendario, serializarOcorrencia } from "@/lib/ics";
import { expandir } from "@/lib/recorrencia";
import type { EventoRow } from "@/lib/supabase/tipos";

function linha(p: Partial<EventoRow> & Pick<EventoRow, "id" | "start_at" | "end_at">): EventoRow {
  return {
    title: "Reunião geral",
    category: "reuniao",
    all_day: false,
    location: "",
    link: "",
    description: "",
    freq: null,
    until: null,
    series_id: null,
    original_start: null,
    cancelled: false,
    created_by: null,
    updated_by: null,
    created_at: "2026-08-01T12:00:00+00:00",
    updated_at: "2026-08-01T12:00:00+00:00",
    ...p,
  };
}

const semanal = linha({
  id: "11111111-1111-1111-1111-111111111111",
  start_at: spDe(2026, 9, 1, 19).toISOString(),
  end_at: spDe(2026, 9, 1, 20, 30).toISOString(),
  freq: "semanal",
  until: "2026-12-15",
  location: "Sala 404, Insper",
  description: "Pauta:\n- orçamento; patrocínio",
});
const cancelada = linha({
  id: "22222222-2222-2222-2222-222222222222",
  series_id: semanal.id,
  original_start: spDe(2026, 10, 13, 19).toISOString(),
  start_at: spDe(2026, 10, 13, 19).toISOString(),
  end_at: spDe(2026, 10, 13, 20, 30).toISOString(),
  cancelled: true,
});
const movida = linha({
  id: "33333333-3333-3333-3333-333333333333",
  series_id: semanal.id,
  original_start: spDe(2026, 10, 20, 19).toISOString(),
  start_at: spDe(2026, 10, 21, 19).toISOString(),
  end_at: spDe(2026, 10, 21, 20).toISOString(),
});
const agora = new Date("2026-10-07T12:00:00Z");

describe("ics", () => {
  it("escapa vírgula, ponto e vírgula, barra e quebra de linha", () => {
    expect(escapar("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("dobra linhas longas em no máximo 75 octetos", () => {
    const longa = `DESCRIPTION:${"ação ".repeat(40)}`;
    const dobrada = dobrar(longa);
    const linhas = dobrada.split("\r\n");
    expect(linhas.length).toBeGreaterThan(1);
    for (const l of linhas) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    for (const l of linhas.slice(1)) expect(l.startsWith(" ")).toBe(true);
    expect(dobrada.replace(/\r\n /g, "")).toBe(longa);
  });

  it("série: RRULE com UNTIL em UTC, EXDATE da cancelada e RECURRENCE-ID da movida com o mesmo UID", () => {
    const ics = serializarCalendario([semanal, cancelada, movida], "Teste", agora);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20260901T190000");
    expect(ics).toContain("DTEND;TZID=America/Sao_Paulo:20260901T203000");
    // 15/12 23:59:59 em SP = 16/12 02:59:59Z
    expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261216T025959Z");
    expect(ics).toContain("EXDATE;TZID=America/Sao_Paulo:20261013T190000");
    expect(ics).toContain("RECURRENCE-ID;TZID=America/Sao_Paulo:20261020T190000");
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20261021T190000");
    expect(ics.match(new RegExp(`UID:${semanal.id}@`, "g"))).toHaveLength(2);
    expect(ics).toContain("LOCATION:Sala 404\\, Insper");
    expect(ics).toContain("DESCRIPTION:Pauta:\\n- orçamento\\; patrocínio");
    expect(ics).toContain("CATEGORIES:Reuniões");
    // nenhuma linha passa de 75 octetos
    for (const l of ics.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it("dia inteiro usa VALUE=DATE e UNTIL em data", () => {
    const d = linha({ id: "44444444-4444-4444-4444-444444444444", all_day: true, start_at: spDe(2026, 10, 12).toISOString(), end_at: spDe(2026, 10, 13).toISOString(), freq: "mensal", until: "2027-03-12" });
    const ics = serializarCalendario([d], "Teste", agora);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261012");
    expect(ics).toContain("DTEND;VALUE=DATE:20261013");
    expect(ics).toContain("RRULE:FREQ=MONTHLY;BYMONTHDAY=12;UNTIL=20270312");
  });

  it("uma ocorrência gerada vira um VEVENT solto, sem RRULE", () => {
    const occ = expandir([semanal], spDe(2026, 10, 6), spDe(2026, 10, 7))[0];
    const ics = serializarOcorrencia(occ, agora);
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20261006T190000");
    expect(ics).not.toContain("RRULE");
    expect(ics).toContain(`UID:${semanal.id}_${occ.inicio.getTime()}@`);
  });
});
