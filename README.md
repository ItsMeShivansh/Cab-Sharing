# CampusPool - IIIT Hyderabad Ride Sharing Platform

A sophisticated ride-sharing web application exclusively for IIIT Hyderabad students, built with Next.js 14, featuring advanced geospatial route matching.

## 🎯 Key Features

- **Advanced Polyline Matching**: Matches passengers along the driver's route, not just start/end points
- **Ghost Mode**: Drivers can hide rides from public view (visible only to matching passengers)
- **Real-time Route Visualization**: Interactive maps showing driver routes and passenger pickup points
- **Trust Score System**: Community-based reputation system for safety
- **Mobile-First Design**: Optimized for students accessing on phones
- **Authentication Ready**: Database schema supports user authentication (can be added later)

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: SQLite (development) - production ready for PostgreSQL/MySQL
- **Maps & Routing**: Google Maps JavaScript API + Google Directions API
- **ORM**: Prisma
- **Geospatial Processing**: Custom polyline algorithms with cross-track distance calculations

## 📁 Project Structure

```
Cab-Sharing/
├── app/
│   ├── api/
│   │   └── rides/
│   │       ├── create/
│   │       │   └── route.ts          # POST: Create new ride with Google Directions
│   │       ├── search/
│   │       │   └── route.ts          # POST: Search rides with polyline matching
│   │       └── request/
│   │           └── route.ts          # POST/GET: Ride requests management
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Main application page
│   └── globals.css                   # Global styles with Tailwind
├── components/
│   ├── ui/                           # Shadcn/UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── switch.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   └── use-toast.ts
│   ├── CreateRideForm.tsx            # Form for creating new rides
│   ├── SearchRidesForm.tsx           # Form for searching rides
│   ├── RideCard.tsx                  # Display ride details
│   └── RouteVisualizer.tsx           # Google Maps integration
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── google-maps.ts                # Google Maps API utilities
│   ├── polyline-utils.ts             # ⭐ Core polyline matching algorithms
│   └── utils.ts                      # General utilities
├── prisma/
│   └── schema.prisma                 # Database schema with PostGIS
├── .env.example                      # Environment variables template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── postcss.config.js
```

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following keys:

```bash
# Database (SQLite - Local file)
DATABASE_URL="file:./prisma/dev.db"

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Google Cloud account with Maps APIs enabled
- Node.js 18 or later
- PostgreSQL with PostGIS extension
- Google Cloud account with Maps API enabled

### Installation

1. **Clone and install dependencies:**

```bash
cd Cab-Sharing
npm install
```

2. **Set up PostgreSQL with PostGIS:**

```sql
CREATE DATABASE campuspool;
\c campuspool
CREATE EXTENSION postgis;
```

3. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. **Set up Prisma:**

```bash
npx prisma generate
npx prisma db push
```

5. **Enable Google Maps APIs:**
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API

6. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧮 Core Algorithm: Polyline Matcher

The heart of CampusPool is the **polyline matching algorithm** located in [`lib/polyline-utils.ts`](lib/polyline-utils.ts).

### How It Works

1. **Route Encoding**: When a driver creates a ride, Google Directions API returns an `overview_polyline` (encoded string)
2. **Storage**: The encoded polyline is stored directly in the database (space-efficient)
3. **Matching**: When a passenger searches:
   - Decode the polyline into coordinate arrays
   - For each route segment, calculate the **cross-track distance** (perpendicular distance from point to line)
   - Match if both pickup AND dropoff are within threshold (default: 500m)

### Key Functions

```typescript
// Check if a point is within threshold distance from the route
isPointOnRoute(
  passengerCoords: Coordinates,
  encodedPolyline: string,
  threshold: number = 500
): { isMatch: boolean; minDistance: number; closestPoint?: Coordinates }

// Calculate perpendicular distance from point to line segment
crossTrackDistance(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): number

// Haversine distance between two points
haversineDistance(point1: Coordinates, point2: Coordinates): number
```

## 📊 Database Schema

### Users Table
- `id`: Unique identifier (string)
- `email`: User email address
- `name`: Full name
- `phone`: Contact number
- `trust_score`: Reputation score (0-100)

### Rides Table
- `driver_id`: Foreign key to Users
- `origin_lat/lng`: Starting coordinates
- `dest_lat/lng`: Destination coordinates
- `route_polyline`: Encoded polyline from Google (TEXT)
- `departure_time`: When the ride starts
- `max_passengers`: Available seats
- `ghost_mode`: Boolean for visibility
- `status`: OPEN | FULL | COMPLETED | CANCELLED

### RideRequests Table
- `passenger_id`: Foreign key to Users
- `ride_id`: Foreign key to Rides
- `pickup_lat/lng`: Where passenger wants to be picked up
- `dropoff_lat/lng`: Where passenger wants to be dropped off
- `status`: PENDING | ACCEPTED | REJECTED

## 🎨 UI Components

### RideCard
Displays ride information with:
- Origin and destination
- Departure time
- Available seats
- Match details (distance from route)
- Driver info and trust score

### RouteVisualizer
Interactive Google Map showing:
- Blue line: Driver's route
- Green marker: Origin
- Red marker: Destination
- Blue marker: Passenger pickup
- Orange marker: Passenger dropoff
- Green dotted line: Connection from pickup to route
- Red dotted line: Connection from dropoff to route

### CreateRideForm
Form for drivers to:
- Enter origin and destination
- Set departure time
- Configure max passengers
- Enable Ghost Mode

### SearchRidesForm
Form for passengers to:
- Enter their pickup and dropoff locations
- Set preferred departure time
- Configure search radius
- View matching rides

## 🔐 Security Features

- Input validation with Zod
- SQL injection prevention via Prisma
- Protected API routes
- CSRF protection via Next.js
- Authentication ready (can be added later)

## 📱 Mobile Optimization

- Responsive Tailwind CSS design
- Touch-friendly interface
- Optimized map interactions
- Fast loading times
- Progressive Web App ready

## 🚦 API Endpoints

### POST `/api/rides/create`
Create a new ride offer
```json
{
  "originLat": 17.4446,
  "originLng": 78.3499,
  "originAddress": "IIIT Hyderabad",
  "destLat": 17.3850,
  "destLng": 78.4867,
  "destAddress": "Hitech City",
  "departureTime": "2026-01-25T10:00:00Z",
  "maxPassengers": 3,
  "ghostMode": false
}
```

### POST `/api/rides/search`
Search for matching rides
```json
{
  "pickupLat": 17.4400,
  "pickupLng": 78.3480,
  "dropoffLat": 17.3900,
  "dropoffLng": 78.4800,
  "thresholdMeters": 500,
  "departureTime": "2026-01-25T09:30:00Z"
}
```

### POST `/api/rides/request`
Request to join a ride
```json
{
  "rideId": "clx123...",
  "pickupLat": 17.4400,
  "pickupLng": 78.3480,
  "pickupAddress": "Near IIIT Gate",
  "dropoffLat": 17.3900,
  "dropoffLng": 78.4800,
  "dropoffAddress": "Hitech City Metro"
}
```

## 🧪 Testing the Algorithm

Example test coordinates (IIIT Hyderabad area):

- **IIIT Main Gate**: 17.4446, 78.3499
- **Gachibowli**: 17.4400, 78.3480
- **Hitech City**: 17.3850, 78.4867
- **Madhapur**: 17.4485, 78.3908

## 📝 Future Enhancements

- Real-time location tracking
- In-app chat between driver and passengers
- Payment integration
- Rating and review system
- Push notifications
- Recurring ride schedules
- Ride history and analytics

## 🤝 Contributing

This is a student project for IIIT Hyderabad. Contributions are welcome!

## 📄 License

MIT License - Feel free to use this project for learning purposes.

## 🙏 Acknowledgments

- IIIT Hyderabad community
- Google Maps Platform
- Shadcn/UI for components
- Next.js and Vercel teams

---

Built with ❤️ for the IIIT Hyderabad community
