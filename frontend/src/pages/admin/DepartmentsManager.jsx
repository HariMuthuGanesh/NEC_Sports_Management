import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import { sportsApi } from "../../services/api/apiServices";
import { sanitizeInput } from "../../utils/security";
import { Building2, Plus, Edit2, Trash2 } from "lucide-react";
import "../admin/AdminPortal.css";

const DEPT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b", "#f97316", "#14b8a6"];

export default function DepartmentsManager() {
  const { t } = useAuth();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", color: "#3b82f6", hod: "", students: "" });

  const load = async () => {
    setLoading(true);
    const data = await sportsApi.getDepartments();
    setDepts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditDept(null); setForm({ name: "", code: "", color: "#3b82f6", hod: "", students: "" }); setShowModal(true); };
  const openEdit = (d) => { setEditDept(d); setForm({ name: d.name, code: d.code, color: d.color || "#3b82f6", hod: d.hod || "", students: d.students || "" }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const entry = { ...form, name: sanitizeInput(form.name), code: sanitizeInput(form.code).toUpperCase(), hod: sanitizeInput(form.hod), students: Number(form.students) || 0 };
    let updated;
    if (editDept) {
      updated = depts.map(d => d.id === editDept.id ? { ...editDept, ...entry } : d);
    } else {
      updated = [...depts, { id: `dept_${Date.now()}`, ...entry }];
    }
    await sportsApi.saveDepartments(updated);
    setDepts(updated);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this department?")) return;
    const updated = depts.filter(d => d.id !== id);
    await sportsApi.saveDepartments(updated);
    setDepts(updated);
  };

  const columns = [
    {
      key: "code", label: "Code", width: "90px",
      render: (val, row) => (
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: (row.color || "#3b82f6") + "22", color: row.color || "#3b82f6", fontWeight: 800, fontSize: "0.82rem" }}>
          {val}
        </span>
      )
    },
    { key: "name", label: "Department Name", render: (val) => <strong>{val}</strong> },
    { key: "hod", label: "Head of Department", render: (val) => <span style={{ color: "var(--nec-text-muted)" }}>{val || "—"}</span> },
    { key: "students", label: "Students", width: "100px", render: (val) => val ? `${Number(val).toLocaleString()}` : "—" },
    {
      key: "color", label: "Color", width: "80px",
      render: (val) => <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: val || "#3b82f6", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)" }} />
    },
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
            <Building2 size={18} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--nec-gold)", textTransform: "uppercase" }}>
              Academic Structure
            </span>
          </div>
          <h2 className="nec-page-title">{t.departments || "Departments"}</h2>
          <p className="nec-page-desc">Manage NEC academic departments and their sports participation records.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAdd}>Add Department</Button>
      </div>

      {/* Stats */}
      <div className="nec-stats-grid" style={{ marginBottom: "20px" }}>
        {[
          { label: "Total Departments", value: depts.length },
          { label: "Total Students", value: depts.reduce((s, d) => s + (Number(d.students) || 0), 0).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="nec-stat-card">
            <div className="nec-stat-card-top"><span className="nec-stat-title">{label}</span></div>
            <div className="nec-stat-value">{value}</div>
          </div>
        ))}

        {/* Department color pills */}
        <div className="nec-stat-card" style={{ gridColumn: "span 2" }}>
          <div className="nec-stat-title" style={{ marginBottom: "10px" }}>Department Overview</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {depts.map(d => (
              <span key={d.id} style={{ padding: "4px 12px", borderRadius: "20px", background: (d.color || "#3b82f6") + "18", color: d.color || "#3b82f6", fontWeight: 700, fontSize: "0.8rem", border: `1.5px solid ${d.color || "#3b82f6"}44` }}>
                {d.code}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Table columns={columns} data={depts} loading={loading} rowKey="id" searchKey="name" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editDept ? "Edit Department" : "Add Department"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="nec-form-group">
            <label className="nec-form-label">Department Full Name *</label>
            <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science & Engineering" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="nec-form-group">
              <label className="nec-form-label">Short Code *</label>
              <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CSE" maxLength={8} />
            </div>
            <div className="nec-form-group">
              <label className="nec-form-label">Student Count</label>
              <input type="number" className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.students} onChange={e => setForm(f => ({ ...f, students: e.target.value }))} placeholder="250" />
            </div>
          </div>
          <div className="nec-form-group">
            <label className="nec-form-label">Head of Department</label>
            <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.hod} onChange={e => setForm(f => ({ ...f, hod: e.target.value }))} placeholder="Dr. Name" />
          </div>
          <div className="nec-form-group">
            <label className="nec-form-label">Department Color</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {DEPT_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, border: form.color === c ? "3px solid var(--nec-navy)" : "2px solid #e2e8f0", cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editDept ? "Save Changes" : "Add Department"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
