'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  User,
  CheckCircle,
  XCircle,
  Clock3,
  Car,
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

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trustScore: number;
}

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  departureTime: string;
  status: string;
  driver: Driver;
}

interface RideRequest {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  createdAt: string;
  ride: Ride;
  driverContact: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface MyRequestsProps {
  userId: string;
}

export function MyRequests({ userId }: MyRequestsProps) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/requests/my-requests?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests');
      }

      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock3 className="h-5 w-5 text-yellow-500" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock3 className="mr-1 h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case 'ACCEPTED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading your requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-red-700">{error}</p>
        <Button onClick={fetchMyRequests} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Car className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No requests yet</h3>
        <p className="mt-2 text-gray-600">
          You haven't requested any rides. Go to "Find a Ride" to request one!
        </p>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED');
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">My Ride Requests</h2>
        <Button onClick={fetchMyRequests} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-yellow-50 border-yellow-200 p-4 text-center">
          <Clock3 className="mx-auto h-6 w-6 text-yellow-600" />
          <p className="mt-2 text-2xl font-bold text-yellow-700">{pendingRequests.length}</p>
          <p className="text-sm text-yellow-600">Pending</p>
        </div>
        <div className="rounded-lg border bg-green-50 border-green-200 p-4 text-center">
          <CheckCircle className="mx-auto h-6 w-6 text-green-600" />
          <p className="mt-2 text-2xl font-bold text-green-700">{acceptedRequests.length}</p>
          <p className="text-sm text-green-600">Approved</p>
        </div>
        <div className="rounded-lg border bg-red-50 border-red-200 p-4 text-center">
          <XCircle className="mx-auto h-6 w-6 text-red-600" />
          <p className="mt-2 text-2xl font-bold text-red-700">{rejectedRequests.length}</p>
          <p className="text-sm text-red-600">Rejected</p>
        </div>
      </div>

      {/* Accepted Requests (with contact info) */}
      {acceptedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Approved Rides ({acceptedRequests.length})
          </h3>
          {acceptedRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-yellow-700 flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Waiting for Approval ({pendingRequests.length})
          </h3>
          {pendingRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Rejected Requests */}
      {rejectedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-red-700 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Rejected Requests ({rejectedRequests.length})
          </h3>
          {rejectedRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RequestCardProps {
  request: RideRequest;
  getStatusBadge: (status: string) => React.ReactNode;
}

function RequestCard({ request, getStatusBadge }: RequestCardProps) {
  const isUpcoming = new Date(request.ride.departureTime) >= new Date();

  return (
    <Card className={`${!isUpcoming ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              {request.ride.originAddress.split(',')[0]} → {request.ride.destAddress.split(',')[0]}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(request.ride.departureTime), 'MMM d, yyyy h:mm a')}
              </span>
              {!isUpcoming && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  Past Ride
                </span>
              )}
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Pickup/Dropoff */}
        <div className="grid gap-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
            <div>
              <span className="font-medium">Your Pickup:</span> {request.pickupAddress}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <span className="font-medium">Your Dropoff:</span> {request.dropoffAddress}
            </div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{request.ride.driver.name}</span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              Trust: {request.ride.driver.trustScore}
            </span>
          </div>

          {/* Contact Info (only for accepted requests) */}
          {request.status === 'ACCEPTED' && request.driverContact && (
            <div className="mt-3 p-3 rounded-lg bg-green-100 border border-green-200">
              <p className="font-medium text-green-800 mb-2">🎉 Your ride is confirmed! Driver contact:</p>
              <div className="space-y-1 text-green-700">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${request.driverContact.email}`} className="hover:underline">
                    {request.driverContact.email}
                  </a>
                </div>
                {request.driverContact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${request.driverContact.phone}`} className="hover:underline">
                      {request.driverContact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Message */}
          {request.status === 'PENDING' && (
            <div className="mt-2 p-2 rounded bg-yellow-100 text-yellow-800 text-xs">
              ⏳ Waiting for the driver to approve your request...
            </div>
          )}

          {/* Rejected Message */}
          {request.status === 'REJECTED' && (
            <div className="mt-2 p-2 rounded bg-red-100 text-red-800 text-xs">
              ❌ Your request was declined. Try finding another ride.
            </div>
          )}
        </div>

        {/* Request Time */}
        <div className="text-xs text-gray-400">
          Requested {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
        </div>
      </CardContent>
    </Card>
  );
}
