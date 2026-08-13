import React, { useEffect, useState } from "react";
import { sportsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, Trophy, Users } from "lucide-react";
import "./AdminPortal.css";

export default function SportsCatalog() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("Team");
  const [minPlayers, setMinPlayers] = useState(11);
  const [maxPlayers, setMaxPlayers] = useState(18);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = () => {
    setLoading(true);
    sportsApi.getSports().then(data => {
      setSports(data);
      setLoading(false);
    });
  };

  const handleAddSport = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSport = {
      id: `sp_${name.toLowerCase().replace(/\s+/g, "_")}`,
      name,
      type,
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
      icon: "Trophy"
    };

    setSports(prev => [newSport, ...prev]);
    setIsModalOpen(false);
    setName("");
  };

  const columns = [
    { key: "name", label: "Sport Name", render: (val) => <strong>🏆 {val}</strong> },
    {
      key: "type",
      label: "Sport Category",
      width: "180px",
      render: (val) => (
        <Badge status={val === "Team" ? "info" : "neutral"}>
          {val} Sport
        </Badge>
      )
    },
    { key: "minPlayers", label: "Min Squad Size", width: "140px", render: (val) => <span>{val} Players</span> },
    { key: "maxPlayers", label: "Max Roster Limit", width: "140px", render: (val) => <span>{val} Athletes</span> }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">NEC Sports Catalog</h2>
          <p className="nec-page-desc">Manage institutional sports catalog, squad rules, and roster size limits.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add New Sport
        </Button>
      </div>

      <Table
        columns={columns}
        data={sports}
        loading={loading}
        searchPlaceholder="Search sports catalog..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Sport to Catalog"
      >
        <form onSubmit={handleAddSport} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport Name</label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="e.g. Handball, Kabaddi, Swimming"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport Category</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Team">Team Sport</option>
              <option value="Individual / Doubles">Individual / Doubles</option>
              <option value="Individual">Individual Sport</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Min Squad Size</label>
              <input
                type="number"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Max Roster Limit</label>
              <input
                type="number"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add Sport</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
