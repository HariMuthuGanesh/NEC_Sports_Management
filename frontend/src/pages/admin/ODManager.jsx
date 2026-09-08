import React, { useEffect, useState, useCallback } from "react";
import { odApi } from "../../services/api/apiServices";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import ErrorState from "../../components/common/ErrorState";
import {
  FileText, CheckCircle2, XCircle, Clock, Filter,
  Download, AlertCircle, CheckSquare, ChevronDown
} from "lucide-react";
import "./AdminPortal.css";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:  { status: "warning", icon: Clock,         label: "Pending" },
  Approved: { status: "success", icon: CheckCircle2,  label: "Approved" },
  Rejected: { status: "danger",  icon: XCircle,       label: "Rejected" }
};

function OdStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  const Icon = cfg.icon;
  return (
    <Badge status={cfg.status}>
      <Icon size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
      {cfg.label}
    </Badge>
  );
}

// ── Client-side OD PDF letter generation (no extra server needed) ─────────────
function generateOdLetterHtml(od) {
  const fromDate = od.from_date ? new Date(od.from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "-";
  const toDate   = od.to_date   ? new Date(od.to_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "-";
  const approvedDate = od.approved_at ? new Date(od.approved_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-IN");
  const days = od.total_days || 1;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OD Letter - ${od.student_name || "Student"}</title>
  <style>
    body { font-family: "Times New Roman", serif; font-size: 13pt; margin: 40px 60px; color: #000; }
    h2 { text-align: center; font-size: 16pt; margin-bottom: 2px; }
    .subtitle { text-align: center; font-size: 11pt; margin-bottom: 4px; color: #444; }
    .college-addr { text-align: center; font-size: 10pt; color: #555; margin-bottom: 24px; }
    hr { border: 1.5px solid #000; margin: 8px 0 24px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11pt; }
    .ref { font-weight: bold; }
    p { line-height: 1.8; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 6px 10px; font-size: 12pt; }
    td:first-child { width: 200px; font-weight: bold; }
    .sign-block { margin-top: 60px; text-align: right; }
    .sign-line { border-top: 1px solid #000; display: inline-block; width: 200px; margin-bottom: 4px; }
    @media print { body { margin: 20px 40px; } }
  </style>
</head>
<body>
  <h2>NATIONAL ENGINEERING COLLEGE</h2>
  <div class="subtitle">An Autonomous Institution | Affiliated to Anna University</div>
  <div class="college-addr">Kovilpatti — 628 503, Thoothukudi District, Tamil Nadu</div>
  <hr/>

  <div class="meta">
    <span class="ref">Ref No: NEC/DPE/OD/${od.request_id || "—"}/${new Date().getFullYear()}</span>
    <span>Date: ${approvedDate}</span>
  </div>

  <p><strong>TO WHOM IT MAY CONCERN</strong></p>

  <p>
    This is to certify that the following student of our institution has been
    deputed to participate in the <strong>${od.tournament_name || "Sports Tournament"}</strong>
    ${od.sport_name ? `(${od.sport_name})` : ""} on official duty.
  </p>

  <table>
    <tr><td>Student Name</td><td>: ${od.student_name || "—"}</td></tr>
    <tr><td>Register Number</td><td>: ${od.register_number || "—"}</td></tr>
    <tr><td>Department</td><td>: ${od.department_name || "—"} (${od.department_code || "—"})</td></tr>
    <tr><td>Event / Tournament</td><td>: ${od.tournament_name || "—"}</td></tr>
    ${od.sport_name ? `<tr><td>Sport</td><td>: ${od.sport_name}</td></tr>` : ""}
    <tr><td>Period of OD</td><td>: ${fromDate}${fromDate !== toDate ? " to " + toDate : ""} (${days} day${days > 1 ? "s" : ""})</td></tr>
  </table>

  <p>
    The student is required to be on <strong>Official Duty</strong> for the above-mentioned period and
    is hereby granted necessary leave of absence. Kindly treat the absence during this period
    as On Duty (OD) for attendance purposes.
  </p>

  <p>Your cooperation in this regard is highly appreciated.</p>

  <div class="sign-block">
    <div class="sign-line"></div><br/>
    <strong>Director of Physical Education</strong><br/>
    National Engineering College<br/>
    Kovilpatti — 628 503
  </div>
</body>
</html>`;
}

function downloadOdLetter(od) {
  const html = generateOdLetterHtml(od);
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `OD_Letter_${od.register_number || od.student_id}_${od.request_id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // Open in new tab so browser can print-to-PDF
  window.open(url, "_blank");
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ od, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onConfirm(od.request_id, reason.trim() || "No reason provided");
    setSubmitting(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "var(--nec-surface, #fff)", borderRadius: "12px", padding: "28px",
        width: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: "6px" }}>Reject OD Request</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)", marginBottom: "16px" }}>
          Student: <strong>{od.student_name}</strong> ({od.register_number}) — {od.tournament_name}
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "6px" }}>
            Rejection Reason
          </label>
          <textarea
            className="nec-form-control"
            rows={3}
            placeholder="e.g. Medical certificate not submitted, duplicate request..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="danger" type="submit" disabled={submitting}>
              {submitting ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ODManager() {
  const [odList, setOdList]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionMsg, setActionMsg]   = useState(null);

  const loadOd = useCallback(() => {
    setLoading(true);
    setError(null);
    odApi.getAll({ status: statusFilter })
      .then(data => {
        setOdList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load OD requests.");
        setLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => { loadOd(); }, [loadOd]);

  const notify = (msg, isError = false) => {
    setActionMsg({ text: msg, isError });
    setTimeout(() => setActionMsg(null), 3500);
  };

  const handleApprove = async (requestId) => {
    try {
      await odApi.approve(requestId);
      notify("OD request approved successfully.");
      loadOd();
    } catch (err) {
      notify(err.message || "Approval failed.", true);
    }
  };

  const handleRejectConfirm = async (requestId, reason) => {
    try {
      await odApi.reject(requestId, reason);
      setRejectTarget(null);
      notify("OD request rejected.");
      loadOd();
    } catch (err) {
      notify(err.message || "Rejection failed.", true);
    }
  };

  // Summary counts (from current filtered list + total-all context)
  const pendingCount  = odList.filter(o => o.approval_status === "Pending").length;
  const approvedCount = odList.filter(o => o.approval_status === "Approved").length;
  const rejectedCount = odList.filter(o => o.approval_status === "Rejected").length;

  const columns = [
    {
      key: "register_number",
      label: "Student",
      render: (val, row) => (
        <div>
          <strong style={{ fontSize: "0.9rem" }}>{row.student_name}</strong>
          <div style={{ fontSize: "0.77rem", color: "var(--nec-text-muted)", fontFamily: "monospace" }}>{val}</div>
          <div style={{ fontSize: "0.77rem", color: "var(--nec-text-muted)" }}>
            {row.department_code} {row.department_name ? `— ${row.department_name}` : ""}
          </div>
        </div>
      )
    },
    {
      key: "tournament_name",
      label: "Tournament / Match",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.87rem" }}>{val}</div>
          {row.sport_name && (
            <div style={{ fontSize: "0.77rem", color: "var(--nec-text-muted)" }}>{row.sport_name}</div>
          )}
          {row.match_date && (
            <div style={{ fontSize: "0.77rem", color: "var(--nec-text-muted)" }}>
              {new Date(row.match_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          )}
        </div>
      )
    },
    {
      key: "from_date",
      label: "OD Period",
      width: "140px",
      render: (val, row) => {
        const from = val ? new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
        const to   = row.to_date ? new Date(row.to_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{from === to ? from : `${from} — ${to}`}</div>
            <div style={{ fontSize: "0.77rem", color: "var(--nec-text-muted)" }}>{row.total_days} day{row.total_days !== 1 ? "s" : ""}</div>
          </div>
        );
      }
    },
    {
      key: "approval_status",
      label: "Status",
      width: "110px",
      render: (val) => <OdStatusBadge status={val} />
    },
    {
      key: "actions",
      label: "Actions",
      width: "200px",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {row.approval_status === "Pending" && (
            <>
              <button
                onClick={() => handleApprove(row.request_id)}
                title="Approve OD"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0",
                  borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem",
                  fontWeight: 600, cursor: "pointer"
                }}
              >
                <CheckCircle2 size={13} /> Approve
              </button>
              <button
                onClick={() => setRejectTarget(row)}
                title="Reject OD"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                  borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem",
                  fontWeight: 600, cursor: "pointer"
                }}
              >
                <XCircle size={13} /> Reject
              </button>
            </>
          )}
          {row.approval_status === "Approved" && (
            <button
              onClick={() => downloadOdLetter(row)}
              title="Download OD Letter"
              style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
                borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem",
                fontWeight: 600, cursor: "pointer"
              }}
            >
              <Download size={13} /> OD Letter
            </button>
          )}
          {row.approval_status === "Rejected" && row.rejection_reason && (
            <span
              title={row.rejection_reason}
              style={{
                fontSize: "0.76rem", color: "#dc2626",
                maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap", display: "block"
              }}
            >
              {row.rejection_reason}
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      {/* Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>OD Management</h1>
          <p className="nec-page-desc">
            Review, approve, and issue On Duty letters for student athletes participating in tournaments.
          </p>
        </div>
        {/* Status Filter */}
        <div style={{ position: "relative" }}>
          <Button
            variant={statusFilter !== "ALL" ? "primary" : "outline"}
            icon={Filter}
            onClick={() => setShowFilterMenu(v => !v)}
          >
            {statusFilter === "ALL" ? "All Requests" : statusFilter}
            <ChevronDown size={14} style={{ marginLeft: 4 }} />
          </Button>
          {showFilterMenu && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: "6px",
              background: "var(--nec-surface, #fff)", border: "1px solid var(--nec-border, #e2e8f0)",
              borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 50, minWidth: "160px", padding: "6px"
            }}>
              {["ALL", "Pending", "Approved", "Rejected"].map(s => (
                <button key={s} type="button"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: "4px", background: statusFilter === s ? "var(--nec-surface-raised, #f1f5f9)" : "transparent", fontWeight: statusFilter === s ? "600" : "400", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                  onClick={() => { setStatusFilter(s); setShowFilterMenu(false); }}
                >
                  {s === "ALL" ? "All Requests" : s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Pending",  count: pendingCount,  color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
          { label: "Approved", count: approvedCount, color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
          { label: "Rejected", count: rejectedCount, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" }
        ].map(card => (
          <div key={card.label} style={{
            background: card.bg, border: `1px solid ${card.border}`,
            borderRadius: "10px", padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: card.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: card.color, lineHeight: 1.1 }}>{card.count}</div>
            </div>
            <FileText size={28} color={card.color} opacity={0.35} />
          </div>
        ))}
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: actionMsg.isError ? "#fef2f2" : "#ecfdf5",
          color: actionMsg.isError ? "#dc2626" : "#059669",
          border: `1px solid ${actionMsg.isError ? "#fecaca" : "#a7f3d0"}`,
          borderRadius: "8px", padding: "10px 16px", marginBottom: "14px", fontSize: "0.85rem"
        }}>
          {actionMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {actionMsg.text}
        </div>
      )}

      {/* Table */}
      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState title="Unable to Load OD Requests" message={error} onRetry={loadOd} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={odList}
          loading={loading}
          searchPlaceholder="Search by student name, register number…"
          emptyMessage={
            statusFilter === "Pending"
              ? "No pending OD requests. Coordinators can generate OD from the Matches panel."
              : `No ${statusFilter.toLowerCase()} OD requests found.`
          }
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          od={rejectTarget}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
