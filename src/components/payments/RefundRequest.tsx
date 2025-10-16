"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface RefundRequestProps {
  paymentId: string;
  paymentAmount: number;
  currency: string;
  onRefundSuccess?: (refundId: string) => void;
  onRefundError?: (error: string) => void;
}

export function RefundRequest({
  paymentId,
  paymentAmount,
  currency,
  onRefundSuccess,
  onRefundError
}: RefundRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
    notes: "",
  });
  const [existingRefunds, setExistingRefunds] = useState<any[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);

  const handleOpenDialog = async () => {
    setIsOpen(true);
    await fetchExistingRefunds();
  };

  const fetchExistingRefunds = async () => {
    try {
      setLoadingRefunds(true);
      const response = await fetch(`/api/payments/refund?paymentId=${paymentId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingRefunds(data.refunds);
      }
    } catch (error) {
      console.error("Error fetching refunds:", error);
    } finally {
      setLoadingRefunds(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const refundAmount = parseFloat(formData.amount);
    if (!refundAmount || refundAmount <= 0) {
      onRefundError?.("Please enter a valid refund amount");
      return;
    }

    if (refundAmount > paymentAmount) {
      onRefundError?.("Refund amount cannot exceed payment amount");
      return;
    }

    // Check against existing refunds
    const totalRefunded = existingRefunds
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    if (totalRefunded + refundAmount > paymentAmount) {
      onRefundError?.("Total refund amount would exceed payment amount");
      return;
    }

    if (!formData.reason) {
      onRefundError?.("Please select a refund reason");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          amount: formData.amount,
          reason: formData.reason,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Refund request failed");
      }

      const data = await response.json();

      if (data.success) {
        onRefundSuccess?.(data.refundId);
        setIsOpen(false);
        setFormData({ amount: "", reason: "", notes: "" });
        await fetchExistingRefunds(); // Refresh the list
      } else {
        throw new Error(data.error || "Refund request failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Refund request failed";
      onRefundError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getTotalRefunded = () => {
    return existingRefunds
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  };

  const getRemainingAmount = () => {
    return paymentAmount - getTotalRefunded();
  };

  const refundReasons = [
    { value: "customer_request", label: "Customer Request" },
    { value: "duplicate", label: "Duplicate Payment" },
    { value: "fraudulent", label: "Fraudulent Payment" },
    { value: "service_issue", label: "Service Issue" },
    { value: "product_not_received", label: "Product Not Received" },
    { value: "product_defective", label: "Product Defective" },
    { value: "other", label: "Other" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={handleOpenDialog}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Request Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Request a refund for payment #{paymentId.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Payment Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Original Amount:</span>
                <div className="font-semibold">{paymentAmount} {currency}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining Amount:</span>
                <div className="font-semibold">{getRemainingAmount()} {currency}</div>
              </div>
            </div>
          </div>

          {/* Existing Refunds */}
          {existingRefunds.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-900">Existing Refunds</h4>
              <div className="space-y-2">
                {existingRefunds.map((refund) => (
                  <div key={refund.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{refund.amount} {currency}</span>
                      <span className="text-muted-foreground ml-2">({refund.reason})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {refund.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : refund.status === 'failed' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      <span className={`capitalize ${
                        refund.status === 'completed' ? 'text-green-700' :
                        refund.status === 'failed' ? 'text-red-700' : 'text-blue-700'
                      }`}>
                        {refund.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Refunded:</span>
                  <span>{getTotalRefunded()} {currency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Refund Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={getRemainingAmount()}
                placeholder="Enter refund amount"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum refund amount: {getRemainingAmount()} {currency}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Refund Reason</Label>
              <Select value={formData.reason} onValueChange={(value) => handleInputChange("reason", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select refund reason" />
                </SelectTrigger>
                <SelectContent>
                  {refundReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Provide additional details about the refund request..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            {/* Warning */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Important Notice</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Refund requests are subject to review and approval. Processing times may vary
                depending on the payment method used. You will be notified once the refund is processed.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.amount || !formData.reason}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Request Refund
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}