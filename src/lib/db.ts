// Loosely-typed handle on the Supabase client for tables that are not part of
// the generated `Database` types (e.g. user_profiles, commodities).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export const db = supabase as unknown as SupabaseClient;
