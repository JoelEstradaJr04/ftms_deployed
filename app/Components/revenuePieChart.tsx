import React, { useEffect, useRef, useMemo } from 'react';
import * as Chart from 'chart.js';

// Register Chart.js components
Chart.Chart.register(
  Chart.ArcElement,
  Chart.Tooltip,
  Chart.Legend,
  Chart.Title
);

interface RevenuePieChartProps {
  data?: {
    Boundary?: number;
    Percentage?: number;
    Bus_Rental?: number;
    Other?: number;
  };
}

const RevenuePieChart: React.FC<RevenuePieChartProps> = ({ 
  data = {
    Boundary: 44,
    Percentage: 55,
    Bus_Rental: 13,
    Other: 33
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart.Chart | null>(null);

  // Memoize revenueColors so it doesn't change on every render
  const revenueColors = useMemo(() => ({
    Boundary: "#54a0ff",
    Percentage: "#5f27cd",
    Bus_Rental: "#F4D58D",
  }), []);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Extract labels and values from data
      const labels = Object.keys(data).map(key => key.replace('_', ' '));
      const values = Object.values(data);
      const colors = Object.keys(data).map(key => revenueColors[key as keyof typeof revenueColors]);

      // Create new chart
      chartInstance.current = new Chart.Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Revenue Breakdown',
              font: {
                size: 18,
                weight: 'bold'
              }
            },
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, revenueColors]);

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RevenuePieChart;