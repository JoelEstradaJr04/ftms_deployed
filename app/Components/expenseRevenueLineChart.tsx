import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const LineChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy(); // clean up old chart
      }

      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
          datasets: [
            {
              label: 'My First dataset',
              data: [65, 59, 80, 81, 56, 55, 40],
              fill: true,
              backgroundColor: 'rgba(105, 0, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 0.8)',
              borderWidth: 2,
              tension: 0.4,
            },
            {
              label: 'My Second dataset',
              data: [28, 48, 40, 19, 86, 27, 90],
              fill: true,
              backgroundColor: 'rgba(0, 137, 132, 0.2)',
              borderColor: 'rgba(50, 150, 255, 1)',
              borderWidth: 2,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return <canvas ref={chartRef} />;
};

export default LineChart;
