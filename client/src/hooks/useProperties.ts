import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Property, PropertyFilters } from "@/lib/types";

export function useProperties(filters?: PropertyFilters) {
  const params = new URLSearchParams();
  if (filters?.city) params.append('city', filters.city);
  if (filters?.propertyType) params.append('propertyType', filters.propertyType);
  if (filters?.bedrooms) params.append('bedrooms', filters.bedrooms.toString());
  if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  
  const queryString = params.toString();
  const url = `/api/properties${queryString ? `?${queryString}` : ''}`;

  return useQuery<Property[]>({
    queryKey: ['/api/properties', filters],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      return response.json();
    },
  });
}

export function useProperty(id: string) {
  return useQuery<Property>({
    queryKey: ['/api/properties', id],
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (property: Partial<Property>) => {
      const response = await apiRequest('POST', '/api/properties', property);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
  });
}
