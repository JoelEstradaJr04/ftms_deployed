"use client";

import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// Fix: Remove non-existent enum imports and use string-based categories
// that align with your GlobalCategory model
interface PieChartProps {
  revenueData: Record<string, number>; // Categories are string names from GlobalCategory
  expenseData: Record<string, number>; // Categories are string names from GlobalCategory
}

const PieChart: React.FC<PieChartProps> = ({ revenueData, expenseData }) => {
  // Define color mappings for common categories
  // These should match the actual category names in your GlobalCategory table
  const colors: Record<string, string> = {
    'Fuel': "#ff6b6b",
    'Vehicle_Parts': "#4ecdc4",
    'Tools': "#45b7d1",
    'Equipment': "#96ceb4",
    'Supplies': "#feca57",
    'Multiple_Categories': "#ff9ff3",
    'Boundary': "#54a0ff",
    'Percentage': "#5f27cd",
  };

  // Helper function to get color for a category, with fallbacks
  const getRevenueColor = (category: string): string => {
    return (colors as Record<string, string>)[category] || (colors as Record<string, string>)[category.replace(/\s+/g, '_')] || "#6C757D";
  };

  const getExpenseColor = (category: string): string => {
    return (colors as Record<string, string>)[category] || (colors as Record<string, string>)[category.replace(/\s+/g, '_')] || "#495057";
  };

  // Helper function to format category names for display
  const formatCategoryName = (category: string): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Create the backgroundColor array
  const backgroundColors = [
    ...Object.keys(revenueData).map(cat => getRevenueColor(cat)),
    ...Object.keys(expenseData).map(cat => getExpenseColor(cat))
  ];

  const pieData = {
    labels: [
      ...Object.keys(revenueData).map(cat => `Revenue - ${formatCategoryName(cat)}`),
      ...Object.keys(expenseData).map(cat => `Expense - ${formatCategoryName(cat)}`)
    ],
    datasets: [
      {
        data: [
          ...Object.values(revenueData),
          ...Object.values(expenseData)
        ],
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: '#ffffff'
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        position: 'top',
        display: true,
        text: 'Revenue and Expense Breakdown',
        font: {
          size: 18,
          weight: 'bold',
        },
        color: '#000',
        padding: {
          top: 10,
          bottom: 20
        },
      },
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12
          },
          color: '#000000',
          boxWidth: 16,
          padding: 8,
          // Fix: Use proper type checking and array access for backgroundColor
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels?.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number;
                // Fix: Safely access backgroundColor with proper type checking
                const backgroundColor = Array.isArray(backgroundColors) && i < backgroundColors.length 
                  ? backgroundColors[i] 
                  : '#6C757D';
                
                return {
                  text: `${label}: ₱${value.toLocaleString()}`,
                  fillStyle: backgroundColor,
                  strokeStyle: '#ffffff',
                  lineWidth: 1,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      datalabels: {
        color: "#fff",
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textAlign: 'center',
        textShadowBlur: 2,
        formatter: (value: number) => {
          const total = Object.values(revenueData).reduce((a, b) => a + b, 0) +
                       Object.values(expenseData).reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
          
          // Only show label if percentage is significant (>2%)
          if (parseFloat(percentage) < 2) {
            return '';
          }
          
          return `₱${value.toLocaleString()}\n(${percentage}%)`;
        },
        font: {
          weight: "bold",
          size: 11,
        },
        anchor: "center",
        align: "center",
        offset: 0,
        // Hide labels for very small slices
        display: function(context) {
          const value = context.dataset.data[context.dataIndex] as number;
          const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
          return total > 0 && (value / total) > 0.02; // Only show if >2%
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = Object.values(revenueData).reduce((a, b) => a + b, 0) +
                         Object.values(expenseData).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
            return `${label}: ₱${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 50,
        bottom: 20,
        top: 20,
      }
    }
  };

  return (
    <Pie data={pieData} options={options} plugins={[ChartDataLabels]} />
  );
};

export default PieChart;