/**
 * Tipos do banco, escritos à mão para espelhar supabase/migrations/ (0001–0006).
 * Se o esquema mudar, mude a migração primeiro e depois este arquivo.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Categoria = "evento" | "aula" | "reuniao" | "prazo";
export type Frequencia = "semanal" | "quinzenal" | "mensal";
/** Ordem importa (enum `nivel` no banco): trainee < membro < diretoria. */
export type Nivel = "trainee" | "membro" | "diretoria";
/** Quem pode ser marcado no público de um evento; a diretoria sempre vê. */
export type NivelPublico = Exclude<Nivel, "diretoria">;

export type MembroRow = {
  id: string;
  email: string;
  name: string;
  cargo: string;
  nivel: Nivel;
  is_admin: boolean;
  created_at: string;
};
export type MembroInsert = {
  id?: string;
  email: string;
  name: string;
  cargo?: string;
  nivel?: Nivel;
  is_admin?: boolean;
  created_at?: string;
};
export type MembroUpdate = Partial<MembroInsert>;

export type FeedTokenRow = {
  member_id: string;
  token: string;
  created_at: string;
};

export type EventoRow = {
  id: string;
  title: string;
  category: Categoria;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string;
  link: string;
  description: string;
  freq: Frequencia | null;
  until: string | null;
  series_id: string | null;
  original_start: string | null;
  cancelled: boolean;
  publico: NivelPublico[];
  /** Membros que veem o evento fora do `publico` (convidados de uma votação). */
  convidados: string[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};
export type EventoInsert = {
  id?: string;
  title: string;
  category: Categoria;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  location?: string;
  link?: string;
  description?: string;
  freq?: Frequencia | null;
  until?: string | null;
  series_id?: string | null;
  original_start?: string | null;
  cancelled?: boolean;
  publico?: NivelPublico[];
  convidados?: string[];
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type EventoUpdate = Partial<EventoInsert>;

export type PedidoRow = {
  id: string;
  email: string;
  name: string;
  cargo: string;
  nivel: Nivel;
  created_at: string;
};
export type ModoVotacao = "unica" | "recorrente";

export type VotacaoRow = {
  id: string;
  titulo: string;
  descricao: string;
  modo: ModoVotacao;
  /** 'AAAA-MM-DD' (única) ou '1'..'7' (recorrente, 1 = segunda). */
  dias: string[];
  duracao_min: number;
  prazo: string;
  niveis: Nivel[];
  criado_por: string | null;
  evento_id: string | null;
  confirmada_em: string | null;
  /** 7 caracteres para o link curto /d/<codigo> (0006). */
  codigo: string;
  created_at: string;
};

/** O que a prévia pública do link mostra (resumo_votacao, sem login). */
export type ResumoVotacao = { id: string; titulo: string; prazo: string; duracao_min: number; modo: ModoVotacao; confirmada: boolean };

export type RespostaRow = { votacao_id: string; member_id: string; blocos: string[]; updated_at: string };

export type MapaVotacao = { total: number; respondidos: number; contagem: Record<string, number> };

/** Agendamento em grupo (0012): horários fatiados, grupos estilo Classroom, um horário por grupo. */
export type AgendamentoRow = {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  niveis: Nivel[];
  criado_por: string | null;
  confirmado_em: string | null;
  created_at: string;
};
export type HorarioRow = { id: string; agendamento_id: string; inicio: string; fim: string };
export type GrupoRow = {
  id: string;
  agendamento_id: string;
  nome: string;
  horario_id: string | null;
  evento_id: string | null;
  criado_por: string | null;
  created_at: string;
};
export type IntegranteRow = { agendamento_id: string; member_id: string; grupo_id: string };

/** `email` vem do JWT (default no banco); o cliente não manda. */
export type PedidoInsert = { name: string; cargo?: string; nivel?: NivelPublico };

export type Database = {
  public: {
    Tables: {
      members: {
        Row: MembroRow;
        Insert: MembroInsert;
        Update: MembroUpdate;
        Relationships: [];
      };
      feed_tokens: {
        Row: FeedTokenRow;
        Insert: { member_id: string; token?: string; created_at?: string };
        Update: Partial<FeedTokenRow>;
        Relationships: [];
      };
      events: {
        Row: EventoRow;
        Insert: EventoInsert;
        Update: EventoUpdate;
        Relationships: [];
      };
      votacoes: {
        Row: VotacaoRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      votacao_convidados: {
        Row: { votacao_id: string; member_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      votacao_respostas: {
        Row: RespostaRow;
        Insert: { votacao_id: string; blocos: string[] };
        Update: { blocos: string[] };
        Relationships: [];
      };
      agendamentos: { Row: AgendamentoRow; Insert: never; Update: never; Relationships: [] };
      agendamento_convidados: { Row: { agendamento_id: string; member_id: string }; Insert: never; Update: never; Relationships: [] };
      agendamento_horarios: { Row: HorarioRow; Insert: never; Update: never; Relationships: [] };
      agendamento_grupos: { Row: GrupoRow; Insert: never; Update: never; Relationships: [] };
      agendamento_integrantes: { Row: IntegranteRow; Insert: never; Update: never; Relationships: [] };
      access_requests: {
        Row: PedidoRow;
        Insert: PedidoInsert;
        Update: Partial<PedidoInsert>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      events_in_range: { Args: { p_ini: string; p_fim: string }; Returns: EventoRow[] };
      rotate_feed_token: { Args: Record<PropertyKey, never>; Returns: string };
      current_member_id: { Args: Record<PropertyKey, never>; Returns: string | null };
      is_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      current_nivel: { Args: Record<PropertyKey, never>; Returns: Nivel | null };
      pode_editar: { Args: Record<PropertyKey, never>; Returns: boolean };
      pode_ver: { Args: { p_publico: NivelPublico[] }; Returns: boolean };
      aprovar_pedido: { Args: { p_id: string; p_nivel: Nivel }; Returns: MembroRow };
      criar_votacao: {
        Args: {
          p_titulo: string;
          p_descricao: string;
          p_modo: ModoVotacao;
          p_dias: string[];
          p_duracao_min: number;
          p_prazo: string;
          p_niveis: Nivel[];
          p_incluir: string[];
          p_excluir: string[];
        };
        Returns: string;
      };
      mapa_votacao: { Args: { p_id: string }; Returns: MapaVotacao };
      pendencias_votacao: { Args: Record<PropertyKey, never>; Returns: { responder: number; resultados: number } };
      confirmar_votacao: { Args: { p_id: string; p_inicio: string; p_freq: Frequencia | null; p_until: string | null }; Returns: string };
      resumo_votacao: { Args: { p_codigo: string }; Returns: ResumoVotacao[] };
      reabrir_votacao: { Args: { p_id: string; p_prazo: string; p_dias: string[] | null }; Returns: undefined };
      criar_agendamento: {
        Args: {
          p_titulo: string;
          p_descricao: string;
          p_prazo: string;
          p_niveis: Nivel[];
          p_incluir: string[];
          p_excluir: string[];
          p_horarios: { inicio: string; fim: string }[];
        };
        Returns: string;
      };
      criar_grupo: { Args: { p_ag: string; p_nome: string }; Returns: string };
      entrar_grupo: { Args: { p_grupo: string }; Returns: undefined };
      sair_grupo: { Args: { p_ag: string }; Returns: undefined };
      reservar_horario: { Args: { p_ag: string; p_horario: string | null }; Returns: undefined };
      org_criar_grupo: { Args: { p_ag: string; p_nome: string }; Returns: string };
      org_renomear_grupo: { Args: { p_grupo: string; p_nome: string }; Returns: undefined };
      org_excluir_grupo: { Args: { p_grupo: string }; Returns: undefined };
      org_mover_pessoa: { Args: { p_ag: string; p_member: string; p_grupo: string | null }; Returns: undefined };
      org_definir_horario: { Args: { p_grupo: string; p_horario: string | null }; Returns: undefined };
      org_estender_prazo: { Args: { p_ag: string; p_prazo: string }; Returns: undefined };
      confirmar_agendamento: { Args: { p_ag: string }; Returns: number };
    };
    Enums: { categoria: Categoria; frequencia: Frequencia; nivel: Nivel; modo_votacao: ModoVotacao };
    CompositeTypes: { [_ in never]: never };
  };
};
