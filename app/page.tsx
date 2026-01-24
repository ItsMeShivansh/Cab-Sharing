'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import { CreateRideForm } from '@/components/CreateRideForm';
import { UnifiedRideSearch } from '@/components/UnifiedRideSearch';
import { MyRides } from '@/components/MyRides';
import { MyRequests } from '@/components/MyRequests';
import { Car, Search, User, LogOut, Loader2, List, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'find' | 'create' | 'myrides' | 'myrequests'>('find');

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto flex items-center justify-center px-4 py-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">CampusPool</h1>
            </div>
          </div>
        </header>

        {/* Auth Form */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome to CampusPool</h2>
              <p className="mt-2 text-gray-600">
                Smart ride sharing for IIIT Hyderabad students
              </p>
            </div>
            <AuthForm />
          </div>

          {/* Info Section */}
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">
                Why CampusPool?
              </h2>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Smart Matching:</strong> Find rides along your route, not just start/end points</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Time-Aware:</strong> Shows estimated pickup time based on route position</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Trust Scores:</strong> Build reputation within the community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Local Storage:</strong> Your data stays secure on campus servers</span>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main app (logged in)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">CampusPool</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">{user.name}</span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                Score: {user.trustScore}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-8 flex gap-4 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('find')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'find'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="h-5 w-5" />
            Find a Ride
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Car className="h-5 w-5" />
            Offer a Ride
          </button>
          <button
            onClick={() => setActiveTab('myrides')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'myrides'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="h-5 w-5" />
            My Rides
          </button>
          <button
            onClick={() => setActiveTab('myrequests')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'myrequests'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            My Requests
          </button>
        </div>

        {/* Tab Content */}
        <div className="mx-auto max-w-7xl">
          {activeTab === 'find' && (
            <UnifiedRideSearch userId={user.id} />
          )}
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              <CreateRideForm userId={user.id} />
            </div>
          )}
          {activeTab === 'myrides' && (
            <MyRides userId={user.id} />
          )}
          {activeTab === 'myrequests' && (
            <MyRequests userId={user.id} />
          )}
        </div>

        {/* Info Section */}
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              How CampusPool Works
            </h2>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>
                  <strong>Browse or Search:</strong> See all available rides or filter by your location
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>
                  <strong>Smart Matching:</strong> Our algorithm finds rides that pass through your pickup and dropoff points
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>
                  <strong>Time Estimates:</strong> See when the driver will actually reach your pickup location
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>
                  <strong>Request & Go:</strong> Send a request to the driver and wait for confirmation
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© 2026 CampusPool - IIIT Hyderabad</p>
          <p className="mt-2">Smart ride sharing for students</p>
        </div>
      </footer>
    </div>
  );
}
