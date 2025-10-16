"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Smartphone, Building2, Shield, Lock } from "lucide-react";

interface PaymentFormData {
  paymentMethodId: string;
  amount: string;
  currency: string;
  notes?: string;
  // Card fields
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardHolderName?: string;
  // Mobile money fields
  phoneNumber?: string;
  // Bank transfer fields
  accountNumber?: string;
  routingNumber?: string;
  bankName?: string;
  accountHolderName?: string;
}

interface PaymentFormProps {
  orderId: string;
  amount: number;
  currency: string;
  onPaymentSuccess?: (paymentId: string) => void;
  onPaymentError?: (error: string) => void;
}

export function PaymentForm({ orderId, amount, currency, onPaymentSuccess, onPaymentError }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentMethodId: "",
    amount: amount.toString(),
    currency,
  });

  const handleMethodChange = (methodType: string) => {
    setSelectedMethod(methodType);
    setFormData(prev => ({
      ...prev,
      paymentMethodId: methodType,
    }));
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethod) {
      onPaymentError?.("Please select a payment method");
      return;
    }

    setLoading(true);
    try {
      // Initiate payment
      const initiateResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethodId: selectedMethod,
          metadata: {
            notes: formData.notes,
          },
        }),
      });

      if (!initiateResponse.ok) {
        const error = await initiateResponse.json();
        throw new Error(error.error || "Payment initiation failed");
      }

      const initiateData = await initiateResponse.json();

      // If redirect URL is provided, redirect user
      if (initiateData.redirectUrl) {
        window.location.href = initiateData.redirectUrl;
        return;
      }

      // If QR code is provided, show it
      if (initiateData.qrCode) {
        // Handle QR code display for mobile money
        alert("Please scan the QR code with your mobile money app to complete payment.");
        return;
      }

      // Process payment immediately
      const processResponse = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: initiateData.paymentId,
          gatewayData: formData,
        }),
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.error || "Payment processing failed");
      }

      const processData = await processResponse.json();
      onPaymentSuccess?.(processData.paymentId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      onPaymentError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentFields = () => {
    switch (selectedMethod) {
      case "libyana_card":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber || ""}
                  onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                  className="pl-10"
                />
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={formData.expiryDate || ""}
                  onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={formData.cvv || ""}
                  onChange={(e) => handleInputChange("cvv", e.target.value)}
                  type="password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardHolderName">Card Holder Name</Label>
              <Input
                id="cardHolderName"
                placeholder="John Doe"
                value={formData.cardHolderName || ""}
                onChange={(e) => handleInputChange("cardHolderName", e.target.value)}
              />
            </div>
          </div>
        );

      case "libyana_mobile":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Mobile Number</Label>
              <div className="relative">
                <Input
                  id="phoneNumber"
                  placeholder="+218 XX XXX XXXX"
                  value={formData.phoneNumber || ""}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  className="pl-10"
                />
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                You will receive a confirmation SMS with payment instructions.
                Complete the payment using your mobile money app.
              </p>
            </div>
          </div>
        );

      case "libyana_bank":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Select onValueChange={(value) => handleInputChange("bankName", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central_bank_ly">Central Bank of Libya</SelectItem>
                  <SelectItem value="wahda_bank">Wahda Bank</SelectItem>
                  <SelectItem value="national_commercial">National Commercial Bank</SelectItem>
                  <SelectItem value="jamhuriya_bank">Jamhuriya Bank</SelectItem>
                  <SelectItem value="other">Other Libyan Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <div className="relative">
                <Input
                  id="accountNumber"
                  placeholder="Account number"
                  value={formData.accountNumber || ""}
                  onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  className="pl-10"
                />
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                placeholder="Full name as on bank account"
                value={formData.accountHolderName || ""}
                onChange={(e) => handleInputChange("accountHolderName", e.target.value)}
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                Bank transfer payments are processed within 1-3 business days.
                You will receive transfer instructions after submission.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Secure Payment
        </CardTitle>
        <CardDescription>
          Complete your payment securely using Libyan payment methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label>Select Payment Method</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className={`cursor-pointer transition-all ${
                  selectedMethod === "libyana_mobile" ? "ring-2 ring-primary" : "hover:shadow-md"
                }`}
                onClick={() => handleMethodChange("libyana_mobile")}
              >
                <CardContent className="p-4 text-center">
                  <Smartphone className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h4 className="font-semibold">Mobile Money</h4>
                  <p className="text-sm text-muted-foreground">Libyan Mobile Money</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  selectedMethod === "libyana_bank" ? "ring-2 ring-primary" : "hover:shadow-md"
                }`}
                onClick={() => handleMethodChange("libyana_bank")}
              >
                <CardContent className="p-4 text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h4 className="font-semibold">Bank Transfer</h4>
                  <p className="text-sm text-muted-foreground">Libyan Banks</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  selectedMethod === "libyana_card" ? "ring-2 ring-primary" : "hover:shadow-md"
                }`}
                onClick={() => handleMethodChange("libyana_card")}
              >
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <h4 className="font-semibold">Card Payment</h4>
                  <p className="text-sm text-muted-foreground">Libyan Cards</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Dynamic Payment Fields */}
          {renderPaymentFields()}

          {/* Order Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Payment Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-semibold">{amount} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span>{orderId}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Payment Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions..."
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Secure Payment</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your payment information is encrypted and secure. We comply with Libyan financial regulations.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || !selectedMethod}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            Pay {amount} {currency}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}