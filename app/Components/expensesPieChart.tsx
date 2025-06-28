import React, { useEffect, useRef, useMemo } from 'react';
import * as Chart from 'chart.js';

// Register Chart.js components
Chart.Chart.register(
  Chart.ArcElement,
  Chart.Tooltip,
  Chart.Legend,
  Chart.Title
);

interface ExpensesPieChartProps {
  data?: {
    Fuel?: number;
    Vehicle_Parts?: number;
    Tools?: number;
    Equipment?: number;
    Supplies?: number;
    Other?: number;
  };
}

const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ 
  data = {
    Fuel: 44,
    Vehicle_Parts: 55,
    Tools: 13,
    Equipment: 33,
    Supplies: 25,
    Other: 15
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart.Chart | null>(null);

  // Memoize expenseColors so it doesn't change on every render
  const expenseColors = useMemo(() => ({
    Fuel: "#ff6b6b",
    Vehicle_Parts: "#4ecdc4",
    Tools: "#45b7d1",
    Equipment: "#96ceb4",
    Supplies: "#feca57",
    Multiple_Categories: "#ff9ff3",
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
      const colors = Object.keys(data).map(key => expenseColors[key as keyof typeof expenseColors]);

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
              text: 'Expenses Breakdown',
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
  }, [data, expenseColors]); // expenseColors is now stable due to useMemo

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default ExpensesPieChart;