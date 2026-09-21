import React, { useState, useEffect } from "react";
import { squadApi, sportsApi, studentLookupApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Search, UserPlus } from "lucide-react";
import "./CoordinatorPortal.css";

export default function DepartmentTeams() {
  const [captains, setCaptains] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [selectedCaptainId, setSelectedCaptainId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Search state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [captainsData, sportsData] = await Promise.all([
        squadApi.getDepartmentSportCaptains(),
        sportsApi.getSports()
      ]);
      setCaptains(captainsData || []);
      setSports(sportsData || []);
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

  const handleSearchStudent = () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    studentLookupApi.searchStudent(searchQuery).then(res => {
      setSearchResults(res);
      setSearching(false);
    });
  };

  const [successMsg, setSuccessMsg] = useState(null);

  const handleAssignCaptain = async (e) => {
    e.preventDefault();
    if (!selectedSportId || !selectedStudent) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await squadApi.assignDepartmentSportCaptain(
        Number(selectedSportId),
        selectedStudent.studentId,
        selectedStudent.name,
        selectedStudent.dept,
        selectedStudent.year
      );

      if (res.data?.isNewUser && res.data?.defaultPassword) {
        setSuccessMsg(`Captain account auto-provisioned! Login Roll No: "${selectedStudent.studentId}" | Default Password: "${res.data.defaultPassword}". Student will be asked to set a new password on first login.`);
      } else {
        setSuccessMsg(`Captain assigned successfully for selected sport!`);
      }

      setSelectedSportId("");
      setSelectedCaptainId("");
      setSelectedStudent(null);
      setSearchModalOpen(false);
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

      {successMsg && (
        <div style={{ color: "#065f46", backgroundColor: "#d1fae5", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #10b981", fontSize: "0.9rem", fontWeight: 500 }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #d9534f" }}>
          {error}
        </div>
      )}

      {/* Assign Captain Form */}
      <div className="nec-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 12px 0" }}>Assign Sport Captain</h4>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="nec-table-search-input"
            style={{ width: "260px" }}
            value={selectedSportId}
            onChange={(e) => setSelectedSportId(e.target.value)}
          >
            <option value="">-- Pick a Sport --</option>
            {sports.map((s) => (
              <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                {s.name} ({s.category || "Outdoor"})
              </option>
            ))}
          </select>

          <Button type="button" variant="outline" icon={UserPlus} onClick={() => setSearchModalOpen(true)}>
            Lookup Student by Roll No
          </Button>
        </div>
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

      {/* External Student Lookup Modal */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => { setSearchModalOpen(false); setSearchQuery(""); setSearchResults([]); }}
        title="Lookup Student in IMS"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="nec-student-search-box">
            <input
              type="text"
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="Enter Student Roll Number (e.g. 2112045)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="primary" icon={Search} onClick={handleSearchStudent} loading={searching}>
              Search
            </Button>
          </div>

          {searchResults.length > 0 && !selectedStudent && (
            <div className="nec-student-results-list">
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--nec-text-muted)" }}>Search Results:</span>
              {searchResults.map(s => (
                <div key={s.studentId} className="nec-student-result-card">
                  <div className="nec-sr-info">
                    <span className="nec-sr-name">{s.name} ({s.studentId})</span>
                    <span className="nec-sr-sub">{s.dept} • {s.year}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedStudent(s)}>
                    Select Captain
                  </Button>
                </div>
              ))}
            </div>
          )}

          {selectedStudent && (
            <form onSubmit={handleAssignCaptain} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "var(--nec-surface-raised)", padding: "10px 14px", borderRadius: "8px" }}>
                <div><strong>Roll Number:</strong> {selectedStudent.studentId} — {selectedStudent.dept} • {selectedStudent.year}</div>
                <div style={{ marginTop: "8px" }}>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "4px" }}>Athlete Name</label>
                  <input
                    type="text"
                    className="nec-table-search-input"
                    style={{ maxWidth: "100%", width: "100%" }}
                    value={selectedStudent.name}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, name: e.target.value })}
                    placeholder="Enter or confirm athlete name"
                  />
                </div>
              </div>

              {!selectedSportId && (
                <div style={{ color: "#d9534f", fontSize: "0.85rem" }}>
                  Please select a Sport in the main form before assigning.
                </div>
              )}

              <Button type="submit" variant="primary" disabled={submitting || !selectedSportId}>
                {submitting ? "Assigning..." : "Assign Captain"}
              </Button>
            </form>
          )}
        </div>
      </Modal>

    </div>
  );
}
