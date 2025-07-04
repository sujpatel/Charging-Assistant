import React, { useEffect, useState } from "react"
import { useBattery } from "react-use";

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const battery = useBattery();
  const { level } = battery;

  useEffect(() => {
    if (level !== undefined) {
      fetch("http://localhost:8000/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ battery_level: level })
      });
    }
  }, [level]);

  useEffect(() => {
    fetch('http://localhost:8000/eia-data')
      .then(() => {
        return fetch('http://localhost:8000/current-grid');
      })
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

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6 font-sans text-lg">
      <h1 className="text-2xl font-bold mb-4">Energy Aware Charging Assistant</h1>
      <div className="flex space-x-8 mb-4">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold">{batteryPercentage}%</span>
          <span className="text-gray-500">Charging</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold">{gridLoadPercent.toFixed(0)}%</span>
          <span className="text-gray-500">Grid demand</span>
        </div>
      </div>
      <div className={`p-3 rounded text-center font-semibold ${messageColor}`}>{message}</div>
    </div>
  );
}

export default App;