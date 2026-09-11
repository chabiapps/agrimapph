export interface LocationReport {
  id: string;
  status: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  commodity: string | null;
  subcategory?: string | null;
  category?: string | null;
  price: number | null;
  volume: string | null;
  record_type?: string | null;
  expected_harvest_date?: string | null;
  expected_volume?: string | null;
  growth_stage?: string | null;
  reported_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type LocationLevel = "region" | "province" | "municipality" | "barangay";

export interface LocationSelection {
  level: LocationLevel;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
}

const levels: LocationLevel[] = ["region", "province", "municipality", "barangay"];

export const locationName = (location: LocationSelection) =>
  [location.barangay, location.municipality, location.province, location.region]
    .filter(Boolean)
    .join(", ");

export const locationShortName = (location: LocationSelection) =>
  location[location.level] ?? locationName(location);

export const matchesLocation = (report: LocationReport, location: LocationSelection) =>
  levels.every((level) => !location[level] || report[level] === location[level]);

export const locationKey = (location: LocationSelection) =>
  levels.map((level) => location[level] ?? "").join("|");

export const buildLocationOptions = (reports: LocationReport[]): LocationSelection[] => {
  const options = new Map<string, LocationSelection>();
  reports.forEach((report) => {
    levels.forEach((level, index) => {
      if (!report[level]) return;
      const selection = levels.reduce<LocationSelection>((value, part, partIndex) => {
        value[part] = partIndex <= index ? report[part] : null;
        return value;
      }, { level, region: null, province: null, municipality: null, barangay: null });
      options.set(locationKey(selection), selection);
    });
  });
  return [...options.values()].sort((a, b) => locationName(a).localeCompare(locationName(b)));
};

export const commonLocation = (reports: LocationReport[]): LocationSelection | null => {
  if (!reports.length) return null;
  const first = reports[0];
  let deepest: LocationLevel | null = null;
  for (const level of levels) {
    if (first[level] && reports.every((report) => report[level] === first[level])) deepest = level;
    else break;
  }
  if (!deepest) return null;
  const deepestIndex = levels.indexOf(deepest);
  return levels.reduce<LocationSelection>((value, level, index) => {
    value[level] = index <= deepestIndex ? first[level] : null;
    return value;
  }, { level: deepest, region: null, province: null, municipality: null, barangay: null });
};