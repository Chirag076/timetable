import React, { useState } from "react";
import axios from "axios";

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

  // ---------- Batch Type ----------
  const [batchType, setBatchType] = useState("morning");

  // ---------- API Handlers ----------
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

  const cardStyle =
    "bg-white shadow-md rounded-2xl p-6 border border-gray-100 transition-transform hover:scale-[1.01]";

  const inputStyle =
    "border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none";

  const buttonStyle =
    "mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        🎓 Admin Panel — Timetable Manager
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Faculty Card */}
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Add Faculty</h2>
          <input
            className={inputStyle}
            placeholder="Faculty Name"
            value={facultyName}
            onChange={e => setFacultyName(e.target.value)}
          />
          <input
            className={`${inputStyle} mt-3`}
            placeholder="Subjects (comma separated)"
            value={facultySubjects}
            onChange={e => setFacultySubjects(e.target.value)}
          />
          <input
            className={`${inputStyle} mt-3`}
            type="number"
            placeholder="Max Hours per Week"
            value={facultyMaxHours}
            onChange={e => setFacultyMaxHours(e.target.value)}
          />
          <button
            className={buttonStyle}
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
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold mb-4 text-green-600">Add Subject</h2>
          <input
            className={inputStyle}
            placeholder="Subject Name"
            value={subjectName}
            onChange={e => setSubjectName(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <input
              className={`${inputStyle}`}
              type="number"
              placeholder="Semester"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            />
            <input
              className={`${inputStyle}`}
              type="number"
              placeholder="Credits"
              value={credits}
              onChange={e => setCredits(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              checked={isLab}
              onChange={e => setIsLab(e.target.checked)}
            />
            <span>Is Lab?</span>
          </div>
          <input
            className={`${inputStyle} mt-3`}
            type="number"
            placeholder="Number of Students"
            value={students}
            onChange={e => setStudents(e.target.value)}
          />
          <button
            className={`${buttonStyle} bg-green-600 hover:bg-green-700`}
            onClick={() =>
              handleRequest("http://localhost:5000/api/subject", {
                name: subjectName,
                semester,
                credits,
                isLab,
                students,
              }, "Subject")
            }
          >
            ➕ Add Subject
          </button>
        </div>

        {/* Room Card */}
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold mb-4 text-purple-600">Add Room</h2>
          <input
            className={inputStyle}
            placeholder="Room Name"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
          />
          <input
            className={`${inputStyle} mt-3`}
            type="number"
            placeholder="Capacity"
            value={roomCapacity}
            onChange={e => setRoomCapacity(e.target.value)}
          />
          <select
            className={`${inputStyle} mt-3`}
            value={roomType}
            onChange={e => setRoomType(e.target.value)}
          >
            <option value="theory">Theory</option>
            <option value="lab">Lab</option>
          </select>
          <button
            className={`${buttonStyle} bg-purple-600 hover:bg-purple-700`}
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
      <div className="mt-10 text-center">
        <label className="mr-3 font-medium text-gray-700">
          Batch Type:
          <select
            className="ml-2 px-3 py-2 border rounded-lg"
            value={batchType}
            onChange={e => setBatchType(e.target.value)}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </label>
        <button
          className="ml-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all"
          onClick={generateTimetable}
        >
          ⚙️ Generate Timetable
        </button>
      </div>
    </div>
  );
}
