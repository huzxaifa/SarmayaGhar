import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ValuationInput, ValuationResult } from "@/lib/types";

export function useValuation() {
  return useMutation<ValuationResult, Error, ValuationInput>({
    mutationFn: async (input: ValuationInput) => {
      const response = await apiRequest('POST', '/api/ml/property-valuation', input);
      return response.json();
    },
  });
}

export function useMarketTrends() {
  return useMutation({
    mutationFn: async (params: { city: string; propertyType: string }) => {
      const response = await apiRequest('GET', `/api/ml/market-trends?city=${params.city}&propertyType=${params.propertyType}`);
      return response.json();
    },
  });
}

export function useROICalculation() {
  return useMutation({
    mutationFn: async (data: { purchasePrice: number; currentValue: number; monthlyRent?: number }) => {
      const response = await apiRequest('POST', '/api/ml/roi-calculation', data);
      return response.json();
    },
  });
}
