import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register the required chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * WeightTrendChart component
 * 
 * Displays a line chart showing weight trends over time
 * Includes the actual weight, 7-day average, and goal weight line
 */
const WeightTrendChart = ({ data = [], viewMode = "daily", goalWeight }) => {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No weight data available</div>;
  }

  // Sort data by date (oldest to newest)
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Format dates based on view mode
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return viewMode === "daily" 
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : `${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Extract labels (dates) and data points (weights)
  const labels = sortedData.map(item => formatDate(item.date));
  const weights = sortedData.map(item => parseFloat(item.weight));

  // Calculate 7-day moving average
  const calculateMovingAverage = (arr, windowSize = 7) => {
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
      if (i < windowSize - 1) {
        // Not enough data points yet for a full window
        const availablePoints = arr.slice(0, i + 1);
        result.push(availablePoints.reduce((sum, val) => sum + val, 0) / availablePoints.length);
      } else {
        // Full window calculation
        const window = arr.slice(i - windowSize + 1, i + 1);
        result.push(window.reduce((sum, val) => sum + val, 0) / windowSize);
      }
    }
    
    return result;
  };

  // Calculate moving average
  const movingAverage = calculateMovingAverage(weights);

  // Create goal weight line
  const goalWeightLine = Array(labels.length).fill(parseFloat(goalWeight) || 0);

  // Chart data
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Weight (kg)',
        data: weights,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      },
      {
        label: '7-Day Average',
        data: movingAverage,
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderDash: [5, 5],
        tension: 0.3,
      },
      {
        label: 'Goal Weight',
        data: goalWeightLine,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderDash: [3, 3],
        tension: 0,
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weight Trend',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Weight (kg)',
        },
        suggestedMin: Math.min(...weights) - 2,
        suggestedMax: Math.max(...weights) + 2,
      },
      x: {
        title: {
          display: true,
          text: viewMode === "daily" ? 'Date' : 'Month',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default WeightTrendChart; 