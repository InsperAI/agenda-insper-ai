import { describe, expect, it } from "vitest";
import { spDe } from "@/lib/fuso";
import { convidadosDe, emJanela, idGoogle, planejarSerie, type Assinante } from "@/lib/googleEvento";
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
    publico: [],
    convidados: [],
    created_by: null,
    updated_by: null,
    created_at: "2026-08-01T12:00:00+00:00",
    updated_at: "2026-08-01T12:00:00+00:00",
    ...p,
  };
}

const SITE = "https://agenda.exemplo";
const M = "11111111-1111-1111-1111-111111111111";
const F1 = "22222222-2222-2222-2222-222222222222";
const F2 = "33333333-3333-3333-3333-333333333333";

const assinantes: Assinante[] = [
  { member_id: "d", email: "Diretora@Gmail.com", nivel: "diretoria" },
  { member_id: "m", email: "membro@gmail.com", nivel: "membro" },
  { member_id: "t", email: "trainee@gmail.com", nivel: "trainee" },
];

const semanal = linha({
  id: M,
  start_at: spDe(2026, 9, 1, 19).toISOString(),
  end_at: spDe(2026, 9, 1, 20, 30).toISOString(),
  freq: "semanal",
  until: "2026-12-15",
  publico: ["membro"],
  location: "Sala 404",
  link: "https://meet.google.com/abc",
  description: "Pauta",
});
const cancelada = linha({
  id: F1,
  series_id: M,
  original_start: spDe(2026, 9, 8, 19).toISOString(),
  start_at: spDe(2026, 9, 8, 19).toISOString(),
  end_at: spDe(2026, 9, 8, 20, 30).toISOString(),
  cancelled: true,
  publico: ["membro"],
});
const movida = linha({
  id: F2,
  series_id: M,
  original_start: spDe(2026, 9, 15, 19).toISOString(),
  start_at: spDe(2026, 9, 16, 10).toISOString(),
  end_at: spDe(2026, 9, 16, 11).toISOString(),
  title: "Reunião geral (quarta)",
  publico: ["membro"],
});

describe("idGoogle", () => {
  it("usa o uuid sem hífens (base32hex, aceito pelo Google como id próprio)", () => {
    expect(idGoogle(M)).toBe("11111111111111111111111111111111");
    expect(idGoogle(M)).toMatch(/^[a-v0-9]{5,1024}$/);
  });
});

describe("convidadosDe", () => {
  it("diretoria sempre; os outros pelo público ou por convite individual; e-mail em minúsculas e sem repetir", () => {
    expect(convidadosDe(semanal, assinantes)).toEqual(["diretora@gmail.com", "membro@gmail.com"]);
    const soDiretoria = linha({ id: "x", start_at: semanal.start_at, end_at: semanal.end_at, convidados: ["t"] });
    expect(convidadosDe(soDiretoria, assinantes)).toEqual(["diretora@gmail.com", "trainee@gmail.com"]);
    const dobrado = [...assinantes, { member_id: "d2", email: "diretora@gmail.com", nivel: "diretoria" as const }];
    expect(convidadosDe(semanal, dobrado)).toEqual(["diretora@gmail.com", "membro@gmail.com"]);
  });
});

describe("planejarSerie", () => {
  const planos = planejarSerie([semanal, cancelada, movida], assinantes, SITE);

  it("um evento recorrente para o mestre e um avulso para cada ocorrência editada; a cancelada não vira evento", () => {
    expect(planos.map((p) => p.eventoId)).toEqual([M, F2]);
  });

  it("o mestre leva RRULE e um EXDATE por filha (cancelada ou movida) e convida quem pode ver", () => {
    const c = planos[0].corpo;
    expect(c.id).toBe(idGoogle(M));
    expect(c.start).toEqual({ dateTime: "2026-09-01T19:00:00", timeZone: "America/Sao_Paulo" });
    expect(c.end).toEqual({ dateTime: "2026-09-01T20:30:00", timeZone: "America/Sao_Paulo" });
    expect(c.recurrence).toEqual([
      "RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261216T025959Z",
      "EXDATE;TZID=America/Sao_Paulo:20260908T190000",
      "EXDATE;TZID=America/Sao_Paulo:20260915T190000",
    ]);
    expect(c.attendees).toEqual([{ email: "diretora@gmail.com" }, { email: "membro@gmail.com" }]);
    expect(c.guestsCanSeeOtherGuests).toBe(false);
    expect(c.location).toBe("Sala 404");
    expect(c.description).toContain("Pauta");
    expect(c.description).toContain("https://meet.google.com/abc");
    expect(c.source?.url).toBe(`${SITE}/agenda?v=semana&d=2026-09-01`);
  });

  it("a ocorrência movida é um evento próprio, sem recorrência, com o horário novo", () => {
    const c = planos[1].corpo;
    expect(c.id).toBe(idGoogle(F2));
    expect(c.summary).toBe("Reunião geral (quarta)");
    expect(c.recurrence).toBeUndefined();
    expect(c.start).toEqual({ dateTime: "2026-09-16T10:00:00", timeZone: "America/Sao_Paulo" });
  });

  it("dia inteiro usa datas (fim exclusivo, como no banco)", () => {
    const dia = linha({ id: M, start_at: spDe(2026, 10, 20).toISOString(), end_at: spDe(2026, 10, 22).toISOString(), all_day: true, category: "prazo" });
    const [p] = planejarSerie([dia], assinantes, SITE);
    expect(p.corpo.start).toEqual({ date: "2026-10-20" });
    expect(p.corpo.end).toEqual({ date: "2026-10-22" });
  });

  it("a assinatura muda quando algo enviado muda (e só então)", () => {
    const de_novo = planejarSerie([semanal, cancelada, movida], assinantes, SITE);
    expect(de_novo[0].assinatura).toBe(planos[0].assinatura);
    const outroTitulo = planejarSerie([{ ...semanal, title: "Outra" }, cancelada, movida], assinantes, SITE);
    expect(outroTitulo[0].assinatura).not.toBe(planos[0].assinatura);
    const semMembro = planejarSerie([semanal, cancelada, movida], assinantes.slice(0, 1), SITE);
    expect(semMembro[0].assinatura).not.toBe(planos[0].assinatura);
  });

  it("série sem mestre (apagada) não planeja nada", () => {
    expect(planejarSerie([], assinantes, SITE)).toEqual([]);
  });
});

describe("emJanela", () => {
  const agora = spDe(2026, 11, 14, 12);
  it("série que acabou há mais de 30 dias fica de fora; série em andamento entra", () => {
    expect(emJanela(semanal, agora)).toBe(true);
    expect(emJanela({ ...semanal, until: "2026-09-30" }, agora)).toBe(false);
    const unico = linha({ id: "u", start_at: spDe(2026, 10, 20, 10).toISOString(), end_at: spDe(2026, 10, 20, 11).toISOString() });
    expect(emJanela(unico, agora)).toBe(true);
    expect(emJanela({ ...unico, start_at: spDe(2026, 9, 1).toISOString(), end_at: spDe(2026, 9, 1, 1).toISOString() }, agora)).toBe(false);
  });
});
