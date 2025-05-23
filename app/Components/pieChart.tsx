"use client";

import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import "../styles/pieChart.css";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const PieChart = () => {
  const [data, setData] = useState<number[]>([50, 15, 5, 20, 10]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newData = Array.from({ length: 5 }, () =>
        Math.floor(Math.random() * 50) + 10
      );
      setData(newData);
    },3000);

    return () => clearInterval(interval);
  }, []);

  const pieData = {
    labels: ["Inventory", "Operations", "Finance", "Human Resource", "Others"],
    datasets: [
      {
        data,
        backgroundColor: [
          "#8D0801", "#4373A1", "#F4D58D", "#708D81", "#001427"
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    plugins: {
      legend: {display: false},
      datalabels: {
        color: "#fff", // text color
        textShadowColor: 'rgba(0, 0, 0, 0.6)', // Shadow color
        textAlign: 'center', // Align text to the center
        textShadowBlur: 8, // Blur effect for the shadow
        formatter: (value, context) => {
          return context.chart.data.labels?.[context.dataIndex] || "";
        },
        font: {
          weight: "bold",
          size: 12,
        },
        
        rotation(context) {
            const chart = context.chart;
            const datasetIndex = context.datasetIndex;
            const index = context.dataIndex;
            const meta = chart.getDatasetMeta(datasetIndex);
            const arc = meta.data[index];

            if (arc && 'startAngle' in arc && 'endAngle' in arc) {
                const startAngle = arc.startAngle;
                const endAngle = arc.endAngle;
                const midAngle = ((arc as any).startAngle + (arc as any).endAngle) / 2;

                let degrees = (midAngle * 0) / Math.PI;
                
                // Flip the label if it's on the left side of the pie
                if (degrees > 90 && degrees < 270) {
                    degrees += 180;
                }

                return degrees;
            }
            return 0;
            },
        anchor: "center",
        align: "center",
        offset: 10,
      },
    },
  };

  return (
    <div className="pieChartContainer">
      <Pie data={pieData} options={options} plugins={[ChartDataLabels]} />
    </div>
  );
};

export default PieChart;
