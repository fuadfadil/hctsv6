"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart as CartIcon, Trash2, Plus, Minus, CreditCard } from "lucide-react";

interface CartItem {
  id: string;
  listingId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
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

interface ShoppingCartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateCart: () => void;
}

export function ShoppingCart({ items, onClose, onUpdateCart }: ShoppingCartProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity }), {})
  );
  const [showCheckout, setShowCheckout] = useState(false);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    try {
      const response = await fetch("/api/marketplace/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId: itemId, quantity: newQuantity }),
      });

      if (response.ok) {
        setQuantities(prev => ({ ...prev, [itemId]: newQuantity }));
        onUpdateCart();
      }
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const removeItem = async (itemId: string) => {
    await updateQuantity(itemId, 0);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantity = quantities[item.id] || 0;
      return total + (parseFloat(item.unitPrice) * quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    try {
      const orderItems = items
        .filter(item => quantities[item.id] > 0)
        .map(item => ({
          listingId: item.listingId,
          quantity: quantities[item.id],
        }));

      const response = await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCheckout(false);
        onClose();
        // Could redirect to order confirmation page here
        alert("Order placed successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("An error occurred during checkout");
    }
  };

  const totalAmount = calculateTotal();
  const itemCount = items.filter(item => quantities[item.id] > 0).length;

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CartIcon className="h-5 w-5" />
              Shopping Cart ({itemCount} items)
            </DialogTitle>
            <DialogDescription>
              Review your healthcare service selections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <CartIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground">
                  Add some healthcare services to get started.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((item) => {
                    const quantity = quantities[item.id] || 0;
                    if (quantity === 0) return null;

                    return (
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
                            onClick={() => removeItem(item.id)}
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
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                                disabled={quantity <= item.listing.minOrderQuantity}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 0;
                                  if (newQty >= 0 && (!item.listing.maxOrderQuantity || newQty <= item.listing.maxOrderQuantity)) {
                                    setQuantities(prev => ({ ...prev, [item.id]: newQty }));
                                  }
                                }}
                                className="w-16 h-8 text-center"
                                min={item.listing.minOrderQuantity}
                                max={item.listing.maxOrderQuantity}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, quantity + 1)}
                                disabled={item.listing.maxOrderQuantity ? quantity >= item.listing.maxOrderQuantity : false}
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
                              {(parseFloat(item.unitPrice) * quantity).toFixed(2)} HU
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.unitPrice} HU each
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Separator />

                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>{totalAmount.toFixed(2)} Health Units</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Continue Shopping
                  </Button>
                  <Button
                    onClick={() => setShowCheckout(true)}
                    disabled={itemCount === 0}
                    className="flex-1"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Checkout
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Please review your order details before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{itemCount}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{totalAmount.toFixed(2)} Health Units</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckout} className="flex-1">
                Place Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}