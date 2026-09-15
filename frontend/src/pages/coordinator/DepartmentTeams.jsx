import React, { useState, useEffect } from "react";
import { squadApi, sportsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import "./CoordinatorPortal.css";

export default function DepartmentTeams() {
  const [captains, setCaptains] = useState([]);
  const [sports, setSports] = useState([]);
  const [eligibleCaptains, setEligibleCaptains] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [selectedCaptainId, setSelectedCaptainId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [captainsData, sportsData, eligibleData] = await Promise.all([
        squadApi.getDepartmentSportCaptains(),
        sportsApi.getSports(),
        squadApi.getEligibleCaptains()
      ]);

      setCaptains(captainsData || []);
      setSports(sportsData || []);
      setEligibleCaptains(eligibleData || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load department teams data.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignCaptain = async (e) => {
    e.preventDefault();
    if (!selectedSportId || !selectedCaptainId) return;
    setSubmitting(true);
    setError(null);

    try {
      await squadApi.assignDepartmentSportCaptain(Number(selectedSportId), Number(selectedCaptainId));
      setSelectedSportId("");
      setSelectedCaptainId("");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to assign team captain.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "sport_name", label: "Sport", render: (val, row) => <strong>{val || `Sport #${row.sport_id}`}</strong> },
    {
      key: "captain_name",
      label: "Current Captain",
      render: (val, row) => (val || row.captain_username ? <span style={{ color: "var(--nec-primary, #0056b3)", fontWeight: 600 }}>{val || row.captain_username}</span> : <em>Unassigned</em>)
    },
    { key: "captain_register_number", label: "Register #", render: (val) => val || "N/A" },
    { key: "assigned_at", label: "Assigned On", render: (val) => (val ? new Date(val).toLocaleDateString() : "N/A") }
  ];

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center" }}>Loading department teams...</div>;
  }

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <div>
          <h2 className="nec-page-title">Department Teams</h2>
          <p className="nec-page-desc">Assign or transfer Sport Captains for your department.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #d9534f" }}>
          {error}
        </div>
      )}

      {/* Assign Captain Form */}
      <div className="nec-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 12px 0" }}>Assign Sport Captain</h4>
        <form onSubmit={handleAssignCaptain} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="nec-table-search-input"
            style={{ width: "260px" }}
            value={selectedSportId}
            onChange={(e) => setSelectedSportId(e.target.value)}
            required
          >
            <option value="">-- Pick a Sport --</option>
            {sports.map((s) => (
              <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                {s.name} ({s.category || "Outdoor"})
              </option>
            ))}
          </select>

          <select
            className="nec-table-search-input"
            style={{ width: "260px" }}
            value={selectedCaptainId}
            onChange={(e) => setSelectedCaptainId(e.target.value)}
            required
          >
            <option value="">-- Pick a Captain --</option>
            {eligibleCaptains.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.student_name || c.username} {c.register_number ? `(${c.register_number})` : ""}
              </option>
            ))}
          </select>

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Assigning..." : "Assign Captain"}
          </Button>
        </form>
        <p style={{ fontSize: "0.8rem", color: "var(--nec-text-muted, #666)", marginTop: "8px" }}>
          Assigning a new captain for a sport automatically transfers out any previously-active captain for that sport in your department.
        </p>
      </div>

      {/* Captains List */}
      <Table
        columns={columns}
        data={captains}
        loading={false}
        searchPlaceholder="Search department teams..."
        emptyMessage="No sport captains assigned in your department yet."
      />
    </div>
  );
}
