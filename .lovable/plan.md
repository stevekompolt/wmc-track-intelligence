

# Clone Utah 2026 as Public Page with SFDC Portal Login Tracking

## Overview
Create a new public page (no login required) that clones the Utah 2026 experience with a different Cesium story. It reads `?email=` from the URL, looks up the contact in SFDC, and posts a "Portal Login" record — the same pattern used in wmc-media-hub.

## Changes

### 1. `src/services/portalTrackingService.ts` — New file
Standalone service with three functions ported from wmc-media-hub:
- `getCurrentIpAddress()` — tries ipify, ipinfo, my-ip.io, httpbin
- `getIPLocation(ip)` — fetches country/city from ipapi.co with localStorage caching
- `trackPortalLogin(contactId)` — creates a hidden iframe, POSTs to `https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php` with sObj=`ri__Portal__c`, action=`WMC Intel Portal Login`, contactId, IP, city, country, login URL
- `lookupContactByEmail(email)` — calls the existing SFDC endpoint (`specific-wmc-member-email.py`) and returns the contact ID (parses the same XML/text response format already used in AuthContext)

### 2. `src/pages/PublicExperience.tsx` — New file
Clone of Utah2026 with these differences:
- Reads `email` from `useSearchParams()`
- On mount, if email is present: calls `lookupContactByEmail(email)` → if contact found, calls `trackPortalLogin(contactId)`
- Uses a placeholder Cesium story URL (different from Utah 2026) — I'll use the same one for now and you can swap it later
- Different title/branding (e.g. "WMC Experience")
- Same start overlay, audio toggle, 1-second delay pattern
- Full-screen layout with no app chrome (no sidebar, no nav)

### 3. `src/App.tsx` — Add public route
Add `/experience` as a public route (outside the ProtectedRoute wrapper, alongside `/login`):
```tsx
<Route path="/experience" element={<PublicExperience />} />
```

### Files
- **New**: `src/services/portalTrackingService.ts`, `src/pages/PublicExperience.tsx`
- **Edit**: `src/App.tsx` (add one public route)

