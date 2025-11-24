import React, { useState } from "react";
import AdminPanel from "./components/AdminPanel";
import TimetableView from "./components/TimetableView";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("admin");

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(135deg, #c6d8ff, #d8c6ff, #ffe6f7)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          background: "linear-gradient(180deg, #1e3a8a, #4338ca)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          padding: "25px 0",
          boxShadow: "4px 0 15px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "1px solid rgba(255,255,255,0.3)",
            paddingBottom: "20px",
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              marginBottom: "6px",
            }}
          >
            🏫 Timetable Generator
          </h1>
          <p style={{ fontSize: "14px", color: "#d1d5ff" }}>Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "0 20px",
          }}
        >
          {[
            { id: "admin", label: "🧑‍🏫 Manage Data" },
            { id: "timetable", label: "🗓️ View Timetable" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: "none",
                background:
                  activeTab === tab.id
                    ? "rgba(255,255,255,0.25)"
                    : "transparent",
                color: "white",
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "16px",
                fontWeight: activeTab === tab.id ? "600" : "500",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.3s, transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background =
                  activeTab === tab.id ? "rgba(255,255,255,0.25)" : "transparent")
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <footer
          style={{
            marginTop: "auto",
            textAlign: "center",
            fontSize: "13px",
            color: "#a5b4fc",
            paddingTop: "30px",
            borderTop: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          © {new Date().getFullYear()} Timetable Generator
        </footer>
      </aside>

      {/* Main Section */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "18px 35px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              color: "#222",
              fontWeight: "600",
            }}
          >
            {activeTab === "admin" ? "Admin Panel" : "Generated Timetable"}
          </h2>
          <span style={{ color: "#444", fontSize: "15px", fontWeight: "500" }}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </header>

        {/* Content */}
        <main
          style={{
            flex: 1,
            padding: "35px",
            overflowY: "auto",
            fontSize: "16px",
            color: "#333",
          }}
        >
          {activeTab === "admin" ? <AdminPanel /> : <TimetableView />}
        </main>
      </div>
    </div>
  );
}
