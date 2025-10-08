import React, { useState } from "react";
import axios from "axios";

export default function AdminPanel() {
  // ----------------- Faculty State -----------------
  const [facultyName, setFacultyName] = useState("");
  const [facultySubjects, setFacultySubjects] = useState("");
  const [facultyMaxHours, setFacultyMaxHours] = useState(12);

  // ----------------- Subject State -----------------
  const [subjectName, setSubjectName] = useState("");
  const [semester, setSemester] = useState(1);
  const [credits, setCredits] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [students, setStudents] = useState(60);

  // ----------------- Room State -----------------
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState(30);
  const [roomType, setRoomType] = useState("theory");

  // ----------------- Handlers -----------------
  const addFaculty = async () => {
    try {
      await axios.post("http://localhost:5000/api/faculty", {
        name: facultyName,
        subjects: facultySubjects.split(","),
        maxHoursPerWeek: facultyMaxHours,
        availability: [
          { day: "Monday", start: "09:00", end: "17:00" },
          { day: "Tuesday", start: "09:00", end: "17:00" },
          { day: "Wednesday", start: "09:00", end: "17:00" },
          { day: "Thursday", start: "09:00", end: "17:00" },
          { day: "Friday", start: "09:00", end: "17:00" },
        ],
      });
      alert("Faculty Added!");
      setFacultyName("");
      setFacultySubjects("");
    } catch (err) {
      console.error(err);
      alert("Error adding faculty");
    }
  };

  const addSubject = async () => {
    try {
      await axios.post("http://localhost:5000/api/subject", {
        name: subjectName,
        semester,
        credits,
        isLab,
        students,
      });
      alert("Subject Added!");
      setSubjectName("");
    } catch (err) {
      console.error(err);
      alert("Error adding subject");
    }
  };

  const addRoom = async () => {
    try {
      await axios.post("http://localhost:5000/api/room", {
        name: roomName,
        capacity: roomCapacity,
        type: roomType,
      });
      alert("Room Added!");
      setRoomName("");
    } catch (err) {
      console.error(err);
      alert("Error adding room");
    }
  };

  const generateTimetable = async () => {
    try {
      await axios.post("http://localhost:5000/api/timetable/generate");
      alert("Timetable Generated!");
    } catch (err) {
      console.error(err);
      alert("Error generating timetable");
    }
  };

  // ----------------- JSX -----------------
  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Panel</h1>

      {/* ---------- Faculty Form ---------- */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Add Faculty</h2>
        <input
          placeholder="Faculty Name"
          value={facultyName}
          onChange={(e) => setFacultyName(e.target.value)}
        />
        <input
          placeholder="Subjects (comma separated)"
          value={facultySubjects}
          onChange={(e) => setFacultySubjects(e.target.value)}
        />
        <input
          type="number"
          placeholder="Max Hours per Week"
          value={facultyMaxHours}
          onChange={(e) => setFacultyMaxHours(e.target.value)}
        />
        <button onClick={addFaculty}>Add Faculty</button>
      </div>

      {/* ---------- Subject Form ---------- */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Add Subject</h2>
        <input
          placeholder="Subject Name"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        />
        <input
          type="number"
          placeholder="Credits"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
        <label style={{ marginLeft: "10px" }}>
          Lab?
          <input
            type="checkbox"
            checked={isLab}
            onChange={(e) => setIsLab(e.target.checked)}
          />
        </label>
        <input
          type="number"
          placeholder="Number of Students"
          value={students}
          onChange={(e) => setStudents(e.target.value)}
        />
        <button onClick={addSubject}>Add Subject</button>
      </div>

      {/* ---------- Room Form ---------- */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Add Room</h2>
        <input
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Capacity"
          value={roomCapacity}
          onChange={(e) => setRoomCapacity(e.target.value)}
        />
        <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
          <option value="theory">Theory</option>
          <option value="lab">Lab</option>
        </select>
        <button onClick={addRoom}>Add Room</button>
      </div>

      {/* ---------- Generate Timetable ---------- */}
      <div style={{ marginTop: "20px" }}>
        <button
          style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white" }}
          onClick={generateTimetable}
        >
          Generate Timetable
        </button>
      </div>
    </div>
  );
}
