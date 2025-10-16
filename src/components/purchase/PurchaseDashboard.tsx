"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ServiceOffersDisplay } from "./ServiceOffersDisplay";
import { CartManagement } from "./CartManagement";
import { CheckoutProcess } from "./CheckoutProcess";
import { PurchaseHistory } from "./PurchaseHistory";
import { BulkDiscountCalculator } from "./BulkDiscountCalculator";
import { Loader2, ShoppingCart, Package, CreditCard, History, Calculator } from "lucide-react";

interface CartSummary {
  itemCount: number;
  totalAmount: string;
  currency: string;
}

export function PurchaseDashboard() {
  const [activeTab, setActiveTab] = useState("offers");
  const [cartSummary, setCartSummary] = useState<CartSummary>({ itemCount: 0, totalAmount: "0", currency: "HU" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCartSummary();
  }, []);

  const fetchCartSummary = async () => {
    try {
      const response = await fetch("/api/purchase/cart");
      if (response.ok) {
        const data = await response.json();
        if (data.cart.items) {
          const itemCount = data.cart.items.length;
          const totalAmount = data.cart.finalTotal || data.cart.total;
          setCartSummary({
            itemCount,
            totalAmount,
            currency: data.cart.currency,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching cart summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCartUpdate = () => {
    fetchCartSummary();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Healthcare Purchasing</h1>
          <p className="text-muted-foreground">
            Browse service offers, manage your cart, and complete purchases
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm font-medium">
                Cart: {cartSummary.itemCount} items
              </span>
              <Badge variant="secondary">
                {cartSummary.totalAmount} {cartSummary.currency}
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="offers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Service Offers
          </TabsTrigger>
          <TabsTrigger value="cart" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Cart ({cartSummary.itemCount})
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Bulk Calculator
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Checkout
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Order History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="space-y-6">
          <ServiceOffersDisplay onCartUpdate={handleCartUpdate} />
        </TabsContent>

        <TabsContent value="cart" className="space-y-6">
          <CartManagement onCartUpdate={handleCartUpdate} />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <BulkDiscountCalculator onCartUpdate={handleCartUpdate} />
        </TabsContent>

        <TabsContent value="checkout" className="space-y-6">
          <CheckoutProcess onOrderComplete={handleCartUpdate} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <PurchaseHistory />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Analytics</CardTitle>
              <CardDescription>
                Track your spending patterns and service utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics dashboard will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}