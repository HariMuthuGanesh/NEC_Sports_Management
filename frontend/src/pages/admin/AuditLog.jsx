import React, { useState, useEffect } from "react";
import { SecurityLogger } from "../../utils/security";
import { auditApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import {
  Shield,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LogOut,
  UserCog,
  FileSpreadsheet,
  Calendar,
  Filter,
  Search,
  Settings
} from "lucide-react";
import "./AdminPortal.css";

const EVENT_META = {
  LOGIN_SUCCESS: { label: "Login Success", status: "success", icon: CheckCircle2 },
  LOGOUT: { label: "Logout", status: "neutral", icon: LogOut },
  ROLE_SWITCH: { label: "Role Switch", status: "info", icon: UserCog },
  LOGIN_FAILED: { label: "Login Failed", status: "danger", icon: XCircle },
  UNAUTHORIZED_ACCESS: { label: "Unauthorized Access", status: "warning", icon: AlertTriangle },
  SESSION_EXPIRED: { label: "Session Expired", status: "warning", icon: AlertTriangle },
  IDLE_TIMEOUT: { label: "Idle Timeout", status: "neutral", icon: AlertTriangle },
  AUTHENTICATION_FAILURE: { label: "Auth Failure", status: "danger", icon: XCircle },
  GALLERY_UPLOAD: { label: "Gallery Upload", status: "success", icon: CheckCircle2 },
  GALLERY_UPDATE: { label: "Gallery Update", status: "info", icon: Settings },
  GALLERY_DELETE: { label: "Gallery Delete", status: "danger", icon: XCircle },
  ANNOUNCEMENT_CREATE: { label: "Announcement Posted", status: "success", icon: CheckCircle2 },
  ANNOUNCEMENT_UPDATE: { label: "Announcement Updated", status: "info", icon: Settings },
  ANNOUNCEMENT_CANCEL: { label: "Announcement Cancelled", status: "warning", icon: AlertTriangle },
  ANNOUNCEMENT_DELETE: { label: "Announcement Deleted", status: "danger", icon: XCircle }
};

const CATEGORIES = [
  "ALL",
  "AUTHENTICATION",
  "ADMINISTRATIVE_MUTATION",
  "SECURITY_EVENT",
  "ACCESS_CONTROL",
  "SYSTEM"
];

const MODULES = [
  "ALL",
  "Authentication",
  "Tournaments",
  "Events",
  "Teams",
  "Appointments",
  "Gallery",
  "Announcements",
  "Matches",
  "System"
];

const escapeCsvCell = (cell) => {
  const text = String(cell ?? "");
  const formulaSafeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${formulaSafeText.replace(/"/g, '""')}"`;
};

export default function AuditLog() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterModule, setFilterModule] = useState("ALL");
  const [filterOutcome, setFilterOutcome] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const localEntries = SecurityLogger.getLog();
    try {
      const serverEntries = await auditApi.getEntries({
        category: filterCategory !== "ALL" ? filterCategory : undefined,
        module: filterModule !== "ALL" ? filterModule : undefined,
        outcome: filterOutcome !== "ALL" ? filterOutcome : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        search: search.trim() || undefined,
        limit: 500
      });

      // Merge unique entries prioritizing server
      const combined = [...(Array.isArray(serverEntries) ? serverEntries : [])];
      localEntries.forEach(loc => {
        if (!combined.some(c => c.timestamp === loc.timestamp && c.event === loc.event)) {
          combined.push(loc);
        }
      });
      combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLog(combined);
    } catch {
      setLog(localEntries);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterCategory, filterModule, filterOutcome, fromDate, toDate]);

  const handleExportCsv = () => {
    const rows = filteredLog.map(entry => ({
      LogID: entry.id || "",
      Timestamp: entry.timestamp || "",
      Event: entry.event || entry.eventType || "REQUEST",
      Category: entry.category || "SYSTEM",
      Module: entry.module || "System",
      Outcome: entry.outcome || (entry.statusCode >= 400 ? "FAILURE" : "SUCCESS"),
      User: entry.user || entry.username || entry.userId || "—",
      Role: entry.role || "—",
      Operation: entry.operation || `${entry.method || ""} ${entry.route || ""}`.trim(),
      IPAddress: entry.ipAddress || "—",
      Route: entry.route || "—",
      StatusCode: entry.statusCode || "—"
    }));

    const columns = Object.keys(rows[0] || {});
    const csvLines = [
      columns.map(escapeCsvCell).join(","),
      ...rows.map(row => columns.map(column => escapeCsvCell(row[column])).join(","))
    ];

    const downloadUrl = URL.createObjectURL(new Blob([csvLines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = `NEC_Security_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleExportExcel = () => {
    const url = auditApi.getExportUrl({
      format: "excel",
      category: filterCategory !== "ALL" ? filterCategory : undefined,
      module: filterModule !== "ALL" ? filterModule : undefined,
      outcome: filterOutcome !== "ALL" ? filterOutcome : undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      search: search.trim() || undefined
    });
    window.open(url, "_blank");
  };

  const filteredLog = log.filter(e => {
    if (filterCategory !== "ALL" && e.category !== filterCategory) return false;
    if (filterModule !== "ALL" && e.module?.toLowerCase() !== filterModule.toLowerCase()) return false;
    if (filterOutcome !== "ALL" && e.outcome !== filterOutcome) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (e.operation || "").toLowerCase().includes(q) ||
                    (e.event || "").toLowerCase().includes(q) ||
                    (e.user || "").toLowerCase().includes(q) ||
                    (e.username || "").toLowerCase().includes(q) ||
                    (e.route || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalCount = log.length;
  const loginCount = log.filter(e => e.event === "LOGIN_SUCCESS" || e.eventType === "LOGIN_SUCCESS").length;
  const failedCount = log.filter(e => e.event === "LOGIN_FAILED" || e.eventType === "LOGIN_FAILED" || e.eventType === "AUTHENTICATION_FAILURE").length;
  const mutationCount = log.filter(e => e.category === "ADMINISTRATIVE_MUTATION" || e.event?.includes("CREATE") || e.event?.includes("UPDATE") || e.event?.includes("DELETE")).length;

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
      label: "Event & Module",
      width: "220px",
      render: (val, row) => {
        const eventName = val || row.eventType || "REQUEST";
        const meta = EVENT_META[eventName] || { label: eventName, status: "neutral" };
        const Icon = meta.icon || Shield;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon size={13} />
              <Badge status={meta.status}>{meta.label}</Badge>
            </div>
            {row.module && row.module !== "System" && (
              <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)" }}>
                Module: {row.module}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "outcome",
      label: "Outcome",
      width: "100px",
      render: (val, row) => {
        const isSuccess = val === "SUCCESS" || (row.statusCode && row.statusCode < 400);
        return (
          <Badge status={isSuccess ? "success" : "danger"}>
            {isSuccess ? "SUCCESS" : "FAILURE"}
          </Badge>
        );
      }
    },
    {
      key: "operation",
      label: "Operation / Action",
      render: (val, row) => (
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 500 }}>
            {val || `${row.method || ""} ${row.route || ""}`.trim() || "—"}
          </div>
          {row.route && row.route !== val && (
            <div style={{ fontFamily: "monospace", fontSize: "0.74rem", color: "var(--nec-text-muted)" }}>
              {row.method} {row.route}
            </div>
          )}
        </div>
      )
    },
    {
      key: "user",
      label: "User & Role",
      width: "180px",
      render: (val, row) => (
        <div>
          <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
            {val || row.username || row.userId || "System / Guest"}
          </span>
          <div style={{ fontSize: "0.74rem", color: "var(--nec-text-muted)" }}>
            Role: {row.role || "Public"}
          </div>
        </div>
      )
    },
    {
      key: "ipAddress",
      label: "IP Address",
      width: "130px",
      render: (val) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
          {val || "—"}
        </span>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Shield size={20} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--nec-gold)", textTransform: "uppercase" }}>
              Institutional Security Centre
            </span>
          </div>
          <h2 className="nec-page-title">Institutional Security Audit Log</h2>
          <p className="nec-page-desc">
            Complete tamper-evident audit trail of institutional logins, administrative mutations, access control checks, and operational changes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="outline" size="sm" icon={RefreshCw} loading={loading} onClick={load}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" icon={FileSpreadsheet} onClick={handleExportExcel}>
            Export Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="nec-stats-grid" style={{ marginBottom: "20px" }}>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Total Audit Records</span>
            <Shield size={18} style={{ color: "var(--nec-navy)" }} />
          </div>
          <div className="nec-stat-value">{totalCount}</div>
          <div className="nec-stat-subtext">Events logged in audit store</div>
        </div>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Successful Logins</span>
            <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
          </div>
          <div className="nec-stat-value" style={{ color: "#22c55e" }}>{loginCount}</div>
          <div className="nec-stat-subtext">Sports admin & user sessions</div>
        </div>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Failed Logins</span>
            <XCircle size={18} style={{ color: "#ef4444" }} />
          </div>
          <div className="nec-stat-value" style={{ color: failedCount > 0 ? "#ef4444" : "var(--nec-text-main)" }}>
            {failedCount}
          </div>
          <div className="nec-stat-subtext">Authentication failures</div>
        </div>
        <div className="nec-stat-card">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Admin Mutations</span>
            <Settings size={18} style={{ color: "var(--nec-gold)" }} />
          </div>
          <div className="nec-stat-value" style={{ color: "var(--nec-gold)" }}>{mutationCount}</div>
          <div className="nec-stat-subtext">Tournaments, events, appointments</div>
        </div>
      </div>

      {/* ── Multi-Dimensional Filters Bar ── */}
      <Card className="nec-card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={15} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Filters:</span>
          </div>

          <div>
            <select
              className="nec-input"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "160px" }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.filter(c => c !== "ALL").map(cat => (
                <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="nec-input"
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "140px" }}
            >
              <option value="ALL">All Modules</option>
              {MODULES.filter(m => m !== "ALL").map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="nec-input"
              value={filterOutcome}
              onChange={e => setFilterOutcome(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "120px" }}
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILURE">Failure Only</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} color="var(--nec-text-muted)" />
            <input
              type="date"
              className="nec-input"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              placeholder="From Date"
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>to</span>
            <input
              type="date"
              className="nec-input"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              placeholder="To Date"
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: "180px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Search size={14} color="var(--nec-text-muted)" />
            <input
              type="text"
              className="nec-input"
              placeholder="Search user, route, action..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "5px 10px", width: "100%" }}
            />
          </div>

          {(filterCategory !== "ALL" || filterModule !== "ALL" || filterOutcome !== "ALL" || fromDate || toDate || search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterCategory("ALL");
                setFilterModule("ALL");
                setFilterOutcome("ALL");
                setFromDate("");
                setToDate("");
                setSearch("");
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* ── Audit Table ── */}
      {filteredLog.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--nec-text-muted)" }}>
            <Shield size={36} style={{ marginBottom: "12px", opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>No audit records match the current filters.</div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
              Try adjusting your category, module, outcome, or date range filters.
            </div>
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          data={filteredLog}
          loading={loading}
          searchable={false}
          rowKey="id"
        />
      )}
    </div>
  );
}
