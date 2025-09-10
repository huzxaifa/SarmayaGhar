import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import { PAKISTANI_CITIES, PROPERTY_TYPES, BEDROOM_OPTIONS } from "@/lib/constants";
import type { PropertyFilters } from "@/lib/types";

export default function Properties() {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilters>({});
  
  const { data: properties, isLoading, error } = useProperties(appliedFilters);

  const handleSearch = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters({});
    setAppliedFilters({});
  };

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Property Listings</h1>
          <p className="text-xl text-muted-foreground">
            Discover AI-analyzed properties with detailed market insights and investment potential
          </p>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search & Filter Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Select 
                value={filters.city} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}
              >
                <SelectTrigger data-testid="select-filter-city">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  {PAKISTANI_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.propertyType} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}
              >
                <SelectTrigger data-testid="select-filter-property-type">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.bedrooms?.toString()} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, bedrooms: value ? parseInt(value) : undefined }))}
              >
                <SelectTrigger data-testid="select-filter-bedrooms">
                  <SelectValue placeholder="Bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  {BEDROOM_OPTIONS.map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Min Price (PKR)"
                value={filters.minPrice || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? parseInt(e.target.value) : undefined }))}
                data-testid="input-min-price"
              />

              <Input
                type="number"
                placeholder="Max Price (PKR)"
                value={filters.maxPrice || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? parseInt(e.target.value) : undefined }))}
                data-testid="input-max-price"
              />

              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1" data-testid="button-search-properties">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-destructive mb-4">Failed to load properties</div>
              <p className="text-muted-foreground">Please try again or contact support if the issue persists.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted-foreground/20"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-muted-foreground/20 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !properties || properties.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground mb-4">No properties found</div>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search filters or browse all available properties.
              </p>
              <Button onClick={clearFilters} className="mt-4" data-testid="button-show-all">
                Show All Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 text-muted-foreground">
              Showing {properties.length} properties
              {Object.keys(appliedFilters).length > 0 && " (filtered)"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
