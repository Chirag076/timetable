import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TimetableView() {
  const [timetable, setTimetable] = useState([]);
  const [options, setOptions] = useState({ subjects: [], faculties: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState("BCA 5 (M)");
  const [editing, setEditing] = useState({}); // track which field is being edited

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // 🟢 Fetch timetable
  useEffect(() => {
    setLoading(true);
    setError("");
    axios
      .get(`http://localhost:5000/api/timetable?batch=${encodeURIComponent(batch)}`)
      .then((res) => {
        setTimetable(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not fetch timetable");
        setLoading(false);
      });
  }, [batch]);

  // 🟢 Fetch dropdown data (subjects/faculty/rooms)
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/timetable/options")
      .then((res) => setOptions(res.data))
      .catch((err) => console.error("Error loading options", err));
  }, []);

  const handleEdit = (id, field) => {
    setEditing({ id, field });
  };

  const handleChange = async (id, field, value) => {
    // update local immediately
    setTimetable((prev) =>
      prev.map((t) => (t._id === id ? { ...t, [field]: value } : t))
    );
    setEditing({}); // exit edit mode

    // update in DB
    try {
      await axios.put(`http://localhost:5000/api/timetable/${id}`, { [field]: value });
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update timetable");
    }
  };

  if (loading) return <p>Loading timetable...</p>;
  if (error) return <p>{error}</p>;

  // group by day
  const groupedByDay = DAYS.map((day) => {
    const slots = timetable
      .filter((slot) => slot.day === day)
      .sort((a, b) => a.time.localeCompare(b.time));
    return { day, slots };
  });

  return (
    <div style={{ padding: "20px" }}>
      <h2>🗓️ Generated Timetable</h2>

      <label>
        Select Batch:{" "}
        <select value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="BCA 5 (M)">BCA 5 (M)</option>
          <option value="BCA 5 (E)">BCA 5 (E)</option>
          <option value="BCA 3 (M)">BCA 3 (M)</option>
          <option value="BCA 3 (E)">BCA 3 (E)</option>
          <option value="BCA 1 (M)">BCA 1 (M)</option>
          <option value="BCA 1 (E)">BCA 1 (E)</option>
        </select>
      </label>

      <table
        border="1"
        cellPadding="5"
        style={{
          borderCollapse: "collapse",
          marginTop: "10px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#8a7777ff", color: "white" }}>
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
                    <td rowSpan={slots.length} style={{ fontWeight: "bold" }}>
                      {day}
                    </td>
                  )}
                  <td>{slot.time}</td>

                  {/* Subject cell (click to edit) */}
                  <td
                    onClick={() => handleEdit(slot._id, "subject")}
                    style={{ cursor: "pointer" }}
                  >
                    {editing.id === slot._id && editing.field === "subject" ? (
                      <select
                        value={slot.subject}
                        onChange={(e) =>
                          handleChange(slot._id, "subject", e.target.value)
                        }
                        autoFocus
                      >
                        {options.subjects.map((s) => (
                          <option key={s._id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      slot.subject
                    )}
                  </td>

                  {/* Faculty cell (click to edit) */}
                  <td
                    onClick={() => handleEdit(slot._id, "faculty")}
                    style={{ cursor: "pointer" }}
                  >
                    {editing.id === slot._id && editing.field === "faculty" ? (
                      <select
                        value={slot.faculty}
                        onChange={(e) =>
                          handleChange(slot._id, "faculty", e.target.value)
                        }
                        autoFocus
                      >
                        {options.faculties.map((f) => (
                          <option key={f._id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      slot.faculty
                    )}
                  </td>

                  {/* Room cell (click to edit) */}
                  <td
                    onClick={() => handleEdit(slot._id, "room")}
                    style={{ cursor: "pointer" }}
                  >
                    {editing.id === slot._id && editing.field === "room" ? (
                      <select
                        value={slot.room}
                        onChange={(e) =>
                          handleChange(slot._id, "room", e.target.value)
                        }
                        autoFocus
                      >
                        {options.rooms.map((r) => (
                          <option key={r._id} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      slot.room
                    )}
                  </td>

                  <td>{slot.batch}</td>
                </tr>
              ))
            ) : (
              <tr key={day}>
                <td style={{ fontWeight: "bold" }}>{day}</td>
                <td colSpan="5" style={{ color: "#888" }}>
                  No classes scheduled
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
