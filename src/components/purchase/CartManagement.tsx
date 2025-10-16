"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShoppingCart, Trash2, Plus, Minus, Calculator, CreditCard } from "lucide-react";

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
  listing: {
    quantity: number;
    minOrderQuantity: number;
    maxOrderQuantity?: number;
  };
}

interface CartManagementProps {
  onCartUpdate: () => void;
}

export function CartManagement({ onCartUpdate }: CartManagementProps) {
  const [cart, setCart] = useState<{
    id: string;
    items: CartItem[];
    subtotal: string;
    discountTotal: string;
    finalTotal: string;
    currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [calculatingDiscounts, setCalculatingDiscounts] = useState(false);

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

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setUpdatingItem(itemId);
    try {
      const response = await fetch("/api/purchase/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId: itemId, quantity: newQuantity }),
      });

      if (response.ok) {
        await fetchCart();
        onCartUpdate();
      }
    } catch (error) {
      console.error("Error updating cart:", error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const calculateDiscounts = async () => {
    setCalculatingDiscounts(true);
    try {
      const response = await fetch("/api/purchase/calculate", {
        method: "POST",
      });

      if (response.ok) {
        await fetchCart();
        onCartUpdate();
      }
    } catch (error) {
      console.error("Error calculating discounts:", error);
    } finally {
      setCalculatingDiscounts(false);
    }
  };

  const clearCart = async () => {
    try {
      const response = await fetch("/api/purchase/cart", {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCart();
        onCartUpdate();
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!cart || !cart.items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
          </CardTitle>
          <CardDescription>
            Your shopping cart is empty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items in cart</h3>
            <p className="text-muted-foreground">
              Browse service offers and add items to your cart.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Your Cart ({cart.items.length} items)
                </CardTitle>
                <CardDescription>
                  Review and manage your healthcare service selections
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={calculateDiscounts}
                  disabled={calculatingDiscounts}
                  size="sm"
                >
                  {calculatingDiscounts ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Calculate Discounts
                </Button>
                <Button variant="outline" onClick={clearCart} size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cart.items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.service.name}</h4>
                      <p className="text-sm text-muted-foreground mb-1">
                        {item.service.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {item.company.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateQuantity(item.id, 0)}
                      disabled={updatingItem === item.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Quantity:</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= item.listing.minOrderQuantity || updatingItem === item.id}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 0;
                            if (newQty >= 0 && (!item.listing.maxOrderQuantity || newQty <= item.listing.maxOrderQuantity)) {
                              updateQuantity(item.id, newQty);
                            }
                          }}
                          className="w-16 h-8 text-center"
                          min={item.listing.minOrderQuantity}
                          max={item.listing.maxOrderQuantity}
                          disabled={updatingItem === item.id}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.listing.maxOrderQuantity ? item.quantity >= item.listing.maxOrderQuantity : false || updatingItem === item.id}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.service.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {item.finalPrice} {cart.currency}
                      </p>
                      {parseFloat(item.discountAmount) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <p>Original: {item.totalPrice} {cart.currency}</p>
                          <p className="text-green-600">
                            Discount: -{item.discountAmount} {cart.currency} ({item.discountPercentage}%)
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {item.unitPrice} {cart.currency} each
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
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

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={fetchCart} className="flex-1">
                Refresh Cart
              </Button>
              <Button onClick={handleCheckout} className="flex-1">
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proceed to Checkout</DialogTitle>
            <DialogDescription>
              You will be redirected to the checkout process.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{cart.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{cart.subtotal} {cart.currency}</span>
                </div>
                {parseFloat(cart.discountTotal) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discounts:</span>
                    <span>-{cart.discountTotal} {cart.currency}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>{cart.finalTotal} {cart.currency}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCheckout(false)}>
                Continue Shopping
              </Button>
              <Button onClick={() => setShowCheckout(false)} className="flex-1">
                Go to Checkout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}