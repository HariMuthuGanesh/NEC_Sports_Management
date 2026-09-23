import React, { useEffect, useState } from "react";
import { sportsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { Plus, Trophy, Users, Trash2, Edit2 } from "lucide-react";
import "./AdminPortal.css";

export default function SportsCatalog() {
  const { t } = useAuth();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Team");
  const [minPlayers, setMinPlayers] = useState(11);
  const [maxPlayers, setMaxPlayers] = useState(18);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = () => {
    setLoading(true);
    setError(null);
    sportsApi.getSports().then(data => {
      setSports(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  const openAddModal = () => {
    setEditingSport(null);
    setName("");
    setCategory("Team");
    setMinPlayers(11);
    setMaxPlayers(18);
    setIsModalOpen(true);
  };

  const openEditModal = (sport) => {
    setEditingSport(sport);
    setName(sport.name || "");
    setCategory(sport.category || "Team");
    setMinPlayers(sport.min_players ?? 11);
    setMaxPlayers(sport.max_players ?? 18);
    setIsModalOpen(true);
  };

  const handleSaveSport = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      category,
      min_players: Number(minPlayers),
      max_players: Number(maxPlayers),
      points_rule: editingSport?.points_rule || "Standard",
      captain_user_id: editingSport?.captain_user_id || null
    };

    const action = editingSport
      ? sportsApi.updateSport(editingSport.sport_id, payload)
      : sportsApi.addSport(payload);

    action.then(() => {
      setIsModalOpen(false);
      setEditingSport(null);
      setName("");
      loadSports();
    }).catch(err => {
      alert(`Failed to ${editingSport ? "update" : "add"} sport: ` + err.message);
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
      render: (val) => {
        const raw = String(val || "Open").replace(/ Sport$/i, "").trim();
        const badgeStatus = raw === "Men" ? "info" : raw === "Women" ? "warning" : raw === "Open" ? "success" : raw === "Mixed" ? "live" : "neutral";
        return (
          <Badge status={badgeStatus}>
            {raw} Sport
          </Badge>
        );
      }
    },
    { key: "min_players", label: t.minSquadSize || "Min Squad Size", width: "140px", render: (val) => <span>{val} Players</span> },
    { key: "max_players", label: t.maxRosterLimit || "Max Roster Limit", width: "140px", render: (val) => <span>{val} Athletes</span> },
    {
      key: "actions",
      label: t.actions || "Actions",
      width: "180px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button variant="outline" size="sm" icon={Edit2} onClick={() => openEditModal(row)}>
            {t.edit || "Edit"}
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleRemoveSport(row.sport_id)}>
            {t.delete || "Delete"}
          </Button>
        </div>
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
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          {t.addNewSport || "Add New Sport"}
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadSports} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={sports}
          loading={loading}
          searchPlaceholder="Search sports catalog..."
          emptyMessage="No sports have been added to the catalog yet."
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSport(null);
        }}
        title={editingSport ? `Edit Sport: ${editingSport.name}` : "Add New Sport to Catalog"}
      >
        <form onSubmit={handleSaveSport} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport Category / Division</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Men">Men Sport</option>
              <option value="Women">Women Sport</option>
              <option value="Open">Open Sport (Co-Ed)</option>
              <option value="Mixed">Mixed Sport</option>
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
                min="1"
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
                min="1"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false);
              setEditingSport(null);
            }}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingSport ? "Save Changes" : "Add Sport"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
