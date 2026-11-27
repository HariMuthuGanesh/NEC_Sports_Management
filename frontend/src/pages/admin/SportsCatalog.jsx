import React, { useEffect, useState, useMemo } from "react";
import { sportsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { 
  Plus, 
  Trophy, 
  Users, 
  User, 
  Trash2, 
  Pencil, 
  ListPlus, 
  X, 
  Search, 
  Filter, 
  ArrowUpDown,
  AlertCircle,
  Layers
} from "lucide-react";
import "./AdminPortal.css";

export default function SportsCatalog() {
  const { t } = useAuth();
  const toastContext = useToast();
  const toast = toastContext?.toast || toastContext;
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name_asc");

  // Form State
  const [name, setName] = useState("");
  const [sportType, setSportType] = useState("Team");
  const [status, setStatus] = useState("Active");
  const [minPlayers, setMinPlayers] = useState(11);
  const [maxPlayers, setMaxPlayers] = useState(18);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Per-sport categories modal (e.g. Athletics: 100m, 200m, Relay)
  const [catSport, setCatSport] = useState(null);
  const [catList, setCatList] = useState([]);
  const [catName, setCatName] = useState("");
  const [catError, setCatError] = useState("");

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = () => {
    setLoading(true);
    setError(null);
    sportsApi.getSports()
      .then(data => {
        setSports(Array.isArray(data) ? data : (data?.items || []));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load sports catalog");
        setLoading(false);
      });
  };

  const openAddModal = () => {
    setEditingSport(null);
    setName("");
    setSportType("Team");
    setStatus("Active");
    setMinPlayers(11);
    setMaxPlayers(18);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (sport) => {
    setEditingSport(sport);
    setName(sport.name || "");
    setSportType(sport.sport_type || "Team");
    setStatus(sport.status || "Active");
    setMinPlayers(sport.min_players ?? 11);
    setMaxPlayers(sport.max_players ?? 18);
    setFormError("");
    setIsModalOpen(true);
  };

  // Adjust default squad limits when switching sport type
  const handleSportTypeChange = (newType) => {
    setSportType(newType);
    if (!editingSport) {
      if (newType === "Individual") {
        setMinPlayers(1);
        setMaxPlayers(2);
      } else if (newType === "Both") {
        setMinPlayers(1);
        setMaxPlayers(18);
      } else {
        setMinPlayers(11);
        setMaxPlayers(18);
      }
    }
  };

  const openCategories = (sport) => {
    setCatSport(sport);
    setCatName("");
    setCatError("");
    sportsApi.getSportCategories(sport.sport_id)
      .then(list => setCatList(Array.isArray(list) ? list : []))
      .catch(() => setCatList([]));
  };

  const addCategory = async (e) => {
    e.preventDefault();
    setCatError("");
    if (!catName.trim()) return;
    try {
      await sportsApi.createSportCategory(catSport.sport_id, { name: catName.trim() });
      setCatName("");
      const list = await sportsApi.getSportCategories(catSport.sport_id);
      setCatList(Array.isArray(list) ? list : []);
      if (toast?.success) toast.success("Category added successfully.");
    } catch (err) {
      setCatError(err.message || "Could not add category.");
    }
  };

  const removeCategory = async (categoryId) => {
    if (!window.confirm("Remove this category?")) return;
    try {
      await sportsApi.deleteSportCategory(categoryId);
      setCatList(prev => prev.filter(c => c.category_id !== categoryId));
      if (toast?.success) toast.success("Category removed.");
    } catch (err) {
      setCatError(err.message || "Could not remove category.");
    }
  };

  const handleSaveSport = async (e) => {
    e.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Sport name is required.");
      return;
    }

    const min = Number(minPlayers);
    const max = Number(maxPlayers);

    if (!Number.isInteger(min) || min < 1) {
      setFormError("Minimum squad size must be at least 1.");
      return;
    }
    if (!Number.isInteger(max) || max < min) {
      setFormError("Maximum roster limit must be greater than or equal to minimum squad size.");
      return;
    }

    const payload = {
      name: trimmedName,
      category: sportType === "Individual" ? "Individual" : "Outdoor",
      sport_type: sportType,
      status,
      min_players: min,
      max_players: max,
      points_rule: editingSport?.points_rule || "Standard",
      captain_user_id: editingSport?.captain_user_id || null
    };

    setSubmitting(true);
    try {
      if (editingSport) {
        await sportsApi.updateSport(editingSport.sport_id, payload);
        if (toast?.success) toast.success(`Sport "${trimmedName}" updated successfully.`);
      } else {
        await sportsApi.addSport(payload);
        if (toast?.success) toast.success(`Sport "${trimmedName}" added to catalog.`);
      }
      setIsModalOpen(false);
      setEditingSport(null);
      setName("");
      loadSports();
    } catch (err) {
      setFormError(err.message || `Failed to ${editingSport ? "update" : "add"} sport.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSport = async (sport) => {
    if (!window.confirm(`Are you sure you want to delete "${sport.name}"? This action cannot be undone.`)) return;
    try {
      await sportsApi.deleteSport(sport.sport_id);
      if (toast?.success) toast.success(`Sport "${sport.name}" deleted from catalog.`);
      loadSports();
    } catch (err) {
      if (toast?.error) toast.error(err.message || "Failed to delete sport.");
    }
  };

  // Filtered & Sorted list
  const filteredSports = useMemo(() => {
    let result = [...sports];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => (s.name || "").toLowerCase().includes(q));
    }

    if (typeFilter !== "ALL") {
      result = result.filter(s => s.sport_type === typeFilter);
    }

    if (statusFilter !== "ALL") {
      result = result.filter(s => (s.status || "Active") === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "type_asc") return (a.sport_type || "").localeCompare(b.sport_type || "");
      if (sortBy === "type_desc") return (b.sport_type || "").localeCompare(a.sport_type || "");
      return 0;
    });

    return result;
  }, [sports, searchQuery, typeFilter, statusFilter, sortBy]);

  const columns = [
    { 
      key: "name", 
      label: "Sport Name", 
      render: (val, row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Trophy size={16} color="var(--nec-blue, #0056b3)" />
          <strong>{val}</strong>
        </div>
      ) 
    },
    {
      key: "sport_type",
      label: "Sport Type",
      width: "180px",
      render: (val) => {
        const isTeam = val === "Team";
        const isBoth = val === "Both";
        return (
          <Badge status={isBoth ? "warning" : isTeam ? "info" : "neutral"}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              {isBoth ? <Layers size={12} /> : isTeam ? <Users size={12} /> : <User size={12} />}
              {isBoth ? "Both (Ind & Team)" : isTeam ? "Team Sport" : "Individual Sport"}
            </span>
          </Badge>
        );
      }
    },
    { 
      key: "min_players", 
      label: "Default Min Squad", 
      width: "150px", 
      render: (val) => <span>{val} {val === 1 ? "Athlete" : "Players"}</span> 
    },
    { 
      key: "max_players", 
      label: "Default Max Roster", 
      width: "160px", 
      render: (val) => <span>{val} Athletes</span> 
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Inactive" ? "neutral" : "success"}>
          {val || "Active"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: t.actions || "Actions",
      width: "200px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Button 
            variant="outline" 
            size="sm" 
            icon={ListPlus} 
            onClick={() => openCategories(row)} 
            title="Manage Sub-categories (e.g. 100m, 200m, Relay)"
          >
            Categories
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Pencil} 
            aria-label="Edit sport" 
            title="Edit sport" 
            onClick={() => openEditModal(row)} 
          />
          <Button 
            variant="danger" 
            size="sm" 
            icon={Trash2} 
            aria-label="Delete sport" 
            title="Delete sport" 
            onClick={() => handleRemoveSport(row)} 
          />
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      {/* Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 className="nec-page-title">{t.necSportsCatalog || "Sports Catalog"}</h2>
          <p className="nec-page-desc">Master list of institutional sports, squad participation structures, and default roster limits.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          {t.addNewSport || "Add New Sport"}
        </Button>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="nec-filters-bar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", margin: "16px 0 20px 0", background: "var(--nec-card-bg, #fff)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
          <input
            type="text"
            className="nec-table-search-input"
            style={{ paddingLeft: "32px", width: "100%", margin: 0 }}
            placeholder="Search sports by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={15} color="var(--nec-text-muted)" />
          <select
            className="nec-table-search-input"
            style={{ width: "auto", margin: 0, padding: "6px 12px" }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Sport Types</option>
            <option value="Team">Team Sports</option>
            <option value="Individual">Individual Sports</option>
            <option value="Both">Both (Individual & Team)</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            className="nec-table-search-input"
            style={{ width: "auto", margin: 0, padding: "6px 12px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ArrowUpDown size={15} color="var(--nec-text-muted)" />
          <select
            className="nec-table-search-input"
            style={{ width: "auto", margin: 0, padding: "6px 12px" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name_asc">Name (A &rarr; Z)</option>
            <option value="name_desc">Name (Z &rarr; A)</option>
            <option value="type_asc">Type (Individual first)</option>
            <option value="type_desc">Type (Team first)</option>
          </select>
        </div>

        {(searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL") && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearchQuery(""); setTypeFilter("ALL"); setStatusFilter("ALL"); setSortBy("name_asc"); }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Sports Table */}
      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadSports} message={error} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredSports}
          loading={loading}
          searchable={false}
          emptyMessage={
            searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL"
              ? "No sports matching the selected search or filter criteria."
              : "No sports have been added to the master catalog yet."
          }
        />
      )}

      {/* Sub-categories Modal (e.g. Athletics 100m, 200m, Relay, Shot Put) */}
      <Modal isOpen={!!catSport} onClose={() => setCatSport(null)} title={`Sub-Categories: ${catSport?.name || ""}`} size="md">
        <p style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)", marginBottom: "12px" }}>
          Define the disciplines, distances, or event categories specific to <strong>{catSport?.name}</strong> (e.g. 100m Sprint, 4x100m Relay, Singles, Doubles).
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", maxHeight: "220px", overflowY: "auto" }}>
          {catList.length === 0 && (
            <li style={{ color: "var(--nec-text-muted)", padding: "12px 0", textAlign: "center", fontStyle: "italic" }}>
              No custom sub-categories defined yet.
            </li>
          )}
          {catList.map(c => (
            <li 
              key={c.category_id} 
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: "8px 12px", 
                borderBottom: "1px solid var(--nec-border, #e2e8f0)",
                background: "var(--nec-bg-light, #f8fafc)",
                borderRadius: "6px",
                marginBottom: "4px"
              }}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                icon={X} 
                aria-label={`Remove ${c.name}`} 
                title="Remove category" 
                onClick={() => removeCategory(c.category_id)} 
              />
            </li>
          ))}
        </ul>

        <form onSubmit={addCategory} style={{ display: "flex", gap: "8px" }}>
          <input 
            className="nec-table-search-input" 
            style={{ flex: 1, margin: 0 }} 
            value={catName} 
            onChange={(e) => setCatName(e.target.value)} 
            placeholder="e.g. 100m Sprint, 4x100m Relay, Doubles" 
            maxLength={100} 
          />
          <Button variant="primary" type="submit" icon={Plus}>Add Category</Button>
        </form>
        {catError && (
          <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", marginTop: "8px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
            <AlertCircle size={14} /> {catError}
          </p>
        )}
      </Modal>

      {/* Add / Edit Sport Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSport(null);
          setFormError("");
        }}
        title={editingSport ? `Edit Sport: ${editingSport.name}` : "Add New Sport to Catalog"}
      >
        <form onSubmit={handleSaveSport} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {formError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Sport Name <span style={{ color: "var(--nec-danger, #dc2626)" }}>*</span>
            </label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0 }}
              placeholder="e.g. Athletics, Basketball, Badminton, Football, Cricket"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Participation Structure <span style={{ color: "var(--nec-danger, #dc2626)" }}>*</span>
              </label>
              <select 
                className="nec-table-search-input" 
                style={{ width: "100%", margin: 0 }} 
                value={sportType} 
                onChange={(e) => handleSportTypeChange(e.target.value)}
              >
                <option value="Team">Team Sport (Squad-based)</option>
                <option value="Individual">Individual Sport (Athlete-based)</option>
                <option value="Both">Both (Individual & Team Formats)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Catalog Status
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Active (Available for events)</option>
                <option value="Inactive">Inactive (Archived)</option>
              </select>
            </div>
          </div>

          <div style={{ padding: "10px 12px", background: "#f0f9ff", borderRadius: "6px", border: "1px solid #bae6fd", fontSize: "0.82rem", color: "#0369a1" }}>
            💡 <strong>Participation Note:</strong> Gender classifications (Men, Women, Mixed, Open) and event formats (e.g. Singles vs Doubles, Sprint vs Relay) are configured at the <strong>Event Level</strong>.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Default Min Squad Size <span style={{ color: "var(--nec-danger, #dc2626)" }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                {sportType === "Individual" ? "Normally 1 athlete" : "Min players on pitch/court"}
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Default Max Roster Limit <span style={{ color: "var(--nec-danger, #dc2626)" }}>*</span>
              </label>
              <input
                type="number"
                min={minPlayers || 1}
                max="50"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                Max registered athletes per entry
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setIsModalOpen(false); setEditingSport(null); }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              loading={submitting}
            >
              {editingSport ? "Save Changes" : "Create Sport"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
