/**
 * Tipos do banco, escritos à mão para espelhar supabase/migrations/ (0001–0004).
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
  created_at: string;
};

export type RespostaRow = { votacao_id: string; member_id: string; blocos: string[]; updated_at: string };

export type MapaVotacao = { total: number; respondidos: number; contagem: Record<string, number> };

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
      reabrir_votacao: { Args: { p_id: string; p_prazo: string; p_dias: string[] | null }; Returns: undefined };
    };
    Enums: { categoria: Categoria; frequencia: Frequencia; nivel: Nivel; modo_votacao: ModoVotacao };
    CompositeTypes: { [_ in never]: never };
  };
};
