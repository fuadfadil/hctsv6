"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Stethoscope } from "lucide-react";

interface SpecialtySelectorProps {
  companyId: string;
}

export function SpecialtySelector({ companyId }: SpecialtySelectorProps) {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [companyType, setCompanyType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecialties();
  }, [companyId]);

  const fetchSpecialties = async () => {
    try {
      const response = await fetch(`/api/company/specialties?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch specialties");
      }
      const data = await response.json();
      setSelectedSpecialties(data.specialties || []);
      setAvailableSpecialties(data.availableSpecialties || []);
      setCompanyType(data.companyType || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/company/specialties", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          specialties: selectedSpecialties,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save specialties");
      }

      setSuccess("Specialties updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading specialties...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Medical Specialties
        </CardTitle>
        <CardDescription>
          Select the medical specialties your {companyType.replace("_", " ")} offers or focuses on
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Selected Specialties */}
        {selectedSpecialties.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Specialties</h4>
            <div className="flex flex-wrap gap-2">
              {selectedSpecialties.map((specialty) => (
                <Badge
                  key={specialty}
                  variant="default"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleSpecialtyToggle(specialty)}
                >
                  {specialty} ×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Specialties */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Specialties</h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {availableSpecialties.map((specialty) => {
              const isSelected = selectedSpecialties.includes(specialty);
              return (
                <Button
                  key={specialty}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => handleSpecialtyToggle(specialty)}
                >
                  {specialty}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Specialties
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground">
          <p>
            Selecting the appropriate specialties helps match your services with the right patients and partners.
            You can select multiple specialties based on your capabilities.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}