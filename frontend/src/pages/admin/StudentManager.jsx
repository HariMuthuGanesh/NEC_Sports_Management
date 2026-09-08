import React, { useEffect, useState } from "react";
import { playersApi, sportsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import {
  Filter, Plus, Mail, Phone, CheckCircle2, AlertCircle, X,
  Database, Activity, ShieldCheck, ShieldOff, Clock
} from "lucide-react";
import "./AdminPortal.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const ACADEMIC_YEARS = ["1st Year", "2nd Year", "3rd Year", "Final Year"];
const STUDENT_TYPES = ["Day-Scholar", "Hosteller"];

// ── Attendance badge: colour by eligibility threshold ─────────────────────────
function AttendanceBadge({ pct }) {
  if (pct === null || pct === undefined || pct === "") {
    return <span style={{ color: "var(--nec-text-muted)", fontSize: "0.8rem" }}>No data</span>;
  }
  const num = parseFloat(pct);
  const color = num >= 75 ? "#10b981" : num >= 60 ? "#f59e0b" : "#ef4444";
  const bg    = num >= 75 ? "#ecfdf5" : num >= 60 ? "#fffbeb" : "#fef2f2";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      background: bg, color, fontWeight: 700,
      padding: "2px 8px", borderRadius: "999px", fontSize: "0.8rem"
    }}>
      <Activity size={11} />
      {num.toFixed(1)}%
    </span>
  );
}

// ── Sports eligibility badge ──────────────────────────────────────────────────
function EligibilityBadge({ status }) {
  if (status === "eligible")
    return (
      <Badge status="success">
        <ShieldCheck size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
        Eligible
      </Badge>
    );
  if (status === "registered")
    return (
      <Badge status="warning">
        <Clock size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
        Low Attendance
      </Badge>
    );
  return (
    <Badge status="default">
      <ShieldOff size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
      Not Registered
    </Badge>
  );
}

// ── Data source chip ──────────────────────────────────────────────────────────
function SourceChip({ source }) {
  const isIms = source === "ims";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "3px",
      background: isIms ? "#eff6ff" : "#f8fafc",
      color: isIms ? "#3b82f6" : "#64748b",
      border: `1px solid ${isIms ? "#bfdbfe" : "#e2e8f0"}`,
      padding: "1px 6px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600
    }}>
      <Database size={9} />
      {isIms ? "IMS" : "Sports DB"}
    </span>
  );
}

export default function StudentManager() {
  const [students, setStudents]           = useState([]);
  const [departments, setDepartments]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [dataSource, setDataSource]       = useState(null);   // 'ims' | 'sportsdb'
  const [imsPopulated, setImsPopulated]   = useState(null);   // boolean | null

  // Modal & Form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [formError, setFormError]           = useState(null);
  const [formSuccess, setFormSuccess]       = useState(null);

  // Filter
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const initialFormState = {
    name: "", rollNo: "", departmentCode: "",
    year: "3rd Year", section: "A",
    email: "", phone: "", bloodGroup: "O+", studentType: "Day-Scholar"
  };
  const [formData, setFormData] = useState(initialFormState);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      playersApi.getAllPlayers ? playersApi.getAllPlayers() : Promise.resolve({ data: [], meta: {} }),
      sportsApi.getDepartments ? sportsApi.getDepartments() : Promise.resolve([])
    ])
      .then(([studentsResp, deptsData]) => {
        // playersApi may return a raw array (old shape) or { data, meta } (new IMS shape)
        const studentArray = Array.isArray(studentsResp)
          ? studentsResp
          : (studentsResp?.data ?? []);
        const meta = (!Array.isArray(studentsResp) && studentsResp?.meta) ? studentsResp.meta : {};

        setStudents(studentArray);
        setDataSource(meta.source ?? (Array.isArray(studentsResp) ? "sportsdb" : null));
        setImsPopulated(meta.imsPopulated ?? null);

        const depts = Array.isArray(deptsData) ? deptsData : [];
        setDepartments(depts);
        if (depts.length > 0 && !formData.departmentCode) {
          setFormData(prev => ({ ...prev, departmentCode: depts[0].code || "CSE" }));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load student directory");
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setFormData({ ...initialFormState, departmentCode: departments[0]?.code || "CSE" });
    setIsAddModalOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmitStudent = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormError("Student Full Name is required."); return; }
    if (!formData.rollNo.trim()) { setFormError("Roll Number / Registration Number is required."); return; }

    setSubmitting(true);
    setFormError(null);
    try {
      await playersApi.createStudent({
        name: formData.name.trim(),
        rollNo: formData.rollNo.trim(),
        departmentCode: formData.departmentCode || "CSE",
        year: formData.year,
        section: formData.section.trim() || "A",
        email: formData.email.trim() || `${formData.rollNo.trim().toLowerCase()}@nec.edu.in`,
        phone: formData.phone.trim() || "9876543210",
        bloodGroup: formData.bloodGroup,
        studentType: formData.studentType
      });
      setFormSuccess("Student athlete registered successfully.");
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess(null);
        loadData();
      }, 750);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to register student athlete.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filter (handles both IMS deptCode field and sportsdb dept/deptCode fields) ──
  const displayedStudents = selectedDeptFilter === "ALL"
    ? students
    : students.filter(s =>
        (s.deptCode || s.department_code || s.dept || "")
          .toUpperCase() === selectedDeptFilter.toUpperCase()
      );

  // ── IMS-enriched columns ────────────────────────────────────────────────────
  const imsColumns = [
    {
      key: "register_number",
      label: "Register No.",
      width: "150px",
      render: (val, row) => (
        <div>
          <strong style={{ fontSize: "0.9rem", fontFamily: "monospace" }}>
            {val || row.studentId || row.rollNo || "—"}
          </strong>
          <div style={{ marginTop: "3px" }}>
            <SourceChip source={row.dataSource || "ims"} />
          </div>
        </div>
      )
    },
    {
      key: "name",
      label: "Student",
      render: (val, row) => (
        <div>
          <strong style={{ fontSize: "0.925rem" }}>{val || row.student_name || "Unnamed"}</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "2px" }}>
            <Mail size={11} style={{ verticalAlign: "middle", marginRight: "3px" }} />
            {row.email || row.personal_email || "No email"}
          </div>
          {(row.phone || row.personal_phone) && (
            <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
              <Phone size={11} style={{ verticalAlign: "middle", marginRight: "3px" }} />
              {row.phone || row.personal_phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: "gender",
      label: "Gender",
      width: "90px",
      render: (val) => val
        ? <Badge status={val === "Male" ? "info" : val === "Female" ? "warning" : "default"}>{val}</Badge>
        : <span style={{ color: "var(--nec-text-muted)", fontSize: "0.8rem" }}>—</span>
    },
    {
      key: "dept",
      label: "Dept",
      width: "90px",
      render: (val, row) => (
        <strong>{row.deptCode || row.department_code || val || row.imsRawDept || "—"}</strong>
      )
    },
    {
      key: "batchYears",
      label: "Programme",
      width: "140px",
      render: (val, row) => (
        <div style={{ fontSize: "0.82rem" }}>
          {row.degree && <div style={{ fontWeight: 600 }}>{row.degree}</div>}
          <div style={{ color: "var(--nec-text-muted)" }}>{val || row.batchYear || row.year || "—"}</div>
        </div>
      )
    },
    {
      key: "attendancePct",
      label: "Attendance",
      width: "115px",
      render: (val) => <AttendanceBadge pct={val} />
    },
    {
      key: "sportsEligibility",
      label: "Sports Status",
      width: "145px",
      render: (val) => <EligibilityBadge status={val || "not_registered"} />
    }
  ];

  // ── Sportsdb fallback columns (existing data shape) ─────────────────────────
  const sportsdbColumns = [
    {
      key: "studentId",
      label: "Student ID (NEC IMS)",
      width: "160px",
      render: (val, row) => <strong>{val || row.rollNo || "—"}</strong>
    },
    {
      key: "name",
      label: "Student Name",
      render: (val, row) => (
        <div>
          <strong style={{ fontSize: "0.925rem" }}>{val || row.student_name || "Unnamed"}</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
            <Mail size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
            {row.email || row.personal_email || "No email"}
          </div>
        </div>
      )
    },
    {
      key: "dept",
      label: "Department",
      width: "130px",
      render: (val, row) => <strong>{val || row.deptCode || row.department_name || "—"}</strong>
    },
    {
      key: "year",
      label: "Academic Year",
      width: "120px",
      render: (val, row) => <span>{val || row.batch || "—"}</span>
    },
    {
      key: "phone",
      label: "Contact Phone",
      width: "140px",
      render: (val, row) => <span>{val || row.personal_phone || "—"}</span>
    },
    {
      key: "status",
      label: "Athletic Status",
      width: "140px",
      render: () => <Badge status="success">Verified Athlete ✓</Badge>
    }
  ];

  const columns = dataSource === "ims" ? imsColumns : sportsdbColumns;

  // ── IMS-connected-but-empty banner ────────────────────────────────────────
  const showImsBanner = imsPopulated === false && dataSource !== "ims";

  return (
    <div className="nec-portal-page">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Student Directory</h1>
          <p className="nec-page-desc">
            Manage enrolled student athletes across all departments — IMS-integrated profiles with live attendance and sports eligibility.
            {dataSource === "ims" && (
              <span style={{ marginLeft: "8px", background: "#eff6ff", color: "#3b82f6", padding: "1px 8px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}>
                <Database size={11} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                Live from IMS
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", position: "relative" }}>
          {/* Department filter */}
          <div style={{ position: "relative" }}>
            <Button
              variant={selectedDeptFilter !== "ALL" ? "primary" : "outline"}
              icon={Filter}
              onClick={() => setShowFilterDropdown(prev => !prev)}
            >
              {selectedDeptFilter === "ALL" ? "Filter Department" : `Dept: ${selectedDeptFilter}`}
            </Button>
            {showFilterDropdown && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: "6px",
                background: "var(--nec-surface, #ffffff)", border: "1px solid var(--nec-border, #e2e8f0)",
                borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 50, minWidth: "180px", padding: "6px"
              }}>
                <button
                  type="button"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: "4px", background: selectedDeptFilter === "ALL" ? "var(--nec-surface-raised, #f1f5f9)" : "transparent", fontWeight: selectedDeptFilter === "ALL" ? "600" : "400", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                  onClick={() => { setSelectedDeptFilter("ALL"); setShowFilterDropdown(false); }}
                >
                  All Departments
                </button>
                {departments.map(d => (
                  <button
                    key={d.id || d.code}
                    type="button"
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: "4px", background: selectedDeptFilter === d.code ? "var(--nec-surface-raised, #f1f5f9)" : "transparent", fontWeight: selectedDeptFilter === d.code ? "600" : "400", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                    onClick={() => { setSelectedDeptFilter(d.code); setShowFilterDropdown(false); }}
                  >
                    {d.code} — {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="primary" icon={Plus} onClick={handleOpenAddModal}>
            Add Student Athlete
          </Button>
        </div>
      </div>

      {/* ── Active filter pill ───────────────────────────────────────────────── */}
      {selectedDeptFilter !== "ALL" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span style={{ fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>Active Filter:</span>
          <span className="nec-demo-tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <strong>{selectedDeptFilter}</strong>
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              onClick={() => setSelectedDeptFilter("ALL")}
              aria-label="Clear filter"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {/* ── IMS-connected but not yet populated banner ───────────────────────── */}
      {showImsBanner && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: "8px", padding: "10px 16px", marginBottom: "14px",
          fontSize: "0.83rem", color: "#1d4ed8"
        }}>
          <Database size={16} />
          <span>
            <strong>IMS database is connected</strong> — student profiles from IMS will appear here automatically once
            <code style={{ margin: "0 4px", padding: "1px 4px", background: "#dbeafe", borderRadius: "3px" }}>ims.personal_information</code>
            is populated. Showing Sports DB records in the meantime.
          </span>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState title="Unable to Load Student Registry" message={error} onRetry={loadData} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={displayedStudents}
          loading={loading}
          searchPlaceholder="Search by name, register number, department…"
          emptyMessage={
            dataSource === "ims"
              ? "No IMS student profiles found. Data will appear automatically once IMS is populated."
              : selectedDeptFilter !== "ALL"
              ? `No students found for department ${selectedDeptFilter}.`
              : "No student athletes found. Click '+ Add Student Athlete' to register one."
          }
        />
      )}

      {/* ── Add Student Athlete Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Student Athlete"
      >
        <form onSubmit={handleSubmitStudent} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {formError && (
            <div style={{ background: "var(--nec-danger-bg, #fef2f2)", color: "var(--nec-danger, #ef4444)", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div style={{ background: "#ecfdf5", color: "#10b981", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} />
              <span>{formSuccess}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Student Full Name *</label>
              <input type="text" required className="nec-form-control" placeholder="e.g. Vignesh Kumar" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Roll / Register Number *</label>
              <input type="text" required className="nec-form-control" placeholder="e.g. 2114002" value={formData.rollNo} onChange={(e) => handleInputChange("rollNo", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Department *</label>
              <select className="nec-form-control" value={formData.departmentCode} onChange={(e) => handleInputChange("departmentCode", e.target.value)}>
                {departments.map(d => <option key={d.id || d.code} value={d.code}>{d.code} — {d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Academic Standing *</label>
              <select className="nec-form-control" value={formData.year} onChange={(e) => handleInputChange("year", e.target.value)}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Section</label>
              <input type="text" className="nec-form-control" placeholder="A / B / C" value={formData.section} onChange={(e) => handleInputChange("section", e.target.value)} maxLength={5} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Blood Group</label>
              <select className="nec-form-control" value={formData.bloodGroup} onChange={(e) => handleInputChange("bloodGroup", e.target.value)}>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Personal Email</label>
              <input type="email" className="nec-form-control" placeholder="student@nec.edu.in" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Contact Phone</label>
              <input type="tel" className="nec-form-control" placeholder="9876543210" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} maxLength={12} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Student Category</label>
            <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
              {STUDENT_TYPES.map(st => (
                <label key={st} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="radio" name="studentType" value={st} checked={formData.studentType === st} onChange={(e) => handleInputChange("studentType", e.target.value)} />
                  {st}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Register Athlete"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
