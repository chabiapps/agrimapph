export interface Region {
  code: string;
  name: string;
  provinces: Province[];
}

export interface Province {
  code: string;
  name: string;
}

export const REGIONS: Region[] = [
  {
    code: "130000000",
    name: "NCR — Metro Manila",
    provinces: [
      { code: "133900000", name: "Metro Manila (NCR)" },
    ],
  },
  {
    code: "140000000",
    name: "CAR — Cordillera Administrative Region",
    provinces: [
      { code: "141400000", name: "Abra" },
      { code: "141500000", name: "Apayao" },
      { code: "141600000", name: "Benguet" },
      { code: "143200000", name: "Ifugao" },
      { code: "143300000", name: "Kalinga" },
      { code: "144400000", name: "Mountain Province" },
    ],
  },
  {
    code: "010000000",
    name: "Region I — Ilocos Region",
    provinces: [
      { code: "012800000", name: "Ilocos Norte" },
      { code: "012900000", name: "Ilocos Sur" },
      { code: "013300000", name: "La Union" },
      { code: "015500000", name: "Pangasinan" },
    ],
  },
  {
    code: "020000000",
    name: "Region II — Cagayan Valley",
    provinces: [
      { code: "021500000", name: "Batanes" },
      { code: "021700000", name: "Cagayan" },
      { code: "023100000", name: "Isabela" },
      { code: "025000000", name: "Nueva Vizcaya" },
      { code: "025700000", name: "Quirino" },
    ],
  },
  {
    code: "030000000",
    name: "Region III — Central Luzon",
    provinces: [
      { code: "030800000", name: "Aurora" },
      { code: "031400000", name: "Bataan" },
      { code: "031900000", name: "Bulacan" },
      { code: "034900000", name: "Nueva Ecija" },
      { code: "035400000", name: "Pampanga" },
      { code: "036900000", name: "Tarlac" },
      { code: "037100000", name: "Zambales" },
    ],
  },
  {
    code: "040000000",
    name: "Region IV-A — CALABARZON",
    provinces: [
      { code: "041000000", name: "Batangas" },
      { code: "042100000", name: "Cavite" },
      { code: "043400000", name: "Laguna" },
      { code: "045600000", name: "Quezon" },
      { code: "045800000", name: "Rizal" },
    ],
  },
  {
    code: "170000000",
    name: "Region IV-B — MIMAROPA",
    provinces: [
      { code: "174000000", name: "Marinduque" },
      { code: "175100000", name: "Occidental Mindoro" },
      { code: "175200000", name: "Oriental Mindoro" },
      { code: "175300000", name: "Palawan" },
      { code: "175900000", name: "Romblon" },
    ],
  },
  {
    code: "050000000",
    name: "Region V — Bicol Region",
    provinces: [
      { code: "050500000", name: "Albay" },
      { code: "052000000", name: "Camarines Norte" },
      { code: "052100000", name: "Camarines Sur" },
      { code: "052200000", name: "Catanduanes" },
      { code: "054100000", name: "Masbate" },
      { code: "056200000", name: "Sorsogon" },
    ],
  },
  {
    code: "060000000",
    name: "Region VI — Western Visayas",
    provinces: [
      { code: "060400000", name: "Aklan" },
      { code: "060600000", name: "Antique" },
      { code: "061900000", name: "Capiz" },
      { code: "063000000", name: "Guimaras" },
      { code: "063600000", name: "Iloilo" },
      { code: "064500000", name: "Negros Occidental" },
    ],
  },
  {
    code: "070000000",
    name: "Region VII — Central Visayas",
    provinces: [
      { code: "071200000", name: "Bohol" },
      { code: "072200000", name: "Cebu" },
      { code: "074600000", name: "Negros Oriental" },
      { code: "076100000", name: "Siquijor" },
    ],
  },
  {
    code: "080000000",
    name: "Region VIII — Eastern Visayas",
    provinces: [
      { code: "082600000", name: "Eastern Samar" },
      { code: "083700000", name: "Leyte" },
      { code: "084300000", name: "Northern Samar" },
      { code: "086000000", name: "Samar (Western Samar)" },
      { code: "086400000", name: "Southern Leyte" },
      { code: "087800000", name: "Biliran" },
    ],
  },
  {
    code: "090000000",
    name: "Region IX — Zamboanga Peninsula",
    provinces: [
      { code: "097200000", name: "Zamboanga del Norte" },
      { code: "097300000", name: "Zamboanga del Sur" },
      { code: "098300000", name: "Zamboanga Sibugay" },
    ],
  },
  {
    code: "100000000",
    name: "Region X — Northern Mindanao",
    provinces: [
      { code: "101300000", name: "Bukidnon" },
      { code: "101800000", name: "Camiguin" },
      { code: "103500000", name: "Lanao del Norte" },
      { code: "104200000", name: "Misamis Occidental" },
      { code: "104300000", name: "Misamis Oriental" },
    ],
  },
  {
    code: "110000000",
    name: "Region XI — Davao Region",
    provinces: [
      { code: "112300000", name: "Davao de Oro" },
      { code: "112400000", name: "Davao del Norte" },
      { code: "112500000", name: "Davao del Sur" },
      { code: "118200000", name: "Davao Occidental" },
      { code: "112600000", name: "Davao Oriental" },
    ],
  },
  {
    code: "120000000",
    name: "Region XII — SOCCSKSARGEN",
    provinces: [
      { code: "124700000", name: "Cotabato (North Cotabato)" },
      { code: "126300000", name: "Sarangani" },
      { code: "126500000", name: "South Cotabato" },
      { code: "126700000", name: "Sultan Kudarat" },
    ],
  },
  {
    code: "160000000",
    name: "Region XIII — Caraga",
    provinces: [
      { code: "160200000", name: "Agusan del Norte" },
      { code: "160300000", name: "Agusan del Sur" },
      { code: "166800000", name: "Dinagat Islands" },
      { code: "166600000", name: "Surigao del Norte" },
      { code: "166700000", name: "Surigao del Sur" },
    ],
  },
  {
    code: "190000000",
    name: "BARMM — Bangsamoro",
    provinces: [
      { code: "198500000", name: "Basilan" },
      { code: "193600000", name: "Lanao del Sur" },
      { code: "198600000", name: "Maguindanao del Norte" },
      { code: "199700000", name: "Maguindanao del Sur" },
      { code: "198900000", name: "Sulu" },
      { code: "199800000", name: "Tawi-Tawi" },
    ],
  },
];

export const getProvinces = (regionCode: string): Province[] =>
  REGIONS.find((r) => r.code === regionCode)?.provinces ?? [];
