import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import { sportsApi } from "../../services/api/apiServices";
import { sanitizeInput } from "../../utils/security";
import { MapPin, Plus, Edit2, Trash2, Home, Building2 } from "lucide-react";
import "../admin/AdminPortal.css";

const VENUE_TYPES = ["Outdoor", "Indoor", "Multi-Purpose"];
const STATUS_OPTIONS = ["Available", "Occupied", "Under Maintenance", "Closed"];

export default function VenuesManager() {
  const { t } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVenue, setEditVenue] = useState(null);
  const [form, setForm] = useState({ name: "", type: "Outdoor", capacity: "", status: "Available", location: "" });

  const load = async () => {
    setLoading(true);
    const data = await sportsApi.getVenues();
    setVenues(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditVenue(null); setForm({ name: "", type: "Outdoor", capacity: "", status: "Available", location: "" }); setShowModal(true); };
  const openEdit = (v) => { setEditVenue(v); setForm({ name: v.name, type: v.type, capacity: v.capacity, status: v.status, location: v.location || "" }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const entry = { ...form, name: sanitizeInput(form.name), location: sanitizeInput(form.location), capacity: Number(form.capacity) || 0 };
    let updated;
    if (editVenue) {
      updated = venues.map(v => v.id === editVenue.id ? { ...editVenue, ...entry } : v);
    } else {
      updated = [...venues, { id: `v_${Date.now()}`, ...entry }];
    }
    await sportsApi.saveVenues(updated);
    setVenues(updated);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this venue?")) return;
    const updated = venues.filter(v => v.id !== id);
    await sportsApi.saveVenues(updated);
    setVenues(updated);
  };

  const statusMap = { Available: "success", Occupied: "warning", "Under Maintenance": "danger", Closed: "neutral" };

  const columns = [
    { key: "name", label: "Venue Name", render: (val) => <strong>{val}</strong> },
    { key: "type", label: "Type", width: "120px", render: (val) => (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {val === "Indoor" ? <Building2 size={13} /> : <Home size={13} />}
        {val}
      </div>
    )},
    { key: "capacity", label: "Capacity", width: "110px", render: (val) => `${val.toLocaleString()} pax` },
    { key: "location", label: "Location / Block", render: (val) => <span style={{ color: "var(--nec-text-muted)" }}>{val || "—"}</span> },
    { key: "status", label: "Status", width: "160px", render: (val) => <Badge status={statusMap[val] || "neutral"}>{val}</Badge> },
    {
      key: "actions", label: "", width: "100px",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button variant="ghost" size="sm" icon={Edit2} onClick={() => openEdit(row)} />
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(row.id)} />
        </div>
      )
    },
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <MapPin size={18} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--nec-gold)", textTransform: "uppercase" }}>
              Facility Management
            </span>
          </div>
          <h2 className="nec-page-title">{t.venues || "Venues"}</h2>
          <p className="nec-page-desc">Manage NEC campus sports facilities, indoor courts, and outdoor grounds.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAdd}>Add Venue</Button>
      </div>

      {/* Stats */}
      <div className="nec-stats-grid" style={{ marginBottom: "20px" }}>
        {[
          { label: "Total Venues", value: venues.length, sub: "On campus" },
          { label: "Available", value: venues.filter(v => v.status === "Available").length, sub: "Ready to use", color: "#22c55e" },
          { label: "Occupied", value: venues.filter(v => v.status === "Occupied").length, sub: "In active use", color: "#f59e0b" },
          { label: "Total Capacity", value: venues.reduce((s, v) => s + (Number(v.capacity) || 0), 0).toLocaleString(), sub: "Combined seating" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="nec-stat-card">
            <div className="nec-stat-card-top"><span className="nec-stat-title">{label}</span></div>
            <div className="nec-stat-value" style={{ color: color || "var(--nec-navy)" }}>{value}</div>
            <div className="nec-stat-subtext">{sub}</div>
          </div>
        ))}
      </div>

      <Table columns={columns} data={venues} loading={loading} rowKey="id" searchKey="name" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editVenue ? "Edit Venue" : "Add New Venue"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="nec-form-group">
            <label className="nec-form-label">Venue Name *</label>
            <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LASA Indoor Sports Complex" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="nec-form-group">
              <label className="nec-form-label">Type</label>
              <select className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {VENUE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="nec-form-group">
              <label className="nec-form-label">Capacity (pax)</label>
              <input type="number" className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="500" />
            </div>
          </div>
          <div className="nec-form-group">
            <label className="nec-form-label">Location / Block</label>
            <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Sports Block A, Near Canteen" />
          </div>
          <div className="nec-form-group">
            <label className="nec-form-label">Status</label>
            <select className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editVenue ? "Save Changes" : "Add Venue"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
