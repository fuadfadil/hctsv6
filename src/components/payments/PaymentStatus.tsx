"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from "lucide-react";

interface PaymentStatusData {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionId: string;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  processedAt?: string;
  failureReason?: string;
  order: {
    id: string;
    status: string;
    totalAmount: string;
    currency: string;
  };
}

interface PaymentStatusProps {
  paymentId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  onStatusChange?: (status: PaymentStatusData) => void;
}

export function PaymentStatus({
  paymentId,
  autoRefresh = true,
  refreshInterval = 5000,
  onStatusChange
}: PaymentStatusProps) {
  const [status, setStatus] = useState<PaymentStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();

    if (autoRefresh) {
      const interval = setInterval(() => {
        if (status?.status === 'pending' || status?.status === 'processing') {
          fetchStatus(true);
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [paymentId, autoRefresh, refreshInterval]);

  useEffect(() => {
    if (status && onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const fetchStatus = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/payments/status?paymentId=${paymentId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        console.error("Failed to fetch payment status");
      }
    } catch (error) {
      console.error("Error fetching payment status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-6 w-6 text-gray-500" />;
      case 'refunded':
        return <AlertCircle className="h-6 w-6 text-blue-500" />;
      case 'processing':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusMessage = (status: PaymentStatusData) => {
    switch (status.status) {
      case 'completed':
        return {
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
          action: null,
        };
      case 'failed':
        return {
          title: "Payment Failed",
          description: status.failureReason || "Your payment could not be processed.",
          action: "Try Again",
        };
      case 'cancelled':
        return {
          title: "Payment Cancelled",
          description: "Your payment was cancelled.",
          action: null,
        };
      case 'refunded':
        return {
          title: "Payment Refunded",
          description: "Your payment has been refunded.",
          action: null,
        };
      case 'processing':
        return {
          title: "Processing Payment",
          description: "Your payment is being processed. This may take a few moments.",
          action: null,
        };
      default:
        return {
          title: "Payment Pending",
          description: "Your payment is pending confirmation.",
          action: null,
        };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Unable to load payment status</p>
          <Button variant="outline" onClick={() => fetchStatus()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusMessage = getStatusMessage(status);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getStatusIcon(status.status)}
        </div>
        <CardTitle className="text-2xl">{statusMessage.title}</CardTitle>
        <CardDescription>{statusMessage.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge className={getStatusColor(status.status)}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </Badge>
          </div>

          {/* Payment Details */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Payment Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Payment ID:</span>
                <span className="font-mono">{status.paymentId.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono">{status.transactionId.slice(-8)}</span>
              </div>
              {status.gatewayTransactionId && (
                <div className="flex justify-between">
                  <span>Gateway ID:</span>
                  <span className="font-mono">{status.gatewayTransactionId.slice(-8)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-semibold">{status.amount} {status.currency}</span>
              </div>
              {status.processedAt && (
                <div className="flex justify-between">
                  <span>Processed:</span>
                  <span>{new Date(status.processedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Order Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono">{status.order.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Status:</span>
                <Badge variant="secondary">{status.order.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Order Total:</span>
                <span>{status.order.totalAmount} {status.order.currency}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="flex-1"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>

            {statusMessage.action && (
              <Button className="flex-1">
                {statusMessage.action}
              </Button>
            )}
          </div>

          {/* Additional Information */}
          {(status.status === 'pending' || status.status === 'processing') && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Processing</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Your payment is being processed. This page will update automatically.
                Do not close this window or navigate away.
              </p>
            </div>
          )}

          {status.status === 'failed' && status.failureReason && (
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failure Reason</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {status.failureReason}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}