import React from "react";
import AdminPanel from "./components/AdminPanel";
import TimetableView from "./components/TimetableView";

function App() {
  return (
    <div className="App">
      <h1>Automatic Timetable Generator</h1>
      <AdminPanel />
      <TimetableView />
    </div>
  );
}

export default App;
