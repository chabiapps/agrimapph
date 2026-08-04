// Approximate geographic centers of Philippine provinces (fallback pin location)
export const PROVINCE_CENTERS: Record<string, [number, number]> = {
  "Metro Manila (NCR)": [14.5995, 120.9842],
  Abra: [17.5951, 120.7983],
  Apayao: [18.0141, 121.1748],
  Benguet: [16.5595, 120.7983],
  Ifugao: [16.8330, 121.1710],
  Kalinga: [17.4740, 121.3542],
  "Mountain Province": [17.0698, 121.1044],
  "Ilocos Norte": [18.1647, 120.7116],
  "Ilocos Sur": [17.2229, 120.5721],
  "La Union": [16.6159, 120.3209],
  Pangasinan: [15.8949, 120.2863],
  Batanes: [20.4487, 121.9702],
  Cagayan: [18.0000, 121.7333],
  Isabela: [16.9754, 121.8107],
  "Nueva Vizcaya": [16.3301, 121.1710],
  Quirino: [16.2700, 121.5370],
  Aurora: [15.9800, 121.6400],
  Bataan: [14.6417, 120.4818],
  Bulacan: [14.7943, 120.8800],
  "Nueva Ecija": [15.5784, 121.0687],
  Pampanga: [15.0794, 120.6200],
  Tarlac: [15.4755, 120.5963],
  Zambales: [15.5082, 120.0691],
  Batangas: [13.7565, 121.0583],
  Cavite: [14.2456, 120.8786],
  Laguna: [14.2691, 121.4113],
  Quezon: [13.9346, 121.9473],
  Rizal: [14.6037, 121.3084],
  Marinduque: [13.4767, 121.9032],
  "Occidental Mindoro": [13.1024, 120.7651],
  "Oriental Mindoro": [13.0565, 121.4069],
  Palawan: [9.8349, 118.7384],
  Romblon: [12.5778, 122.2695],
  Albay: [13.1775, 123.5280],
  "Camarines Norte": [14.1390, 122.7633],
  "Camarines Sur": [13.5250, 123.3486],
  Catanduanes: [13.7089, 124.2422],
  Masbate: [12.3574, 123.5504],
  Sorsogon: [12.9433, 124.0060],
  Aklan: [11.8166, 122.0942],
  Antique: [11.3683, 122.0645],
  Capiz: [11.5514, 122.7405],
  Guimaras: [10.5929, 122.6325],
  Iloilo: [10.7202, 122.5621],
  "Negros Occidental": [10.2920, 123.0220],
  Bohol: [9.8500, 124.1435],
  Cebu: [10.3157, 123.8854],
  "Negros Oriental": [9.6168, 123.0113],
  Siquijor: [9.1985, 123.5951],
  "Eastern Samar": [11.5000, 125.5000],
  Leyte: [11.0000, 124.8000],
  "Northern Samar": [12.3714, 124.7500],
  "Samar (Western Samar)": [11.8000, 125.0000],
  "Southern Leyte": [10.3333, 125.1667],
  Biliran: [11.5833, 124.4667],
  "Zamboanga del Norte": [8.3333, 123.0000],
  "Zamboanga del Sur": [7.8383, 123.2967],
  "Zamboanga Sibugay": [7.7167, 122.6667],
  Bukidnon: [8.0515, 125.0985],
  Camiguin: [9.1732, 124.7295],
  "Lanao del Norte": [8.0000, 124.0000],
  "Misamis Occidental": [8.3375, 123.7071],
  "Misamis Oriental": [8.5046, 124.6220],
  "Davao de Oro": [7.5000, 126.0000],
  "Davao del Norte": [7.5619, 125.6549],
  "Davao del Sur": [6.7656, 125.3284],
  "Davao Occidental": [6.1055, 125.6094],
  "Davao Oriental": [7.0000, 126.3333],
  "Cotabato (North Cotabato)": [7.2047, 124.8511],
  Sarangani: [5.9280, 125.1660],
  "South Cotabato": [6.3369, 124.8511],
  "Sultan Kudarat": [6.5069, 124.4198],
  "Agusan del Norte": [9.0000, 125.5000],
  "Agusan del Sur": [8.5000, 125.8333],
  "Dinagat Islands": [10.1282, 125.6094],
  "Surigao del Norte": [9.7500, 125.5000],
  "Surigao del Sur": [8.7500, 126.1000],
  Basilan: [6.5000, 122.0667],
  "Lanao del Sur": [7.8232, 124.4198],
  "Maguindanao del Norte": [7.2000, 124.2500],
  "Maguindanao del Sur": [6.9000, 124.4500],
  Sulu: [5.9749, 121.0335],
  "Tawi-Tawi": [5.1339, 119.9508],
};

export const getProvinceCenter = (province: string): [number, number] | null =>
  PROVINCE_CENTERS[province] ?? null;

/**
 * Look up the coordinates of a municipality/city using OpenStreetMap Nominatim.
 * Returns null when nothing matches so the caller can fall back to the province center.
 */
export async function geocodeMunicipality(
  municipality: string,
  province: string
): Promise<[number, number] | null> {
  const cleanProvince = province.replace(/\s*\(.*\)\s*/g, "").trim();
  const queries = [
    `${municipality}, ${cleanProvince}, Philippines`,
    `${municipality}, Philippines`,
  ];
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (data?.length) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }
    } catch {
      /* try next query */
    }
  }
  return null;
}
