"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, X } from "lucide-react";

interface ICD11Result {
  id: string;
  code: string;
  title: string;
  description?: string;
  complexityScore: number;
  serviceCategory: string;
}

interface ICD11SelectorProps {
  selectedCode: string;
  onCodeSelect: (code: string) => void;
}

export function ICD11Selector({ selectedCode, onCodeSelect }: ICD11SelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<ICD11Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<ICD11Result | null>(null);

  useEffect(() => {
    if (selectedCode) {
      fetchCodeDetails(selectedCode);
    } else {
      setSelectedDetails(null);
    }
  }, [selectedCode]);

  const searchCodes = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/calculator/icd11?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Error searching ICD-11 codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCodeDetails = async (code: string) => {
    try {
      const response = await fetch(`/api/calculator/icd11?code=${encodeURIComponent(code)}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedDetails(data.category || null);
      }
    } catch (error) {
      console.error("Error fetching ICD-11 details:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchCodes(query);
  };

  const handleSelect = (code: string) => {
    onCodeSelect(code);
    setResults([]);
    setSearchQuery("");
  };

  const handleClear = () => {
    onCodeSelect("");
    setSelectedDetails(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">ICD-11 Code (Optional)</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ICD-11 codes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {selectedCode && selectedDetails && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">{selectedDetails.code}</Badge>
                  <Badge variant="secondary">
                    Complexity: {selectedDetails.complexityScore}/4
                  </Badge>
                </div>
                <h4 className="font-medium">{selectedDetails.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDetails.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Category: {selectedDetails.serviceCategory}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleSelect(result.code)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{result.code}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {result.serviceCategory}
                      </Badge>
                    </div>
                    <h5 className="font-medium text-sm">{result.title}</h5>
                    {result.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="text-sm text-muted-foreground">Searching ICD-11 codes...</div>
        </div>
      )}
    </div>
  );
}