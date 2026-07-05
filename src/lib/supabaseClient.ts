// Custom Supabase client pointing to the user's external Supabase project.
// This replaces the auto-generated Lovable Cloud client for all app queries.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://gnrhciktvgokhipvsvcq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducmhjaWt0dmdva2hpcHZzdmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODMzODAsImV4cCI6MjA5MDk1OTM4MH0.kZ-9dmC70_-uwxswacaLqdug5J7AhYVWbxtoSY02ZL8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
