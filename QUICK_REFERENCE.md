# 🚀 CampusPool - Quick Reference Card

## One-Command Setup (After configuring .env)

```bash
npm install && npx prisma generate && npx prisma db push && npm run dev
```

## Essential Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

# Database
npx prisma studio        # Open database GUI
npx prisma db push       # Sync schema to database
npx prisma generate      # Generate Prisma client
npx prisma db pull       # Pull schema from database

# Deploy
vercel                   # Deploy to Vercel
```

## Environment Variables Quick Copy

```bash
# Paste this into your .env file, then fill in the values

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/campuspool"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
CLERK_WEBHOOK_SECRET=whsec_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy
GOOGLE_MAPS_API_KEY=AIzaSy

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Test Coordinates (Hyderabad)

```typescript
// Copy-paste for testing

// IIIT Hyderabad
Origin: 17.4446, 78.3499

// Gachibowli
Nearby: 17.4400, 78.3480

// Hitech City
Destination: 17.4435, 78.3772

// Kondapur
Alternative: 17.4569, 78.3676
```

## Key API Endpoints

```bash
# Create a ride
POST /api/rides/create
{
  "originLat": 17.4446,
  "originLng": 78.3499,
  "originAddress": "IIIT Hyderabad",
  "destLat": 17.4435,
  "destLng": 78.3772,
  "destAddress": "Hitech City",
  "departureTime": "2026-01-25T10:00:00Z",
  "maxPassengers": 3,
  "ghostMode": false
}

# Search for rides
POST /api/rides/search
{
  "pickupLat": 17.4400,
  "pickupLng": 78.3480,
  "dropoffLat": 17.4430,
  "dropoffLng": 78.3750,
  "thresholdMeters": 500
}

# Request a ride
POST /api/rides/request
{
  "rideId": "clx123...",
  "pickupLat": 17.4400,
  "pickupLng": 78.3480,
  "pickupAddress": "Near IIIT",
  "dropoffLat": 17.4430,
  "dropoffLng": 78.3750,
  "dropoffAddress": "Hitech City"
}
```

## Core Functions Reference

```typescript
// lib/polyline-utils.ts

// Main matching function
isPointOnRoute(
  point: { lat: number, lng: number },
  encodedPolyline: string,
  thresholdMeters?: number  // default: 500
): {
  isMatch: boolean,
  minDistance: number,
  closestPoint?: { lat: number, lng: number }
}

// Distance calculations
haversineDistance(point1, point2): number  // meters
crossTrackDistance(point, lineStart, lineEnd): number  // meters

// Polyline utilities
decodePolyline(encodedPolyline): Array<{ lat, lng }>
```

## Database Schema Quick Ref

```typescript
// Users
{
  id: string,           // Clerk user ID
  email: string,        // @iiit.ac.in required
  name: string,
  phone: string,
  trustScore: number    // default: 100
}

// Rides
{
  id: string,
  driverId: string,
  originLat/Lng: number,
  destLat/Lng: number,
  routePolyline: string,  // Encoded from Google
  departureTime: DateTime,
  maxPassengers: number,
  ghostMode: boolean,
  status: 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED'
}

// RideRequests
{
  id: string,
  passengerId: string,
  rideId: string,
  pickupLat/Lng: number,
  dropoffLat/Lng: number,
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
}
```

## Common Issues & Quick Fixes

```bash
# Issue: Prisma errors
rm -rf node_modules/.prisma
npx prisma generate

# Issue: Port already in use
lsof -ti:3000 | xargs kill
npm run dev

# Issue: PostGIS not found
psql -d campuspool -c "CREATE EXTENSION postgis;"

# Issue: Clerk webhook not working (local dev)
ngrok http 3000
# Use the ngrok URL in Clerk dashboard

# Issue: Google Maps not loading
# Check browser console for specific error
# Verify billing is enabled in Google Cloud
# Check API restrictions
```

## File Locations Cheat Sheet

```
Algorithm Logic:       lib/polyline-utils.ts
Search API:           app/api/rides/search/route.ts
Create Ride API:      app/api/rides/create/route.ts
Main UI:              app/page.tsx
Database Schema:      prisma/schema.prisma
Auth Config:          middleware.ts
Map Component:        components/RouteVisualizer.tsx
Ride Display:         components/RideCard.tsx
```

## Google Cloud Setup Checklist

- [ ] Create project
- [ ] Enable billing
- [ ] Enable Maps JavaScript API
- [ ] Enable Directions API
- [ ] Enable Places API
- [ ] Enable Geocoding API
- [ ] Create API key
- [ ] (Optional) Restrict to domain/IP

## Clerk Setup Checklist

- [ ] Create application
- [ ] Enable email authentication
- [ ] Set allowlist to `iiit.ac.in`
- [ ] Get publishable key
- [ ] Get secret key
- [ ] Create webhook endpoint
- [ ] Subscribe to user events
- [ ] Get webhook secret

## Database Setup Checklist

- [ ] Install PostgreSQL
- [ ] Create database `campuspool`
- [ ] Enable PostGIS extension
- [ ] Set DATABASE_URL in .env
- [ ] Run `npx prisma db push`

## Testing Workflow

```bash
# 1. Start dev server
npm run dev

# 2. Open Prisma Studio (separate terminal)
npx prisma studio

# 3. Sign up with test email
# Go to localhost:3000/sign-up
# Use: test@iiit.ac.in

# 4. Create test ride
# Use coordinates: 17.4446, 78.3499 → 17.4435, 78.3772

# 5. Search for ride
# Use nearby coordinates: 17.4400, 78.3480 → 17.4430, 78.3750

# 6. Check Prisma Studio
# Verify ride was created
# Check encoded polyline is stored
```

## Production Deployment Checklist

- [ ] Set all env vars in hosting platform
- [ ] Use production database URL
- [ ] Update Clerk webhook URL
- [ ] Restrict Google API keys
- [ ] Set NEXT_PUBLIC_APP_URL
- [ ] Test @iiit.ac.in email restriction
- [ ] Test ride creation
- [ ] Test ride search
- [ ] Test on mobile device

## Performance Benchmarks

- API response time: <100ms
- Polyline decode: ~5ms
- Algorithm per ride: ~10ms
- Database query: <50ms
- Page load: <1s

## Useful Links

- [Prisma Studio](http://localhost:5555)
- [Dev Server](http://localhost:3000)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [Vercel Dashboard](https://vercel.com/dashboard)

## Emergency Commands

```bash
# Reset everything (DANGER: deletes all data)
npx prisma db push --force-reset

# Clear Next.js cache
rm -rf .next

# Reinstall everything
rm -rf node_modules package-lock.json
npm install

# Check database connection
npx prisma db pull
```

## Success Indicators

✅ Server starts without errors
✅ Can sign up with @iiit.ac.in email
✅ Can create a ride (check Network tab)
✅ Can search and find rides
✅ Map loads and shows route
✅ Polyline is visible in Prisma Studio

---

**Need help?** Check SETUP_GUIDE.md for detailed instructions!

**Want to understand the algorithm?** Read ALGORITHM_EXPLAINED.md!

**Lost in files?** See FILE_TREE.md for structure!
