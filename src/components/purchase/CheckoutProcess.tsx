"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";

interface CartItem {
  id: string;
  listingId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  discountPercentage: string;
  discountAmount: string;
  finalPrice: string;
  service: {
    name: string;
    description: string;
    unit: string;
  };
  company: {
    name: string;
  };
}

interface CheckoutProcessProps {
  onOrderComplete: () => void;
}

export function CheckoutProcess({ onOrderComplete }: CheckoutProcessProps) {
  const [cart, setCart] = useState<{
    id: string;
    items: CartItem[];
    subtotal: string;
    discountTotal: string;
    finalTotal: string;
    currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState({
    paymentMethodId: "",
    notes: "",
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/purchase/cart");
      if (response.ok) {
        const data = await response.json();
        setCart(data.cart);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!cart || !cart.items.length) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/purchase/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData),
      });

      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data.order);
        setOrderComplete(true);
        onOrderComplete();
      } else {
        const error = await response.json();
        alert(`Checkout failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("An error occurred during checkout");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (orderComplete && orderDetails) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Order Placed Successfully!</CardTitle>
          <CardDescription>
            Your healthcare service order has been submitted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Order Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono">{orderDetails.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span>{orderDetails.totalAmount} {orderDetails.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="secondary">{orderDetails.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{orderDetails.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Date:</span>
                  <span>{new Date(orderDetails.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                You will receive a confirmation email with order details and tracking information.
              </p>
              <Button onClick={() => window.location.reload()}>
                Continue Shopping
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cart || !cart.items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Checkout
          </CardTitle>
          <CardDescription>
            Complete your healthcare service purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground">
              Add some services to your cart before checking out.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Checkout
          </CardTitle>
          <CardDescription>
            Review your order and complete the purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Order Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.service.name}</h4>
                        <p className="text-sm text-muted-foreground mb-1">
                          {item.service.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {item.company.name}
                        </p>
                        <p className="text-sm mt-1">
                          Quantity: {item.quantity} {item.service.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.finalPrice} {cart.currency}</p>
                        {parseFloat(item.discountAmount) > 0 && (
                          <p className="text-xs text-green-600">
                            Saved: {item.discountAmount} {cart.currency}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{cart.subtotal} {cart.currency}</span>
                </div>
                {parseFloat(cart.discountTotal) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Discounts:</span>
                    <span>-{cart.discountTotal} {cart.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Final Total:</span>
                  <span>{cart.finalTotal} {cart.currency}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={checkoutData.paymentMethodId}
                    onValueChange={(value) => setCheckoutData({ ...checkoutData, paymentMethodId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="health_units">Health Units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or notes for this order..."
                    value={checkoutData.notes}
                    onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Important Notes:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Orders are subject to availability and provider confirmation</li>
                    <li>• Payment will be processed upon order confirmation</li>
                    <li>• Delivery timelines vary by service provider</li>
                    <li>• All sales are final unless otherwise specified</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={fetchCart} className="flex-1">
                Back to Cart
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={processing || !checkoutData.paymentMethodId}
                className="flex-1"
                size="lg"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Complete Purchase
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}