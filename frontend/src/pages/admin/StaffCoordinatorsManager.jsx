import React, { useEffect, useState } from "react";
import { sportsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, Pencil, UserX, UserCheck, Copy } from "lucide-react";
import "./AdminPortal.css";

const emptyForm = { fullName: "", designation: "", email: "", phone: "", departmentId: "", username: "", password: "" };

// Staff Coordinators: add staff details, optionally create their login, and assign a department.
export default function StaffCoordinatorsManager() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(null); // staff row or "new"
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState(null);

  const load = () => {
    setLoading(true);
    setPageError("");
    Promise.all([sportsApi.getCoordinators(), sportsApi.getDepartments()])
      .then(([list, depts]) => {
        setStaff(Array.isArray(list) ? list : []);
        setDepartments(Array.isArray(depts) ? depts : []);
      })
      .catch(err => setPageError(err.message || "Failed to load staff coordinators."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setEditing("new");
  };

  const openEdit = (row) => {
    setForm({
      fullName: row.fullName || "",
      designation: row.designation || "",
      email: row.email || "",
      phone: row.phone || "",
      departmentId: row.departmentId ? String(row.departmentId) : "",
      username: "",
      password: ""
    });
    setFormError("");
    setEditing(row);
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const body = {
      fullName: form.fullName.trim(),
      designation: form.designation.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      departmentId: form.departmentId ? Number(form.departmentId) : null
    };
    try {
      if (editing === "new") {
        const created = await sportsApi.createCoordinator({
          ...body,
          username: form.username.trim() || undefined,
          password: form.password || undefined
        });
        setEditing(null);
        setIssuedPassword({ username: created.username, password: created.temporaryPassword });
      } else {
        await sportsApi.updateCoordinator(editing.staff_id, body);
        setEditing(null);
      }
      load();
    } catch (err) {
      setFormError(err.message || "Could not save staff details.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    const next = !row.isActive;
    const msg = next
      ? `Reactivate ${row.fullName}?`
      : `Deactivate ${row.fullName}? Their login is disabled and they are removed from their department. Records are kept.`;
    if (!window.confirm(msg)) return;
    try {
      await sportsApi.setCoordinatorStatus(row.staff_id, next);
      load();
    } catch (err) {
      setPageError(err.message || "Could not update status.");
    }
  };

  const columns = [
    { key: "fullName", label: "Name", render: (v, r) => <div><strong>{v}</strong>{r.designation && <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{r.designation}</div>}</div> },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone", width: "130px", render: (v) => v || "-" },
    { key: "departmentName", label: "Department", width: "170px", render: (v, r) => v ? `${r.departmentCode ? r.departmentCode + " - " : ""}${v}` : <span style={{ color: "var(--nec-text-muted)" }}>Not assigned</span> },
    { key: "username", label: "Login", width: "120px", render: (v) => v || <span style={{ color: "var(--nec-text-muted)" }}>No login</span> },
    { key: "isActive", label: "Status", width: "110px", render: (v) => <Badge status={v ? "success" : "warning"}>{v ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      label: "Actions",
      width: "110px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button variant="ghost" size="sm" icon={Pencil} aria-label="Edit" title="Edit" onClick={() => openEdit(row)} />
          <Button variant="ghost" size="sm" icon={row.isActive ? UserX : UserCheck} aria-label={row.isActive ? "Deactivate" : "Reactivate"} title={row.isActive ? "Deactivate" : "Reactivate"} onClick={() => toggleActive(row)} />
        </div>
      )
    }
  ];

  const field = (label, key, props = {}) => (
    <div className="nec-form-group">
      <label className="nec-form-label">{label}</label>
      <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  );

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Staff Coordinators</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={openNew}>Add Staff Coordinator</Button>
      </div>

      {pageError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", marginBottom: 12 }}>{pageError}</p>}

      <Table columns={columns} data={staff} loading={loading} searchPlaceholder="Search staff by name, email, department..." emptyMessage="No staff coordinators yet. Click 'Add Staff Coordinator'." />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add Staff Coordinator" : `Edit ${editing?.fullName || ""}`} size="md">
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {field("Full name *", "fullName", { required: true, minLength: 3 })}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Designation", "designation", { placeholder: "e.g. Physical Director" })}
            {field("Phone", "phone", { placeholder: "10 digits" })}
          </div>
          {field("Email *", "email", { type: "email", required: true })}
          <div className="nec-form-group">
            <label className="nec-form-label">Department (coordinates)</label>
            <select className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">-- Not assigned --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
            </select>
          </div>
          {editing === "new" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("Login username", "username", { placeholder: "defaults to email prefix" })}
              {field("Temporary password", "password", { placeholder: "auto-generated if empty", minLength: 8 })}
            </div>
          )}
          {formError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", margin: 0 }}>{formError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="outline" type="button" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!issuedPassword} onClose={() => setIssuedPassword(null)} title="Coordinator login created" size="sm">
        <p>Shown once. The coordinator must change it at first login.</p>
        <p><strong>Username:</strong> {issuedPassword?.username}</p>
        <p><strong>Temporary password:</strong> <code>{issuedPassword?.password}</code></p>
        <Button variant="outline" icon={Copy} onClick={() => navigator.clipboard?.writeText(issuedPassword?.password || "")}>Copy password</Button>
      </Modal>
    </div>
  );
}
