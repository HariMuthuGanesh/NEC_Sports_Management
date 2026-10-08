import React, { useState, useEffect } from "react";
import { competitionLevelsApi } from "../../services/api/apiServices";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import ErrorState from "../../components/common/ErrorState";
import "./AdminPortal.css";

export default function CompetitionLevelsManager() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    display_order: 1,
    status: "Active"
  });

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLevels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await competitionLevelsApi.getLevels({ all: "true", limit: 100 });
      const data = Array.isArray(res) ? res : (res?.data || []);
      setLevels(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load competition levels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLevels();
  }, []);

  const openAdd = () => {
    setEditingLevel(null);
    setFormError("");
    setForm({
      name: "",
      code: "",
      description: "",
      display_order: (levels.length + 1) * 1,
      status: "Active"
    });
    setShowModal(true);
  };

  const openEdit = (lvl) => {
    setEditingLevel(lvl);
    setFormError("");
    setForm({
      name: lvl.name || "",
      code: lvl.code || "",
      description: lvl.description || "",
      display_order: lvl.display_order ?? 0,
      status: lvl.status || "Active"
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Competition level name is required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim().toUpperCase() : null,
        description: form.description.trim(),
        display_order: Number(form.display_order) || 0,
        status: form.status
      };

      if (editingLevel) {
        await competitionLevelsApi.updateLevel(editingLevel.id || editingLevel.level_id, payload);
        setSuccessMsg(`Competition level "${payload.name}" updated successfully.`);
      } else {
        await competitionLevelsApi.createLevel(payload);
        setSuccessMsg(`Competition level "${payload.name}" created successfully.`);
      }

      setShowModal(false);
      await loadLevels();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setFormError(err.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await competitionLevelsApi.deleteLevel(deleteTarget.id || deleteTarget.level_id);
      setSuccessMsg(`Competition level "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await loadLevels();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to delete competition level.");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "display_order",
      label: "Order",
      width: "80px",
      render: (val) => (
        <span style={{ fontWeight: 700, color: "var(--nec-text-muted)" }}>
          #{val ?? 0}
        </span>
      )
    },
    {
      key: "name",
      label: "Level Name",
      render: (val, r) => (
        <div>
          <div style={{ fontWeight: 700, color: "var(--nec-text-main)" }}>
            {val}
          </div>
          {r.description && (
            <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", marginTop: "2px" }}>
              {r.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: "code",
      label: "Code",
      width: "110px",
      render: (val) => (
        val ? (
          <span className="nec-fixture-dept-tag">
            {val}
          </span>
        ) : (
          <span style={{ color: "var(--nec-text-muted)" }}>-</span>
        )
      )
    },
    {
      key: "tournament_count",
      label: "Tournaments",
      width: "130px",
      render: (val) => (
        <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
          {val || 0} assigned
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Active" ? "success" : "neutral"}>
          {val || "Active"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "140px",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button
            variant="outline"
            size="sm"
            icon={Edit2}
            onClick={() => openEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            title="Delete Competition Level"
            ariaLabel="Delete Competition Level"
            onClick={() => setDeleteTarget(row)}
          />
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      {/* Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={22} color="var(--nec-blue, #0274be)" />
            <h2 className="nec-page-title" style={{ margin: 0 }}>Competition Levels</h2>
          </div>
        </div>

        <Button variant="primary" icon={Plus} onClick={openAdd}>
          Add Competition Level
        </Button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          background: "var(--nec-success-bg, rgba(16, 185, 129, 0.1))",
          color: "var(--nec-success-text, #059669)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
          border: "1px solid rgba(16, 185, 129, 0.2)"
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{ marginBottom: "16px" }}>
          <ErrorState message={error} onRetry={loadLevels} />
        </div>
      )}

      {/* Data Table with Single Integrated Search Bar */}
      <Table
        columns={columns}
        data={levels}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search levels..."
        emptyMessage="No competition levels found"
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLevel ? "Edit Competition Level" : "Add Competition Level"}
      >
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {formError && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem"
            }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="nec-form-group">
            <label className="nec-form-label">Level Name *</label>
            <input
              type="text"
              required
              className="nec-form-input"
              placeholder="e.g. State, Zonal, Inter-Collegiate"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="nec-form-grid-2">
            <div className="nec-form-group">
              <label className="nec-form-label">Level Code (Optional)</label>
              <input
                type="text"
                className="nec-form-input"
                placeholder="e.g. STATE, ZONE, NATL"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">Display Order</label>
              <input
                type="number"
                min="0"
                className="nec-form-input"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
              />
            </div>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Status</label>
            <select
              className="nec-form-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Description (Optional)</label>
            <textarea
              rows={3}
              className="nec-form-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="nec-form-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Saving..." : editingLevel ? "Save Changes" : "Create Level"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Level"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--nec-danger, #ef4444)" }}>
            <AlertTriangle size={24} />
            <strong style={{ fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
              Delete "{deleteTarget?.name}"?
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
