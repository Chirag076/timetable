import React, { useState } from "react";
import axios from "axios";
import "./AdminPanel.css"; // Add custom styles here

export default function AdminPanel() {
  // ---------- Faculty ----------
  const [facultyName, setFacultyName] = useState("");
  const [facultySubjects, setFacultySubjects] = useState("");
  const [facultyMaxHours, setFacultyMaxHours] = useState(12);

  // ---------- Subject ----------
  const [subjectName, setSubjectName] = useState("");
  const [semester, setSemester] = useState(1);
  const [credits, setCredits] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [students, setStudents] = useState(60);

  // ---------- Room ----------
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState(30);
  const [roomType, setRoomType] = useState("theory");

  // ---------- Batch ----------
  const [batchType, setBatchType] = useState("morning");

  // ---------- API Helper ----------
  const handleRequest = async (url, data, msg) => {
    try {
      await axios.post(url, data);
      alert(`${msg} Added!`);
    } catch (err) {
      console.error(err);
      alert(`Error adding ${msg}`);
    }
  };

  const generateTimetable = async () => {
    try {
      await axios.post("http://localhost:5000/api/timetable/generate", { batchType });
      alert("✅ Timetable Generated!");
    } catch (err) {
      console.error(err);
      alert("Error generating timetable");
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">🎓 Admin Panel — Timetable Manager</h1>

      <div className="admin-grid">
        {/* Faculty Card */}
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
            placeholder="Max Hours per Week"
            value={facultyMaxHours}
            onChange={(e) => setFacultyMaxHours(e.target.value)}
          />
          <button
            className="btn blue"
            onClick={() =>
              handleRequest(
                "http://localhost:5000/api/faculty",
                {
                  name: facultyName,
                  subjects: facultySubjects.split(","),
                  maxHoursPerWeek: facultyMaxHours,
                  availability: [
                    { day: "Monday", start: "08:10", end: "18:10" },
                    { day: "Tuesday", start: "08:10", end: "18:10" },
                    { day: "Wednesday", start: "08:10", end: "18:10" },
                    { day: "Thursday", start: "08:10", end: "18:10" },
                    { day: "Friday", start: "08:10", end: "18:10" },
                  ],
                },
                "Faculty"
              )
            }
          >
            ➕ Add Faculty
          </button>
        </div>

        {/* Subject Card */}
        <div className="admin-card">
          <h2 className="card-title green">Add Subject</h2>
          <input
            className="input"
            placeholder="Subject Name"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
          <div className="input-row">
            <input
              className="input small"
              type="number"
              placeholder="Semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
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
            <span>Is Lab?</span>
          </div>
          <input
            className="input"
            type="number"
            placeholder="Number of Students"
            value={students}
            onChange={(e) => setStudents(e.target.value)}
          />
          <button
            className="btn green"
            onClick={() =>
              handleRequest(
                "http://localhost:5000/api/subject",
                { name: subjectName, semester, credits, isLab, students },
                "Subject"
              )
            }
          >
            ➕ Add Subject
          </button>
        </div>

        {/* Room Card */}
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

      {/* Timetable Generator */}
      <div className="timetable-gen">
        <label>
          Batch Type:
          <select
            value={batchType}
            onChange={(e) => setBatchType(e.target.value)}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </label>
        <button className="btn indigo" onClick={generateTimetable}>
          ⚙️ Generate Timetable
        </button>
      </div>
    </div>
  );
}
