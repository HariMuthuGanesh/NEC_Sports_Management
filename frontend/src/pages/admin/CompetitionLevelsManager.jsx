import React, { useEffect, useState } from "react";
import { competitionLevelsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";
import "./AdminPortal.css";

const emptyForm = { name: "", code: "", description: "", displayOrder: 0, isActive: true };

// Competition Levels master: admin-managed tiers used by tournaments.
// Deletes are soft and blocked while a tournament is assigned to the level.
export default function CompetitionLevelsManager() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState(null); // row, or "new"
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    setLoading(true);
    setPageError("");
    competitionLevelsApi
      .list({ includeInactive: showInactive ? 1 : 0, pageSize: 100, sort: "display_order", dir: "asc" })
      .then((res) => setLevels(Array.isArray(res?.items) ? res.items : []))
      .catch((err) => setPageError(err.message || "Could not load competition levels."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showInactive]);

  const openNew = () => { setForm({ ...emptyForm, displayOrder: (levels.at(-1)?.displayOrder ?? 0) + 1 }); setFormError(""); setEditing("new"); };
  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, description: row.description || "", displayOrder: row.displayOrder ?? 0, isActive: !!row.isActive });
    setFormError("");
    setEditing(row);
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (name.length < 2) return setFormError("Name must be at least 2 characters.");
    if (!/^[A-Z][A-Z0-9_-]{1,29}$/.test(code)) return setFormError("Code must be 2-30 characters (letters, digits, - or _), starting with a letter.");
    const duplicate = levels.find((l) => l.id !== editing?.id && (l.name.toLowerCase() === name.toLowerCase() || l.code === code));
    if (duplicate) return setFormError(`"${duplicate.name}" already uses this ${duplicate.name.toLowerCase() === name.toLowerCase() ? "name" : "code"}.`);
    setSaving(true);
    try {
      const body = { ...form, name, code, displayOrder: Number(form.displayOrder) || 0 };
      if (editing === "new") await competitionLevelsApi.create(body);
      else await competitionLevelsApi.update(editing.id, body);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message || "Could not save the competition level.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await competitionLevelsApi.remove(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err.message || "Could not delete this level.");
    }
  };

  const columns = [
    { key: "name", label: "Name", sortable: true, render: (v) => <strong>{v}</strong> },
    { key: "code", label: "Code", sortable: true },
    { key: "displayOrder", label: "Order", sortable: true },
    { key: "description", label: "Description", render: (v) => v || <span style={{ opacity: 0.6 }}>—</span> },
    {
      key: "isActive",
      label: "Status",
      render: (v) => <Badge status={v ? "success" : "neutral"}>{v ? "Active" : "Inactive"}</Badge>,
    },
    {
      label: "Actions",
      key: "actions",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Edit ${row.name}`} title="Edit" onClick={() => openEdit(row)} />
          <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Delete ${row.name}`} title="Delete" onClick={() => { setDeleteError(""); setDeleting(row); }} />
        </div>
      ),
    },
  ];

  const field = (label, key, props = {}) => (
    <div className="nec-form-group">
      <label className="nec-form-label">{label}</label>
      <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  );

  return (
    <div className="nec-admin-dashboard">
      <div className="nec-admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Competition Levels</h2>
                  </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
          </label>
          <Button variant="primary" icon={Plus} onClick={openNew}>Add Level</Button>
        </div>
      </div>

      {pageError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)" }}>{pageError}</p>}

      <Table
        columns={columns}
        data={levels}
        loading={loading}
        searchPlaceholder="Search levels by name or code..."
        emptyTitle="No competition levels"
        emptyMessage="Click 'Add Level' to create the first competition level."
      />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add Competition Level" : `Edit ${editing?.name || ""}`} size="md">
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {field("Name *", "name", { required: true, maxLength: 100 })}
          {field("Code * (unique, e.g. STATE)", "code", { required: true, maxLength: 30, style: { maxWidth: "100%", textTransform: "uppercase" } })}
          {field("Description", "description", { maxLength: 500 })}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
            {field("Display order", "displayOrder", { type: "number", min: 0, max: 9999 })}
            <label style={{ display: "flex", gap: 6, alignItems: "center", paddingBottom: 10 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active
            </label>
          </div>
          {formError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", margin: 0 }}>{formError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="outline" type="button" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete competition level?" size="sm">
        <p>Delete <strong>{deleting?.name}</strong>?</p>
        {deleteError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)" }}>{deleteError}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" icon={Trash2} aria-label="Confirm delete" title="Confirm delete" onClick={confirmDelete} />
        </div>
      </Modal>
    </div>
  );
}
