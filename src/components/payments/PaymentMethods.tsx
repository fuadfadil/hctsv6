"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, CreditCard, Smartphone, Building2, Plus, Trash2, CheckCircle } from "lucide-react";

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'mobile_money';
  provider: string;
  accountNumber: string;
  accountHolderName?: string;
  expiryDate?: string;
  phoneNumber?: string;
  bankName?: string;
  isDefault: boolean;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaymentMethodsProps {
  onMethodSelect?: (method: PaymentMethod) => void;
  selectedMethodId?: string;
  showAddButton?: boolean;
}

export function PaymentMethods({ onMethodSelect, selectedMethodId, showAddButton = true }: PaymentMethodsProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/payments/methods");
      if (response.ok) {
        const data = await response.json();
        setMethods(data.methods);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    if (onMethodSelect) {
      onMethodSelect(method);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(`/api/payments/methods/${methodId}/default`, {
        method: "PUT",
      });

      if (response.ok) {
        await fetchPaymentMethods();
      }
    } catch (error) {
      console.error("Error setting default method:", error);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    try {
      const response = await fetch(`/api/payments/methods/${methodId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPaymentMethods();
      }
    } catch (error) {
      console.error("Error deleting payment method:", error);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      case 'mobile_money':
        return <Smartphone className="h-5 w-5" />;
      case 'bank_transfer':
        return <Building2 className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getMethodDisplayName = (method: PaymentMethod) => {
    switch (method.type) {
      case 'credit_card':
        return `•••• •••• •••• ${method.accountNumber.slice(-4)}`;
      case 'mobile_money':
        return method.phoneNumber || method.accountNumber;
      case 'bank_transfer':
        return `${method.bankName} - ${method.accountNumber.slice(-4)}`;
      default:
        return method.accountNumber;
    }
  };

  const getProviderName = (provider: string) => {
    const providerNames: Record<string, string> = {
      'libyana_mobile': 'Libyan Mobile Money',
      'libyana_bank': 'Libyan Bank Transfer',
      'libyana_card': 'Libyan Card Payment',
    };
    return providerNames[provider] || provider;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        {showAddButton && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Choose a payment method to add to your account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h4 className="font-semibold">Mobile Money</h4>
                      <p className="text-sm text-muted-foreground">Libyan Mobile Money</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h4 className="font-semibold">Bank Transfer</h4>
                      <p className="text-sm text-muted-foreground">Libyan Banks</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <h4 className="font-semibold">Card Payment</h4>
                      <p className="text-sm text-muted-foreground">Libyan Cards</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Payment method setup will be implemented here.
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to make purchases.
            </p>
            {showAddButton && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all ${
                selectedMethodId === method.id
                  ? "ring-2 ring-primary"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleMethodSelect(method)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(method.type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getMethodDisplayName(method)}
                        </span>
                        {method.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        {method.isVerified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getProviderName(method.provider)}
                      </p>
                      {method.accountHolderName && (
                        <p className="text-xs text-muted-foreground">
                          {method.accountHolderName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.isDefault && method.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(method.id);
                        }}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMethod(method.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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