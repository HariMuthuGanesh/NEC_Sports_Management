import React, { useState, useEffect, useMemo, useCallback } from "react";
import { odApi, sportsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import {
  FileCheck,
  FileText,
  Search,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  ArrowUpDown,
  X,
  Trophy,
  Filter,
  CheckCircle,
  Eye,
  Download,
  Layers,
  Users,
  AlertCircle
} from "lucide-react";
import "./PublicOdList.css";
import "./PublicPortal.css";
import "../coordinator/CoordinatorPortal.css";
import "../../components/od/OfficialOd.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper for formatting date strings cleanly
function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "-";
  }
}

export default function PublicOdList({ onNavigate, initialSport = null }) {
  // Main view mode: "official_letters" (Principal signed verification) vs "student_directory"
  const [viewMode, setViewMode] = useState("official_letters");

  // ── Official Signed OD Documents state ──────────────────────────────────
  const [officialDocs, setOfficialDocs] = useState([]);
  const [loadingOfficialDocs, setLoadingOfficialDocs] = useState(true);
  const [officialDocsError, setOfficialDocsError] = useState(null);

  // Filters for Official Documents
  const [docSportFilter, setDocSportFilter] = useState("ALL");
  const [docDeptFilter, setDocDeptFilter] = useState("ALL");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // In-browser PDF preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // ── Student OD Directory state ──────────────────────────────────────────
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [sportsError, setSportsError] = useState(null);

  const [selectedSport, setSelectedSport] = useState(initialSport);
  const [sportSearch, setSportSearch] = useState("");
  const [showOnlyWithRecords, setShowOnlyWithRecords] = useState(false);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState(null);

  const [studentDeptFilter, setStudentDeptFilter] = useState("ALL");
  const [nameSearch, setNameSearch] = useState("");
  const [sortDirection, setSortDirection] = useState("ASC");

  // Master departments & sports list for filters
  const [allDepartments, setAllDepartments] = useState([]);

  // Fetch official signed OD documents
  const fetchOfficialDocuments = useCallback(async () => {
    setLoadingOfficialDocs(true);
    setOfficialDocsError(null);
    try {
      const res = await odApi.getPublicOfficialDocs();
      const list = Array.isArray(res) ? res : res?.data || [];
      setOfficialDocs(list);
    } catch (err) {
      console.error("[PublicOdList] fetchOfficialDocuments error:", err);
      setOfficialDocsError(err.message || "Unable to load official signed OD documents.");
    } finally {
      setLoadingOfficialDocs(false);
    }
  }, []);

  // Fetch sports summary for student directory
  const fetchSportsSummary = useCallback(async () => {
    setLoadingSports(true);
    setSportsError(null);
    try {
      const res = await odApi.getPublicOdSports();
      const list = Array.isArray(res) ? res : res?.data || [];
      setSports(list);
    } catch (err) {
      console.error("[PublicOdList] fetchSportsSummary error:", err);
      setSportsError(err.message || "Unable to load sports list.");
    } finally {
      setLoadingSports(false);
    }
  }, []);

  // Fetch departments list
  useEffect(() => {
    sportsApi.getDepartments()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setAllDepartments(list);
      })
      .catch((err) => {
        console.warn("[PublicOdList] Could not fetch departments:", err);
      });
  }, []);

  // Initial loads
  useEffect(() => {
    fetchOfficialDocuments();
    fetchSportsSummary();
  }, [fetchOfficialDocuments, fetchSportsSummary]);

  // Fetch student records when a sport is selected in directory view
  const fetchSportStudents = useCallback(async (sportItem) => {
    if (!sportItem) return;
    setLoadingStudents(true);
    setStudentsError(null);
    try {
      const res = await odApi.getPublicOdList({
        sport: sportItem.sport_name || sportItem.name,
        sort: sortDirection
      });
      const list = Array.isArray(res) ? res : res?.data || [];
      setStudents(list);
    } catch (err) {
      console.error("[PublicOdList] fetchSportStudents error:", err);
      setStudentsError(err.message || "Failed to load student OD records.");
    } finally {
      setLoadingStudents(false);
    }
  }, [sortDirection]);

  useEffect(() => {
    if (selectedSport && viewMode === "student_directory") {
      fetchSportStudents(selectedSport);
    }
  }, [selectedSport, viewMode, fetchSportStudents]);

  // ── Derived Options for Official Documents ──────────────────────────────
  const availableDocSports = useMemo(() => {
    const set = new Set(officialDocs.map((d) => d.sport_name).filter(Boolean));
    return Array.from(set).sort();
  }, [officialDocs]);

  const availableDocDepartments = useMemo(() => {
    const map = new Map();
    officialDocs.forEach((d) => {
      if (d.department_code && !map.has(d.department_code)) {
        map.set(d.department_code, d.department_name || d.department_code);
      }
    });
    allDepartments.forEach((d) => {
      if (d.code && !map.has(d.code)) {
        map.set(d.code, d.name || d.code);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [officialDocs, allDepartments]);

  // Filtered official documents
  const filteredOfficialDocs = useMemo(() => {
    return officialDocs.filter((d) => {
      if (docSportFilter !== "ALL" && d.sport_name !== docSportFilter) return false;
      if (docDeptFilter !== "ALL" && d.department_code !== docDeptFilter) return false;
      if (!docSearchQuery.trim()) return true;
      const q = docSearchQuery.toLowerCase();
      return (
        d.sport_name?.toLowerCase().includes(q) ||
        d.department_code?.toLowerCase().includes(q) ||
        d.department_name?.toLowerCase().includes(q) ||
        d.tournament_name?.toLowerCase().includes(q) ||
        d.title?.toLowerCase().includes(q)
      );
    });
  }, [officialDocs, docSportFilter, docDeptFilter, docSearchQuery]);

  // Filtered sports for Student Directory
  const filteredSports = useMemo(() => {
    return sports.filter((s) => {
      const nameMatch = (s.sport_name || s.name || "").toLowerCase().includes(sportSearch.toLowerCase().trim());
      if (showOnlyWithRecords) {
        return nameMatch && Number(s.approved_count) > 0;
      }
      return nameMatch;
    });
  }, [sports, sportSearch, showOnlyWithRecords]);

  // Filtered students for selected sport
  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (studentDeptFilter && studentDeptFilter !== "ALL") {
      result = result.filter((st) => {
        const code = (st.department_code || "").toUpperCase();
        const name = (st.department_name || "").toUpperCase();
        const target = studentDeptFilter.toUpperCase();
        return code === target || name === target;
      });
    }
    if (nameSearch.trim()) {
      const q = nameSearch.toLowerCase().trim();
      result = result.filter((st) =>
        (st.student_name || "").toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const nameA = (a.student_name || "").toLowerCase();
      const nameB = (b.student_name || "").toLowerCase();
      return sortDirection === "DESC" ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
    });
    return result;
  }, [students, studentDeptFilter, nameSearch, sortDirection]);

  return (
    <div className="nec-portal-page nec-od-portal">
      {/* ── Page Header & Institutional Identity ─────────────────────────── */}
      <div className="nec-od-header">
        <div className="nec-od-title-row">
          <h1 className="nec-od-header-title">
            <ShieldCheck size={28} color="var(--nec-primary, #1e40af)" />
            Official On Duty (OD) Verification Portal
          </h1>
          <span className="nec-od-header-subtitle">
            National Engineering College · Office of Physical Education & Principal Approval
          </span>
        </div>
      </div>

      {/* ── Top Primary Mode Switcher ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
        <Button
          variant={viewMode === "official_letters" ? "primary" : "ghost"}
          icon={FileCheck}
          onClick={() => {
            setViewMode("official_letters");
            setSelectedSport(null);
          }}
        >
          Official Signed OD Letters (Principal Approved)
        </Button>
        <Button
          variant={viewMode === "student_directory" ? "primary" : "ghost"}
          icon={Users}
          onClick={() => setViewMode("student_directory")}
        >
          Approved Student Athletes Directory
        </Button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          MODE 1: OFFICIAL SIGNED OD LETTERS (SPORT-WISE & DEPT-WISE)
          ═════════════════════════════════════════════════════════════════════ */}
      {viewMode === "official_letters" && (
        <div className="nec-official-letters-section">
          {/* Instruction & Filter Banner */}
          <div
            style={{
              padding: "16px 20px",
              background: "var(--nec-surface)",
              border: "1.5px solid var(--nec-border)",
              borderRadius: "var(--nec-radius-lg)",
              marginBottom: "20px",
              boxShadow: "var(--nec-shadow-sm)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
              <strong style={{ fontSize: "1rem", color: "var(--nec-text-main)" }}>
                Department Staff & Faculty OD Verification
              </strong>
              <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
                Select a Sport and Department below to verify the official Principal-signed OD letter issued for participating athletes.
              </span>
            </div>

            {/* Sport and Department Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                alignItems: "center"
              }}
            >
              {/* Sport Selector */}
              <div className="nec-form-group">
                <label className="nec-form-label">Filter by Sport</label>
                <select
                  className="nec-select-field"
                  value={docSportFilter}
                  onChange={(e) => setDocSportFilter(e.target.value)}
                >
                  <option value="ALL">All Sports ({availableDocSports.length})</option>
                  {availableDocSports.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selector */}
              <div className="nec-form-group">
                <label className="nec-form-label">Filter by Department</label>
                <select
                  className="nec-select-field"
                  value={docDeptFilter}
                  onChange={(e) => setDocDeptFilter(e.target.value)}
                >
                  <option value="ALL">All Departments</option>
                  {availableDocDepartments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="nec-form-group">
                <label className="nec-form-label">Search Keywords</label>
                <div className="nec-search-input-wrapper" style={{ maxWidth: "100%" }}>
                  <Search size={15} className="nec-search-icon" />
                  <input
                    type="text"
                    className="nec-search-input"
                    placeholder="Search tournament, title, or reference..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documents Grid */}
          {loadingOfficialDocs ? (
            <SkeletonLoader rows={4} />
          ) : officialDocsError ? (
            <PublicInfoCard
              icon={AlertCircle}
              title="Verification Service Error"
              message={officialDocsError}
              actionText="Retry"
              onAction={fetchOfficialDocuments}
            />
          ) : filteredOfficialDocs.length === 0 ? (
            <PublicInfoCard
              icon={FileText}
              title="No Official OD Letters Found"
              message={
                docSportFilter !== "ALL" || docDeptFilter !== "ALL" || docSearchQuery
                  ? `No Principal-signed OD letter matches the selected filters (${docSportFilter !== "ALL" ? docSportFilter : ""} ${docDeptFilter !== "ALL" ? docDeptFilter : ""}).`
                  : "No official signed OD letters have been uploaded yet."
              }
              variant="flat"
            />
          ) : (
            <div className="nec-official-docs-grid">
              {filteredOfficialDocs.map((doc) => (
                <div key={doc.document_id} className="nec-official-doc-item">
                  <div className="nec-doc-item-header">
                    <div className="nec-doc-badges">
                      <span className="nec-doc-sport-badge">{doc.sport_name}</span>
                      <span className="nec-doc-dept-badge">{doc.department_code}</span>
                      <span className="nec-doc-version-badge">v{doc.version || 1}</span>
                    </div>
                    <Badge status="success">
                      <ShieldCheck size={12} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                      Principal Signed
                    </Badge>
                  </div>

                  <div className="nec-doc-item-body">
                    <h4 className="nec-doc-title">
                      {doc.title || `${doc.sport_name} - ${doc.department_code} Official OD Letter`}
                    </h4>
                    {doc.tournament_name && (
                      <div className="nec-doc-meta-row">
                        <Trophy size={13} style={{ color: "var(--nec-blue-accent, #1d4ed8)" }} />
                        <span>{doc.tournament_name}</span>
                      </div>
                    )}
                    <div className="nec-doc-meta-row">
                      <Building size={13} />
                      <span>{doc.department_name || doc.department_code}</span>
                    </div>
                    <div className="nec-doc-meta-sub">
                      <span>Academic Year: <strong>{doc.academic_year}</strong></span>
                      <span>·</span>
                      <span>Uploaded: {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="nec-doc-item-footer">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewDoc(doc)}
                      style={{ width: "100%" }}
                    >
                      View & Verify Official Signed PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODE 2: APPROVED STUDENT ATHLETES DIRECTORY
          ═════════════════════════════════════════════════════════════════════ */}
      {viewMode === "student_directory" && (
        <div className="nec-student-directory-section">
          {!selectedSport ? (
            <>
              {/* Search Bar for Sports */}
              <div className="nec-od-search-bar-wrap">
                <div className="nec-od-search-input-box">
                  <Search size={18} color="var(--nec-text-muted, #94a3b8)" />
                  <input
                    type="text"
                    className="nec-od-search-input"
                    placeholder="Search sports by name (e.g. Cricket, Football, Volleyball)..."
                    value={sportSearch}
                    onChange={(e) => setSportSearch(e.target.value)}
                  />
                  {sportSearch && (
                    <button className="nec-od-clear-btn" onClick={() => setSportSearch("")}>
                      <X size={15} />
                    </button>
                  )}
                </div>

                <label className="nec-od-filter-toggle">
                  <input
                    type="checkbox"
                    checked={showOnlyWithRecords}
                    onChange={(e) => setShowOnlyWithRecords(e.target.checked)}
                  />
                  <span>Show only sports with approved ODs</span>
                </label>
              </div>

              {/* Sports Grid */}
              {loadingSports ? (
                <SkeletonLoader rows={3} type="cards" />
              ) : sportsError ? (
                <PublicInfoCard
                  icon={AlertCircle}
                  title="Error Loading Sports"
                  message={sportsError}
                  actionText="Retry"
                  onAction={fetchSportsSummary}
                />
              ) : filteredSports.length === 0 ? (
                <PublicInfoCard
                  icon={Search}
                  title="No Sports Found"
                  message={
                    sportSearch
                      ? `No sports match "${sportSearch}".`
                      : "No sports available."
                  }
                />
              ) : (
                <div className="nec-od-sports-grid">
                  {filteredSports.map((sp) => {
                    const approvedN = Number(sp.approved_count || 0);
                    return (
                      <div
                        key={sp.sport_id || sp.id || sp.sport_name}
                        className="nec-od-sport-card"
                        onClick={() => {
                          setSelectedSport(sp);
                          setStudentDeptFilter("ALL");
                          setNameSearch("");
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedSport(sp)}
                      >
                        <div className="nec-od-sport-card-header">
                          <div className="nec-od-sport-icon-box">
                            <Trophy size={20} color="var(--nec-navy)" />
                          </div>
                          <span className={`nec-od-sport-count-badge ${approvedN > 0 ? "has-records" : ""}`}>
                            {approvedN} Student{approvedN !== 1 ? "s" : ""} Approved
                          </span>
                        </div>
                        <h3 className="nec-od-sport-name">{sp.sport_name || sp.name}</h3>
                        <div className="nec-od-sport-card-footer">
                          <span>View Approved Roster</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Sport-Specific Student List */}
              <div className="nec-od-detail-header">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ArrowLeft}
                  onClick={() => setSelectedSport(null)}
                >
                  Back to All Sports
                </Button>
                <div className="nec-od-detail-title-block">
                  <h2 className="nec-od-detail-sport-title">
                    {selectedSport.sport_name || selectedSport.name} OD Records
                  </h2>
                  <span className="nec-od-detail-badge">
                    {filteredStudents.length} Approved Student{filteredStudents.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Department and Name Filters */}
              <div className="nec-od-filter-panel">
                <div className="nec-od-filter-group">
                  <Building size={16} />
                  <select
                    className="nec-od-dept-select"
                    value={studentDeptFilter}
                    onChange={(e) => setStudentDeptFilter(e.target.value)}
                  >
                    <option value="ALL">All Departments</option>
                    {availableDocDepartments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="nec-od-search-student-box">
                  <Search size={15} />
                  <input
                    type="text"
                    className="nec-od-student-search-input"
                    placeholder="Search student by name..."
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                  />
                </div>

                <Button variant="ghost" size="sm" icon={ArrowUpDown} onClick={() => setSortDirection(p => p === "ASC" ? "DESC" : "ASC")}>
                  {sortDirection === "ASC" ? "A to Z" : "Z to A"}
                </Button>
              </div>

              {/* Students Table */}
              {loadingStudents ? (
                <SkeletonLoader rows={4} />
              ) : filteredStudents.length === 0 ? (
                <PublicInfoCard
                  icon={Search}
                  title="No Student Records Found"
                  message="No approved student OD records match your current filters."
                />
              ) : (
                <div className="nec-table-container">
                  <table className="nec-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Reg No</th>
                        <th>Department</th>
                        <th>Tournament / Event</th>
                        <th>Dates</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st, i) => (
                        <tr key={st.request_id || i}>
                          <td><strong>{st.student_name}</strong></td>
                          <td>{st.register_number || "-"}</td>
                          <td>
                            <span className="nec-doc-dept-badge">{st.department_code || "-"}</span>
                          </td>
                          <td>{st.tournament_name || "-"}</td>
                          <td>{formatDate(st.from_date)} {st.from_date !== st.to_date ? `to ${formatDate(st.to_date)}` : ""}</td>
                          <td>{st.total_days || 1} day(s)</td>
                          <td>
                            <Badge status="success">Approved</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── In-Browser Official Signed PDF Modal Viewer ────────────────── */}
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
                  {previewDoc.tournament_name || "Principal Approved Document"} · Academic Year: {previewDoc.academic_year}
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
                Authentic Principal-signed document on record. Publicly verifiable.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <a
                  href={`${API_BASE_URL}/api/od/public/official-documents/${previewDoc.document_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nec-btn nec-btn-primary nec-btn-sm"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Download size={14} /> Open in New Tab / Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
