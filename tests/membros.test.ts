import { describe, expect, it } from "vitest";
import { lerListaMembros, ordenarMembros, traduzirErroMembro } from "@/lib/membros";
import type { MembroRow } from "@/lib/supabase/tipos";

describe("lerListaMembros", () => {
  it("lê vírgula, ponto e vírgula e tab (colado de planilha)", () => {
    const { validos, invalidos } = lerListaMembros(
      ["ana@al.insper.edu.br, Ana Souza, membro", "bia@gmail.com; Bia Lima; trainee", "caio@gmail.com\tCaio Reis\tdiretoria\tPresidente"].join("\n"),
    );
    expect(invalidos).toEqual([]);
    expect(validos).toEqual([
      { email: "ana@al.insper.edu.br", name: "Ana Souza", nivel: "membro", cargo: "" },
      { email: "bia@gmail.com", name: "Bia Lima", nivel: "trainee", cargo: "" },
      { email: "caio@gmail.com", name: "Caio Reis", nivel: "diretoria", cargo: "Presidente" },
    ]);
  });

  it("nível vazio vira membro; aceita plural e maiúsculas", () => {
    const { validos } = lerListaMembros("a@x.com, A\nb@x.com, B, Trainees\nc@x.com, C, MEMBROS");
    expect(validos.map((v) => v.nivel)).toEqual(["membro", "trainee", "membro"]);
  });

  it("normaliza o e-mail para minúsculas", () => {
    expect(lerListaMembros("Ana@Gmail.COM, Ana").validos[0].email).toBe("ana@gmail.com");
  });

  it("ignora linhas em branco e o cabeçalho", () => {
    const { validos, invalidos } = lerListaMembros("email, nome, nivel\n\n  \na@x.com, A, membro\n");
    expect(validos).toHaveLength(1);
    expect(invalidos).toEqual([]);
  });

  it("aponta e-mail inválido, falta de nome e nível desconhecido com o número da linha", () => {
    const { validos, invalidos } = lerListaMembros("nao-e-email, Fulano\nb@x.com\nc@x.com, C, chefe");
    expect(validos).toEqual([]);
    expect(invalidos.map((i) => [i.linha, i.motivo])).toEqual([
      [1, "e-mail inválido"],
      [2, "falta o nome"],
      [3, 'nível "chefe" não existe (use diretoria, membro ou trainee)'],
    ]);
  });

  it("separador dentro do cargo não quebra a linha", () => {
    const { validos, invalidos } = lerListaMembros("a@x.com, Ana, membro, Diretora; Projetos\nb@x.com; Bia; trainee; Gente, Cultura");
    expect(invalidos).toEqual([]);
    expect(validos.map((v) => v.cargo)).toEqual(["Diretora; Projetos", "Gente, Cultura"]);
  });

  it("marca e-mail repetido dentro da própria lista", () => {
    const { validos, invalidos } = lerListaMembros("a@x.com, A\nA@x.com, A de novo");
    expect(validos).toHaveLength(1);
    expect(invalidos).toEqual([{ linha: 2, texto: "A@x.com, A de novo", motivo: "e-mail repetido na lista" }]);
  });
});

describe("traduzirErroMembro", () => {
  it("traduz as mensagens conhecidas do banco", () => {
    expect(traduzirErroMembro('duplicate key value violates unique constraint "members_email_key"')).toBe("Esse e-mail já está cadastrado.");
    expect(traduzirErroMembro('new row violates check constraint "admin_e_diretoria"')).toBe("Só quem é da diretoria pode ser admin.");
    expect(traduzirErroMembro("Não é possível remover o último admin.")).toBe("Não é possível remover o último admin.");
  });
});

describe("ordenarMembros", () => {
  const m = (name: string, nivel: MembroRow["nivel"]): MembroRow => ({ id: name, email: `${name}@x.com`, name, cargo: "", nivel, is_admin: false, created_at: "" });

  it("diretoria primeiro, depois membros e trainees, cada grupo por nome", () => {
    const ordem = ordenarMembros([m("Zé", "trainee"), m("Bia", "membro"), m("Ana", "trainee"), m("Caio", "diretoria")]).map((x) => x.name);
    expect(ordem).toEqual(["Caio", "Bia", "Ana", "Zé"]);
  });
});
