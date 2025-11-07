import React, { useState } from "react";
import AdminPanel from "./components/AdminPanel";
import TimetableView from "./components/TimetableView";

export default function App() {
  const [activeTab, setActiveTab] = useState("admin");

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-700 to-indigo-800 text-white flex flex-col">
        <div className="text-center py-6 border-b border-blue-500">
          <h1 className="text-2xl font-bold tracking-wide">
            🏫 Timetable Generator
          </h1>
          <p className="text-sm text-blue-200 mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 mt-6 space-y-1">
          <button
            onClick={() => setActiveTab("admin")}
            className={`w-full text-left px-6 py-3 font-medium hover:bg-blue-600 transition ${
              activeTab === "admin" ? "bg-blue-600" : ""
            }`}
          >
            🧑‍🏫 Manage Data
          </button>
          <button
            onClick={() => setActiveTab("timetable")}
            className={`w-full text-left px-6 py-3 font-medium hover:bg-blue-600 transition ${
              activeTab === "timetable" ? "bg-blue-600" : ""
            }`}
          >
            🗓️ View Timetable
          </button>
        </nav>

        
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-700">
            {activeTab === "admin" ? "Admin Panel" : "Generated Timetable"}
          </h2>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </span>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {activeTab === "admin" ? <AdminPanel /> : <TimetableView />}
        </div>
      </main>
    </div>
  );
}
