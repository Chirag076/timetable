import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TimetableView.css";

export default function TimetableView() {
  const [timetable, setTimetable] = useState([]);
  const [options, setOptions] = useState({ subjects: [], faculties: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState("BCA 5 (M)");
  const [editing, setEditing] = useState({});
  const [viewType, setViewType] = useState("batch");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = [
  "08:10-09:05",
  "09:05-10:00",
  "10:00-10:20",   // BREAK
  "10:20-11:15",
  "11:15-12:10",
  "12:10-13:05",
  "13:05-13:15",   // BREAK
  "13:15-14:10",
  "14:10-15:05",
  "15:05-16:00",
  "16:00-16:20",   // BREAK
  "16:20-17:15",
  "17:15-18:10",
];


  const batches = [
    "BCA 1 (M)",
    "BCA 1 (E)",
    "BCA 3 (M)",
    "BCA 3 (E)",
    "BCA 5 (M)",
    "BCA 5 (E)",
  ];

  // store all batches data
  const [allData, setAllData] = useState({}); // { "BCA 1 (M)": [...], ... }

  // canonicalize time slot into consistent "HH:MM-HH:MM" 24-hour style for matching
  const canonicalize = (raw) => {
    if (!raw) return "";
    // replace dots, en-dash, spaces; remove am/pm
    const clean = raw.replace(/[–—−]/g, "-").replace(/\./g, ":").replace(/\s+/g, "").replace(/am|pm/gi, "");
    const parts = clean.split("-");
    if (parts.length !== 2) return clean.toLowerCase();
    const parsePart = (p) => {
      // accept "8:10" or "08:10" or "0810" or "8:10"
      const [hStr, mStr] = p.split(":");
      let h = Number(hStr);
      let m = mStr !== undefined ? Number(mStr) : 0;
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      // pad
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      return `${hh}:${mm}`;
    };
    const a = parsePart(parts[0]);
    const b = parsePart(parts[1]);
    if (!a || !b) return clean.toLowerCase();
    return `${a}-${b}`;
  };

  // build canonical slots for TIME_SLOTS once
  const CANON_TIME_SLOTS = TIME_SLOTS.map(s => canonicalize(s));

  // fetch single-batch timetable
  useEffect(() => {
    if (viewType !== "batch") return;
    setLoading(true);
    setError("");
    axios
      .get(`http://localhost:5000/api/timetable?batch=${encodeURIComponent(batch)}`)
      .then((res) => {
        setTimetable(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching batch timetable:", err);
        setError("Could not fetch timetable");
        setLoading(false);
      });
  }, [batch, viewType]);

  // fetch all batches when needed (full or faculty view)
  useEffect(() => {
    if (viewType === "batch") return;
    setAllLoading(true);
    setError("");
    Promise.all(batches.map(b => axios.get(`http://localhost:5000/api/timetable?batch=${encodeURIComponent(b)}`)))
      .then(results => {
        const map = {};
        results.forEach((r, i) => {
          map[batches[i]] = r.data || [];
        });
        setAllData(map);
        setAllLoading(false);
      })
      .catch(err => {
        console.error("Error fetching all batches:", err);
        setError("Could not fetch complete timetable");
        setAllLoading(false);
      });
  }, [viewType]);

  // dropdown options
  useEffect(() => {
    axios.get("http://localhost:5000/api/timetable/options")
      .then((res) => setOptions(res.data || { subjects: [], faculties: [], rooms: [] }))
      .catch(err => console.error("Error loading options", err));
  }, []);

  const handleEdit = (id, field) => setEditing({ id, field });

  const handleChange = async (id, field, value) => {
    // optimistic UI update (batch view only)
    if (viewType === "batch") {
      setTimetable(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t));
    } else {
      // if allData contains this id, update it too (so full/faculty views reflect change)
      setAllData(prev => {
        const copy = { ...prev };
        Object.keys(copy).forEach(batchName => {
          copy[batchName] = copy[batchName].map(t => t._id === id ? { ...t, [field]: value } : t);
        });
        return copy;
      });
    }

    setEditing({});
    try {
      await axios.put(`http://localhost:5000/api/timetable/${id}`, { [field]: value });
    } catch (err) {
      console.error("Failed to update timetable entry", err);
      alert("❌ Failed to update timetable");
    }
  };

  // choose source data
  let sourceData = timetable;
  if (viewType !== "batch") {
    sourceData = Object.values(allData).flat();
  }

  // apply faculty filter
  let filteredTimetable = sourceData;
  if (viewType === "faculty" && selectedFaculty) {
    filteredTimetable = sourceData.filter(slot => slot.faculty === selectedFaculty);
  }

  if ((viewType === "batch" && loading) || (viewType !== "batch" && allLoading)) {
    return <div className="timetable-loader">Loading timetable...</div>;
  }
  if (error) return <div className="timetable-error">{error}</div>;

  // grouped by day for list view
  const groupedByDay = DAYS.map(day => {
    const slots = filteredTimetable
      .filter(slot => slot.day === day)
      .sort((a, b) => canonicalize(a.time).localeCompare(canonicalize(b.time)));
    return { day, slots };
  });

  // Render full view: for each day -> table where time columns and batch rows
  const renderFullView = () => {
    // helper to get all matches for batch/day/slot (canonicalized)
    const getMatchesFor = (batchName, day, slotCanonical) => {
      const list = allData[batchName] || [];
      return list.filter(t =>
        (t.day || "").toLowerCase() === day.toLowerCase() &&
        canonicalize(t.time) === slotCanonical
      );
    };

    return (
      <div className="fullview-wrapper">
        {DAYS.map(day => (
          <div key={day} className="day-section">
            <h3 className="day-title">{day}</h3>
            <table className="fullview-table">
              <thead>
                <tr>
                  <th className="batch-header">Class</th>
                  {TIME_SLOTS.map((slot, i) => (
                    <th key={i} className="time-slot-header">
                      <div className="slot-time">{slot}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {batches.map(b => (
                  <tr key={b}>
                    <td className="batch-name">{b}</td>

                    {CANON_TIME_SLOTS.map((slotCanon, idx) => {
                      // Breaks (keep same strings used earlier)
                      const rawSlot = TIME_SLOTS[idx];
                     if (["10:00-10:20", "13:05-13:15", "16:00-16:20"].includes(rawSlot))
{
                        return (
                          <td key={b + slotCanon} className="break-cell">
                            BREAK
                          </td>
                        );
                      }

                      const matches = getMatchesFor(b, day, slotCanon);

                      if (!matches || matches.length === 0) {
                        return <td key={b + slotCanon} className="empty-cell"></td>;
                      }

                      // If multiple matches (labs group entries or accidental multiple), render stacked
                      return (
                        <td key={b + slotCanon} className={matches.some(m => (m.subject || "").toLowerCase().includes("lab")) ? "lab-cell" : "class-cell"}>
                          {matches.map(m => (
                            <div key={m._id} className="cell-entry">
                              <div className="subject-text">{m.subject}</div>
                              <div className="faculty-text">{m.faculty}</div>
                              <div className="room-text">{m.room}</div>
                            </div>
                          ))}
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
            <select value={viewType} onChange={(e) => setViewType(e.target.value)} className="filter-select">
              <option value="batch">Batch-wise</option>
              <option value="faculty">Faculty-wise</option>
              <option value="full">Full Timetable</option>
            </select>
          </label>

          {viewType === "batch" && (
            <label>
              Select Batch:
              <select value={batch} onChange={(e) => setBatch(e.target.value)} className="filter-select">
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          )}

          {viewType === "faculty" && (
            <label>
              Select Faculty:
              <select value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} className="filter-select">
                <option value="">-- Select Faculty --</option>
                {options.faculties.map(f => <option key={f._id} value={f.name}>{f.name}</option>)}
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
