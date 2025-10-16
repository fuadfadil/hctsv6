"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const healthcareSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseExpiry: z.string().min(1, "License expiry date is required"),
  specialties: z.array(z.string()).min(1, "At least one specialty is required"),
  insuranceProvider: z.string().optional(),
  accreditation: z.string().optional(),
});

const insuranceSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  coverageTypes: z.array(z.string()).min(1, "At least one coverage type is required"),
  regulatoryBody: z.string().min(1, "Regulatory body is required"),
  reinsurancePartners: z.array(z.string()).optional(),
});

const investorSchema = z.object({
  investmentFocus: z.array(z.string()).min(1, "Investment focus areas are required"),
  portfolioSize: z.string().min(1, "Portfolio size is required"),
  investmentStrategy: z.string().min(1, "Investment strategy is required"),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]),
});

type HealthcareFormData = z.infer<typeof healthcareSchema>;
type InsuranceFormData = z.infer<typeof insuranceSchema>;
type InvestorFormData = z.infer<typeof investorSchema>;

interface CompanySpecificFormProps {
  companyType: string;
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
}

export function CompanySpecificForm({ companyType, onSubmit, initialData, isLoading }: CompanySpecificFormProps) {
  const [specialties, setSpecialties] = useState<string[]>(initialData?.specialties || []);
  const [coverageTypes, setCoverageTypes] = useState<string[]>(initialData?.coverageTypes || []);
  const [investmentFocus, setInvestmentFocus] = useState<string[]>(initialData?.investmentFocus || []);
  const [reinsurancePartners, setReinsurancePartners] = useState<string[]>(initialData?.reinsurancePartners || []);

  const getSchema = () => {
    switch (companyType) {
      case 'healthcare_provider':
        return healthcareSchema;
      case 'insurance_company':
        return insuranceSchema;
      case 'investor':
        return investorSchema;
      default:
        return z.object({});
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: initialData,
  });

  const addItem = (array: string[], setter: (arr: string[]) => void, value: string) => {
    if (value && !array.includes(value)) {
      setter([...array, value]);
    }
  };

  const removeItem = (array: string[], setter: (arr: string[]) => void, index: number) => {
    setter(array.filter((_, i) => i !== index));
  };

  const renderHealthcareForm = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">Medical License Number *</Label>
          <Input
            id="licenseNumber"
            {...register("licenseNumber")}
            placeholder="Enter license number"
          />
          {errors.licenseNumber && (
            <p className="text-sm text-red-600">{errors.licenseNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseExpiry">License Expiry Date *</Label>
          <Input
            id="licenseExpiry"
            type="date"
            {...register("licenseExpiry")}
          />
          {errors.licenseExpiry && (
            <p className="text-sm text-red-600">{String(errors.licenseExpiry.message)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Medical Specialties *</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add specialty"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (e.target as HTMLInputElement).value;
                addItem(specialties, setSpecialties, value);
                setValue('specialties', [...specialties, value]);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {specialties.map((specialty, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
              {specialty}
              <button
                type="button"
                onClick={() => {
                  removeItem(specialties, setSpecialties, index);
                  setValue('specialties', specialties.filter((_, i) => i !== index));
                }}
                className="ml-2 text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="insuranceProvider">Insurance Provider</Label>
          <Input
            id="insuranceProvider"
            {...register("insuranceProvider")}
            placeholder="Professional liability insurance provider"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accreditation">Accreditation</Label>
          <Input
            id="accreditation"
            {...register("accreditation")}
            placeholder="JCI, ISO, etc."
          />
        </div>
      </div>
    </div>
  );

  const renderInsuranceForm = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">Insurance License Number *</Label>
          <Input
            id="licenseNumber"
            {...register("licenseNumber")}
            placeholder="Enter license number"
          />
          {errors.licenseNumber && (
            <p className="text-sm text-red-600">{String(errors.licenseNumber.message)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="regulatoryBody">Regulatory Body *</Label>
          <Input
            id="regulatoryBody"
            {...register("regulatoryBody")}
            placeholder="e.g., SEC, Insurance Commission"
          />
          {errors.regulatoryBody && (
            <p className="text-sm text-red-600">{String(errors.regulatoryBody.message)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Coverage Types *</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add coverage type"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (e.target as HTMLInputElement).value;
                addItem(coverageTypes, setCoverageTypes, value);
                setValue('coverageTypes', [...coverageTypes, value]);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {coverageTypes.map((type, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
              {type}
              <button
                type="button"
                onClick={() => {
                  removeItem(coverageTypes, setCoverageTypes, index);
                  setValue('coverageTypes', coverageTypes.filter((_, i) => i !== index));
                }}
                className="ml-2 text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reinsurance Partners</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add reinsurance partner"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (e.target as HTMLInputElement).value;
                addItem(reinsurancePartners, setReinsurancePartners, value);
                setValue('reinsurancePartners', [...reinsurancePartners, value]);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {reinsurancePartners.map((partner, index) => (
            <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
              {partner}
              <button
                type="button"
                onClick={() => {
                  removeItem(reinsurancePartners, setReinsurancePartners, index);
                  setValue('reinsurancePartners', reinsurancePartners.filter((_, i) => i !== index));
                }}
                className="ml-2 text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInvestorForm = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Investment Focus Areas *</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add investment focus"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (e.target as HTMLInputElement).value;
                addItem(investmentFocus, setInvestmentFocus, value);
                setValue('investmentFocus', [...investmentFocus, value]);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {investmentFocus.map((focus, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
              {focus}
              <button
                type="button"
                onClick={() => {
                  removeItem(investmentFocus, setInvestmentFocus, index);
                  setValue('investmentFocus', investmentFocus.filter((_, i) => i !== index));
                }}
                className="ml-2 text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="portfolioSize">Portfolio Size *</Label>
          <Input
            id="portfolioSize"
            {...register("portfolioSize")}
            placeholder="e.g., $10M - $50M"
          />
          {errors.portfolioSize && (
            <p className="text-sm text-red-600">{String(errors.portfolioSize.message)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="riskTolerance">Risk Tolerance *</Label>
          <Select onValueChange={(value) => setValue('riskTolerance', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select risk tolerance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
          {errors.riskTolerance && (
            <p className="text-sm text-red-600">{String(errors.riskTolerance.message)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="investmentStrategy">Investment Strategy *</Label>
        <Textarea
          id="investmentStrategy"
          {...register("investmentStrategy")}
          placeholder="Describe your investment strategy and approach"
          rows={4}
        />
        {errors.investmentStrategy && (
          <p className="text-sm text-red-600">{String(errors.investmentStrategy.message)}</p>
        )}
      </div>
    </div>
  );

  const renderForm = () => {
    switch (companyType) {
      case 'healthcare_provider':
        return renderHealthcareForm();
      case 'insurance_company':
        return renderInsuranceForm();
      case 'investor':
        return renderInvestorForm();
      default:
        return <p>Invalid company type</p>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company-Specific Information</CardTitle>
        <CardDescription>
          Provide details specific to your type of organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {renderForm()}

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}