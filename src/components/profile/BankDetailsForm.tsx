"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, CreditCard, Eye, EyeOff } from "lucide-react";

interface BankDetails {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  accountHolderName: string;
  currency: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BankDetailsFormProps {
  companyId: string;
}

export function BankDetailsForm({ companyId }: BankDetailsFormProps) {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    swiftCode: "",
    accountHolderName: "",
    currency: "USD",
  });

  useEffect(() => {
    fetchBankDetails();
  }, [companyId]);

  const fetchBankDetails = async () => {
    try {
      const response = await fetch(`/api/company/bank?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bank details");
      }
      const data = await response.json();

      if (data.bankDetails) {
        setBankDetails(data.bankDetails);
        setFormData({
          bankName: data.bankDetails.bankName || "",
          accountNumber: data.bankDetails.accountNumber || "",
          routingNumber: data.bankDetails.routingNumber || "",
          swiftCode: data.bankDetails.swiftCode || "",
          accountHolderName: data.bankDetails.accountHolderName || "",
          currency: data.bankDetails.currency || "USD",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/company/bank", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save bank details");
      }

      setSuccess("Bank details saved successfully");
      fetchBankDetails(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return "";
    const visibleDigits = 4;
    const masked = "*".repeat(Math.max(0, accountNumber.length - visibleDigits));
    const visible = accountNumber.slice(-visibleDigits);
    return masked + visible;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading bank details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Banking Information
        </CardTitle>
        <CardDescription>
          Secure banking details for payments and transactions. This information is encrypted and stored securely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Current Bank Details Display */}
        {bankDetails && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Banking Information</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank Name:</span>
                <span>{bankDetails.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Holder:</span>
                <span>{bankDetails.accountHolderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-mono">
                  {showAccountNumber ? bankDetails.accountNumber : maskAccountNumber(bankDetails.accountNumber)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-4 w-4 p-0"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                  >
                    {showAccountNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${bankDetails.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {bankDetails.isVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleInputChange("bankName", e.target.value)}
                placeholder="Enter bank name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => handleInputChange("accountHolderName", e.target.value)}
                placeholder="Full name on the account"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                type="password"
                value={formData.accountNumber}
                onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                placeholder="Enter account number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number (Optional)</Label>
              <Input
                id="routingNumber"
                value={formData.routingNumber}
                onChange={(e) => handleInputChange("routingNumber", e.target.value)}
                placeholder="9-digit routing number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swiftCode">SWIFT/BIC Code (Optional)</Label>
              <Input
                id="swiftCode"
                value={formData.swiftCode}
                onChange={(e) => handleInputChange("swiftCode", e.target.value)}
                placeholder="SWIFT or BIC code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => handleInputChange("currency", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Bank Details
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Security Notice</h4>
          <p className="text-sm text-blue-700">
            Your banking information is encrypted and stored securely. Changes to bank details may require re-verification
            before they can be used for transactions. Contact support if you need to update verified banking information.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}