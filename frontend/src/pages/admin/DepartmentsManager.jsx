import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import { sportsApi } from "../../services/api/apiServices";
import { sanitizeInput } from "../../utils/security";
import { Building2, Plus, Edit2, Trash2, UserCheck, Mail } from "lucide-react";
import ErrorState from "../../components/common/ErrorState";
import "../admin/AdminPortal.css";

const DEPT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b", "#f97316", "#14b8a6"];

const unescapeEntity = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'");
};

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
    coordinatorUserId: "" 
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sportsApi.getDepartments();
      setDepts(Array.isArray(data) ? data : []);

      // Fetch coordinators
      const coordList = await sportsApi.getCoordinators().catch(() => []);
      setCoordinators(Array.isArray(coordList) ? coordList : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load departments");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { 
    setEditDept(null); 
    setForm({ name: "", code: "", color: "#3b82f6", coordinatorUserId: "" }); 
    setShowModal(true); 
  };
  
  const openEdit = (d) => { 
    setEditDept(d); 
    setForm({ 
      name: unescapeEntity(d.name), 
      code: unescapeEntity(d.code), 
      color: d.color_code || d.color || "#3b82f6", 
      coordinatorUserId: d.coordinator_user_id ? String(d.coordinator_user_id) : "" 
    }); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const entry = { 
      name: form.name.trim(), 
      code: form.code.trim().toUpperCase(), 
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
          {unescapeEntity(val) || "-"}
        </span>
      )
    },
    { key: "name", label: "Department Name", render: (val) => <strong>{unescapeEntity(val) || "-"}</strong> },
    { key: "students", label: "Enrolled Students", width: "140px", render: (val) => <span>{val || 0} students</span> },
    { key: "teams_count", label: "Teams", width: "100px", render: (val) => <span style={{ fontWeight: 600 }}>{val || 0} teams</span> },
    {
      key: "actions", label: "Actions", width: "140px",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button variant="outline" size="sm" icon={Edit2} onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(row.id)} title="Delete Department" ariaLabel="Delete Department" />
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
          <h2 className="nec-page-title">Academic Departments Catalog</h2>
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
              { label: "Total Registered Teams", value: depts.reduce((acc, d) => acc + (Number(d.teams_count) || 0), 0) },
              { label: "Total Enrolled Students", value: depts.reduce((acc, d) => acc + (Number(d.students) || 0), 0) }
            ].map(({ label, value }) => (
              <div key={label} className="nec-stat-card">
                <div className="nec-stat-card-top"><span className="nec-stat-title">{label}</span></div>
                <div className="nec-stat-value">{value}</div>
              </div>
            ))}
          </div>

          <Table columns={columns} data={depts} loading={loading} rowKey="id" searchKey="name" emptyMessage="No departments configured yet." />
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editDept ? "Edit Department" : "Add Department"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="nec-form-group">
            <label className="nec-form-label">Department Full Name *</label>
            <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science & Engineering" />
          </div>
          <div className="nec-form-group">
            <label className="nec-form-label">Short Code *</label>
            <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CSE" maxLength={8} />
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
