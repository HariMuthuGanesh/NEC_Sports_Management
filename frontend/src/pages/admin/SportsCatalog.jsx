import React, { useEffect, useState } from "react";
import { sportsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, Trophy, Users, Trash2 } from "lucide-react";
import "./AdminPortal.css";

export default function SportsCatalog() {
  const { t } = useAuth();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Team");
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

    sportsApi.addSport({
      name,
      category,
      min_players: Number(minPlayers),
      max_players: Number(maxPlayers),
      points_rule: "Standard"
    }).then(() => {
      setIsModalOpen(false);
      setName("");
      loadSports();
    }).catch(err => {
      alert("Failed to add sport: " + err.message);
    });
  };

  const handleRemoveSport = (sportId) => {
    if (!window.confirm("Are you sure you want to delete this sport?")) return;
    sportsApi.deleteSport(sportId).then(() => {
      loadSports();
    }).catch(err => {
      alert("Failed to delete sport: " + err.message);
    });
  };

  const columns = [
    { key: "name", label: "Sport Name", render: (val) => <strong>🏆 {val}</strong> },
    {
      key: "category",
      label: "Sport Category",
      width: "180px",
      render: (val) => (
        <Badge status={val === "Team" ? "info" : "neutral"}>
          {val} Sport
        </Badge>
      )
    },
    { key: "min_players", label: t.minSquadSize || "Min Squad Size", width: "140px", render: (val) => <span>{val} Players</span> },
    { key: "max_players", label: t.maxRosterLimit || "Max Roster Limit", width: "140px", render: (val) => <span>{val} Athletes</span> },
    {
      key: "actions",
      label: t.actions || "Actions",
      width: "100px",
      sortable: false,
      render: (_, row) => (
        <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleRemoveSport(row.sport_id)}>
          {t.delete || "Remove"}
        </Button>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">{t.necSportsCatalog || "NEC Sports Catalog"}</h2>
          <p className="nec-page-desc">Manage institutional sports catalog, squad rules, and roster size limits.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          {t.addNewSport || "Add New Sport"}
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
