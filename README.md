# 🌾 AgriMap PH

National Agricultural Supply & Demand Intelligence Map

A mobile-first Progressive Web App (PWA) that crowdsources real-time agricultural supply and demand data across the Philippines — down to the barangay level. Built to solve the food repositioning problem across the country's 7,000+ islands.

## 🌟 The Problem

The Philippines does not have a food supply problem — it has a food repositioning problem:

- Sardines sell for ₱200 in Manila but ₱50 in Zamboanga del Norte
- Tomatoes rot in Nueva Vizcaya while Zamboanga imports tomato paste from China
- Onions bought from Mindoro farmers for ₱12/kg during harvest sell for ₱700 off-season
- Bananas from Davao cost more to ship to Manila than to export to Japan

AgriMap PH makes surplus and deficit visible in real time so traders, buyers, LGUs, and government planners can act before produce rots.

## ✨ Features

### 🗺 Mapa (Map View)

- Interactive Leaflet map using OpenStreetMap tiles centered on the Philippines
- Color-coded pins per location: 🟢 Sobra (Surplus) · 🔴 Kulang (Deficit) · 🟡 Sapat (Balanced)
- Pin size reflects volume — bigger dot means higher supply
- Commodity-specific emoji icons on every pin (🌽 🍅 🐟 🐔 🐷 etc.)
- Tap any pin to see a detail panel with commodity, price, volume, season, and barangay
- **Ngayon / Paparating toggle**:
  - **Ngayon** — shows current supply and demand reports
  - **Paparating** — shows planting intentions with harvest countdown (e.g. "Harvest in 6 weeks")
- Filter by category (🌾 Pananim · 🐟 Isda · 🐔 Manok · 🐖 Hayop · 🌿 Iba Pa) and commodity
- Responsive layout: bottom sheet on mobile, right side panel on desktop

### 📋 Listahan (Table View)

- Full data table with all agri reports
- Sortable columns: Region, Province, Municipality, Barangay, Commodity, Status, Volume, Price, Season
- Filter by category, commodity, status, and record type (Ngayon/Paparating)
- Search across region, province, barangay, and commodity
- Export to CSV — filtered data downloads instantly

### ➕ Mag-ulat (Report Form)

- Requires login — public can view, only registered users can report
- Two report types:
  - 🌾 **Ani Ko Ngayon** — report current harvest/supply
  - 🌱 **Itinanim Ko** — log planting intentions with expected harvest date
- Covers all food categories: Crops, Fish & Seafood, Poultry, Livestock, Dairy
- GPS auto-fill for location (📍 Gamitin ang aking lokasyon)
- Conditional fields per category (e.g. Date Caught for fish, Number of Heads for livestock)

### 🌐 Bilingual Support

- Toggle between Filipino (FIL) and English (EN) at any time
- All labels, buttons, and form fields translated
- Designed for non-tech-savvy farmers with large tap targets and simple language

## 🗂 Data Categories

| Category | Emoji | Examples |
|----------|-------|----------|
| Pananim (Crops) | 🌾 | Rice, Corn, Tomato, Onion, Garlic, Banana, Mango |
| Isda at Pagkaing-dagat (Fish & Seafood) | 🐟 | Sardinas, Bangus, Tilapia, Sugpo, Alimango, Seaweed |
| Manok at Itlog (Poultry & Eggs) | 🐔 | Broiler, Native Chicken, Eggs, Duck |
| Hayop (Livestock) | 🐖 | Baboy, Baka, Kambing, Kalabaw |
| Produktong Gatas (Dairy) | 🥛 | Carabao milk, Goat milk, Kesong Puti |
| Iba Pa (Others) | 🌿 | Copra, Abaka, Cacao, Coffee, Bamboo |

## 🏗 Tech Stack

- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Map**: Leaflet.js + OpenStreetMap (free, no API key needed)
- **Backend & Database**: Lovable Cloud
- **Auth**: Lovable Cloud built-in authentication
- **Hosting**: Lovable Cloud ([agrimapph.lovable.app](https://agrimapph.lovable.app))
- **PWA**: Service worker + Web App Manifest

## 👥 Who Is This For?

| User | How They Use AgriMap PH |
|------|------------------------|
| 🧑‍🌾 Farmers | Report what they harvested or planted via Mag-ulat |
| 🚚 Traders | Find surplus areas to source produce at farm gate prices |
| 🏛 LGU Officials | Monitor supply and demand in their area |
| 📊 Researchers | Export CSV data for agricultural studies |
| 🏢 DA / Government | National food repositioning planning and decision making |

## 🔐 Access Levels

| Action | Public | Logged In |
|--------|--------|-----------|
| View map | ✅ | ✅ |
| Browse Listahan | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| Submit report (Mag-ulat) | ❌ | ✅ |
| Edit own report | ❌ | ✅ |
| Delete own report | ❌ | ✅ |

## 🗺 Why Barangay-Level?

Provincial or regional data is too broad to be actionable. A surplus in "Mindanao" doesn't tell a trader where to send a truck. AgriMap PH goes down to the barangay level so logistics decisions can be made with precision — the right produce, from the right sitio, at the right time.

## 🚀 Roadmap

- [ ] Push notifications when your area goes from surplus to deficit
- [ ] Harvest countdown reminders for Paparating entries
- [ ] Trader/buyer matching — post what you want to buy
- [ ] Verified farmer badge system
- [ ] Logistics cost calculator between surplus and deficit areas
- [ ] Price trend charts per commodity per region
- [ ] Integration with DA price monitoring data
- [ ] SMS reporting for farmers without smartphones
- [ ] Barangay official verification tier

## 📖 Background

AgriMap PH is the civilian, crowdsourced version of the National Food Demand and Supply Map that the Department of Agriculture attempted to build in 2017-2019 under the UN-FAO National Food Consumption Quantification Study — a project that was shelved when its champion left government. AgriMap PH picks up where that initiative left off, without needing a government mandate to work.

## 📄 License

MIT License — free to use, fork, and build upon.
