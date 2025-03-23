import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
}

export type UserData = User & Partial<UserProfile>; 