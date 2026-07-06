export type CategoryKey = "crops" | "fish" | "poultry" | "livestock" | "dairy" | "other";

export interface CategoryDef {
  key: CategoryKey;
  icon: string;
  label: string; // Filipino label shown to user
  subLabel: string; // secondary English hint
  subcategories: string[]; // suggested subcategories / commodities
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "crops",
    icon: "🌾",
    label: "Pananim",
    subLabel: "Crops",
    subcategories: [
      "Rice", "Corn", "Banana", "Pineapple", "Sugarcane", "Onion", "Tomato",
      "Coconut", "Coffee", "Mango", "Cassava", "Sweet Potato", "Garlic",
      "Cabbage", "Carrot", "Eggplant", "Papaya", "Calamansi",
    ],
  },
  {
    key: "fish",
    icon: "🐟",
    label: "Isda",
    subLabel: "Fish & Seafood",
    subcategories: [
      "Bangus", "Tilapia", "Galunggong", "Sardines", "Tuna", "Hipon", "Alimasag", "Pusit",
    ],
  },
  {
    key: "poultry",
    icon: "🐔",
    label: "Manok / Itlog",
    subLabel: "Poultry & Eggs",
    subcategories: [
      "Broiler Chicken", "Native Chicken", "Chicken Eggs", "Duck", "Duck Eggs (Balut)",
    ],
  },
  {
    key: "livestock",
    icon: "🐖",
    label: "Hayop",
    subLabel: "Livestock",
    subcategories: [
      "Pork", "Beef", "Goat", "Carabao",
    ],
  },
  {
    key: "dairy",
    icon: "🥛",
    label: "Gatas",
    subLabel: "Dairy",
    subcategories: [
      "Fresh Milk", "Carabao Milk", "Cheese",
    ],
  },
  {
    key: "other",
    icon: "🌿",
    label: "Iba Pa",
    subLabel: "Other",
    subcategories: [],
  },
];

const commodityToCategory: Record<string, CategoryKey> = (() => {
  const map: Record<string, CategoryKey> = {};
  for (const c of CATEGORIES) {
    for (const s of c.subcategories) map[s.toLowerCase()] = c.key;
  }
  return map;
})();

export const inferCategory = (commodity?: string | null): CategoryKey => {
  if (!commodity) return "other";
  return commodityToCategory[commodity.toLowerCase()] ?? "other";
};

export const getCategoryDef = (key: CategoryKey) =>
  CATEGORIES.find((c) => c.key === key)!;

const SUBCATEGORY_ICONS: Record<string, string> = {
  // Crops (English + Filipino aliases)
  "rice": "🌾", "palay": "🌾",
  "corn": "🌽", "mais": "🌽",
  "tomato": "🍅", "kamatis": "🍅",
  "onion": "🧅", "sibuyas": "🧅",
  "garlic": "🧄", "bawang": "🧄",
  "eggplant": "🍆", "talong": "🍆",
  "sweet potato": "🍠", "kamote": "🍠",
  "cabbage": "🥬", "pechay": "🥬", "repolyo": "🥬",
  "bitter gourd": "🥒", "ampalaya": "🥒",
  "string beans": "🫘", "sitaw": "🫘",
  "squash": "🎃", "kalabasa": "🎃",
  "banana": "🍌", "saging": "🍌",
  "mango": "🥭", "mangga": "🥭",
  "pineapple": "🍍", "pinya": "🍍",
  "coconut": "🥥", "niyog": "🥥",
  "sugarcane": "🎋", "tubo": "🎋",
  "cacao": "🍫", "kakaw": "🍫",
  "coffee": "☕", "kape": "☕",
  "durian": "🌵",
  "cassava": "🥔", "kamoteng kahoy": "🥔",
  "carrot": "🥕",
  "papaya": "🍈",
  "calamansi": "🍋",
  // Fish & seafood
  "sardines": "🐟", "sardinas": "🐟", "tamban": "🐟",
  "bangus": "🐠",
  "tilapia": "🐡",
  "galunggong": "🐟",
  "hipon": "🦐", "sugpo": "🦐", "prawn": "🦐", "shrimp": "🦐",
  "alimasag": "🦀", "alimango": "🦀", "crab": "🦀",
  "mussel": "🦪", "tahong": "🦪",
  "oyster": "🦪", "talaba": "🦪",
  "pusit": "🦑", "squid": "🦑",
  "tuna": "🐟",
  "seaweed": "🌿", "guso": "🌿", "seaweed/guso": "🌿",
  "dilis": "🐟",
  // Poultry
  "broiler chicken": "🐔", "native chicken": "🐔", "chicken": "🐔", "manok": "🐔", "manok broiler": "🐔",
  "chicken eggs": "🥚", "itlog": "🥚", "itlog ng manok": "🥚", "eggs": "🥚",
  "duck": "🦆", "pato": "🦆", "itik": "🦆",
  "duck eggs (balut)": "🦆", "balut": "🦆",
  // Livestock
  "pork": "🐷", "baboy": "🐷", "pig": "🐷",
  "beef": "🐄", "baka": "🐄", "cattle": "🐄",
  "goat": "🐐", "kambing": "🐐",
  "carabao": "🐃", "kalabaw": "🐃",
  "sheep": "🐑", "tupa": "🐑",
  // Dairy
  "fresh milk": "🥛", "gatas": "🥛", "milk": "🥛",
  "carabao milk": "🥛",
  "cheese": "🧀", "kesong puti": "🧀", "keso": "🧀",
};

const CATEGORY_FALLBACK: Record<string, string> = {
  crops: "🌾",
  fish: "🐟",
  poultry: "🐔",
  livestock: "🐖",
  dairy: "🥛",
  other: "🌿",
};

export const getCommodityIcon = (
  subcategory?: string | null,
  category?: string | null
): string => {
  if (subcategory) {
    const icon = SUBCATEGORY_ICONS[subcategory.toLowerCase()];
    if (icon) return icon;
  }
  return CATEGORY_FALLBACK[category?.toLowerCase() ?? ""] ?? "🌿";
};
