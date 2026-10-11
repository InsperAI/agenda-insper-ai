import { ehNivel } from "./niveis";
import type { MembroRow, Nivel } from "./supabase/tipos";

/** Pura e testável: usada pela tela Membros (components/admin/*). */

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CARGOS_SUGERIDOS = [
  "Presidente",
  "Vice-Presidente",
  "Diretor(a) Acadêmico(a)",
  "Diretor(a) de Projetos",
  "Diretor(a) Institucional",
  "Diretor(a) de Gestão de Pessoas",
];

export type NovoMembro = { email: string; name: string; nivel: Nivel; cargo: string };
export type LinhaInvalida = { linha: number; texto: string; motivo: string };

/** Aceita o rótulo no singular ou plural, sem acento e em qualquer caixa. */
const APELIDOS_NIVEL: Record<string, Nivel> = {
  diretoria: "diretoria",
  diretor: "diretoria",
  diretora: "diretoria",
  membro: "membro",
  membros: "membro",
  trainee: "trainee",
  trainees: "trainee",
};

function lerNivel(bruto: string): Nivel | null {
  const t = bruto.trim().toLowerCase();
  if (!t) return "membro";
  if (ehNivel(t)) return t;
  return APELIDOS_NIVEL[t] ?? null;
}

const COLUNAS = 4; // email, nome, nível, cargo

/**
 * Tab (colado de planilha) ou o primeiro entre vírgula e ponto e vírgula. A
 * última coluna (cargo) fica com o resto, então "Diretora; Projetos" não quebra.
 */
function separar(linha: string): string[] {
  const virgula = linha.indexOf(",");
  const pontoVirgula = linha.indexOf(";");
  const sep = linha.includes("\t") ? "\t" : pontoVirgula >= 0 && (virgula < 0 || pontoVirgula < virgula) ? ";" : ",";
  const partes = linha.split(sep);
  return [...partes.slice(0, COLUNAS - 1), partes.slice(COLUNAS - 1).join(sep)].map((c) => c.trim());
}

function ehCabecalho(colunas: string[]): boolean {
  return /^e-?mail$/i.test(colunas[0] ?? "");
}

/**
 * Lê linhas `email, nome, nível[, cargo]`. Nível vazio = "membro". Ignora linhas
 * em branco e um cabeçalho "email". E-mail repetido na própria lista é inválido.
 */
export function lerListaMembros(texto: string): { validos: NovoMembro[]; invalidos: LinhaInvalida[] } {
  const validos: NovoMembro[] = [];
  const invalidos: LinhaInvalida[] = [];
  const vistos = new Set<string>();

  texto.split(/\r?\n/).forEach((bruta, i) => {
    const linha = i + 1;
    if (!bruta.trim()) return;
    const colunas = separar(bruta);
    if (ehCabecalho(colunas)) return;

    const [emailBruto = "", nome = "", nivelBruto = "", cargo = ""] = colunas;
    const email = emailBruto.toLowerCase();
    const nivel = lerNivel(nivelBruto);
    const motivo = !EMAIL_VALIDO.test(email)
      ? "e-mail inválido"
      : !nome
        ? "falta o nome"
        : !nivel
          ? `nível "${nivelBruto}" não existe (use diretoria, membro ou trainee)`
          : vistos.has(email)
            ? "e-mail repetido na lista"
            : null;

    if (motivo || !nivel) {
      invalidos.push({ linha, texto: bruta.trim(), motivo: motivo ?? "linha inválida" });
      return;
    }
    vistos.add(email);
    validos.push({ email, name: nome, nivel, cargo });
  });

  return { validos, invalidos };
}

/** Mensagens do Postgres/PostgREST → português para o aviso. */
export function traduzirErroMembro(m: string): string {
  if (/duplicate key/i.test(m)) return "Esse e-mail já está cadastrado.";
  if (/admin_e_diretoria/i.test(m)) return "Só quem é da diretoria pode ser admin.";
  if (/row-level security/i.test(m)) return "Só admins podem alterar a lista de membros.";
  if (/último admin/i.test(m)) return "Não é possível remover o último admin.";
  return m;
}

const ORDEM_GRUPO: Record<Nivel, number> = { diretoria: 0, membro: 1, trainee: 2 };

/** Ordena por nível (diretoria primeiro) e depois por nome. */
export function ordenarMembros(lista: readonly MembroRow[]): MembroRow[] {
  return [...lista].sort((a, b) => ORDEM_GRUPO[a.nivel] - ORDEM_GRUPO[b.nivel] || a.name.localeCompare(b.name, "pt-BR"));
}
