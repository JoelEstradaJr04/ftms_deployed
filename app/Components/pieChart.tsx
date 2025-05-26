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
import { RevenueCategory, ExpenseCategory } from '@prisma/client';
import "../styles/pieChart.css";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface PieChartProps {
  revenueData: Record<RevenueCategory, number>;
  expenseData: Record<ExpenseCategory, number>;
}

const PieChart: React.FC<PieChartProps> = ({ revenueData, expenseData }) => {
  const revenueColors = {
    Boundary: "#4373A1",
    Percentage: "#708D81",
    Bus_Rental: "#F4D58D",
    Other: "#001427"
  };

  const expenseColors = {
    Fuel: "#8D0801",
    Vehicle_Parts: "#bf0603",
    Tools: "#8b0000",
    Equipment: "#590202",
    Supplies: "#720000",
    Other: "#400000"
  };

  const pieData = {
    labels: [
      ...Object.keys(revenueData).map(cat => `Revenue - ${cat.replace('_', ' ')}`),
      ...Object.keys(expenseData).map(cat => `Expense - ${cat.replace('_', ' ')}`)
    ],
    datasets: [
      {
        data: [
          ...Object.values(revenueData),
          ...Object.values(expenseData)
        ],
        backgroundColor: [
          ...Object.keys(revenueData).map(cat => revenueColors[cat as keyof typeof revenueColors]),
          ...Object.keys(expenseData).map(cat => expenseColors[cat as keyof typeof expenseColors])
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12
          },
          color: '#000000'
        }
      },
      datalabels: {
        color: "#fff",
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textAlign: 'center',
        textShadowBlur: 8,
        formatter: (value: number) => {
          const total = Object.values(revenueData).reduce((a, b) => a + b, 0) +
                       Object.values(expenseData).reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `₱${value.toLocaleString()}\n(${percentage}%)`;
        },
        font: {
          weight: "bold",
          size: 12,
        },
        anchor: "center",
        align: "center",
        offset: 10,
      },
    },
    layout: {
      padding: 20
    }
  };

  return (
    <div className="pieChartContainer">
      <Pie data={pieData} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
};

export default PieChart;
