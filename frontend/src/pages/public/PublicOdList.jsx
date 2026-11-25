import React, { useState, useEffect, useMemo, useCallback } from "react";
import { odApi, sportsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import {
  Search, ShieldCheck, Building,
  Calendar, X, Trophy, CheckCircle,
  AlertCircle, Eye, ExternalLink, Lock
} from "lucide-react";
import "./PublicOdList.css";
import "./PublicPortal.css";
import "../../components/od/OfficialOd.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "-";
  }
}

export default function PublicOdList() {
  const [officialDocs, setOfficialDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [docSportFilter, setDocSportFilter] = useState("ALL");
  const [docDeptFilter, setDocDeptFilter] = useState("ALL");
  const [docYearFilter, setDocYearFilter] = useState("ALL");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // In-browser PDF preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Master departments & sports list for filters
  const [sportsList, setSportsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Fetch official signed OD documents
  const fetchOfficialDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsRes, sportsRes, deptsRes] = await Promise.all([
        odApi.getPublicOfficialDocs(),
        sportsApi.getSports().catch(() => []),
        sportsApi.getDepartments().catch(() => [])
      ]);

      const list = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
      setOfficialDocs(list);
      setSportsList(Array.isArray(sportsRes) ? sportsRes : sportsRes?.data || []);
      setDepartmentsList(Array.isArray(deptsRes) ? deptsRes : deptsRes?.data || []);
    } catch (err) {
      console.error("[PublicOdList] fetchOfficialDocuments error:", err);
      setError(err.message || "Unable to load official signed OD documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOfficialDocuments();
  }, [fetchOfficialDocuments]);

  // Distinct academic years
  const academicYears = useMemo(() => {
    const set = new Set();
    officialDocs.forEach(d => {
      if (d.academic_year) set.add(d.academic_year);
    });
    return Array.from(set).sort().reverse();
  }, [officialDocs]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return officialDocs.filter(doc => {
      if (docSportFilter !== "ALL") {
        const matchesSport =
          String(doc.sport_id) === docSportFilter ||
          (doc.sport_name || "").toLowerCase() === docSportFilter.toLowerCase();
        if (!matchesSport) return false;
      }

      if (docDeptFilter !== "ALL") {
        const matchesDept =
          String(doc.department_id) === docDeptFilter ||
          (doc.department_code || "").toLowerCase() === docDeptFilter.toLowerCase();
        if (!matchesDept) return false;
      }

      if (docYearFilter !== "ALL" && doc.academic_year !== docYearFilter) {
        return false;
      }

      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase().trim();
        const title = (doc.title || "").toLowerCase();
        const sport = (doc.sport_name || "").toLowerCase();
        const dept = (doc.department_name || doc.department_code || "").toLowerCase();
        const tour = (doc.tournament_name || "").toLowerCase();
        const ref = (doc.reference_number || `OD-${doc.id}`).toLowerCase();

        if (!title.includes(q) && !sport.includes(q) && !dept.includes(q) && !tour.includes(q) && !ref.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [officialDocs, docSportFilter, docDeptFilter, docYearFilter, docSearchQuery]);

  return (
    <div className="nec-portal-page nec-public-od-verification">
      {/* Institutional Verification Header */}
      <div className="nec-portal-header" style={{
        background: "linear-gradient(135deg, #091a2e 0%, #0d2e52 60%, #154c82 100%)",
        color: "#fff",
        padding: "36px 32px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f5c451", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}>
          <ShieldCheck size={18} /> OFFICIAL INSTITUTIONAL VERIFICATION PORTAL
        </div>
        <h1 style={{ margin: 0, fontSize: "2.1rem", fontFamily: "var(--nec-font-display)", fontWeight: 800 }}>
          On Duty (OD) Letter Verification
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.88)", maxWidth: "800px", fontSize: "0.98rem", lineHeight: 1.6 }}>
          Authorized verification repository for Principal-signed and Directorate-approved On Duty letters. External universities, examination cells, academic departments, and event organizers can independently verify official participation credentials.
        </p>

        {/* Privacy Notice Banner */}
        <div style={{
          marginTop: "12px",
          padding: "10px 16px",
          background: "rgba(245, 196, 81, 0.12)",
          borderRadius: "10px",
          border: "1px solid rgba(245, 196, 81, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "0.82rem",
          color: "rgba(255,255,255,0.92)"
        }}>
          <Lock size={15} style={{ color: "#f5c451", flexShrink: 0 }} />
          <span>
            <strong>Student Data Protection:</strong> Individual student personal details and raw attendance rosters are protected under institutional privacy policy and accessible strictly to authorized coordinators and student portal logins.
          </span>
        </div>
      </div>

      {/* Filter and Verification Search Toolbar */}
      <Card style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Reference Search */}
          <div style={{ position: "relative", minWidth: "280px", flex: "1 1 300px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
            <input
              type="text"
              placeholder="Search by reference number, tournament, sport, or department..."
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.88rem"
              }}
            />
            {docSearchQuery && (
              <button
                type="button"
                onClick={() => setDocSearchQuery("")}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--nec-text-muted)" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            {/* Sport Filter */}
            <select
              value={docSportFilter}
              onChange={(e) => setDocSportFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              <option value="ALL">All Sports</option>
              {sportsList.map(s => (
                <option key={s.sport_id || s.id} value={s.name || s.sport_id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={docDeptFilter}
              onChange={(e) => setDocDeptFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map(d => (
                <option key={d.id} value={d.code || d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            {/* Academic Year Filter */}
            {academicYears.length > 0 && (
              <select
                value={docYearFilter}
                onChange={(e) => setDocYearFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--nec-border)",
                  background: "var(--nec-surface)",
                  color: "var(--nec-text-main)",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                <option value="ALL">All Academic Years</option>
                {academicYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            )}

            {(docSearchQuery || docSportFilter !== "ALL" || docDeptFilter !== "ALL" || docYearFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDocSearchQuery("");
                  setDocSportFilter("ALL");
                  setDocDeptFilter("ALL");
                  setDocYearFilter("ALL");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Official Documents List */}
      {loading ? (
        <SkeletonLoader rows={5} type="cards" />
      ) : error ? (
        <PublicInfoCard
          icon={AlertCircle}
          title="Error Loading Verification Records"
          message={error}
          actionText="Retry"
          onAction={fetchOfficialDocuments}
        />
      ) : filteredDocs.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <ShieldCheck size={48} style={{ color: "var(--nec-gold)", margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 8px", color: "var(--nec-text-main)" }}>No Verified Documents Found</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", maxWidth: "480px", marginInline: "auto" }}>
            No signed OD letters match your current filter or reference number search. Clear your filters to browse all verified records.
          </p>
          <div style={{ marginTop: "20px" }}>
            <Button variant="secondary" onClick={() => { setDocSearchQuery(""); setDocSportFilter("ALL"); setDocDeptFilter("ALL"); }}>
              Show All Verified Letters
            </Button>
          </div>
        </Card>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "18px"
        }}>
          {filteredDocs.map(doc => {
            const docId = doc.id || doc.document_id;
            const refNumber = doc.reference_number || `NEC/OD/${doc.academic_year || "2025-26"}/${String(docId).padStart(4, "0")}`;

            return (
              <div
                key={docId}
                className="nec-doc-item-card"
                style={{
                  borderRadius: "14px",
                  border: "1px solid var(--nec-border)",
                  background: "var(--nec-surface)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  boxShadow: "var(--nec-shadow-sm)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  {/* Top Badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", minHeight: "26px" }}>
                    <Badge variant="primary" style={{ background: "#1e3a8a", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}>
                      {doc.sport_name || "Athletics"}
                    </Badge>
                    <Badge variant="success" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem" }}>
                      <CheckCircle size={11} /> Verified Signed Order
                    </Badge>
                  </div>

                  {/* Title & Ref */}
                  <h4 style={{
                    margin: "0 0 6px",
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "var(--nec-text-main)",
                    lineHeight: 1.35,
                    minHeight: "2.9rem",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {doc.title || `${doc.sport_name} - ${doc.department_code} Official OD Letter`}
                  </h4>

                  <div style={{
                    fontSize: "0.78rem",
                    color: "var(--nec-blue-accent)",
                    fontWeight: 700,
                    marginBottom: "12px",
                    fontFamily: "monospace"
                  }}>
                    Ref: {refNumber}
                  </div>

                  {/* Metadata */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "0.82rem",
                    color: "var(--nec-text-muted)",
                    marginBottom: "16px",
                    flex: 1
                  }}>
                    {doc.tournament_name && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <Trophy size={14} style={{ color: "var(--nec-gold)", flexShrink: 0, marginTop: "2px" }} />
                        <span style={{ lineHeight: 1.4 }}>{doc.tournament_name}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <Building size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ lineHeight: 1.4 }}>Department: <strong>{doc.department_name || doc.department_code}</strong></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <Calendar size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ lineHeight: 1.4 }}>Academic Year: <strong>{doc.academic_year}</strong> • Signed: {formatDate(doc.uploaded_at || doc.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <ShieldCheck size={14} style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ lineHeight: 1.4 }}>Authority: <strong>Principal & Director of Physical Education</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={{
                  borderTop: "1px solid var(--nec-border)",
                  paddingTop: "14px",
                  marginTop: "auto"
                }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Eye}
                    onClick={() => setPreviewDoc(doc)}
                    style={{ width: "100%", fontWeight: 700 }}
                  >
                    View & Verify Signed Document
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Document Preview & Verification Modal */}
      {previewDoc && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }} onClick={() => setPreviewDoc(null)}>
          <div style={{
            background: "var(--nec-surface)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "920px",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
            border: "1px solid var(--nec-border)"
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, #091a2e 0%, #0d2e52 100%)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <ShieldCheck size={16} style={{ color: "#f5c451" }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f5c451" }}>
                    AUTHENTICATED INSTITUTIONAL RECORD
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                  {previewDoc.title || `${previewDoc.sport_name} - ${previewDoc.department_code} Official OD Letter`}
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={`${API_BASE_URL}/api/od/public/official-documents/${previewDoc.id || previewDoc.document_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textDecoration: "none"
                  }}
                >
                  <ExternalLink size={13} /> Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: PDF Iframe */}
            <div style={{ flex: "1 1 auto", background: "#334155", position: "relative" }}>
              <iframe
                src={`${API_BASE_URL}/api/od/public/official-documents/${previewDoc.id || previewDoc.document_id}/view`}
                title="Official OD Document"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "12px 20px",
              background: "var(--nec-surface-raised)",
              borderTop: "1px solid var(--nec-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.8rem",
              color: "var(--nec-text-muted)"
            }}>
              <div>
                Verified Signatories: <strong>Principal • Director of Physical Education</strong>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
