---
name: project-overview
description: Comprehensive overview of AgriMap PH project architecture, scope, and design conventions
metadata:
  type: project
---

# AgriMap PH — Project Overview

## What It Is
Philippine agricultural supply and demand PWA. Farmers, fisherfolk, 
and livestock raisers crowdsource real-time data on what food is 
available, where, and at what price — solving the food repositioning 
problem across 7,000+ islands.

## App Structure — 4 Tabs
1. 🗺 Mapa — Leaflet map with supply/demand pins
2. 📋 Listahan — sortable data table
3. 📊 Dashboard — price trends, gaps, stats
4. ➕ Mag-ulat — report submission form

## Supabase Tables

### agri_reports (main table)
Columns: id, category, subcategory, region, province, municipality, 
barangay, lat, lng, volume, status, price, price_unit, season,
record_type, planted_date, expected_harvest_date, growth_stage,
expected_volume, reported_by, phone_number, messenger_username,
user_id, created_at, updated_at

- **category values:** crops, fish, poultry, livestock, dairy, other
- **status values:** surplus, deficit, balanced
- **volume values:** Very High, High, Medium, Low
- **record_type values:** current_supply, planting_intention
- **growth_stage values:** Planted, Growing, Near Harvest, Harvested

### user_profiles
Columns: id (references auth.users), full_name, user_type, primary_commodity,
farm_region, farm_province, farm_municipality, farm_barangay,
land_area, vessel_type, rsbsa_number, philsys_id, rsbsa_submitted,
verification_tier, is_verifier, verifier_municipality,
verified_by, verified_at, phone_number, messenger_username,
avatar_url, created_at, updated_at

- **user_type values:** magsasaka, mangingisda, mag-aalaga, 
  negosyante, lgu, researcher, publiko
- **verification_tier values:** basic, lgu_verified, 
  government_pending, government

### commodities
Columns: id, name, category, emoji, unit

## Supabase Config
- **Project URL:** https://gnrhciktvgokhipvsvcq.supabase.co
- **RLS:** public SELECT on agri_reports and commodities
- **Auth:** required for INSERT on agri_reports

## UI Conventions
- **Primary green:** #16a34a
- **Surplus:** #22c55e (green)
- **Deficit:** #ef4444 (red)
- **Balanced:** #f59e0b (yellow)
- **Navigation:** Bottom nav on mobile, 4 tabs
- **Modals:** Bottom sheets for modals on mobile
- **Localization:** Bilingual toggle EN/FIL on all screens
- **Accessibility:** Minimum tap target: 52px
- **Commodity emojis:** Rice🌾 Corn🌽 Tomato🍅 Onion🧅 
  Garlic🧄 Saging🍌 Mangga🥭 Sardinas🐟 Bangus🐠 
  Sugpo🦐 Alimango🦀 Manok🐔 Itlog🥚 Baboy🐷 Baka🐄 
  Kambing🐐 Kalabaw🐃

## Key Features Built
- Leaflet map with colored pins (surplus/deficit/balanced)
- Ngayon/Paparating map toggle
- Pin clustering with count badges
- Horizontal legend (Sobra/Kulang/Sapat/Paparating)
- Filter bottom sheet (category pills + status buttons)
- Pin detail bottom sheet with 📞 Tumawag + 💬 Messenger buttons
- Listahan table with sortable columns + CSV export
- Dashboard with summary cards, price gap, trend chart
- Mag-ulat form with Zod validation
- Cascading location dropdowns (PSGC API + JSON fallback)
- User registration with farmer onboarding flow
- QR code profile page per user
- Verification tiers (basic/lgu_verified/government)

## Currently Building
**Location Profile feature:**
- Search bar on Dashboard tab
- Shows all products from a selected location
- Paparating section for upcoming harvests
- Reporters section linked to user profiles
