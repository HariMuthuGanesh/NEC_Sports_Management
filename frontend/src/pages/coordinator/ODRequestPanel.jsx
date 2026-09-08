import React, { useEffect, useState } from "react";
import { odApi, matchesApi } from "../../services/api/apiServices";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import {
  FileText, Clock, CheckCircle2, XCircle, Plus, RefreshCw, AlertCircle
} from "lucide-react";
import "../admin/AdminPortal.css";

function OdStatusBadge({ status }) {
  if (status === "Approved")
    return <Badge status="success"><CheckCircle2 size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />Approved</Badge>;
  if (status === "Rejected")
    return <Badge status="danger"><XCircle size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />Rejected</Badge>;
  if (status === "Pending")
    return <Badge status="warning"><Clock size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />Pending</Badge>;
  return <Badge status="default">-</Badge>;
}

export default function ODRequestPanel() {
  const [matches, setMatches]           = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [odStatus, setOdStatus]         = useState([]);   // OD per player for selected match
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingOd, setLoadingOd]       = useState(false);
  const [creating, setCreating]         = useState(false);
  const [error, setError]               = useState(null);
  const [actionMsg, setActionMsg]       = useState(null);

  // Load all matches on mount
  useEffect(() => {
    matchesApi.getMatches()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        // Only show Scheduled / Ongoing — or within 7 days past
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const relevant = list.filter(m =>
          m.status === "Scheduled" || m.status === "Ongoing" ||
          (m.scheduled_time && new Date(m.scheduled_time) >= cutoff)
        );
        setMatches(relevant);
        if (relevant.length > 0) setSelectedMatchId(String(relevant[0].match_id));
        setLoadingMatches(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load matches.");
        setLoadingMatches(false);
      });
  }, []);

  // Load OD status whenever selected match changes
  useEffect(() => {
    if (!selectedMatchId) return;
    setLoadingOd(true);
    odApi.getMatchOdStatus(selectedMatchId)
      .then(data => {
        setOdStatus(Array.isArray(data) ? data : []);
        setLoadingOd(false);
      })
      .catch(() => {
        setOdStatus([]);
        setLoadingOd(false);
      });
  }, [selectedMatchId]);

  const notify = (msg, isError = false) => {
    setActionMsg({ text: msg, isError });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleGenerateOd = async () => {
    if (!selectedMatchId) return;
    setCreating(true);
    try {
      const result = await odApi.createForMatch(selectedMatchId);
      notify(`OD generated: ${result.created} new request(s). ${result.skipped || 0} already existed.`);
      // Refresh OD status
      const updated = await odApi.getMatchOdStatus(selectedMatchId);
      setOdStatus(Array.isArray(updated) ? updated : []);
    } catch (err) {
      notify(err.message || "Failed to generate OD requests.", true);
    } finally {
      setCreating(false);
    }
  };

  const selectedMatch = matches.find(m => String(m.match_id) === selectedMatchId);

  const pendingCount  = odStatus.filter(o => o.approval_status === "Pending").length;
  const approvedCount = odStatus.filter(o => o.approval_status === "Approved").length;

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ marginBottom: "20px" }}>
        <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>OD Request Panel</h1>
        <p className="nec-page-desc">
          Select a match, generate On Duty requests for all rostered players, and track approval status.
        </p>
      </div>

      {error && (
        <div style={{ padding: "40px" }}>
          <ErrorState title="Failed to Load Matches" message={error} />
        </div>
      )}

      {!error && (
        <>
          {/* Match Selector */}
          <div style={{
            background: "var(--nec-surface, #fff)", border: "1px solid var(--nec-border, #e2e8f0)",
            borderRadius: "10px", padding: "20px", marginBottom: "20px"
          }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "8px" }}>
              Select Match
            </label>
            {loadingMatches ? (
              <div style={{ color: "var(--nec-text-muted)", fontSize: "0.875rem" }}>Loading matches…</div>
            ) : matches.length === 0 ? (
              <div style={{ color: "var(--nec-text-muted)", fontSize: "0.875rem" }}>
                No recent or upcoming matches found.
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <select
                  className="nec-form-control"
                  style={{ flex: 1, minWidth: "260px" }}
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                >
                  {matches.map(m => {
                    const date = m.scheduled_time
                      ? new Date(m.scheduled_time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—";
                    return (
                      <option key={m.match_id} value={m.match_id}>
                        Match #{m.match_id} — {date} [{m.status}]
                        {m.round ? ` (${m.round})` : ""}
                      </option>
                    );
                  })}
                </select>
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={handleGenerateOd}
                  disabled={creating || !selectedMatchId}
                >
                  {creating ? "Generating…" : "Generate OD Requests"}
                </Button>
              </div>
            )}
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

          {/* OD Status Table for Selected Match */}
          {selectedMatchId && (
            <div style={{
              background: "var(--nec-surface, #fff)", border: "1px solid var(--nec-border, #e2e8f0)",
              borderRadius: "10px", padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>
                    OD Status — Match #{selectedMatchId}
                  </h3>
                  {odStatus.length > 0 && (
                    <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", marginTop: "3px" }}>
                      {pendingCount} pending · {approvedCount} approved · {odStatus.length} total
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setLoadingOd(true);
                    odApi.getMatchOdStatus(selectedMatchId)
                      .then(d => { setOdStatus(Array.isArray(d) ? d : []); setLoadingOd(false); })
                      .catch(() => setLoadingOd(false));
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--nec-text-muted)" }}
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {loadingOd ? (
                <div style={{ textAlign: "center", padding: "32px", color: "var(--nec-text-muted)", fontSize: "0.875rem" }}>
                  Loading OD status…
                </div>
              ) : odStatus.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "40px",
                  color: "var(--nec-text-muted)", fontSize: "0.875rem"
                }}>
                  <FileText size={40} style={{ opacity: 0.25, marginBottom: "12px" }} />
                  <p style={{ margin: 0 }}>No OD requests generated yet for this match.</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>
                    Click "Generate OD Requests" to create OD for all rostered players.
                  </p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--nec-border, #e2e8f0)" }}>
                      {["Register No.", "Student Name", "Department", "OD Date", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "var(--nec-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {odStatus.map((od, i) => (
                      <tr key={od.request_id} style={{ borderBottom: "1px solid var(--nec-border, #e2e8f0)", background: i % 2 === 0 ? "transparent" : "var(--nec-surface-raised, #f8fafc)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.85rem" }}>{od.register_number}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: "0.875rem" }}>{od.student_name}</td>
                        <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                          {od.department_code} {od.department_name ? `— ${od.department_name}` : ""}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>
                          {od.from_date ? new Date(od.from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <OdStatusBadge status={od.approval_status} />
                          {od.rejection_reason && od.approval_status === "Rejected" && (
                            <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "3px" }}>
                              {od.rejection_reason}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
