import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TimetableView.css";

export default function TimetableView() {
  const [timetable, setTimetable] = useState([]);
  const [options, setOptions] = useState({ subjects: [], faculties: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState("BCA 5 (M)");
  const [editing, setEditing] = useState({});
  const [viewType, setViewType] = useState("batch");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const TIME_SLOTS = [
    "8:10-9:05",
    "9:05-10:00",
    "10:00-10:20",   // BREAK
    "10:20-11:15",
    "11:15-12:10",
    "12:10-1:05",
    "1:05-1:15",     // BREAK
    "1:15-2:10",
    "2:10-3:05",
    "3:05-4:00",
    "4:00-4:20",     // BREAK
    "4:20-5:15",
    "5:15-6:10",
  ];

  // All batches used anywhere in the app
  const batches = [
    "BCA 1 (M)",
    "BCA 1 (E)",
    "BCA 3 (M)",
    "BCA 3 (E)",
    "BCA 5 (M)",
    "BCA 5 (E)",
  ];

  // NEW: storage for all-batch data (used by full + faculty views)
  const [allData, setAllData] = useState({}); // { "BCA 1 (M)": [...], ...}
  const [allLoading, setAllLoading] = useState(false);

  // Single-batch fetch (kept as-is for batch view)
  useEffect(() => {
    if (viewType !== "batch") return; // avoid double loading
    setLoading(true);
    setError("");
    axios
      .get(`http://localhost:5000/api/timetable?batch=${encodeURIComponent(batch)}`)
      .then((res) => {
        setTimetable(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not fetch timetable");
        setLoading(false);
      });
  }, [batch, viewType]);

  // NEW: when full or faculty view is selected, fetch ALL batches once
  useEffect(() => {
    if (viewType === "batch") return;
    setAllLoading(true);
    setError("");
    Promise.all(
      batches.map((b) =>
        axios.get(`http://localhost:5000/api/timetable?batch=${encodeURIComponent(b)}`)
      )
    )
      .then((results) => {
        const map = {};
        results.forEach((res, i) => {
          map[batches[i]] = res.data || [];
        });
        setAllData(map);
        setAllLoading(false);
      })
      .catch(() => {
        setError("Could not fetch complete timetable");
        setAllLoading(false);
      });
  }, [viewType]);

  // Dropdown data (unchanged)
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/timetable/options")
      .then((res) => setOptions(res.data))
      .catch((err) => console.error("Error loading options", err));
  }, []);

  const handleEdit = (id, field) => setEditing({ id, field });

  const handleChange = async (id, field, value) => {
    setTimetable((prev) => prev.map((t) => (t._id === id ? { ...t, [field]: value } : t)));
    setEditing({});
    try {
      await axios.put(`http://localhost:5000/api/timetable/${id}`, { [field]: value });
    } catch {
      alert("❌ Failed to update timetable");
    }
  };

  // Choose the correct source data for list/grouped view
  let sourceData = timetable;
  if (viewType !== "batch") {
    // combine all batches for faculty view filtering & safety
    sourceData = Object.values(allData).flat();
  }

  // faculty filter (works across all batches now)
  let filteredTimetable = sourceData;
  if (viewType === "faculty" && selectedFaculty) {
    filteredTimetable = sourceData.filter((slot) => slot.faculty === selectedFaculty);
  }

  if ((viewType === "batch" && loading) || (viewType !== "batch" && allLoading)) {
    return <div className="timetable-loader">Loading timetable...</div>;
  }
  if (error) return <div className="timetable-error">{error}</div>;

  // Group by day for list table view
  const groupedByDay = DAYS.map((day) => {
    const slots = filteredTimetable
      .filter((slot) => slot.day === day)
      .sort((a, b) => a.time.localeCompare(b.time));
    return { day, slots };
  });

  // ---------- FULL VIEW (uses allData strictly) ----------
const renderFullView = () => {
  const normalizeTime = (t) => {
  if (!t) return "";
  const clean = t
    .replace(/[–.]/g, "-")
    .replace(/\s+/g, "")
    .replace(/AM|PM|am|pm/gi, "");

  const parts = clean.split("-").map((p) => {
    const [h, m] = p.split(":").map(Number);
    const hour = h > 12 ? h - 12 : h; // convert 24-hour to 12-hour
    return `${hour}:${m.toString().padStart(2, "0")}`;
  });

  return parts.join("-").toLowerCase();
};


  return (
    <div className="fullview-wrapper">
      {DAYS.map((day) => (
        <div key={day} className="day-section">
          <h3 className="day-title">{day}</h3>
          <table className="fullview-table">
            <thead>
              <tr>
                <th className="batch-header">Class</th>
                {TIME_SLOTS.map((slot, i) => (
                  <th key={i} className="time-slot-header">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {batches.map((b) => (
                <tr key={b}>
                  <td className="batch-name">{b}</td>

                  {TIME_SLOTS.map((slot) => {
                    // Breaks
                    if (["10:00-10:20", "1:05-1:15", "4:00-4:20"].includes(slot)) {
                      return (
                        <td key={slot + b} className="break-cell">
                          BREAK
                        </td>
                      );
                    }

                    const list = allData[b] || [];
                    const match = list.find(
                      (t) =>
                        t.day?.toLowerCase() === day.toLowerCase() &&
                        normalizeTime(t.time) === normalizeTime(slot)
                    );

                    if (!match)
                      return <td key={slot + b} className="empty-cell"></td>;

                    const isLab =
                      match.subject &&
                      match.subject.toLowerCase().includes("lab");

                    return (
                      <td
                        key={slot + b}
                        className={isLab ? "lab-cell" : "class-cell"}
                      >
                        <div className="subject-text">{match.subject}</div>
                        <div className="faculty-text">{match.faculty}</div>
                        <div className="room-text">{match.room}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};



  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h2>🗓️ Generated Timetable</h2>

        <div className="timetable-filters">
          <label>
            View Type:
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="filter-select"
            >
              <option value="batch">Batch-wise</option>
              <option value="faculty">Faculty-wise</option>
              <option value="full">Full Timetable</option>
            </select>
          </label>

          {viewType === "batch" && (
            <label>
              Select Batch:
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="filter-select"
              >
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}

          {viewType === "faculty" && (
            <label>
              Select Faculty:
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="filter-select"
              >
                <option value="">-- Select Faculty --</option>
                {options.faculties.map((f) => (
                  <option key={f._id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {viewType === "full" ? (
        renderFullView()
      ) : (
        <div className="timetable-wrapper">
          <table className="timetable-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Time</th>
                <th>Subject</th>
                <th>Faculty</th>
                <th>Room</th>
                <th>Batch</th>
              </tr>
            </thead>
            <tbody>
              {groupedByDay.map(({ day, slots }) =>
                slots.length > 0 ? (
                  slots.map((slot, idx) => (
                    <tr key={slot._id}>
                      {idx === 0 && (
                        <td rowSpan={slots.length} className="day-cell">
                          {day}
                        </td>
                      )}
                      <td>{slot.time}</td>
                      <td>{slot.subject}</td>
                      <td>{slot.faculty}</td>
                      <td>{slot.room}</td>
                      <td>{slot.batch}</td>
                    </tr>
                  ))
                ) : (
                  <tr key={day}>
                    <td className="day-cell">{day}</td>
                    <td colSpan="5" className="no-class">
                      No classes scheduled
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
