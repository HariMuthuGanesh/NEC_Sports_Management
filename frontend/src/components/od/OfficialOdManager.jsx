import React, { useState, useEffect, useCallback, useRef } from "react";
import { odApi, sportsApi, tournamentsApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import { Card } from "../common/Card";
import Button from "../common/Button";
import Badge from "../common/Badge";
import SkeletonLoader from "../common/SkeletonLoader";
import EmptyState from "../common/EmptyState";
import {
  Upload,
  FileText,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  X,
  Search,
  Filter,
  Layers,
  Building,
  Trophy
} from "lucide-react";
import "./OfficialOd.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function OfficialOdManager() {
  const toast = useToast();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  // Form state
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedTournament, setSelectedTournament] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Filter state for document list
  const [sportFilter, setSportFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview PDF modal state
  const [previewDoc, setPreviewDoc] = useState(null);

  const fileInputRef = useRef(null);

  // Load master data
  useEffect(() => {
    Promise.all([
      sportsApi.getSports().catch(() => []),
      sportsApi.getDepartments().catch(() => []),
      tournamentsApi.getTournaments().catch(() => [])
    ]).then(([sData, dData, tData]) => {
      setSports(Array.isArray(sData) ? sData : []);
      setDepartments(Array.isArray(dData) ? dData : []);
      setTournaments(Array.isArray(tData) ? tData : []);
    });
  }, []);

  // Fetch uploaded documents
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odApi.getOfficialDocs();
      const list = Array.isArray(res) ? res : res?.data || [];
      setDocs(list);
    } catch (err) {
      console.error("Failed to load official OD docs:", err);
      toast.error("Could not load official OD documents.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files (.pdf) are allowed for official signed OD letters.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds the 15 MB limit.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setDuplicateWarning(null);
  };

  const handleUpload = async (forceReplace = false) => {
    if (!selectedSport) {
      toast.warning("Please select a Sport.");
      return;
    }
    if (!selectedDept) {
      toast.warning("Please select a Department.");
      return;
    }
    if (!selectedFile) {
      toast.warning("Please select a signed PDF document to upload.");
      return;
    }

    const sportObj = sports.find((s) => String(s.sport_id) === String(selectedSport) || s.name === selectedSport);
    const deptObj = departments.find((d) => String(d.id) === String(selectedDept) || d.code === selectedDept);
    const tourObj = tournaments.find((t) => String(t.tournament_id) === String(selectedTournament));

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("sportId", sportObj?.sport_id || "");
    formData.append("sportName", sportObj?.name || selectedSport);
    formData.append("departmentId", deptObj?.id || "");
    formData.append("departmentCode", deptObj?.code || selectedDept);
    formData.append("departmentName", deptObj?.name || "");
    if (tourObj) {
      formData.append("tournamentId", tourObj.tournament_id);
      formData.append("tournamentName", tourObj.name);
    }
    formData.append("academicYear", academicYear || "2025-2026");
    if (customTitle.trim()) {
      formData.append("title", customTitle.trim());
    }
    if (forceReplace) {
      formData.append("replace", "true");
    }

    setUploading(true);
    try {
      const res = await odApi.uploadOfficialDoc(formData);
      if (res?.success) {
        toast.success(res.message || "Official signed OD letter uploaded successfully!");
        // Reset form
        setSelectedFile(null);
        setCustomTitle("");
        setDuplicateWarning(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchDocs();
      } else if (res?.duplicate) {
        setDuplicateWarning(res.message);
      } else {
        toast.error(res?.error?.message || "Failed to upload official OD document.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      if (err.data?.duplicate) {
        setDuplicateWarning(err.message);
      } else {
        toast.error(err.message || "Upload failed. Please check the network.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to archive this official signed OD document?")) {
      return;
    }
    try {
      await odApi.deleteOfficialDoc(docId);
      toast.success("Document archived successfully.");
      fetchDocs();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to archive document.");
    }
  };

  // Filtered documents
  const filteredDocs = docs.filter((d) => {
    if (sportFilter !== "ALL" && d.sport_name !== sportFilter) return false;
    if (deptFilter !== "ALL" && d.department_code !== deptFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.sport_name?.toLowerCase().includes(q) ||
      d.department_code?.toLowerCase().includes(q) ||
      d.department_name?.toLowerCase().includes(q) ||
      d.tournament_name?.toLowerCase().includes(q) ||
      d.title?.toLowerCase().includes(q) ||
      d.file_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="nec-official-od-manager">
      {/* ── Section 1: Upload Form Card ─────────────────────────────────── */}
      <Card
        title="Upload Principal-Signed Official OD Document"
        subtitle="Upload signed OD letters sport-wise and department-wise for instant public staff verification"
        className="nec-official-od-upload-card"
      >
        <div className="nec-official-od-form-grid">
          {/* Sport Select */}
          <div className="nec-form-group">
            <label className="nec-form-label">
              Sport <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              className="nec-select-field"
              value={selectedSport}
              onChange={(e) => {
                setSelectedSport(e.target.value);
                setDuplicateWarning(null);
              }}
            >
              <option value="">Select Sport...</option>
              {sports.map((s) => (
                <option key={s.sport_id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Select */}
          <div className="nec-form-group">
            <label className="nec-form-label">
              Department <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              className="nec-select-field"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setDuplicateWarning(null);
              }}
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tournament / Event (Optional) */}
          <div className="nec-form-group">
            <label className="nec-form-label">Associated Tournament / Event</label>
            <select
              className="nec-select-field"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
            >
              <option value="">Select Tournament (Optional)...</option>
              {tournaments.map((t) => (
                <option key={t.tournament_id} value={t.tournament_id}>
                  {t.name} ({t.academic_year || "2025-26"})
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div className="nec-form-group">
            <label className="nec-form-label">Academic Year</label>
            <input
              type="text"
              className="nec-input-field"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
            />
          </div>
        </div>

        {/* Custom Document Title */}
        <div className="nec-form-group" style={{ marginTop: "14px" }}>
          <label className="nec-form-label">Letter Title / Reference Note (Optional)</label>
          <input
            type="text"
            className="nec-input-field"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Anna University Zonal Cricket - CSE Official OD Letter"
          />
        </div>

        {/* File Drop / Select Area */}
        <div className="nec-official-od-dropzone">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            id="officialPdfInput"
            style={{ display: "none" }}
          />
          <div
            className="nec-dropzone-box"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <Upload size={32} className="nec-dropzone-icon" />
            <div className="nec-dropzone-text">
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileCheck size={20} style={{ color: "var(--nec-blue-accent, #1d4ed8)" }} />
                  <strong style={{ color: "var(--nec-navy)" }}>{selectedFile.name}</strong>
                  <span style={{ color: "var(--nec-text-muted)", fontSize: "0.8rem" }}>
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <strong>Click or Drag to Select Signed OD PDF Document</strong>
                  <span>Only PDF files up to 15 MB are accepted</span>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" type="button">
              {selectedFile ? "Change PDF" : "Browse Files"}
            </Button>
          </div>
        </div>

        {/* Duplicate Warning & Replacement Prompt */}
        {duplicateWarning && (
          <div className="nec-duplicate-warning-box">
            <AlertTriangle size={20} className="nec-warning-icon" />
            <div className="nec-warning-content">
              <strong>Existing Document Found</strong>
              <p>{duplicateWarning}</p>
              <div style={{ marginTop: "8px", display: "flex", gap: "10px" }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => handleUpload(true)}
                >
                  {uploading ? "Replacing..." : "Confirm & Replace (Increment Version)"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!duplicateWarning && (
          <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="primary"
              icon={Upload}
              disabled={uploading || !selectedFile}
              onClick={() => handleUpload(false)}
            >
              {uploading ? "Uploading & Verifying..." : "Upload Official Signed OD Letter"}
            </Button>
          </div>
        )}
      </Card>

      {/* ── Section 2: Uploaded Documents Directory ─────────────────────── */}
      <Card
        title="Official Signed OD Documents Directory"
        subtitle={`${docs.length} official Principal-signed document${docs.length !== 1 ? "s" : ""} on record`}
        className="nec-official-od-list-card"
        headerAction={
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchDocs}>
            Refresh
          </Button>
        }
      >
        {/* Filter Controls Bar */}
        <div className="nec-official-od-filter-bar">
          <div className="nec-filter-group">
            <select
              className="nec-filter-select"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="ALL">All Sports</option>
              {sports.map((s) => (
                <option key={s.sport_id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              className="nec-filter-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>

          <div className="nec-search-input-wrapper">
            <Search size={15} className="nec-search-icon" />
            <input
              type="text"
              className="nec-search-input"
              placeholder="Search by sport, department, tournament, file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Document Table / Cards */}
        {loading ? (
          <SkeletonLoader rows={4} />
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Official OD Letters Found"
            message={
              searchQuery || sportFilter !== "ALL" || deptFilter !== "ALL"
                ? "No uploaded documents match the selected filters."
                : "No official signed OD letters have been uploaded yet."
            }
          />
        ) : (
          <div className="nec-official-docs-grid">
            {filteredDocs.map((doc) => (
              <div key={doc.document_id} className="nec-official-doc-item">
                <div className="nec-doc-item-header">
                  <div className="nec-doc-badges">
                    <span className="nec-doc-sport-badge">{doc.sport_name}</span>
                    <span className="nec-doc-dept-badge">{doc.department_code}</span>
                    <span className="nec-doc-version-badge">v{doc.version || 1}</span>
                  </div>
                  <Badge status="success">Verified Signed</Badge>
                </div>

                <div className="nec-doc-item-body">
                  <h4 className="nec-doc-title">
                    {doc.title || `${doc.sport_name} - ${doc.department_code} Signed OD`}
                  </h4>
                  {doc.tournament_name && (
                    <div className="nec-doc-meta-row">
                      <Trophy size={13} /> {doc.tournament_name}
                    </div>
                  )}
                  <div className="nec-doc-meta-row">
                    <Building size={13} /> {doc.department_name || doc.department_code}
                  </div>
                  <div className="nec-doc-meta-sub">
                    <span>Academic Year: {doc.academic_year}</span>
                    <span>·</span>
                    <span>Uploaded: {new Date(doc.created_at).toLocaleDateString("en-IN")}</span>
                    {doc.file_size && (
                      <>
                        <span>·</span>
                        <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="nec-doc-item-footer">
                  <Button
                    variant="link"
                    size="sm"
                    icon={Eye}
                    onClick={() => setPreviewDoc(doc)}
                  >
                    View PDF
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(doc.document_id)}
                    title="Archive Document"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Section 3: In-Browser PDF Preview Modal ────────────────────── */}
      {previewDoc && (
        <div className="nec-modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div
            className="nec-pdf-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="nec-pdf-modal-header">
              <div>
                <h3 className="nec-pdf-modal-title">
                  {previewDoc.sport_name} - {previewDoc.department_code} Official OD Letter (v{previewDoc.version || 1})
                </h3>
                <span className="nec-pdf-modal-subtitle">
                  {previewDoc.tournament_name || "Principal Approved Document"} · {previewDoc.academic_year}
                </span>
              </div>
              <button
                className="nec-modal-close-btn"
                onClick={() => setPreviewDoc(null)}
                aria-label="Close PDF Viewer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="nec-pdf-modal-body">
              <iframe
                src={`${API_BASE_URL}/api/od/public/official-documents/${previewDoc.document_id}/view`}
                title={`Official OD PDF - ${previewDoc.sport_name} ${previewDoc.department_code}`}
                className="nec-pdf-iframe"
              />
            </div>

            <div className="nec-pdf-modal-footer">
              <span className="nec-pdf-verification-notice">
                <CheckCircle size={15} style={{ color: "#10b981", verticalAlign: "middle", marginRight: "4px" }} />
                Officially verified Principal-signed OD letter on record.
              </span>
              <a
                href={`${API_BASE_URL}/api/od/public/official-documents/${previewDoc.document_id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="nec-btn nec-btn-primary nec-btn-sm"
                style={{ textDecoration: "none" }}
              >
                Open in New Tab / Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
