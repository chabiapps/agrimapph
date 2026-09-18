---
name: database-schema
description: Detailed schema and common query patterns for the Supabase database
metadata:
  type: reference
---

# Database Schema

## agri_reports
Primary table for all supply/demand reports.

**Columns:**
- `id`: UUID (Primary Key)
- `category`: String (crops, fish, poultry, livestock, dairy, other)
- `subcategory`: String
- `region`: String
- `province`: String
- `municipality`: String
- `barangay`: String
- `lat`: Float
- `lng`: Float
- `volume`: String (Very High, High, Medium, Low)
- `status`: String (surplus, deficit, balanced)
- `price`: Number
- `price_unit`: String
- `season`: String
- `record_type`: String (current_supply, planting_intention)
- `planted_date`: Date
- `expected_harvest_date`: Date
- `growth_stage`: String (Planted, Growing, Near Harvest, Harvested)
- `expected_volume`: String
- `reported_by`: String
- `phone_number`: String
- `messenger_username`: String
- `user_id`: UUID (Foreign Key to user_profiles)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Key Queries:**
```sql
-- Get all current supply for map
select * from agri_reports 
where record_type = 'current_supply'

-- Get surplus in a location
select * from agri_reports
where municipality = 'Bambang'
and status = 'surplus'

-- Get price gaps
select subcategory,
  min(price) as lowest_price,
  max(price) as highest_price,
  max(price) - min(price) as gap
from agri_reports
where record_type = 'current_supply'
group by subcategory
having count(distinct status) > 1
order by gap desc
```

## user_profiles
One row per auth user. Created during onboarding.

**Columns:**
- `id`: UUID (Primary Key, references auth.users)
- `full_name`: String
- `user_type`: String (magsasaka, mangingisda, mag-aalaga, negosyante, lgu, researcher, publiko)
- `primary_commodity`: String
- `farm_region`: String
- `farm_province`: String
- `farm_municipality`: String
- `farm_barangay`: String
- `land_area`: String/Number
- `vessel_type`: String
- `rsbsa_number`: String
- `philsys_id`: String
- `rsbsa_submitted`: Boolean
- `verification_tier`: String (basic, lgu_verified, government_pending, government)
- `is_verifier`: Boolean
- `verifier_municipality`: String
- `verified_by`: UUID
- `verified_at`: Timestamp
- `phone_number`: String
- `messenger_username`: String
- `avatar_url`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Key Queries:**
```sql
-- Get reporter details for a location
select u.full_name, u.user_type, u.verification_tier,
  u.primary_commodity
from user_profiles u
join agri_reports r on r.user_id = u.id
where r.municipality = 'Bambang'
group by u.id
```

## commodities
Reference table with 50 rows. Used to populate dropdowns and map emojis.

**Columns:**
- `id`: UUID (Primary Key)
- `name`: String
- `category`: String
- `emoji`: String
- `unit`: String
