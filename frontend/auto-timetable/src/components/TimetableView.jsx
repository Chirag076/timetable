import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TimetableView() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/api/timetable")
      .then(res => {
        console.log("Fetched timetable:", res.data); // debug
        setTimetable(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching timetable:", err);
        setError("Could not fetch timetable");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading timetable...</p>;
  if (error) return <p>{error}</p>;

  if (timetable.length === 0) return <p>No timetable generated yet.</p>;

  return (
    <div>
      <h2>Generated Timetable</h2>
      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Subject</th>
            <th>Faculty</th>
            <th>Room</th>
          </tr>
        </thead>
        <tbody>
          {timetable.map((slot, index) => (
            <tr key={index}>
              <td>{slot.day}</td>
              <td>{slot.time}</td>
              <td>{slot.subject}</td>
              <td>{slot.faculty}</td>
              <td>{slot.room}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
