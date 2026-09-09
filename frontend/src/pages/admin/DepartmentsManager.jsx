import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import { sportsApi } from "../../services/api/apiServices";
import { sanitizeInput, getAuthToken } from "../../utils/security";
import { Building2, Plus, Edit2, Trash2, UserCheck, Mail } from "lucide-react";
import ErrorState from "../../components/common/ErrorState";
import "../admin/AdminPortal.css";

const DEPT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b", "#f97316", "#14b8a6"];

export default function DepartmentsManager() {
  const { t } = useAuth();
  const [depts, setDepts] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ 
    name: "", 
    code: "", 
    color: "#3b82f6", 
    hod: "", 
    hodEmail: "",
    coordinatorUserId: "" 
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sportsApi.getDepartments();
      setDepts(Array.isArray(data) ? data : []);

      // Fetch coordinators
      const token = getAuthToken();
      const coordRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/coordinators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (coordRes.ok) {
        const cJson = await coordRes.json();
        setCoordinators(cJson.data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load departments");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { 
    setEditDept(null); 
    setForm({ name: "", code: "", color: "#3b82f6", hod: "", hodEmail: "", coordinatorUserId: "" }); 
    setShowModal(true); 
  };
  
  const openEdit = (d) => { 
    setEditDept(d); 
    setForm({ 
      name: d.name, 
      code: d.code, 
      color: d.color_code || d.color || "#3b82f6", 
      hod: d.hod_name || d.hod || "", 
      hodEmail: d.hod_email || "",
      coordinatorUserId: d.coordinator_user_id ? String(d.coordinator_user_id) : "" 
    }); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const entry = { 
      name: sanitizeInput(form.name), 
      code: sanitizeInput(form.code).toUpperCase(), 
      hodName: sanitizeInput(form.hod), 
      hodEmail: sanitizeInput(form.hodEmail),
      coordinatorUserId: form.coordinatorUserId ? Number(form.coordinatorUserId) : null,
      colorCode: form.color 
    };

    try {
      if (editDept) {
        await sportsApi.updateDepartment(editDept.id, entry);
      } else {
        await sportsApi.createDepartment(entry);
      }
      await load();
      setShowModal(false);
    } catch (e) {
      alert("Failed to save department: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this department?")) return;
    try {
      await sportsApi.deleteDepartment(id);
      await load();
    } catch (e) {
      alert("Failed to delete department: " + e.message);
    }
  };

  const columns = [
    {
      key: "code", label: "Code", width: "90px",
      render: (val, row) => (
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: (row.color_code || row.color || "#3b82f6") + "22", color: row.color_code || row.color || "#3b82f6", fontWeight: 800, fontSize: "0.82rem" }}>
          {val || "—"}
        </span>
      )
    },
    { key: "name", label: "Department Name", render: (val) => <strong>{val || "—"}</strong> },
    { 
      key: "coordinator_name", 
      label: "Staff Coordinator", 
      render: (val, row) => val ? (
        <div>
          <strong>{val}</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{row.coordinator_email}</div>
        </div>
      ) : (
        <span style={{ color: "var(--nec-text-muted)", fontStyle: "italic" }}>Not Assigned</span>
      ) 
    },
    { 
      key: "hod_name", 
      label: "Head of Department", 
      render: (val, row) => (
        <div>
          <div>{val || row.hod || "—"}</div>
          {row.hod_email && <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{row.hod_email}</div>}
        </div>
      ) 
    },
    { key: "students", label: "Athletes", width: "90px", render: (val) => <span>{val || 0} enrolled</span> },
    {
      key: "actions", label: "Actions", width: "100px",
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
          <h2 className="nec-page-title">{t.departments || "Departments & Coordinators"}</h2>
          <p className="nec-page-desc">Manage NEC academic departments, designate Staff Coordinators, and configure HOD contacts.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAdd}>Add Department</Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={load} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="nec-stats-grid" style={{ marginBottom: "20px" }}>
            {[
              { label: "Total Departments", value: depts.length },
              { label: "Assigned Coordinators", value: depts.filter(d => d.coordinator_user_id).length },
            ].map(({ label, value }) => (
              <div key={label} className="nec-stat-card">
                <div className="nec-stat-card-top"><span className="nec-stat-title">{label}</span></div>
                <div className="nec-stat-value">{value}</div>
              </div>
            ))}

            {/* Department color pills */}
            <div className="nec-stat-card" style={{ gridColumn: "span 2" }}>
              <div className="nec-stat-title" style={{ marginBottom: "10px" }}>Active Departments Overview</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {depts.map(d => (
                  <span key={d.id} style={{ padding: "4px 12px", borderRadius: "20px", background: (d.color_code || d.color || "#3b82f6") + "18", color: d.color_code || d.color || "#3b82f6", fontWeight: 700, fontSize: "0.8rem", border: `1.5px solid ${d.color_code || d.color || "#3b82f6"}44` }}>
                    {d.code} • {d.coordinator_name || "Unassigned"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Table columns={columns} data={depts} loading={loading} rowKey="id" searchKey="name" emptyMessage="No departments configured yet." />
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editDept ? "Edit Department & Coordinator" : "Add Department"}>
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
              <label className="nec-form-label">Designated Staff Coordinator</label>
              <select className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.coordinatorUserId} onChange={e => setForm(f => ({ ...f, coordinatorUserId: e.target.value }))}>
                <option value="">-- Select Coordinator --</option>
                {coordinators.map(c => (
                  <option key={c.id} value={c.id}>{c.username} ({c.email})</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="nec-form-group">
              <label className="nec-form-label">Head of Department (HOD)</label>
              <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.hod} onChange={e => setForm(f => ({ ...f, hod: e.target.value }))} placeholder="Dr. Name" />
            </div>
            <div className="nec-form-group">
              <label className="nec-form-label">HOD Official Email</label>
              <input type="email" className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.hodEmail} onChange={e => setForm(f => ({ ...f, hodEmail: e.target.value }))} placeholder="hod_cse@nec.edu.in" />
            </div>
          </div>
          <div className="nec-form-group">
            <label className="nec-form-label">Department Color Code</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {DEPT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, border: form.color === c ? "3px solid var(--nec-navy)" : "2px solid #e2e8f0", cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editDept ? "Save Changes" : "Create Department"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
