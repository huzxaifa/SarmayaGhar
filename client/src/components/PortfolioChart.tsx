import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface PortfolioChartProps {
  data: {
    labels: string[];
    values: number[];
    gains: number[];
  };
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Total Portfolio Value (Cr)",
            data: data.values,
            borderColor: "rgb(59, 130, 246)", // Blue
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: "Total Gains (Cr)",
            data: data.gains,
            borderColor: "rgb(34, 197, 94)", // Green
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(2) + ' Cr';
                }
                return label;
              }
            }
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              display: true,
              color: "rgba(0,0,0,0.05)",
            },
            ticks: {
              callback: function(value) {
                return value.toFixed(1) + ' Cr';
              }
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return <canvas ref={chartRef} data-testid="portfolio-chart" />;
}
