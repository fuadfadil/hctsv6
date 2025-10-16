"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Download, Mail, Calendar, CreditCard } from "lucide-react";

interface OrderItem {
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
}

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  totalAmount: string;
  currency: string;
  status: string;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  items: OrderItem[];
}

interface OrderConfirmationProps {
  order: Order;
  onClose: () => void;
}

export function OrderConfirmation({ order, onClose }: OrderConfirmationProps) {
  const handleDownloadInvoice = () => {
    // Implement invoice download functionality
    alert("Invoice download functionality will be implemented");
  };

  const handleSendEmail = () => {
    // Implement email sending functionality
    alert("Email confirmation functionality will be implemented");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          <CardDescription>
            Your healthcare service order has been successfully placed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Order ID:</span>
                <p className="font-mono">{order.id}</p>
              </div>
              <div>
                <span className="font-semibold">Status:</span>
                <Badge variant="default" className="ml-2">
                  {order.status}
                </Badge>
              </div>
              <div>
                <span className="font-semibold">Order Date:</span>
                <p>{new Date(order.orderDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-semibold">Total Amount:</span>
                <p className="font-semibold">{order.totalAmount} {order.currency}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{item.service.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.service.description}</p>
                    <p className="text-xs text-muted-foreground">by {item.company.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {item.quantity} × {item.unitPrice} {order.currency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: {item.totalPrice} {order.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount:</span>
            <span>{order.totalAmount} {order.currency}</span>
          </div>

          {order.notes && (
            <div>
              <h3 className="font-semibold mb-2">Order Notes</h3>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {order.notes}
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">What's Next?</h4>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• You'll receive an email confirmation shortly</li>
                  <li>• The healthcare provider will process your order</li>
                  <li>• You'll be notified when services are ready for delivery</li>
                  <li>• Payment will be processed upon service delivery</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadInvoice} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Button variant="outline" onClick={handleSendEmail} className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Email Confirmation
            </Button>
            <Button onClick={onClose} className="flex-1">
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}