import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, BarChart, Home, Plus, FileText, RefreshCw } from "lucide-react";
import PortfolioChart from "@/components/PortfolioChart";
import { formatCurrency } from "@/lib/constants";

interface PortfolioData {
  properties: Array<{
    id: string;
    propertyId?: string;
    purchasePrice: string;
    currentValue: string;
    monthlyRent?: string;
    isRented: boolean;
    property?: {
      title: string;
      city: string;
      area: string;
    };
  }>;
  summary: {
    totalValue: number;
    totalGain: number;
    totalROI: number;
    monthlyIncome: number;
    propertiesCount: number;
  };
}

export default function Portfolio() {
  const { data: portfolioData, isLoading, error } = useQuery<PortfolioData>({
    queryKey: ['/api/portfolio'],
    queryFn: async () => {
      const response = await fetch('/api/portfolio');
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      return response.json();
    },
  });

  const chartData = {
    labels: ["Jan 2024", "Mar 2024", "May 2024", "Jul 2024", "Sep 2024", "Nov 2024", "Jan 2025"],
    values: [6.2, 6.8, 7.1, 7.5, 8.0, 8.2, 8.5],
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted-foreground/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted-foreground/20 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-destructive mb-4">Failed to load portfolio</div>
              <p className="text-muted-foreground">Please try again or contact support if the issue persists.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { summary, properties } = portfolioData;

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-primary mb-4">Portfolio Management</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Track your real estate investments, monitor performance, and get AI-powered optimization recommendations.
          </p>
        </div>
        
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Total Portfolio Value</span>
                <TrendingUp className="h-5 w-5 opacity-90" />
              </div>
              <div className="text-3xl font-bold mb-1" data-testid="portfolio-total-value">
                {formatCurrency(summary.totalValue)}
              </div>
              <div className="text-sm opacity-90">
                <span className="text-green-300">+{summary.totalROI.toFixed(1)}%</span> total return
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Properties Owned</span>
                <Home className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1" data-testid="portfolio-properties-count">
                {summary.propertiesCount}
              </div>
              <div className="text-sm text-muted-foreground">Across multiple cities</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Monthly Rental Income</span>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1" data-testid="portfolio-monthly-income">
                {formatCurrency(summary.monthlyIncome)}
              </div>
              <div className="text-sm text-green-600">Active rental income</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Gains</span>
                <BarChart className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1" data-testid="portfolio-total-gains">
                {formatCurrency(summary.totalGain)}
              </div>
              <div className="text-sm text-muted-foreground">Capital appreciation</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Performance Chart */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Portfolio Performance</CardTitle>
                  <select className="px-3 py-2 border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring">
                    <option>Last 12 Months</option>
                    <option>Last 24 Months</option>
                    <option>Last 5 Years</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <PortfolioChart data={chartData} />
                </div>
              </CardContent>
            </Card>
            
            {/* Property List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Properties</CardTitle>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-8">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No properties in your portfolio yet</p>
                    <Button data-testid="button-add-first-property">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Property
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Property</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Current Value</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Purchase Price</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Gain/Loss</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {properties.map((property) => {
                          const currentValue = parseFloat(property.currentValue);
                          const purchasePrice = parseFloat(property.purchasePrice);
                          const gain = currentValue - purchasePrice;
                          const gainPercentage = ((gain / purchasePrice) * 100).toFixed(1);
                          
                          return (
                            <tr key={property.id} data-testid={`portfolio-property-${property.id}`}>
                              <td className="px-4 py-4">
                                <div>
                                  <div className="font-semibold text-primary">
                                    {property.property?.title || `Property ${property.id}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {property.property?.area}, {property.property?.city}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-semibold text-primary">
                                {formatCurrency(currentValue)}
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                {formatCurrency(purchasePrice)}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`font-semibold ${gain >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                  {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPercentage}%)
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant={property.isRented ? "default" : "secondary"}>
                                  {property.isRented ? "Rented" : "Vacant"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* AI Recommendations Sidebar */}
          <div className="space-y-6">
            {/* AI Recommendations */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white/20 rounded-lg p-4">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 mt-0.5 mr-3 text-green-300" />
                      <div>
                        <div className="font-semibold text-sm mb-1">BUY Signal</div>
                        <div className="text-sm opacity-90">
                          Consider acquiring property in Bahria Town. Expected 25% appreciation in next 2 years.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-4">
                    <div className="flex items-start">
                      <BarChart className="h-5 w-5 mt-0.5 mr-3 text-yellow-300" />
                      <div>
                        <div className="font-semibold text-sm mb-1">Portfolio Rebalancing</div>
                        <div className="text-sm opacity-90">
                          Consider diversifying across more cities for better risk management.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-4">
                    <div className="flex items-start">
                      <DollarSign className="h-5 w-5 mt-0.5 mr-3 text-green-300" />
                      <div>
                        <div className="font-semibold text-sm mb-1">Rental Optimization</div>
                        <div className="text-sm opacity-90">
                          Some properties can increase rent by 15% based on market comparisons.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full" data-testid="button-add-property">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Property
                  </Button>
                  <Button variant="outline" className="w-full" data-testid="button-export-report">
                    <FileText className="mr-2 h-4 w-4" />
                    Export Portfolio Report
                  </Button>
                  <Button variant="outline" className="w-full" data-testid="button-schedule-revaluation">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Schedule Revaluation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
