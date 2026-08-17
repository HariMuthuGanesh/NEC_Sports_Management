import React, { useState } from "react";
import { useAuth, ROLES } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import { Trophy, ShieldCheck, UserCheck, Lock } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage({ onLoginSuccess }) {
  const { login, ROLES, t } = useAuth();
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
          <h2 className="nec-login-title">{t.collegeName}</h2>
          <span className="nec-login-subtitle">{t.systemTitle}</span>
        </div>

        <form onSubmit={handleSubmit} className="nec-login-form">
          <div className="nec-form-group">
            <label className="nec-form-label">{t.selectPortalRole}</label>
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
            <label className="nec-form-label">{t.rollOrStaffId}</label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder={t.enterRollPlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">{t.password}</label>
            <input
              type="password"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder={t.enterPasswordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" icon={UserCheck}>
            {t.signInBtn}
          </Button>

          <div className="nec-login-footer-info">
            <ShieldCheck size={14} /> {t.integratedWithLasa}
          </div>
        </form>
      </div>
    </div>
  );
}
