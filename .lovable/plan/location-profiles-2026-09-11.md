# Location Profiles

## What will be built
- Add a public location search at the top of the Dashboard with live matches for regions, provinces, municipalities, and barangays.
- Open one shared Location Profile sheet from either a search result or a map cluster.
- Show the location name, report count, latest update, food-status totals and proportion bar, products grouped by category, upcoming harvests with countdowns, and unique local reporters.
- Make each reporter row open the existing public QR profile page.

## Map behavior
- Keep the cluster's normal zoom behavior.
- When a cluster is tapped, select the deepest location shared by its reports (barangay, municipality, province, then region) and open that location's profile after zooming.

## Data and filtering
- Reuse the loaded report data and include each report's creation/update timestamps.
- Match a selected location by its exact hierarchy so broad searches such as Cavite include all nested reports while barangay matches remain precise.
- Load matching reporter details from `user_profiles` only for reporter IDs present in the selected location.
- Show Paparating only when matching planting-intention records exist, sorted by expected harvest date; products are grouped by category and ordered by latest report.

## Technical details
- Create reusable location types/helpers and a dedicated Location Profile sheet component.
- Pass the selected location from Dashboard and AgriMap up to the main page so both entry points use the same sheet.
- Attach report data to map markers so cluster-click handlers can derive the shared location without extra requests.
- Preserve the existing bottom navigation, filters, pin detail sheet, and public Dashboard access.
- Verify compilation and test the Dashboard search, profile content, map cluster opening, and reporter links on a mobile viewport.
