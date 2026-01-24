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
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}

interface RideRequest {
  id: string;
  passengerId: string;
  rideId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  status: string;
  createdAt: string;
  passenger: Passenger;
  amountOwed?: number;
  distanceKm?: number;
  paymentStatus?: string;
}

interface Ride {
  id: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destAddress: string;
  destLat: number;
  destLng: number;
  departureTime: string;
  status: string;
  maxPassengers: number;
  rideRequests: RideRequest[];
  acceptedRequests: number;
  pendingRequests: number;
  availableSeats: number;
  totalCost?: number;
  routeDistance?: number;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface PassengerRide {
  id: string;
  rideId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  amountOwed?: number;
  distanceKm?: number;
  paymentStatus?: string;
  ride: {
    id: string;
    originAddress: string;
    destAddress: string;
    departureTime: string;
    status: string;
    totalCost?: number;
    driver: Driver;
  };
}

interface MyRidesProps {
  userId: string;
}

export function MyRides({ userId }: MyRidesProps) {
  const [driverRides, setDriverRides] = useState<Ride[]>([]);
  const [passengerRides, setPassengerRides] = useState<PassengerRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRides, setExpandedRides] = useState<Set<string>>(new Set());
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [completingRide, setCompletingRide] = useState<string | null>(null);
  const [totalCostInput, setTotalCostInput] = useState<string>('');
  const [submittingCost, setSubmittingCost] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const fetchMyRides = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch rides where user is driver
      const driverResponse = await fetch(`/api/rides/my-rides?userId=${userId}`);
      const driverData = await driverResponse.json();

      if (!driverResponse.ok) {
        throw new Error(driverData.error || 'Failed to fetch rides');
      }

      // Fetch rides where user is passenger
      const passengerResponse = await fetch(`/api/requests/my-requests?userId=${userId}`);
      const passengerData = await passengerResponse.json();

      if (!passengerResponse.ok) {
        throw new Error(passengerData.error || 'Failed to fetch passenger rides');
      }

      setDriverRides(driverData.rides);
      // Filter only accepted requests
      setPassengerRides(passengerData.requests.filter((r: any) => r.status === 'ACCEPTED'));
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

  const handleCompleteRide = async (rideId: string) => {
    const cost = parseFloat(totalCostInput);
    if (isNaN(cost) || cost <= 0) {
      alert('Please enter a valid total cost');
      return;
    }

    setSubmittingCost(true);
    try {
      const response = await fetch('/api/rides/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId, userId, totalCost: cost }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete ride');
      }

      // Show cost breakdown with segment details
      let message = `✅ RIDE COMPLETED!\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      message += `📊 SUMMARY:\n`;
      message += `   Total Ride Cost: ₹${data.summary.totalCost}\n`;
      message += `   Your Net Cost: ₹${data.summary.hostNetCost}\n`;
      message += `   Amount from Passengers: ₹${data.summary.totalFromPassengers}\n\n`;
      
      message += `👥 PASSENGER BREAKDOWN:\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      data.costBreakdown.forEach((p: any) => {
        message += `\n👤 ${p.passengerName}`;
        message += `\n   📍 Route: ${p.pickupPosition}% → ${p.dropoffPosition}%`;
        message += `\n   📏 Distance: ${p.distanceKm.toFixed(2)} km`;
        message += `\n   💵 Owes You: ₹${p.amountOwed.toFixed(2)}\n`;
      });
      
      if (data.segments && data.segments.length > 0) {
        message += `\n📐 SEGMENT CALCULATION:\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        data.segments.forEach((seg: any, i: number) => {
          message += `\nSegment ${i + 1}: ${seg.start}% → ${seg.end}%`;
          message += `\n   Cost: ₹${seg.segmentCost}`;
          message += `\n   People: ${seg.peopleCount} (Host${seg.passengerNames.length > 0 ? ' + ' + seg.passengerNames.length + ' passenger(s)' : ' only'})`;
          message += `\n   Per Person: ₹${seg.perPersonCost}`;
        });
      }
      
      alert(message);

      setCompletingRide(null);
      setTotalCostInput('');
      await fetchMyRides();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete ride');
    } finally {
      setSubmittingCost(false);
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    if (!confirm('Are you sure you want to mark this payment as paid?')) return;
    
    setProcessingPayment(requestId);
    try {
      const response = await fetch('/api/payments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId, action: 'mark_paid' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment');
      }

      alert(data.message);
      await fetchMyRides();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleConfirmPayment = async (requestId: string) => {
    setProcessingPayment(requestId);
    try {
      const response = await fetch('/api/payments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId, action: 'confirm_payment' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      alert(data.message);
      await fetchMyRides();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-orange-100 text-orange-800">Payment Pending</Badge>;
      case 'PAID':
        return <Badge className="bg-blue-100 text-blue-800">Paid (Awaiting Confirmation)</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-green-100 text-green-800">Payment Confirmed</Badge>;
      default:
        return null;
    }
  };

  const getRideTimingStatus = (departureTime: string) => {
    const now = new Date();
    const departure = new Date(departureTime);
    
    if (departure > now) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'in-progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' };
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

  if (driverRides.length === 0 && passengerRides.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Car className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No active rides</h3>
        <p className="mt-2 text-gray-600">
          You don't have any upcoming rides as driver or passenger.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">My Rides</h2>
        <Button onClick={fetchMyRides} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Rides as Driver */}
      {driverRides.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">As Host ({driverRides.length})</h3>
          {driverRides.map((ride) => (
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
              completingRide={completingRide}
              setCompletingRide={setCompletingRide}
              totalCostInput={totalCostInput}
              setTotalCostInput={setTotalCostInput}
              submittingCost={submittingCost}
              onCompleteRide={handleCompleteRide}
              getPaymentStatusBadge={getPaymentStatusBadge}
              onConfirmPayment={handleConfirmPayment}
              processingPayment={processingPayment}
              getRideTimingStatus={getRideTimingStatus}
            />
          ))}
        </div>
      )}

      {/* Rides as Passenger */}
      {passengerRides.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">As Passenger ({passengerRides.length})</h3>
          {passengerRides.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {request.ride.originAddress.split(',')[0]} → {request.ride.destAddress.split(',')[0]}
                      </CardTitle>
                      {request.ride.status === 'COMPLETED' ? (
                        <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(request.ride.departureTime), 'MMM d, yyyy h:mm a')}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <span className="font-medium">Your Pickup:</span> {request.pickupAddress}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-red-600" />
                      <div className="flex-1">
                        <span className="font-medium">Your Dropoff:</span> {request.dropoffAddress}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${request.pickupLat},${request.pickupLng}&destination=${request.dropoffLat},${request.dropoffLng}`, '_blank')}
                    className="w-full"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    View Your Route on Maps
                  </Button>
                </div>

                {/* Payment Section for Completed Rides */}
                {request.amountOwed && request.amountOwed > 0 && (
                  <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-orange-600" />
                          <span className="font-medium text-orange-900">Payment Due</span>
                          {getPaymentStatusBadge(request.paymentStatus)}
                        </div>
                        <div className="text-sm text-orange-700">
                          <p>Amount: <span className="font-bold">₹{request.amountOwed.toFixed(2)}</span></p>
                          {request.distanceKm && (
                            <p className="text-xs">Distance traveled: {request.distanceKm.toFixed(2)} km</p>
                          )}
                        </div>
                      </div>
                      {request.paymentStatus === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(request.id)}
                          disabled={processingPayment === request.id}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {processingPayment === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Mark as Paid
                            </>
                          )}
                        </Button>
                      )}
                      {request.paymentStatus === 'PAID' && (
                        <span className="text-sm text-blue-600">Awaiting host confirmation</span>
                      )}
                      {request.paymentStatus === 'CONFIRMED' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 p-3 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Host: {request.ride.driver.name}</span>
                  </div>
                  <div className="space-y-1 text-blue-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${request.ride.driver.email}`} className="hover:underline">
                        {request.ride.driver.email}
                      </a>
                    </div>
                    {request.ride.driver.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${request.ride.driver.phone}`} className="hover:underline">
                          {request.ride.driver.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
  completingRide: string | null;
  setCompletingRide: (rideId: string | null) => void;
  totalCostInput: string;
  setTotalCostInput: (value: string) => void;
  submittingCost: boolean;
  onCompleteRide: (rideId: string) => void;
  getPaymentStatusBadge: (status?: string) => React.ReactNode;
  onConfirmPayment: (requestId: string) => void;
  processingPayment: string | null;
  getRideTimingStatus: (departureTime: string) => { status: string; label: string; color: string };
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
  completingRide,
  setCompletingRide,
  totalCostInput,
  setTotalCostInput,
  submittingCost,
  onCompleteRide,
  getPaymentStatusBadge,
  onConfirmPayment,
  processingPayment,
  getRideTimingStatus,
}: RideCardProps) {
  const pendingRequests = ride.rideRequests.filter((r) => r.status === 'PENDING');
  const acceptedRequests = ride.rideRequests.filter((r) => r.status === 'ACCEPTED');
  const rejectedRequests = ride.rideRequests.filter((r) => r.status === 'REJECTED');
  const timingStatus = getRideTimingStatus(ride.departureTime);
  const canCompleteRide = ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED' && timingStatus.status === 'in-progress' && acceptedRequests.length > 0;

  return (
    <Card className="transition-all">
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
            {ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED' && (
              <Badge className={timingStatus.color}>{timingStatus.label}</Badge>
            )}
            {pendingRequests.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                {pendingRequests.length} pending
              </Badge>
            )}
            {canCompleteRide && (
              <Badge className="bg-green-100 text-green-800 animate-pulse">
                Ready to Complete
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
          {/* Complete Ride Section - Show prominently if ride is in progress */}
          {canCompleteRide && (
            <div className="mb-4">
              {completingRide === ride.id ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
                    <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Complete This Ride
                    </h4>
                    <p className="text-sm text-green-800 mb-3">
                      🎯 Enter the total cost incurred. The system will automatically split it fairly among {acceptedRequests.length} passenger(s) based on distance traveled.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Total cost in ₹"
                          value={totalCostInput}
                          onChange={(e) => setTotalCostInput(e.target.value)}
                          className="text-lg font-semibold"
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                      </div>
                      <Button
                        onClick={() => onCompleteRide(ride.id)}
                        disabled={submittingCost}
                        className="bg-green-600 hover:bg-green-700 px-6"
                        size="lg"
                      >
                        {submittingCost ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Calculate & Complete</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCompletingRide(null);
                          setTotalCostInput('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      💡 <strong>Fair Splitting:</strong> Cost is divided based on route segments. Shared segments are split equally among passengers.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                        🚗 Ride is In Progress
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Ready to complete? Enter the total cost to split among passengers.
                      </p>
                    </div>
                    <Button
                      onClick={() => setCompletingRide(ride.id)}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Ride
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Route Details */}
          <div className="space-y-3">
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <span className="font-medium">From:</span> {ride.originAddress}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <span className="font-medium">To:</span> {ride.destAddress}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${ride.originLat},${ride.originLng}&destination=${ride.destLat},${ride.destLng}`, '_blank')}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              View Route on Google Maps
            </Button>
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
                      showActions={true}
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

              {/* Payment Status for Completed Ride */}
              {ride.status === 'COMPLETED' && ride.totalCost && acceptedRequests.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Tracking (Total: ₹{ride.totalCost})
                  </h4>
                  <div className="space-y-2">
                    {acceptedRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                        <div>
                          <span className="font-medium">{req.passenger.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ₹{req.amountOwed?.toFixed(2) || '0.00'}
                          </span>
                          {req.distanceKm && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({req.distanceKm.toFixed(2)} km)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getPaymentStatusBadge(req.paymentStatus)}
                          {req.paymentStatus === 'PAID' && (
                            <Button
                              size="sm"
                              onClick={() => onConfirmPayment(req.id)}
                              disabled={processingPayment === req.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {processingPayment === req.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Confirm
                                </>
                              )}
                            </Button>
                          )}
                          {req.paymentStatus === 'CONFIRMED' && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
            {getRequestStatusBadge(request.status)}
          </div>

          {/* Pickup/Dropoff */}
          <div className="text-sm space-y-2">
            <div className="space-y-1 text-gray-600">
              <div className="flex items-start gap-1">
                <span className="text-green-600">↑</span>
                <span>Pickup: {request.pickupAddress}</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-red-600">↓</span>
                <span>Dropoff: {request.dropoffAddress}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${request.pickupLat},${request.pickupLng}&destination=${request.dropoffLat},${request.dropoffLng}`, '_blank')}
              className="w-full text-xs"
            >
              <MapPin className="h-3 w-3 mr-1" />
              View on Maps
            </Button>
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
