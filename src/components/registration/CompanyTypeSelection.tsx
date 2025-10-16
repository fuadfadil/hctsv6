"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Heart, Shield, TrendingUp } from "lucide-react";

interface CompanyType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const companyTypes: CompanyType[] = [
  {
    id: "healthcare_provider",
    name: "Healthcare Provider",
    description: "Hospitals, clinics, and medical service providers",
    icon: <Heart className="h-8 w-8 text-blue-600" />,
  },
  {
    id: "insurance_company",
    name: "Insurance Company",
    description: "Health insurance and medical coverage providers",
    icon: <Shield className="h-8 w-8 text-green-600" />,
  },
  {
    id: "investor",
    name: "Investor",
    description: "Investment firms and financial institutions",
    icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
  },
];

interface CompanyTypeSelectionProps {
  onSelect: (type: string) => void;
  selectedType?: string;
}

export function CompanyTypeSelection({ onSelect, selectedType }: CompanyTypeSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your Company Type</h2>
        <p className="text-muted-foreground mt-2">
          Select the type of organization you represent to customize your registration experience.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {companyTypes.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedType === type.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onSelect(type.id)}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                {type.icon}
              </div>
              <CardTitle className="text-lg">{type.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                {type.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedType && (
        <div className="text-center">
          <Button onClick={() => onSelect(selectedType)} className="px-8">
            Continue with {companyTypes.find(t => t.id === selectedType)?.name}
          </Button>
        </div>
      )}
    </div>
  );
}