import React from "react";
import { useEffect } from "react";
import { useBattery } from "react-use";

function App() {

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

  return (
    <div>
      <strong>Charge level</strong>:
      <span> {(level * 100).toFixed(0)}%</span>
    </div>
  );
}

export default App;