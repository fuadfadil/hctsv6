"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingCalculator } from "@/components/calculator/PricingCalculator";
import { BulkDiscountCalculator } from "@/components/calculator/BulkDiscountCalculator";
import { Calculator, Package } from "lucide-react";

export default function CalculatorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Healthcare Pricing Calculator</h1>
        <p className="text-muted-foreground">
          Advanced pricing tools powered by AI and ICD-11 classification for accurate healthcare service pricing
        </p>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Single Service Calculator
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Bulk Pricing Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <PricingCalculator />
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <BulkDiscountCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}