

## Fresh Start: Home Page with Leaflet Map & Address Search

The previous implementation had version compatibility issues. This plan starts clean.

### Root Cause of Previous Failure
`react-leaflet` v4/v5 has known compatibility issues with React 18 in certain bundler configurations. The fix is to ensure we use `react-leaflet@4.2.1` (the last stable v4 release) and import Leaflet CSS properly.

### What gets built
1. **Full-screen Leaflet/OpenStreetMap map** centered on NYC — free, no API key
2. **Centered floating search bar** — white, rounded, shadow, search icon
3. **On submit**: geocode via free Nominatim API, fade out search bar, fly map to pin
4. **Back button** to return to search

### Changes

1. **Delete** `src/components/MapView.tsx`, `src/components/AddressSearchBar.tsx` — start fresh
2. **Recreate `src/components/MapView.tsx`** — use `react-leaflet` v4 (`MapContainer`, `TileLayer`, `Marker`, `Popup`, `useMap`). Import Leaflet CSS inline. Fix default marker icons. Use `flyTo()` for animation.
3. **Recreate `src/components/AddressSearchBar.tsx`** — styled floating input with CSS transitions for fade-out
4. **Rewrite `src/pages/Index.tsx`** — full-screen layout, geocoding via Nominatim, state management for marker/search visibility
5. **Add Leaflet CSS import** in `src/index.css`: `@import "leaflet/dist/leaflet.css";`
6. **Ensure `package.json`** has `react-leaflet@4.2.1` and `leaflet@1.9.4`

### Key difference from previous attempt
- Explicitly pin `react-leaflet` to `4.2.1` to avoid React 18 incompatibility
- Import Leaflet CSS via `index.css` `@import` instead of in the component to avoid bundling issues

