import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { SecurityLogger } from "../../utils/security";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Shield, Trash2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, LogOut, UserCog } from "lucide-react";
import "./AdminPortal.css";

const EVENT_META = {
  LOGIN_SUCCESS:        { label: "Login Success",         status: "success", icon: CheckCircle2 },
  LOGOUT:               { label: "Logout",                status: "neutral", icon: LogOut },
  ROLE_SWITCH:          { label: "Role Switch",           status: "info",    icon: UserCog },
  LOGIN_FAILED:         { label: "Login Failed",          status: "danger",  icon: XCircle },
  UNAUTHORIZED_ACCESS:  { label: "Unauthorized Access",   status: "warning", icon: AlertTriangle },
  SESSION_EXPIRED:      { label: "Session Expired",       status: "warning", icon: AlertTriangle },
  IDLE_TIMEOUT:         { label: "Idle Timeout",          status: "neutral", icon: AlertTriangle },
};

const SUMMARY_EVENTS = ["LOGIN_FAILED", "UNAUTHORIZED_ACCESS"];

export default function AuditLog() {
  const { t } = useAuth();
  const [log, setLog] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const load = () => setLog(SecurityLogger.getLog());

  useEffect(() => { load(); }, []);

  const handleClear = () => {
    if (window.confirm("Clear the entire security audit log? This cannot be undone.")) {
      SecurityLogger.clearLog();
      setLog([]);
    }
  };

  const filtered = filter === "ALL" ? log : log.filter(e => e.event === filter);

  const criticalCount = log.filter(e => SUMMARY_EVENTS.includes(e.event)).length;
  const loginCount    = log.filter(e => e.event === "LOGIN_SUCCESS").length;
  const failedCount   = log.filter(e => e.event === "LOGIN_FAILED").length;

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      width: "175px",
      render: (val) => {
        const d = new Date(val);
        return (
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
            {d.toLocaleDateString("en-IN")} {d.toLocaleTimeString("en-IN", { hour12: false })}
          </span>
        );
      }
    },
    {
      key: "event",
      label: "Event Type",
      width: "190px",
      render: (val) => {
        const meta = EVENT_META[val] || { label: val, status: "neutral" };
        const Icon = meta.icon || Shield;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon size={13} />
            <Badge status={meta.status}>{meta.label}</Badge>
          </div>
        );
      }
    },
    {
      key: "user",
      label: "User / ID",
      render: (val, row) => (
        <div>
          <span style={{ fontWeight: 600 }}>{val || row.userId || "—"}</span>
          {row.userId && val && <span style={{ color: "var(--nec-text-muted)", fontSize: "0.8rem" }}> ({row.userId})</span>}
        </div>
      )
    },
    {
      key: "role",
      label: "Role",
      width: "200px",
      render: (val, row) => {
        if (row.event === "ROLE_SWITCH") {
          return (
            <span style={{ fontSize: "0.82rem" }}>
              <span style={{ color: "var(--nec-text-muted)" }}>{row.from?.split(" ")[0]}</span>
              {" → "}
              <span style={{ fontWeight: 600, color: "var(--nec-navy)" }}>{row.to?.split(" ")[0]}</span>
            </span>
          );
        }
        return <span style={{ fontSize: "0.82rem" }}>{val || row.role || "—"}</span>;
      }
    },
    {
      key: "reason",
      label: "Details",
      render: (val, row) => (
        <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
          {val || row.route || row.dept || "—"}
        </span>
      )
    },
  ];

  const EVENT_FILTERS = ["ALL", ...Object.keys(EVENT_META)];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Shield size={20} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--nec-gold)", textTransform: "uppercase" }}>
              Security Centre
            </span>
          </div>
          <h2 className="nec-page-title">Security Audit Log</h2>
          <p className="nec-page-desc">
            Complete audit trail of authentication events, role switches, unauthorized access attempts, and session activity.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={handleClear}>Clear Log</Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="nec-stats-grid" style={{ marginBottom: "20px" }}>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Total Events</span>
            <Shield size={18} style={{ color: "var(--nec-navy)" }} />
          </div>
          <div className="nec-stat-value">{log.length}</div>
          <div className="nec-stat-subtext">In session history</div>
        </div>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Successful Logins</span>
            <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
          </div>
          <div className="nec-stat-value" style={{ color: "#22c55e" }}>{loginCount}</div>
          <div className="nec-stat-subtext">Authenticated sessions</div>
        </div>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Failed Attempts</span>
            <XCircle size={18} style={{ color: "#ef4444" }} />
          </div>
          <div className="nec-stat-value" style={{ color: "#ef4444" }}>{failedCount}</div>
          <div className="nec-stat-subtext">Potential threats</div>
        </div>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Security Alerts</span>
            <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
          </div>
          <div className="nec-stat-value" style={{ color: criticalCount > 0 ? "#f59e0b" : "var(--nec-text-main)" }}>
            {criticalCount}
          </div>
          <div className="nec-stat-subtext">Failed + unauthorized</div>
        </div>
      </div>

      {/* ── Event Type Filter ── */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {EVENT_FILTERS.map(ev => (
          <button
            key={ev}
            onClick={() => setFilter(ev)}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              border: `1.5px solid ${filter === ev ? "var(--nec-navy)" : "var(--nec-border-light)"}`,
              background: filter === ev ? "var(--nec-navy)" : "transparent",
              color: filter === ev ? "#fff" : "var(--nec-text-muted)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {ev === "ALL" ? "All Events" : (EVENT_META[ev]?.label || ev)}
            {ev !== "ALL" && (
              <span style={{
                marginLeft: "6px",
                background: filter === ev ? "rgba(255,255,255,0.2)" : "var(--nec-bg-alt)",
                borderRadius: "10px",
                padding: "0 6px",
                fontSize: "0.72rem",
              }}>
                {log.filter(e => e.event === ev).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Audit Table ── */}
      {filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--nec-text-muted)" }}>
            <Shield size={36} style={{ marginBottom: "12px", opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>No audit events recorded yet.</div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
              Events are logged automatically on login, logout, role changes, and access violations.
            </div>
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          loading={false}
          searchable={false}
          rowKey="id"
        />
      )}
    </div>
  );
}
