/**
 * Hand-maintained database types.
 *
 * These mirror the SQL in `supabase/migrations/`. Keep the two in sync when the
 * schema changes. (Can be regenerated with `supabase gen types typescript`.)
 */

export type RunStatus =
  | "queued"
  | "planning"
  | "retrieving"
  | "analyzing"
  | "refining"
  | "synthesizing"
  | "building"
  | "completed"
  | "failed";

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      research_runs: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          status: string;
          mode: string;
          scope: Json | null;
          plan: Json | null;
          report_markdown: string | null;
          quality: Json | null;
          error_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question: string;
          status?: string;
          mode?: string;
          scope?: Json | null;
          plan?: Json | null;
          report_markdown?: string | null;
          quality?: Json | null;
          error_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["research_runs"]["Insert"]>;
        Relationships: [];
      };
      uploaded_files: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          ingestion_status: string;
          page_count: number | null;
          error_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          ingestion_status?: string;
          page_count?: number | null;
          error_summary?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["uploaded_files"]["Insert"]>;
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          file_id: string;
          user_id: string;
          chunk_index: number;
          page_number: number | null;
          content: string;
          token_count: number | null;
          metadata: Json | null;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          user_id: string;
          chunk_index: number;
          page_number?: number | null;
          content: string;
          token_count?: number | null;
          metadata?: Json | null;
          embedding?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_chunks"]["Insert"]>;
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          run_id: string;
          user_id: string;
          source_key: string;
          source_type: string;
          title: string;
          url: string | null;
          excerpt: string | null;
          citation_metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          user_id: string;
          source_key: string;
          source_type: string;
          title: string;
          url?: string | null;
          excerpt?: string | null;
          citation_metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
        Relationships: [];
      };
      agent_events: {
        Row: {
          id: number;
          run_id: string;
          user_id: string;
          sequence: number;
          agent_name: string;
          status: string;
          message: string;
          safe_metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          run_id: string;
          user_id: string;
          sequence: number;
          agent_name: string;
          status: string;
          message: string;
          safe_metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: string;
          match_count: number;
          file_ids: string[];
        };
        Returns: {
          id: string;
          file_id: string;
          chunk_index: number;
          page_number: number | null;
          content: string;
          metadata: Json | null;
          similarity: number;
        }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
