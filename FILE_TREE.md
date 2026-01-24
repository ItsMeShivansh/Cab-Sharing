# 📁 CampusPool - Complete File Structure

```
Cab-Sharing/
│
├── 📄 package.json                      # Dependencies and scripts
├── 📄 tsconfig.json                     # TypeScript configuration
├── 📄 next.config.js                    # Next.js configuration
├── 📄 tailwind.config.ts                # Tailwind CSS configuration
├── 📄 postcss.config.js                 # PostCSS configuration
├── 📄 middleware.ts                     # Clerk auth middleware (CRITICAL)
├── 📄 .env.example                      # Environment variables template
├── 📄 .gitignore                        # Git ignore rules
├── 📄 README.md                         # Project documentation
├── 📄 SETUP_GUIDE.md                    # Step-by-step setup instructions
├── 📄 ALGORITHM_EXPLAINED.md            # Deep dive into polyline matching
│
├── 📁 app/                              # Next.js App Router
│   ├── 📄 layout.tsx                    # Root layout with ClerkProvider
│   ├── 📄 page.tsx                      # Main application page ⭐
│   ├── 📄 globals.css                   # Global styles + Tailwind
│   │
│   ├── 📁 api/                          # API Routes (Backend)
│   │   ├── 📁 rides/
│   │   │   ├── 📁 create/
│   │   │   │   └── 📄 route.ts          # POST: Create ride + Google Directions
│   │   │   ├── 📁 search/
│   │   │   │   └── 📄 route.ts          # POST: Search with polyline matching ⭐
│   │   │   └── 📁 request/
│   │   │       └── 📄 route.ts          # POST/GET: Ride requests
│   │   └── 📁 webhooks/
│   │       └── 📁 clerk/
│   │           └── 📄 route.ts          # Clerk user sync webhook
│   │
│   ├── 📁 sign-in/
│   │   └── 📁 [[...sign-in]]/
│   │       └── 📄 page.tsx              # Sign in page
│   └── 📁 sign-up/
│       └── 📁 [[...sign-up]]/
│           └── 📄 page.tsx              # Sign up page (@iiit.ac.in only)
│
├── 📁 components/                       # React Components
│   ├── 📁 ui/                           # Shadcn/UI Components
│   │   ├── 📄 button.tsx
│   │   ├── 📄 card.tsx
│   │   ├── 📄 input.tsx
│   │   ├── 📄 label.tsx
│   │   ├── 📄 switch.tsx
│   │   ├── 📄 toast.tsx
│   │   ├── 📄 toaster.tsx
│   │   └── 📄 use-toast.ts
│   │
│   ├── 📄 RideCard.tsx                  # Display ride details
│   ├── 📄 RouteVisualizer.tsx           # Google Maps with polyline rendering ⭐
│   ├── 📄 CreateRideForm.tsx            # Form for drivers to create rides
│   └── 📄 SearchRidesForm.tsx           # Form for passengers to search rides
│
├── 📁 lib/                              # Utility Libraries
│   ├── 📄 db.ts                         # Prisma client singleton
│   ├── 📄 utils.ts                      # General utilities (cn function)
│   ├── 📄 google-maps.ts                # Google Maps API wrapper
│   └── 📄 polyline-utils.ts             # ⭐⭐⭐ CORE ALGORITHM ⭐⭐⭐
│                                        #   - isPointOnRoute()
│                                        #   - crossTrackDistance()
│                                        #   - haversineDistance()
│
└── 📁 prisma/
    └── 📄 schema.prisma                 # Database schema with PostGIS
                                         #   - Users table
                                         #   - Rides table
                                         #   - RideRequests table
```

## 🌟 Star Files (Most Important)

### 1. `lib/polyline-utils.ts` ⭐⭐⭐
**THE CORE INNOVATION**
- Contains the polyline matching algorithm
- Cross-track distance calculations
- Haversine distance formula
- Point-on-route detection

**Key Functions:**
```typescript
isPointOnRoute(point, encodedPolyline, threshold)
crossTrackDistance(point, lineStart, lineEnd)
haversineDistance(point1, point2)
```

### 2. `app/api/rides/search/route.ts` ⭐⭐
**THE MATCHING ENGINE**
- Uses polyline-utils to filter rides
- Implements the search logic
- Returns matched rides with distances

### 3. `prisma/schema.prisma` ⭐⭐
**THE DATA MODEL**
- Users with trust scores
- Rides with encoded polylines
- RideRequests for passenger matching

### 4. `app/page.tsx` ⭐
**THE USER INTERFACE**
- Main application entry point
- Tab switching between search/create
- Authentication checks

### 5. `components/RouteVisualizer.tsx` ⭐
**THE MAP VISUALIZATION**
- Renders routes on Google Maps
- Shows pickup/dropoff connections
- Visual feedback for matches

## 📊 Code Statistics

- **Total Files**: 35
- **TypeScript Files**: 28
- **React Components**: 13
- **API Routes**: 4
- **Lines of Code**: ~3,500

## 🔍 File Relationships

```
User Request
    ↓
app/page.tsx (UI)
    ↓
components/SearchRidesForm.tsx
    ↓
app/api/rides/search/route.ts (Backend)
    ↓
lib/polyline-utils.ts (Algorithm) ⭐
    ↓
lib/db.ts (Database)
    ↓
prisma/schema.prisma
    ↓
PostgreSQL + PostGIS
```

## 🎯 Critical Configuration Files

### `.env`
**Purpose**: Stores all secrets and API keys
**Required for**: Everything to work

### `middleware.ts`
**Purpose**: Protects routes with Clerk authentication
**Critical**: Without this, app is public!

### `prisma/schema.prisma`
**Purpose**: Defines database structure
**Must have**: PostGIS extension enabled

## 🚀 Entry Points

### For Users:
- `/` - Main application (requires auth)
- `/sign-in` - Login page
- `/sign-up` - Registration page

### For Developers:
- `app/page.tsx` - Start here for UI
- `lib/polyline-utils.ts` - Start here for algorithm
- `prisma/schema.prisma` - Start here for data model

## 📦 Dependencies Breakdown

### Core Framework:
- `next` - Next.js 14 framework
- `react` - React 18
- `typescript` - Type safety

### UI:
- `tailwindcss` - Styling
- `@radix-ui/*` - Headless components
- `lucide-react` - Icons

### Backend:
- `@prisma/client` - Database ORM
- `@clerk/nextjs` - Authentication

### Geospatial:
- `@googlemaps/polyline-codec` - Polyline encoding/decoding ⭐
- `@vis.gl/react-google-maps` - React Google Maps
- PostGIS - Database spatial extension

### Utilities:
- `zod` - Schema validation
- `date-fns` - Date formatting
- `clsx` + `tailwind-merge` - Class name utilities

## 🧪 Test Data Locations

For testing, use these Hyderabad coordinates:

```typescript
// test-data.ts (create this if needed)
export const TEST_LOCATIONS = {
  iiit: { lat: 17.4446, lng: 78.3499 },
  gachibowli: { lat: 17.4400, lng: 78.3480 },
  hitechCity: { lat: 17.4435, lng: 78.3772 },
  kondapur: { lat: 17.4569, lng: 78.3676 },
  madhapur: { lat: 17.4485, lng: 78.3908 }
};
```

## 📝 Documentation Files

1. **README.md** - Project overview, features, tech stack
2. **SETUP_GUIDE.md** - Step-by-step installation
3. **ALGORITHM_EXPLAINED.md** - Mathematical deep dive
4. **FILE_TREE.md** (this file) - File structure guide

---

**Pro Tip**: Use VS Code's file search (Cmd+P) to quickly navigate between files!
