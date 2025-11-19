import React, { useState } from "react";
import axios from "axios";
import "./AdminPanel.css";

export default function AdminPanel() {
  // ---------- Faculty ----------
  const [facultyName, setFacultyName] = useState("");
  const [facultySubjects, setFacultySubjects] = useState("");
  const [facultyMaxHoursWeekly, setFacultyMaxHoursWeekly] = useState(20);
  const [facultyMaxHoursDaily, setFacultyMaxHoursDaily] = useState(4);
  const [facultyBatchAssignments, setFacultyBatchAssignments] = useState([]);

  // ---------- Subject ----------
  const [subjectName, setSubjectName] = useState("");
  const [semester, setSemester] = useState(1);
  const [credits, setCredits] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [students, setStudents] = useState(60);
  const [subjectBatchAssignment, setSubjectBatchAssignment] = useState("");

  // ---------- Room ----------
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState(30);
  const [roomType, setRoomType] = useState("theory");

  // ---------- API Helper ----------
  const handleRequest = async (url, data, msg) => {
    try {
      await axios.post(url, data);
      alert(`${msg} Added!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || `Error adding ${msg}`);
    }
  };

  const generateTimetable = async () => {
    try {
      await axios.post("http://localhost:5000/api/timetable/generate");
      alert("✅ Timetable Generated!");
    } catch (err) {
      console.error(err);
      alert("Error generating timetable");
    }
  };

  const BATCHES = [
    "BCA 1 (M)",
    "BCA 1 (E)",
    "BCA 3 (M)",
    "BCA 3 (E)",
    "BCA 5 (M)",
    "BCA 5 (E)"
  ];

  return (
    <div className="admin-container">
      <h1 className="admin-title">🎓 Admin Panel — Timetable Manager</h1>

      <div className="admin-grid">

        {/* --------------------------------------------------
            FACULTY CARD
        -------------------------------------------------- */}
        <div className="admin-card">
          <h2 className="card-title blue">Add Faculty</h2>

          <input
            className="input"
            placeholder="Faculty Name"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
          />

          <input
            className="input"
            placeholder="Subjects (comma separated)"
            value={facultySubjects}
            onChange={(e) => setFacultySubjects(e.target.value)}
          />

          <input
            className="input"
            type="number"
            placeholder="Weekly Max Hours"
            value={facultyMaxHoursWeekly}
            onChange={(e) => setFacultyMaxHoursWeekly(e.target.value)}
          />

          <input
            className="input"
            type="number"
            placeholder="Daily Max Hours"
            value={facultyMaxHoursDaily}
            onChange={(e) => setFacultyMaxHoursDaily(e.target.value)}
          />

          <label className="label">Batch Assignments:</label>
<select
  className="input"
  value=""
  onChange={(e) => {
    const newValue = e.target.value;
    if (!facultyBatchAssignments.includes(newValue)) {
      setFacultyBatchAssignments([...facultyBatchAssignments, newValue]);
    }
  }}
>
  <option value="">-- Select Batch --</option>
  {BATCHES.map((b) => (
    <option key={b} value={b}>{b}</option>
  ))}
</select>

{/* Show selected batches */}
<div className="selected-batch-list">
  {facultyBatchAssignments.map((b) => (
    <div key={b} className="selected-batch-item">
      {b}
      <button
        className="remove-btn"
        onClick={() =>
          setFacultyBatchAssignments(
            facultyBatchAssignments.filter((x) => x !== b)
          )
        }
      >
        ✖
      </button>
    </div>
  ))}
</div>


          <button
            className="btn blue"
            onClick={() =>
              handleRequest("http://localhost:5000/api/faculty", {
                name: facultyName,
                subjects: facultySubjects.split(",").map(s => s.trim()),
                maxHoursPerWeek: facultyMaxHoursWeekly,
                maxHoursPerDay: facultyMaxHoursDaily,
                batchAssignments: facultyBatchAssignments,
                availability: [
                  { day: "Monday", start: "08:10", end: "18:10" },
                  { day: "Tuesday", start: "08:10", end: "18:10" },
                  { day: "Wednesday", start: "08:10", end: "18:10" },
                  { day: "Thursday", start: "08:10", end: "18:10" },
                  { day: "Friday", start: "08:10", end: "18:10" }
                ]
              }, "Faculty")
            }
          >
            ➕ Add Faculty
          </button>
        </div>


        {/* --------------------------------------------------
            SUBJECT CARD
        -------------------------------------------------- */}
        <div className="admin-card">
          <h2 className="card-title green">Add Subject</h2>

          <input
            className="input"
            placeholder="Subject Name"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />

          <div className="input-row">
            <select
              className="input small"
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
            >
              <option value={1}>Semester 1</option>
              <option value={3}>Semester 3</option>
              <option value={5}>Semester 5</option>
            </select>

            <input
              className="input small"
              type="number"
              placeholder="Credits"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>

          <div className="checkbox-row">
            <input
              type="checkbox"
              checked={isLab}
              onChange={(e) => setIsLab(e.target.checked)}
            />
            <span>Is Lab Subject?</span>
          </div>

          <input
            className="input"
            type="number"
            placeholder="No. of Students"
            value={students}
            onChange={(e) => setStudents(e.target.value)}
          />

          <label className="label">Assign Batch:</label>
          <select
            className="input"
            value={subjectBatchAssignment}
            onChange={(e) => setSubjectBatchAssignment(e.target.value)}
          >
            <option value="">-- Select --</option>
            {BATCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <button
            className="btn green"
            onClick={() =>
              handleRequest(
                "http://localhost:5000/api/subject",
                {
                  name: subjectName,
                  semester,
                  credits,
                  isLab,
                  students,
                  batchAssignment: subjectBatchAssignment
                },
                "Subject"
              )
            }
          >
            ➕ Add Subject
          </button>
        </div>


        {/* --------------------------------------------------
            ROOM CARD
        -------------------------------------------------- */}
        <div className="admin-card">
          <h2 className="card-title purple">Add Room</h2>

          <input
            className="input"
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />

          <input
            className="input"
            type="number"
            placeholder="Capacity"
            value={roomCapacity}
            onChange={(e) => setRoomCapacity(e.target.value)}
          />

          <select
            className="input"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
          >
            <option value="theory">Theory</option>
            <option value="lab">Lab</option>
          </select>

          <button
            className="btn purple"
            onClick={() =>
              handleRequest(
                "http://localhost:5000/api/room",
                { name: roomName, capacity: roomCapacity, type: roomType },
                "Room"
              )
            }
          >
            ➕ Add Room
          </button>
        </div>

      </div>

      {/* --------------------------------------------------
          TIMETABLE GENERATOR
      -------------------------------------------------- */}
      <div className="timetable-gen">
        <button className="btn indigo" onClick={generateTimetable}>
          ⚙️ Generate Timetable
        </button>
      </div>
    </div>
  );
}
