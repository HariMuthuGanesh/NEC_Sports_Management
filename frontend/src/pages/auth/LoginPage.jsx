import React, { useState } from "react";
import { useAuth, ROLES } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import { Trophy, ShieldCheck, UserCheck, Lock } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage({ onLoginSuccess }) {
  const { login, ROLES } = useAuth();
  const [role, setRole] = useState(ROLES.ADMIN);
  const [username, setUsername] = useState("2112045");
  const [password, setPassword] = useState("password123");

  const handleSubmit = (e) => {
    e.preventDefault();
    let name = "Rahul Sharma";
    let dept = "CSE";
    let title = "Student";

    if (role === ROLES.ADMIN) {
      name = "Dr. K. Arumugam";
      dept = "Sports Office";
      title = "Director of Physical Education";
    } else if (role === ROLES.COORDINATOR) {
      name = "Rahul Sharma";
      dept = "CSE";
      title = "CSE Sports Coordinator";
    } else if (role === ROLES.PLAYER) {
      name = "Priya Patel";
      dept = "MECH";
      title = "Student Athlete";
    }

    login({ role, name, dept, title, id: username });
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div className="nec-login-container">
      <div className="nec-login-card">
        <div className="nec-login-header">
          <div className="nec-login-logo">
            <Trophy size={32} />
          </div>
          <h2 className="nec-login-title">National Engineering College</h2>
          <span className="nec-login-subtitle">Sports Management System</span>
        </div>

        <form onSubmit={handleSubmit} className="nec-login-form">
          <div className="nec-form-group">
            <label className="nec-form-label">Select Portal Role</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {Object.values(ROLES).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Roll Number / Staff ID</label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="Enter Roll No or Staff ID..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Password</label>
            <input
              type="password"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" icon={UserCheck}>
            Sign In to NEC Sports System
          </Button>

          <div className="nec-login-footer-info">
            <ShieldCheck size={14} /> Integrated with NEC Institutional Identity & Lakshmi Ammal Sports Academy
          </div>
        </form>
      </div>
    </div>
  );
}
