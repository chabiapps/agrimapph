import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";

export type UserType =
  | "farmer"
  | "fisherfolk"
  | "livestock"
  | "trader"
  | "lgu"
  | "public";

export const USER_TYPES: { id: UserType; emoji: string; label: string; sub: string }[] = [
  { id: "farmer", emoji: "🌾", label: "Magsasaka", sub: "Farmer" },
  { id: "fisherfolk", emoji: "🐟", label: "Mangingisda", sub: "Fisherfolk" },
  { id: "livestock", emoji: "🐔", label: "Mag-aalaga ng Hayop", sub: "Livestock raiser" },
  { id: "trader", emoji: "🚚", label: "Negosyante / Trader", sub: "Trader" },
  { id: "lgu", emoji: "🏛", label: "LGU / Gobyerno", sub: "Government" },
  { id: "public", emoji: "📊", label: "Mananaliksik / Publiko", sub: "Researcher / public" },
];

export const PRODUCER_TYPES: UserType[] = ["farmer", "fisherfolk", "livestock"];
export const isProducer = (t?: string | null) => PRODUCER_TYPES.includes(t as UserType);

export const userTypeMeta = (t?: string | null) =>
  USER_TYPES.find((u) => u.id === t) ?? { id: "public" as UserType, emoji: "👤", label: "Miyembro", sub: "Member" };

export type Tier = "basic" | "community" | "government";

export const TIERS: Record<Tier, { emoji: string; label: string; className: string }> = {
  basic: { emoji: "🔵", label: "Basic", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  community: { emoji: "🟡", label: "Community Verified", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  government: { emoji: "🟢", label: "Government Verified", className: "bg-green-500/15 text-green-700 border-green-500/30" },
};

export const tierMeta = (t?: string | null) => TIERS[(t as Tier) ?? "basic"] ?? TIERS.basic;

export interface UserProfile {
  id: string;
  full_name: string | null;
  user_type: string | null;
  phone_number: string | null;
  messenger_username: string | null;
  primary_commodity: string | null;
  farm_location: string | null;
  farm_region: string | null;
  farm_province: string | null;
  farm_municipality: string | null;
  farm_barangay: string | null;
  land_area: string | null;
  vessel_type: string | null;
  rsbsa_number: string | null;
  philsys_id: string | null;
  verification_tier: string | null;
  created_at?: string | null;
}

export const PROFILE_COLS =
  "id, full_name, user_type, phone_number, messenger_username, primary_commodity, farm_location, farm_region, farm_province, farm_municipality, farm_barangay, land_area, vessel_type, rsbsa_number, philsys_id, verification_tier, created_at";

export const isProfileComplete = (p: UserProfile | null) =>
  !!p && !!p.full_name && !!p.user_type;

/**
 * Only these columns are exposed by the `public_profiles` view. Selecting any
 * other column (e.g. the private PII in `PROFILE_COLS`) makes PostgREST return
 * error 42703 (column does not exist) and the profile silently fails to load.
 * `phone_verified` / `messenger_verified` are booleans only — never the raw
 * phone number or Messenger username, which stay private on `user_profiles`.
 */
export const PUBLIC_PROFILE_COLS =
  "id, full_name, avatar_url, user_type, verification_tier, phone_verified, messenger_verified, primary_commodity, farm_province, farm_municipality";

export interface PublicProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  verification_tier: string | null;
  phone_verified: boolean | null;
  messenger_verified: boolean | null;
  primary_commodity: string | null;
  farm_province: string | null;
  farm_municipality: string | null;
}

export const fetchProfile = async (id: string): Promise<UserProfile | null> => {
  const { data } = await db.from("user_profiles").select(PROFILE_COLS).eq("id", id).maybeSingle();
  return (data as UserProfile | null) ?? null;
};

/** Read another user's profile via the `public_profiles` view (RLS-safe, no
 *  private contact/PII columns). Use for any profile that is not the signed-in
 *  user's own; self reads stay on `user_profiles` via `fetchProfile`. */
export const fetchPublicProfile = async (id: string): Promise<PublicProfile | null> => {
  const { data } = await db.from("public_profiles").select(PUBLIC_PROFILE_COLS).eq("id", id).maybeSingle();
  return (data as PublicProfile | null) ?? null;
};

export const useProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setProfile(await fetchProfile(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return { profile, loading: loading || authLoading, refresh, setProfile };
};

export interface Commodity {
  id: number;
  name: string;
  category: string | null;
  emoji: string | null;
  unit: string | null;
}

export const fetchCommodities = async (): Promise<Commodity[]> => {
  const { data } = await db.from("commodities").select("id, name, category, emoji, unit").order("name");
  return (data as Commodity[]) ?? [];
};
