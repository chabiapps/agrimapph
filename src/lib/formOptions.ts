// Shared form-option constants used by both the Mag-ulat form
// (src/components/ReportFormPage.tsx) and the admin data-entry grid
// (src/pages/AdminDataEntry.tsx). Kept in one place so their stored values
// and category-keyed options stay identical across both surfaces.

export type StageOption = { value: string; label: string; icon: string };

export const STAGE_BY_CATEGORY: Record<string, StageOption[]> = {
  crops: [
    { value: "Planted", label: "Itinanim", icon: "🌱" },
    { value: "Growing", label: "Lumalaki", icon: "🌿" },
    { value: "Near Harvest", label: "Malapit nang Anihin", icon: "🌾" },
  ],
  fish: [
    { value: "Newly Stocked", label: "Bagong Lagay", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐠" },
    { value: "Near Harvest", label: "Handa nang Anihin", icon: "🐟" },
  ],
  poultry: [
    { value: "Newly Placed", label: "Bagong Sisiw", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐥" },
    { value: "Near Harvest", label: "Handa na", icon: "🐔" },
  ],
  livestock: [
    { value: "Newly Acquired", label: "Bagong Bili", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐷" },
    { value: "Near Harvest", label: "Handa nang Ibenta", icon: "🐖" },
  ],
  dairy: [
    { value: "Newly Acquired", label: "Bagong Bili", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐄" },
    { value: "Near Harvest", label: "Nagagatasan na", icon: "🥛" },
  ],
  other: [
    { value: "Planted", label: "Itinanim", icon: "🌱" },
    { value: "Growing", label: "Lumalaki", icon: "🌿" },
    { value: "Near Harvest", label: "Handa na", icon: "✅" },
  ],
};

export const DATE_LABELS: Record<string, { start: string; end: string }> = {
  crops: { start: "📅 Kailan mo ito itinanim?", end: "📅 Kailan mo aanihin?" },
  fish: { start: "📅 Kailan mo sila inilagay sa tubig?", end: "📅 Inaasahang petsa ng huli" },
  poultry: { start: "📅 Petsa ng paglalagay ng sisiw", end: "📅 Inaasahang petsa ng karne/itlog" },
  livestock: { start: "📅 Petsa ng pagbili ng alagang hayop", end: "📅 Inaasahang petsa ng pagbenta" },
  dairy: { start: "📅 Petsa ng pagbili", end: "📅 Inaasahang petsa" },
  other: { start: "📅 Petsa ng simula", end: "📅 Inaasahang petsa ng ani" },
};
