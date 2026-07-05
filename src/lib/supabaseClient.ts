// Custom Supabase client pointing to the user's external Supabase project.
// This replaces the auto-generated Lovable Cloud client for all app queries.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://gnrhciktvgokhipvsvcq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cgCE1nSOp__9jO1tBETwIA_vZiny_uf";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
