"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";

interface Category {
  id: string;
  code: string;
  title: string;
  description?: string;
  serviceCount: number;
  listingCount: number;
  children?: Category[];
}

interface ServiceFiltersProps {
  onFilterChange: (filters: {
    category?: string;
    priceMin?: string;
    priceMax?: string;
    specialty?: string;
    location?: string;
    companyType?: string;
  }) => void;
}

export function ServiceFilters({ onFilterChange }: ServiceFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [companyType, setCompanyType] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    onFilterChange({
      category: selectedCategory,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      specialty,
      location,
      companyType,
    });
  }, [selectedCategory, priceRange, specialty, location, companyType, onFilterChange]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/marketplace/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setPriceRange({ min: "", max: "" });
    setSpecialty("");
    setLocation("");
    setCompanyType("");
  };

  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map((category) => (
      <div key={category.id} style={{ marginLeft: `${level * 16}px` }}>
        <div className="flex items-center space-x-2 py-1">
          <Checkbox
            id={category.id}
            checked={selectedCategory === category.id}
            onCheckedChange={(checked: boolean) => {
              if (checked) {
                setSelectedCategory(category.id);
              } else {
                setSelectedCategory("");
              }
            }}
          />
          <Label
            htmlFor={category.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {category.code} - {category.title}
          </Label>
          <span className="text-xs text-muted-foreground">
            ({category.listingCount})
          </span>
        </div>
        {category.children && category.children.length > 0 && (
          <div>{renderCategoryTree(category.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filters</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Refine your search results
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Categories */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Medical Categories (ICD-11)
          </Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.length > 0 ? (
              renderCategoryTree(categories)
            ) : (
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Price Range (Health Units)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="price-min" className="text-xs">Min</Label>
              <Input
                id="price-min"
                type="number"
                placeholder="0"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="price-max" className="text-xs">Max</Label>
              <Input
                id="price-max"
                type="number"
                placeholder="10000"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="h-8"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Specialty */}
        <div>
          <Label htmlFor="specialty" className="text-sm font-semibold mb-3 block">
            Specialty
          </Label>
          <Input
            id="specialty"
            placeholder="e.g., cardiology, radiology"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="h-8"
          />
        </div>

        <Separator />

        {/* Location */}
        <div>
          <Label htmlFor="location" className="text-sm font-semibold mb-3 block">
            Location
          </Label>
          <Input
            id="location"
            placeholder="City, region, or country"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-8"
          />
        </div>

        <Separator />

        {/* Company Type */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Provider Type
          </Label>
          <Select value={companyType} onValueChange={setCompanyType}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="healthcare_provider">Healthcare Provider</SelectItem>
              <SelectItem value="insurance_company">Insurance Company</SelectItem>
              <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
              <SelectItem value="medical_equipment">Medical Equipment</SelectItem>
              <SelectItem value="diagnostic_center">Diagnostic Center</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}