# 🌾 AgriMap PH

National Agricultural Supply & Demand Intelligence Map

A mobile-first Progressive Web App (PWA) that crowdsources real-time agricultural supply and demand data across the Philippines — down to the barangay level. Built to solve the food repositioning problem across the country's 7,000+ islands.

Live app: https://agrimapph.lovable.app

## 🌟 The Problem

The Philippines does not have a food supply problem — it has a food repositioning problem:

- Sardines sell for ₱200 in Manila but ₱50 in Zamboanga del Norte
- Tomatoes rot in Nueva Vizcaya while Zamboanga imports tomato paste from China
- Onions bought from Mindoro farmers for ₱12/kg during harvest sell for ₱700 off-season
- Bananas from Davao cost more to ship to Manila than to export to Japan

AgriMap PH makes surplus and deficit visible in real time so traders, buyers, LGUs, and government planners can act before produce rots.

## ✨ Current Features

### 🗺 Mapa (Map View)

- Interactive Leaflet map using OpenStreetMap tiles centered on the Philippines
- Color-coded pins: 🟢 Sobra (Surplus) · 🔴 Kulang (Deficit) · 🟡 Sapat (Balanced)
- Pin size reflects volume — bigger = more supply
- Commodity-specific emoji icons on every pin (🌽 🍅 🐟 🐔 🐷 🦐 etc.)
- **Ngayon / Paparating toggle**:
  - **Ngayon** — current supply and demand reports with colored pins
  - **Paparating** — planting intentions with emoji pins and harvest countdown (e.g. 'Harvest in 6 weeks')
- Near-harvest pins (within 2 weeks) pulse orange as an early warning signal
- Filter bottom sheet: filter by category, commodity, and status — all filters stack together
- Tap any pin → bottom sheet with full details above the bottom navigation

### 📍 Pin Detail Sheet

- Commodity name, emoji, and status badge
- Price with dynamic unit (₱/kg · ₱/liter · ₱/piraso · ₱/ulo etc.)
- Volume, season, and location (Barangay → Municipality → Province)
- Reporter name
- 📞 **Tumawag** button (opens phone dialer) — shown only if phone number provided
- 💬 **Messenger** button (opens m.me/username) — shown only if Messenger username provided
- For **Paparating** pins: planted date, growth stage, expected volume, harvest countdown

### 📋 Listahan (Table View)

- Full data table reading live from Supabase
- Columns: Type, Region, Province, Municipality, Barangay, Commodity, Status, Price, Volume, Season, Contact
- Sortable columns with ▲▼ indicators
- Horizontally scrollable on mobile
- Filter by Ngayon/Paparating/Lahat, status, and commodity
- Search across region, province, barangay, and commodity
- Contact column with 📞 and 💬 icon buttons
- Export to CSV — downloads currently filtered data

### ➕ Mag-ulat (Report Form)

- Requires login — public can view, only registered users can report
- **Ani Ko Ngayon** — report current harvest/supply:
  - Category selector (🌾 Pananim · 🐟 Isda · 🐔 Manok/Itlog · 🐖 Hayop · 🥛 Gatas · 🌿 Iba Pa)
  - Commodity dropdown filtered by category with emoji icons
  - Dynamic price label per category (₱/kg for crops, ₱/liter for dairy, ₱/piraso for eggs, etc.)
  - Volume selector (Napakataas/Mataas/Katamtaman/Mababa)
  - Status selector (Sobra/Kulang/Sapat)
  - Cascading location dropdowns (Region → Province → Municipality → Barangay)
  - GPS auto-fill (📍 Gamitin ang aking lokasyon) with coordinates auto-set from selected municipality
  - Optional phone number and Messenger username fields
  - Notes field
- **Itinanim Ko** — log planting intentions:
  - All fields above plus: Date Planted, Expected Harvest Date
  - Auto-calculated harvest countdown display
  - Growth Stage selector (Bagong Tanim/Lumalaki/Malapit nang Anihin)
  - Expected volume field
  - Conditional fields by category (e.g. Date Stocked for fish, Number of Heads for livestock)

### 🌐 Bilingual Support

- EN/FIL language toggle on all screens
- All labels, buttons, and form fields translated
- Designed for non-tech-savvy farmers: large tap targets, simple language, big buttons

### 🔒 Privacy & Contact

- Phone numbers and Messenger usernames are never shown as raw text
- Shown only as action buttons (📞 Tumawag, 💬 Messenger)
- Contact info is opt-in with clear disclosure at time of submission
- Compliant with Philippine Data Privacy Act of 2012 (RA 10173)

## 🗂 Food Categories

| Category | Emoji | Examples |
|----------|-------|----------|
| Pananim (Crops) | 🌾 | Rice, Corn, Tomato, Onion, Garlic, Banana, Mango, Durian |
| Isda at Pagkaing-dagat (Fish & Seafood) | 🐟 | Sardinas, Bangus, Tilapia, Sugpo, Alimango, Seaweed |
| Manok at Itlog (Poultry & Eggs) | 🐔 | Broiler, Native Chicken, Eggs, Duck |
| Hayop (Livestock) | 🐖 | Baboy, Baka, Kambing, Kalabaw |
| Produktong Gatas (Dairy) | 🥛 | Carabao milk, Goat milk, Kesong Puti |
| Iba Pa (Others) | 🌿 | Copra, Abaka, Cacao, Coffee, Bamboo |

## 🏗 Tech Stack

- **Frontend**: React + Tailwind CSS (via Lovable)
- **Map**: Leaflet.js + OpenStreetMap (free, no API key needed)
- **Database**: Supabase (PostgreSQL) — migrated from Lovable Cloud
- **Auth**: Supabase Auth (email/password)
- **Hosting**: Lovable ([agrimapph.lovable.app](https://agrimapph.lovable.app))
- **Project management**: Trello ([trello.com/b/dXtv7yen/agrimap-ph](https://trello.com/b/dXtv7yen/agrimap-ph))

## 🗄 Database Schema

- **agri_reports** (main table — 31 columns)
  - Key fields: `category`, `subcategory`, `region`, `province`, `municipality`, `barangay`, `lat`, `lng`, `volume`, `status`, `price`, `price_unit`, `season`, `record_type`, `planted_date`, `expected_harvest_date`, `growth_stage`, `expected_volume`, `phone_number`, `messenger_username`, `user_id`
- **commodities** — 50 rows with emoji mapping per category
- **ph_locations** — Philippine location reference table
- Row Level Security: public SELECT, authenticated INSERT, owner-only UPDATE/DELETE

## 👥 Who Is This For?

| User | How They Use AgriMap PH |
|------|------------------------|
| 🧑‍🌾 Farmers | Report harvest or planting intentions via Mag-ulat |
| 🚚 Traders | Find surplus areas, contact farmers directly via phone/Messenger |
| 🏛 LGU Officials | Monitor supply and demand in their area |
| 📊 Researchers | Export CSV data for agricultural studies |
| 🏢 DA / Government | National food repositioning planning |

## 🔐 Access Levels

| Action | Public | Logged In |
|--------|--------|-----------|
| View map (Mapa) | ✅ | ✅ |
| Browse table (Listahan) | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| Submit report (Mag-ulat) | ❌ | ✅ |
| Edit own report | ❌ | ✅ |
| Delete own report | ❌ | ✅ |

## 📖 Background

AgriMap PH is the civilian, crowdsourced version of the National Food Demand and Supply Map that the Department of Agriculture attempted to build in 2017-2019 under the UN-FAO National Food Consumption Quantification Study — a project shelved when its champion left government. AgriMap PH picks up where that initiative left off, without needing a government mandate to work.

Inspired by the writing of former DA Secretary Emmanuel Piñol, who identified food repositioning — not food production — as the core problem of Philippine food security.

## 🚀 Roadmap

### In Progress

- [ ] Map filter commodity dropdown filtering pins
- [ ] Desktop right-side panel layout
- [ ] Google OAuth login

### Planned

- [ ] Component refactor (shared ContactButtons, StatusBadge, CommodityIcon)
- [ ] Repository pattern for centralized Supabase queries
- [ ] Global state store (filters persist across tabs)
- [ ] Form schema validation with Zod
- [ ] Optimistic UI (instant pin on map before Supabase confirms)
- [ ] User profile page (name, photo, contact info)

### Future

- [ ] Push notifications when commodity status changes
- [ ] Harvest countdown reminders for Paparating entries
- [ ] Trader/buyer matching
- [ ] Verified farmer badge system
- [ ] Logistics cost calculator between surplus/deficit areas
- [ ] Price trend charts per commodity per region
- [ ] DA price monitoring data integration
- [ ] SMS reporting for farmers without smartphones
- [ ] Admin dashboard for data verification

## 📄 License

MIT License — free to use, fork, and build upon.
