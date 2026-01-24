# 🚀 CampusPool Setup Guide

Complete step-by-step guide to get CampusPool running locally.

## Prerequisites Checklist

- [ ] Node.js 18 or later installed
- [ ] Google Cloud account (with billing enabled)

## Step 1: Install Dependencies

```bash
cd /Users/itsmeshivansh/Desktop/Cab-Sharing
npm install
```

## Step 2: Configure Google Maps API

### Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API

### Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Optional but recommended) Restrict the key:
   - For browser key: Restrict to HTTP referrers (localhost:3000, your domain)
   - For server key: Restrict to IP addresses

**Important**: You'll need TWO API keys:
- One for frontend (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- One for backend (`GOOGLE_MAPS_API_KEY`)

They can be the same key initially, but for production, restrict them separately.

## Step 4: Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env
```

Fill in all the values:

```bash
# Database - SQLite local database (created automatically)
DATABASE_URL="file:./prisma/dev.db"

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Create SQLite database and tables (creates dev.db file)
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 7: Test the Application

The app will automatically generate a demo user ID for you.

### Test Ride Creation

Use these test coordinates for Hyderabad:

**IIIT Hyderabad to Hitech City:**
- Origin: `17.4446, 78.3499` (IIIT Hyderabad)
- Destination: `17.4435, 78.3772` (Gachibowli)

**Create a ride:**
1. Go to "Offer a Ride" tab
2. Fill in the form with test coordinates
3. Set departure time (future date)
4. Click "Create Ride"

### Test Ride Search

**Search for rides:**
1. Go to "Find a Ride" tab
2. Enter coordinates near the route:
   - Pickup: `17.4440, 78.3500` (near IIIT)
   - Dropoff: `17.4430, 78.3750` (near Gachibowli)
3. Click "Search Rides"
4. Should show the ride you created (if within 500m of route)

## Common Issues & Solutions

### Issue: Database file not found

**Solution:**
```bash
# The dev.db file is created automatically in prisma/ folder when you run:
npx prisma db push

# If you need to reset the database:
rm prisma/dev.db
npx prisma db push
```

### Issue: Google Maps not loading

**Solutions:**
- Check browser console for API key errors
- Verify API key is enabled for Maps JavaScript API
- Check billing is enabled in Google Cloud
- Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly

### Issue: Prisma client errors

**Solution:**
```bash
# Regenerate Prisma client
rm -rf node_modules/.prisma
npx prisma generate

# If schema changed, push again
npx prisma db push
```

## Production Deployment

### Recommended Platforms

1. **Vercel** (Best for Next.js)
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Railway** (Easier database setup)
3. **Netlify**

### Production Checklist

- [ ] Set all environment variables in hosting platform
- [ ] Migrate to a production database (PostgreSQL, MySQL recommended for production)
- [ ] Restrict Google Maps API keys to your domain
- [ ] Enable HTTPS
- [ ] Set up custom domain
- [ ] Add authentication if needed

**Note:** SQLite is great for development but for production, consider PostgreSQL or MySQL.

## Development Tips

### Useful Commands

```bash
# View database in browser
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Check database connection
npx prisma db pull

# Format Prisma schema
npx prisma format

# Build for production
npm run build

# Start production server
npm start
```

### Debugging

1. **Check API routes**: Use browser DevTools → Network tab
2. **Database issues**: Use Prisma Studio (`npx prisma studio`) to inspect
3. **Logs**: Check terminal and browser console

## Quick Start (TL;DR)

```bash
# 1. Install
npm install

# 2. Set up .env file with your credentials

# 3. Set up database
npx prisma generate
npx prisma db push

# 4. Run
npm run dev
```

## Support

For issues specific to:
- **Next.js**: [Next.js Docs](https://nextjs.org/docs)
- **Next.js**: [Next.js Docs](https://nextjs.org/docs)
- **Prisma**: [Prisma Docs](https://www.prisma.io/docs)
- **Google Maps**: [Google Maps Platform Docs](https://developers.google.com/maps)

## Architecture Notes

### The Polyline Matching Algorithm

The core innovation is in `lib/polyline-utils.ts`:

1. **isPointOnRoute()**: Main function that checks if a passenger's location is within threshold distance of driver's route
2. **crossTrackDistance()**: Calculates perpendicular distance from point to line segment using Haversine formula
3. **Encoded Polylines**: Stores Google's compressed route format (saves ~90% space vs raw coordinates)

### Database Choice

**Development (SQLite):**
- Zero configuration - file-based database
- Perfect for local development and testing
- No separate database server needed

**Production (PostgreSQL/MySQL):**
- Better concurrency handling
- Optional PostGIS extension for spatial queries
- Industry-standard for production apps

### Security Model

- Server-side API route protection  
- No client-side route calculations (prevents manipulation)
- Input validation with Zod schemas
- Authentication can be added later as needed

---

Happy coding! 🚀
