import numpy as np
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import math

class ROICalculator:
    """
    ROI Calculation Engine for Real Estate Investment Analysis
    Combines rental income and property value predictions
    """
    
    def __init__(self):
        self.market_rates = {
            'inflation_rate': 0.08,  # 8% annual inflation
            'interest_rate': 0.12,   # 12% bank interest rate
            'property_tax_rate': 0.005,  # 0.5% annual property tax
            'maintenance_rate': 0.02,    # 2% annual maintenance
            'vacancy_rate': 0.05,       # 5% vacancy rate
            'management_rate': 0.08      # 8% property management fee
        }
    
    def calculate_monthly_roi(self, monthly_rent: float, property_value: float) -> float:
        """Calculate monthly ROI percentage"""
        if property_value <= 0:
            return 0
        return (monthly_rent / property_value) * 100
    
    def calculate_annual_roi(self, monthly_rent: float, property_value: float) -> float:
        """Calculate annual ROI percentage"""
        if property_value <= 0:
            return 0
        annual_rent = monthly_rent * 12
        return (annual_rent / property_value) * 100
    
    def calculate_cash_flow(self, monthly_rent: float, monthly_expenses: float) -> Dict[str, float]:
        """Calculate cash flow metrics"""
        monthly_cash_flow = monthly_rent - monthly_expenses
        annual_cash_flow = monthly_cash_flow * 12
        
        return {
            'monthly_cash_flow': monthly_cash_flow,
            'annual_cash_flow': annual_cash_flow
        }
    
    def calculate_total_expenses(self, property_value: float, monthly_maintenance: float = 0) -> Dict[str, float]:
        """Calculate total monthly expenses"""
        # Property tax (annual to monthly)
        monthly_property_tax = (property_value * self.market_rates['property_tax_rate']) / 12
        
        # Maintenance (user input + market rate)
        monthly_maintenance_total = monthly_maintenance + (property_value * self.market_rates['maintenance_rate'] / 12)
        
        # Management fee (8% of rent)
        # This will be calculated after we know the rent
        
        # Insurance (estimated 0.1% of property value annually)
        monthly_insurance = (property_value * 0.001) / 12
        
        total_monthly_expenses = monthly_property_tax + monthly_maintenance_total + monthly_insurance
        
        return {
            'property_tax': monthly_property_tax,
            'maintenance': monthly_maintenance_total,
            'insurance': monthly_insurance,
            'total_expenses': total_monthly_expenses
        }
    
    def calculate_rental_yield(self, monthly_rent: float, property_value: float) -> float:
        """Calculate rental yield percentage"""
        if property_value <= 0:
            return 0
        annual_rent = monthly_rent * 12
        return (annual_rent / property_value) * 100
    
    def calculate_cap_rate(self, monthly_rent: float, property_value: float, monthly_expenses: float) -> float:
        """Calculate capitalization rate"""
        if property_value <= 0:
            return 0
        annual_net_income = (monthly_rent - monthly_expenses) * 12
        return (annual_net_income / property_value) * 100
    
    def calculate_payback_period(self, property_value: float, monthly_cash_flow: float) -> float:
        """Calculate payback period in years"""
        if monthly_cash_flow <= 0:
            return float('inf')
        annual_cash_flow = monthly_cash_flow * 12
        return property_value / annual_cash_flow
    
    def calculate_future_value(self, current_value: float, years: int, growth_rate: float = None) -> float:
        """Calculate future property value"""
        if growth_rate is None:
            growth_rate = self.market_rates['inflation_rate']
        
        return current_value * ((1 + growth_rate) ** years)
    
    def calculate_future_rent(self, current_rent: float, years: int, growth_rate: float = None) -> float:
        """Calculate future rental income"""
        if growth_rate is None:
            growth_rate = self.market_rates['inflation_rate']
        
        return current_rent * ((1 + growth_rate) ** years)
    
    def calculate_npv(self, initial_investment: float, cash_flows: List[float], discount_rate: float = None) -> float:
        """Calculate Net Present Value"""
        if discount_rate is None:
            discount_rate = self.market_rates['interest_rate']
        
        npv = -initial_investment
        for i, cash_flow in enumerate(cash_flows):
            npv += cash_flow / ((1 + discount_rate) ** (i + 1))
        
        return npv
    
    def calculate_irr(self, initial_investment: float, cash_flows: List[float]) -> float:
        """Calculate Internal Rate of Return"""
        def npv_function(rate):
            npv = -initial_investment
            for i, cash_flow in enumerate(cash_flows):
                npv += cash_flow / ((1 + rate) ** (i + 1))
            return npv
        
        # Use Newton's method to find IRR
        rate = 0.1  # Initial guess
        for _ in range(100):
            npv = npv_function(rate)
            if abs(npv) < 1e-6:
                break
            
            # Calculate derivative
            derivative = 0
            for i, cash_flow in enumerate(cash_flows):
                derivative -= cash_flow * (i + 1) / ((1 + rate) ** (i + 2))
            
            if abs(derivative) < 1e-10:
                break
            
            rate = rate - npv / derivative
        
        return rate * 100  # Convert to percentage
    
    def calculate_comprehensive_roi(self, 
                                 monthly_rent: float, 
                                 property_value: float, 
                                 monthly_maintenance: float = 0,
                                 years: int = 5) -> Dict[str, Any]:
        """Calculate comprehensive ROI analysis"""
        
        # Calculate expenses
        expenses = self.calculate_total_expenses(property_value, monthly_maintenance)
        
        # Calculate cash flow
        cash_flow = self.calculate_cash_flow(monthly_rent, expenses['total_expenses'])
        
        # Calculate ROI metrics
        monthly_roi = self.calculate_monthly_roi(monthly_rent, property_value)
        annual_roi = self.calculate_annual_roi(monthly_rent, property_value)
        rental_yield = self.calculate_rental_yield(monthly_rent, property_value)
        cap_rate = self.calculate_cap_rate(monthly_rent, property_value, expenses['total_expenses'])
        payback_period = self.calculate_payback_period(property_value, cash_flow['monthly_cash_flow'])
        
        # Calculate future projections
        future_value = self.calculate_future_value(property_value, years)
        future_rent = self.calculate_future_rent(monthly_rent, years)
        
        # Calculate NPV and IRR
        cash_flows = [cash_flow['annual_cash_flow']] * years
        cash_flows.append(future_value)  # Add property value at the end
        
        npv = self.calculate_npv(property_value, cash_flows)
        irr = self.calculate_irr(property_value, cash_flows)
        
        # Calculate total return
        total_return = (future_value - property_value) + (cash_flow['annual_cash_flow'] * years)
        total_return_percentage = (total_return / property_value) * 100
        
        return {
            'current_metrics': {
                'monthly_roi': monthly_roi,
                'annual_roi': annual_roi,
                'rental_yield': rental_yield,
                'cap_rate': cap_rate,
                'payback_period': payback_period
            },
            'cash_flow': cash_flow,
            'expenses': expenses,
            'future_projections': {
                'years': years,
                'future_property_value': future_value,
                'future_monthly_rent': future_rent,
                'property_appreciation': ((future_value - property_value) / property_value) * 100,
                'rent_growth': ((future_rent - monthly_rent) / monthly_rent) * 100
            },
            'investment_metrics': {
                'npv': npv,
                'irr': irr,
                'total_return': total_return,
                'total_return_percentage': total_return_percentage
            },
            'market_rates': self.market_rates
        }
    
    def get_investment_grade(self, roi_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Determine investment grade based on ROI analysis"""
        annual_roi = roi_analysis['current_metrics']['annual_roi']
        cap_rate = roi_analysis['current_metrics']['cap_rate']
        irr = roi_analysis['investment_metrics']['irr']
        
        # Grade criteria
        if annual_roi >= 12 and cap_rate >= 8 and irr >= 15:
            grade = 'A+'
            recommendation = 'Excellent investment opportunity'
        elif annual_roi >= 10 and cap_rate >= 6 and irr >= 12:
            grade = 'A'
            recommendation = 'Very good investment opportunity'
        elif annual_roi >= 8 and cap_rate >= 5 and irr >= 10:
            grade = 'B+'
            recommendation = 'Good investment opportunity'
        elif annual_roi >= 6 and cap_rate >= 4 and irr >= 8:
            grade = 'B'
            recommendation = 'Moderate investment opportunity'
        elif annual_roi >= 4 and cap_rate >= 3 and irr >= 6:
            grade = 'C'
            recommendation = 'Fair investment opportunity'
        else:
            grade = 'D'
            recommendation = 'Poor investment opportunity'
        
        return {
            'grade': grade,
            'recommendation': recommendation,
            'criteria': {
                'annual_roi_threshold': 8,
                'cap_rate_threshold': 5,
                'irr_threshold': 10
            }
        }
    
    def generate_insights(self, roi_analysis: Dict[str, Any]) -> List[str]:
        """Generate investment insights based on ROI analysis"""
        insights = []
        
        annual_roi = roi_analysis['current_metrics']['annual_roi']
        cap_rate = roi_analysis['current_metrics']['cap_rate']
        payback_period = roi_analysis['current_metrics']['payback_period']
        irr = roi_analysis['investment_metrics']['irr']
        
        # ROI insights
        if annual_roi >= 10:
            insights.append(f"Excellent rental yield of {annual_roi:.1f}% exceeds market average")
        elif annual_roi >= 8:
            insights.append(f"Good rental yield of {annual_roi:.1f}% is above market average")
        elif annual_roi >= 6:
            insights.append(f"Moderate rental yield of {annual_roi:.1f}% meets market expectations")
        else:
            insights.append(f"Low rental yield of {annual_roi:.1f}% may not justify investment")
        
        # Cap rate insights
        if cap_rate >= 8:
            insights.append(f"Strong capitalization rate of {cap_rate:.1f}% indicates good income potential")
        elif cap_rate >= 6:
            insights.append(f"Reasonable capitalization rate of {cap_rate:.1f}% shows decent income potential")
        else:
            insights.append(f"Low capitalization rate of {cap_rate:.1f}% suggests limited income potential")
        
        # Payback period insights
        if payback_period <= 10:
            insights.append(f"Quick payback period of {payback_period:.1f} years indicates strong cash flow")
        elif payback_period <= 15:
            insights.append(f"Reasonable payback period of {payback_period:.1f} years shows good cash flow")
        else:
            insights.append(f"Long payback period of {payback_period:.1f} years suggests slow cash flow recovery")
        
        # IRR insights
        if irr >= 15:
            insights.append(f"Excellent IRR of {irr:.1f}% indicates very attractive investment returns")
        elif irr >= 12:
            insights.append(f"Good IRR of {irr:.1f}% shows attractive investment returns")
        elif irr >= 8:
            insights.append(f"Moderate IRR of {irr:.1f}% indicates reasonable investment returns")
        else:
            insights.append(f"Low IRR of {irr:.1f}% suggests limited investment returns")
        
        # Market comparison
        market_roi = self.market_rates['interest_rate'] * 100
        if annual_roi > market_roi:
            insights.append(f"Rental yield exceeds bank interest rate by {annual_roi - market_roi:.1f}%")
        else:
            insights.append(f"Rental yield is below bank interest rate by {market_roi - annual_roi:.1f}%")
        
        return insights

def main():
    """Test the ROI Calculator"""
    calculator = ROICalculator()
    
    # Test data
    monthly_rent = 50000
    property_value = 5000000
    monthly_maintenance = 5000
    
    # Calculate comprehensive ROI
    roi_analysis = calculator.calculate_comprehensive_roi(
        monthly_rent, property_value, monthly_maintenance, 5
    )
    
    # Get investment grade
    grade = calculator.get_investment_grade(roi_analysis)
    
    # Generate insights
    insights = calculator.generate_insights(roi_analysis)
    
    print("ROI Analysis Results:")
    print(f"Annual ROI: {roi_analysis['current_metrics']['annual_roi']:.2f}%")
    print(f"Cap Rate: {roi_analysis['current_metrics']['cap_rate']:.2f}%")
    print(f"IRR: {roi_analysis['investment_metrics']['irr']:.2f}%")
    print(f"Investment Grade: {grade['grade']}")
    print(f"Recommendation: {grade['recommendation']}")
    print("\nInsights:")
    for insight in insights:
        print(f"- {insight}")

if __name__ == "__main__":
    main()
