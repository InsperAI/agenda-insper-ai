/**
 * Tipos do banco, escritos à mão para espelhar supabase/migrations/ (0001–0003).
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
    };
    Enums: { categoria: Categoria; frequencia: Frequencia; nivel: Nivel };
    CompositeTypes: { [_ in never]: never };
  };
};
