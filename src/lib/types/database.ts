export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          org_id: string
          membership_id: string
          name: string
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          membership_id: string
          name: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          membership_id?: string
          name?: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      memberships: {
        Row: {
          id: string
          org_id: string
          user_id: string
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          membership_id?: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
    }
  }
}

