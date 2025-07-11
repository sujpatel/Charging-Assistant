import React, { useEffect, useState } from "react"
import { useBattery } from "react-use";
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const battery = useBattery();
  const { level } = battery;

  const [history, setHistory] = useState([]);


  useEffect(() => {
    fetch('https://charging-assistant.onrender.com/grid-history-24')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
      })
      .catch(error => {
        setError(error.toString());
      });
  }, []);




  const chartData = {
    //x axis labels
    labels: history.map(point => {
      let period = point.period;
      if (period && period.length === 13) {
        period += ":00:00Z";
      }
      const date = new Date(period);
      return isNaN(date.getTime()) ? 'Invalid' : date.toLocaleTimeString();
    }),
    //y axis labels
    datasets: [
      {
        label: 'Grid Demand (MW)',
        data: history.map(point => point.value),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  useEffect(() => {
    if (level !== undefined) {
      fetch("https://charging-assistant.onrender.com/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ battery_level: level })
      })
        .catch(error => {
          console.error("Failed to send battery data:", error);
        });
    }
  }, [level]);


  useEffect(() => {
    fetch('https://charging-assistant.onrender.com/current-grid')
      .then(response => response.json())
      .then(result => {
        setData(result);
      })
      .catch(error => {
        setError(error.toString());
      });
  }, []);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!data) return <p>Loading data...</p>;

  const maxGridLoad = 160000;
  const gridLoadPercent = (data.value / maxGridLoad) * 100;
  const batteryPercentage = level !== undefined ? (level * 100).toFixed(0) : '--';

  let message, messageColor;
  if (gridLoadPercent < 40) {
    message = "Great time to charge - grid is low and green!";
    messageColor = "bg-green-100 text-green-800";
  } else if (gridLoadPercent < 70) {
    message = "Charging is okay, but grid is moderately loaded.";
    messageColor = "bg-yellow-100 text-yellow-800";
  } else {
    message = "High grid demand - consider delaying charging";
    messageColor = "bg-red-100 text-red-800";
  }

  function getStatus(value) {
    if (value < 80000) return "Low";
    if (value < 120000) return "Medium";
    return "High";
  }
  return (
    <div className="">
      <h1 className="">Energy Aware Charging Assistant</h1>
      <div className="">
        <div className="">
          <span className="">{batteryPercentage}%</span>
          <span className="">Charging</span>
        </div>
        <div className="">
          <span className="">{gridLoadPercent.toFixed(0)}%</span>
          <span className="">Grid demand</span>
        </div>
      </div>
      <div className={`${messageColor}`}>{message}</div>
      <div className="my-8">
        <h2 className="text-xl font-bold mb-2">Grid Demand (Last 24 hours) </h2>
        <Line data={chartData} />
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h2>Grid Demand History (Last 24 hours)</h2>
        <table border="1" cellPadding="6" cellSpace="0" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Grid Demand(MW)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((point, idx) => {
              let period = point.period;
              if (period && period.length === 13) period += ":00:00Z";
              const date = new Date(period);
              return (
                <tr key={idx} style={{ textAlign: "center" }}>
                  <td>{isNaN(date.getTime()) ? 'Invalid' : date.toLocaleString()}</td>
                  <td>{point.value.toLocaleString()}</td>
                  <td>{getStatus(point.value)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;