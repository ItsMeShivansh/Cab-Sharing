'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Car,
  MapPin,
  Clock,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  User,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Passenger {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trustScore: number;
}

interface RideRequest {
  id: string;
  passengerId: string;
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  createdAt: string;
  passenger: Passenger;
}

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  departureTime: string;
  status: string;
  maxPassengers: number;
  rideRequests: RideRequest[];
  acceptedRequests: number;
  pendingRequests: number;
  availableSeats: number;
}

interface MyRidesProps {
  userId: string;
}

export function MyRides({ userId }: MyRidesProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRides, setExpandedRides] = useState<Set<string>>(new Set());
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchMyRides = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/rides/my-rides?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rides');
      }

      setRides(data.rides);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyRides();
  }, [fetchMyRides]);

  const toggleRideExpanded = (rideId: string) => {
    setExpandedRides((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rideId)) {
        newSet.delete(rideId);
      } else {
        newSet.add(rideId);
      }
      return newSet;
    });
  };

  const handleApprove = async (requestId: string) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId));
    try {
      const response = await fetch('/api/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, driverId: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve request');
      }

      // Refresh rides to get updated data
      await fetchMyRides();

      // Show success message with contact info
      if (data.contactInfo) {
        alert(
          `Request approved! Contact info:\n\nPassenger: ${data.contactInfo.passenger.name}\nEmail: ${data.contactInfo.passenger.email}\nPhone: ${data.contactInfo.passenger.phone || 'Not provided'}`
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId));
    try {
      const response = await fetch('/api/requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, driverId: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject request');
      }

      // Refresh rides to get updated data
      await fetchMyRides();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-100 text-green-800">Open</Badge>;
      case 'FULL':
        return <Badge className="bg-yellow-100 text-yellow-800">Full</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading your rides...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-red-700">{error}</p>
        <Button onClick={fetchMyRides} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Car className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No rides yet</h3>
        <p className="mt-2 text-gray-600">
          You haven't created any rides. Go to "Offer a Ride" to create one!
        </p>
      </div>
    );
  }

  const upcomingRides = rides.filter(
    (ride) => new Date(ride.departureTime) >= new Date() && ride.status === 'OPEN'
  );
  const otherRides = rides.filter(
    (ride) => new Date(ride.departureTime) < new Date() || ride.status !== 'OPEN'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">My Rides as Driver</h2>
        <Button onClick={fetchMyRides} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Upcoming Rides */}
      {upcomingRides.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Upcoming Rides</h3>
          {upcomingRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              isExpanded={expandedRides.has(ride.id)}
              onToggle={() => toggleRideExpanded(ride.id)}
              onApprove={handleApprove}
              onReject={handleReject}
              processingRequests={processingRequests}
              getStatusBadge={getStatusBadge}
              getRequestStatusBadge={getRequestStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Past/Other Rides */}
      {otherRides.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-500">Past & Completed Rides</h3>
          {otherRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              isExpanded={expandedRides.has(ride.id)}
              onToggle={() => toggleRideExpanded(ride.id)}
              onApprove={handleApprove}
              onReject={handleReject}
              processingRequests={processingRequests}
              getStatusBadge={getStatusBadge}
              getRequestStatusBadge={getRequestStatusBadge}
              isPast
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RideCardProps {
  ride: Ride;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  processingRequests: Set<string>;
  getStatusBadge: (status: string) => React.ReactNode;
  getRequestStatusBadge: (status: string) => React.ReactNode;
  isPast?: boolean;
}

function RideCard({
  ride,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  processingRequests,
  getStatusBadge,
  getRequestStatusBadge,
  isPast = false,
}: RideCardProps) {
  const pendingRequests = ride.rideRequests.filter((r) => r.status === 'PENDING');
  const acceptedRequests = ride.rideRequests.filter((r) => r.status === 'ACCEPTED');
  const rejectedRequests = ride.rideRequests.filter((r) => r.status === 'REJECTED');

  return (
    <Card className={`transition-all ${isPast ? 'opacity-75' : ''}`}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {ride.originAddress.split(',')[0]} → {ride.destAddress.split(',')[0]}
              </CardTitle>
              {getStatusBadge(ride.status)}
            </div>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(ride.departureTime), 'MMM d, yyyy h:mm a')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {ride.acceptedRequests}/{ride.maxPassengers} passengers
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                {pendingRequests.length} pending
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Route Details */}
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
              <div>
                <span className="font-medium">From:</span> {ride.originAddress}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-red-600" />
              <div>
                <span className="font-medium">To:</span> {ride.destAddress}
              </div>
            </div>
          </div>

          {/* Requests Section */}
          {ride.rideRequests.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-600">
              No requests yet for this ride
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-700">
                    Pending Requests ({pendingRequests.length})
                  </h4>
                  {pendingRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onApprove={onApprove}
                      onReject={onReject}
                      isProcessing={processingRequests.has(req.id)}
                      getRequestStatusBadge={getRequestStatusBadge}
                      showActions={!isPast}
                    />
                  ))}
                </div>
              )}

              {/* Accepted Requests */}
              {acceptedRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">
                    Accepted Passengers ({acceptedRequests.length})
                  </h4>
                  {acceptedRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onApprove={onApprove}
                      onReject={onReject}
                      isProcessing={false}
                      getRequestStatusBadge={getRequestStatusBadge}
                      showActions={false}
                      showContact
                    />
                  ))}
                </div>
              )}

              {/* Rejected Requests */}
              {rejectedRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">
                    Rejected Requests ({rejectedRequests.length})
                  </h4>
                  {rejectedRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onApprove={onApprove}
                      onReject={onReject}
                      isProcessing={false}
                      getRequestStatusBadge={getRequestStatusBadge}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface RequestCardProps {
  request: RideRequest;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isProcessing: boolean;
  getRequestStatusBadge: (status: string) => React.ReactNode;
  showActions: boolean;
  showContact?: boolean;
}

function RequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
  getRequestStatusBadge,
  showActions,
  showContact = false,
}: RequestCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Passenger Info */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{request.passenger.name}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Trust: {request.passenger.trustScore}
            </span>
            {getRequestStatusBadge(request.status)}
          </div>

          {/* Pickup/Dropoff */}
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-start gap-1">
              <span className="text-green-600">↑</span>
              <span>Pickup: {request.pickupAddress}</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="text-red-600">↓</span>
              <span>Dropoff: {request.dropoffAddress}</span>
            </div>
          </div>

          {/* Contact Info (for accepted requests) */}
          {showContact && (
            <div className="mt-2 rounded-lg bg-green-50 p-3 text-sm">
              <p className="font-medium text-green-800 mb-2">Contact Info:</p>
              <div className="flex items-center gap-2 text-green-700">
                <Mail className="h-4 w-4" />
                <span>{request.passenger.email}</span>
              </div>
              {request.passenger.phone && (
                <div className="flex items-center gap-2 text-green-700 mt-1">
                  <Phone className="h-4 w-4" />
                  <span>{request.passenger.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Request Time */}
          <div className="text-xs text-gray-400">
            Requested {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(request.id);
              }}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReject(request.id);
              }}
              disabled={isProcessing}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
