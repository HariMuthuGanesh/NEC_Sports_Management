import React, { useEffect, useState } from "react";
import { tournamentsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, Calendar, Trophy } from "lucide-react";
import "./AdminPortal.css";

export default function TournamentsManager() {
  const { t } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAcademicYear, setNewAcademicYear] = useState("2025-2026");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = () => {
    setLoading(true);
    tournamentsApi.getTournaments().then(data => {
      setTournaments(data);
      setLoading(false);
    });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    tournamentsApi.createTournament({
      title: newTitle,
      academicYear: newAcademicYear,
      description: newDesc,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "2026-09-30",
      organizer: "Physical Education Department & LASA"
    }).then(() => {
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      loadTournaments();
    });
  };

  const columns = [
    { key: "title", label: "Tournament Title", render: (val, row) => <div><strong>{val}</strong><br/><small style={{color: 'var(--nec-text-muted)'}}>{row.organizer}</small></div> },
    { key: "academicYear", label: "Academic Year", width: "130px" },
    { key: "startDate", label: "Start Date", width: "110px" },
    { key: "endDate", label: "End Date", width: "110px" },
    {
      key: "status",
      label: "Status",
      width: "140px",
      render: (val) => (
        <Badge status={val === "Ongoing" ? "live" : val === "Registration Open" ? "info" : "success"}>
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">{t.tournamentsManagement || "Tournaments Management"}</h2>
          <p className="nec-page-desc">Create and manage inter-department and inter-collegiate tournament series.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          {t.createTournament || "Create Tournament"}
        </Button>
      </div>

      <Table
        columns={columns}
        data={tournaments}
        loading={loading}
        searchPlaceholder="Search tournaments..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Tournament"
      >
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Tournament Title
            </label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="e.g. Annual Inter-Department Championship 2026"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Academic Year
            </label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={newAcademicYear}
              onChange={(e) => setNewAcademicYear(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Description & Guidelines
            </label>
            <textarea
              className="nec-table-search-input"
              style={{ maxWidth: "100%", height: "80px", fontFamily: "inherit" }}
              placeholder="Enter tournament description..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Publish Tournament</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
