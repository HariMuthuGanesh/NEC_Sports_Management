import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Award,
  Search,
  Plus,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Edit2,
  Eye,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Check
} from "lucide-react";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { appointmentsApi, sportsApi, studentLookupApi } from "../../services/api/apiServices";
import "./AppointmentsManager.css";

const COLLEGE_ROLES = [
  "Sports President",
  "Vice President (Sports)",
  "Sports Secretary",
  "Joint Sports Secretary",
  "Custom Role..."
];

const DEPARTMENT_ROLES = [
  "Department Sports Coordinator",
  "Department Sports Secretary",
  "Joint Department Coordinator",
  "Custom Role..."
];

const PRESET_ROLES = [
  "Sports President",
  "Department Sports Coordinator",
  "Vice President (Sports)",
  "Sports Secretary",
  "Joint Sports Secretary",
  "Department Sports Secretary",
  "Custom Role..."
];

export default function AppointmentsManager() {
  // Data state
  const [appointments, setAppointments] = useState([]);
  const [meta, setMeta] = useState({ stats: {}, academicYears: [], roles: [] });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tabs: 'current' (Active only) | 'history' (All)
  const [activeTab, setActiveTab] = useState("current");

  // Filters
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("ALL");
  const [filterScope, setFilterScope] = useState("ALL");
  const [filterGender, setFilterGender] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [revocationReason, setRevocationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Create Form State
  const defaultYear = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed (June = 5)
    return currentMonth >= 5 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;
  }, []);

  const [formData, setFormData] = useState({
    academicYear: defaultYear,
    scope: "Department",
    gender: "Male",
    departmentId: "",
    roleSelect: "Department Sports Coordinator",
    customRole: "",
    studentId: "",
    studentName: "",
    registerNumber: "",
    studentDept: "",
    appointmentDate: new Date().toISOString().split("T")[0],
    tenureStart: `${new Date().getFullYear()}-07-01`,
    tenureEnd: `${new Date().getFullYear() + 1}-06-30`,
    remarks: ""
  });

  const handleScopeChange = (newScope) => {
    setFormData(prev => ({
      ...prev,
      scope: newScope,
      roleSelect: newScope === "College" ? "Sports President" : "Department Sports Coordinator",
      customRole: "",
      departmentId: newScope === "College" ? "" : prev.departmentId
    }));
  };

  // Student Search in Modal
  const [studentQuery, setStudentQuery] = useState("");
  const [studentCandidates, setStudentCandidates] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Load Departments & Metadata
  const loadInitialData = async () => {
    try {
      const [deptsRes, metaRes] = await Promise.all([
        sportsApi.getDepartments ? sportsApi.getDepartments() : Promise.resolve([]),
        appointmentsApi.getAppointmentsMetadata ? appointmentsApi.getAppointmentsMetadata().catch(() => ({ data: {} })) : Promise.resolve({ data: {} })
      ]);
      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);
      if (metaRes?.data) setMeta(metaRes.data);
    } catch (err) {
      console.error("Failed to load departments/meta", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        academicYear: filterYear !== "ALL" ? filterYear : undefined,
        scope: filterScope !== "ALL" ? filterScope : undefined,
        gender: filterGender !== "ALL" ? filterGender : undefined,
        departmentId: filterDept !== "ALL" ? filterDept : undefined,
        role: filterRole !== "ALL" ? filterRole : undefined,
        status: activeTab === "current" ? "Active" : (filterStatus !== "ALL" ? filterStatus : undefined)
      };

      const res = await appointmentsApi.getAppointments(params);
      const list = res?.data || (Array.isArray(res) ? res : []);
      setAppointments(list);
      setTotalCount(res?.pagination?.total !== undefined ? res.pagination.total : list.length);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load leadership appointments.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterYear, filterScope, filterGender, filterDept, filterRole, filterStatus, activeTab]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Search Students for Modal Picker
  const handleStudentSearch = async (val) => {
    setStudentQuery(val);
    if (!val || val.trim().length < 2) {
      setStudentCandidates([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const res = await studentLookupApi.searchStudent(val.trim());
      const list = res?.data || (Array.isArray(res) ? res : []);
      setStudentCandidates(list);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectStudent = (stu) => {
    const sId = stu.student_id || stu.id;
    const sName = stu.student_name || stu.name;
    const sReg = stu.register_number || stu.rollNo || "";
    const sDeptId = stu.department_id || stu.deptId || "";
    const sDeptName = stu.department_name || stu.dept || "";

    setFormData((prev) => ({
      ...prev,
      studentId: sId,
      studentName: sName,
      registerNumber: sReg,
      studentDept: sDeptName,
      departmentId: prev.scope === "Department" ? String(sDeptId) : prev.departmentId
    }));
    setStudentCandidates([]);
    setStudentQuery("");
  };

  // Reset Create Form
  const resetCreateForm = () => {
    setFormData({
      academicYear: defaultYear,
      scope: "Department",
      gender: "Male",
      departmentId: "",
      roleSelect: "Department Sports Coordinator",
      customRole: "",
      studentId: "",
      studentName: "",
      registerNumber: "",
      studentDept: "",
      appointmentDate: new Date().toISOString().split("T")[0],
      tenureStart: `${new Date().getFullYear()}-07-01`,
      tenureEnd: `${new Date().getFullYear() + 1}-06-30`,
      remarks: ""
    });
    setStudentQuery("");
    setStudentCandidates([]);
    setModalError(null);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId) {
      setModalError("Please select a student athlete from the Student Registry.");
      return;
    }

    const finalRole = formData.roleSelect === "Custom Role..." ? formData.customRole.trim() : formData.roleSelect;
    if (!finalRole) {
      setModalError("Appointment role/title cannot be empty.");
      return;
    }

    if (formData.scope === "Department" && !formData.departmentId) {
      setModalError("Department is required for Department Sports Coordinator appointments.");
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        student_id: Number(formData.studentId),
        academic_year: formData.academicYear.trim(),
        appointment_role: finalRole,
        position_category: formData.gender,
        gender: formData.gender,
        appointment_scope: formData.scope,
        department_id: formData.scope === "Department" ? Number(formData.departmentId) : null,
        appointment_date: formData.appointmentDate,
        tenure_start: formData.tenureStart,
        tenure_end: formData.tenureEnd,
        status: "Active",
        remarks: formData.remarks?.trim() || null
      };

      await appointmentsApi.createAppointment(payload);
      setSuccessMsg(`Official appointment for "${finalRole}" successfully created!`);
      setCreateModalOpen(false);
      resetCreateForm();
      fetchAppointments();
      loadInitialData(); // Refresh metadata stats
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Failed to create appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setSubmitting(true);
    setModalError(null);
    try {
      await appointmentsApi.updateAppointment(selectedAppointment.appointment_id, {
        role: selectedAppointment.appointment_role,
        position_category: selectedAppointment.position_category || selectedAppointment.gender,
        gender: selectedAppointment.gender,
        scope: selectedAppointment.appointment_scope,
        departmentId: selectedAppointment.department_id,
        academicYear: selectedAppointment.academic_year,
        appointmentDate: selectedAppointment.appointment_date ? String(selectedAppointment.appointment_date).split("T")[0] : undefined,
        tenureStart: selectedAppointment.tenure_start ? String(selectedAppointment.tenure_start).split("T")[0] : undefined,
        tenureEnd: selectedAppointment.tenure_end ? String(selectedAppointment.tenure_end).split("T")[0] : undefined,
        status: selectedAppointment.status,
        remarks: selectedAppointment.remarks
      });

      setSuccessMsg("Appointment record updated successfully.");
      setEditModalOpen(false);
      fetchAppointments();
      loadInitialData();
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Failed to update appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Revoke Submit
  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    if (!revocationReason.trim() || revocationReason.trim().length < 3) {
      setModalError("Please provide an institutional reason for revocation (minimum 3 characters).");
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      await appointmentsApi.revokeAppointment(selectedAppointment.appointment_id, revocationReason.trim());
      setSuccessMsg(`Appointment for ${selectedAppointment.student_name} (${selectedAppointment.appointment_role}) has been revoked.`);
      setRevokeModalOpen(false);
      setRevocationReason("");
      fetchAppointments();
      loadInitialData();
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Failed to revoke appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Submit (CRUD: Delete)
  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setSubmitting(true);
    setModalError(null);
    try {
      await appointmentsApi.deleteAppointment(selectedAppointment.appointment_id || selectedAppointment.id);
      setSuccessMsg(`Appointment record for "${selectedAppointment.student_name}" successfully deleted.`);
      setDeleteModalOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
      loadInitialData();
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Failed to delete appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return (
          <span className="nec-status-pill active">
            <CheckCircle2 size={12} /> Active
          </span>
        );
      case "Revoked":
        return (
          <span className="nec-status-pill revoked">
            <XCircle size={12} /> Revoked
          </span>
        );
      case "Completed":
        return (
          <span className="nec-status-pill completed">
            <Clock size={12} /> Completed
          </span>
        );
      default:
        return <span className="nec-status-pill completed">{status}</span>;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="nec-app-container">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem", marginBottom: "4px" }}>
            Student Leadership Appointments
          </h1>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--nec-text-muted, #64748b)" }}>
            Institutional appointments for Sports President, Department Sports Coordinators, and student leadership councils.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => {
              fetchAppointments();
              loadInitialData();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              resetCreateForm();
              setCreateModalOpen(true);
            }}
          >
            Appoint Student Leader
          </Button>
        </div>
      </div>

      {/* ── Notification Banners ───────────────────────────────────── */}
      {error && (
        <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ color: "#155724", backgroundColor: "#d4edda", padding: "12px 16px", borderRadius: "8px", border: "1px solid #c3e6cb", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#155724", fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* ── Metric Summary Cards ─────────────────────────────────────── */}
      <div className="nec-app-stats-grid">
        <div className="nec-app-stat-card">
          <div className="nec-app-stat-icon primary">
            <Award size={24} />
          </div>
          <div>
            <div className="nec-app-stat-val">{meta?.stats?.active_count ?? appointments.filter(a => a.status === 'Active').length}</div>
            <div className="nec-app-stat-label">Active Appointments</div>
          </div>
        </div>

        <div className="nec-app-stat-card">
          <div className="nec-app-stat-icon amber">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="nec-app-stat-val">{meta?.stats?.college_leaders_count ?? appointments.filter(a => a.status === 'Active' && a.appointment_scope === 'College').length}</div>
            <div className="nec-app-stat-label">College Level Leaders</div>
          </div>
        </div>

        <div className="nec-app-stat-card">
          <div className="nec-app-stat-icon success">
            <Building2 size={24} />
          </div>
          <div>
            <div className="nec-app-stat-val">{meta?.stats?.dept_coordinators_count ?? appointments.filter(a => a.status === 'Active' && a.appointment_scope === 'Department').length}</div>
            <div className="nec-app-stat-label">Department Coordinators</div>
          </div>
        </div>

        <div className="nec-app-stat-card">
          <div className="nec-app-stat-icon indigo">
            <Calendar size={24} />
          </div>
          <div>
            <div className="nec-app-stat-val">{meta?.stats?.total_records ?? appointments.length}</div>
            <div className="nec-app-stat-label">Total Appointments Recorded</div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────────── */}
      <div className="nec-app-tabs">
        <button
          type="button"
          className={`nec-app-tab-btn ${activeTab === "current" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("current");
            setPage(1);
          }}
        >
          <Award size={16} />
          Current Active Tenures
        </button>
        <button
          type="button"
          className={`nec-app-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("history");
            setPage(1);
          }}
        >
          <Clock size={16} />
          Historical &amp; All Appointments
        </button>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────── */}
      <div className="nec-app-filter-card">
        <div className="nec-app-filter-row">
          <div className="nec-app-search-box">
            <Search size={16} className="nec-app-search-icon" />
            <input
              type="text"
              className="nec-app-search-input"
              placeholder="Search by student name, register #, or role title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="nec-app-select"
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Academic Years</option>
            {meta?.academicYears?.map((yr) => (
              <option key={yr} value={yr}>
                AY {yr}
              </option>
            ))}
            {!meta?.academicYears?.includes(defaultYear) && (
              <option value={defaultYear}>AY {defaultYear}</option>
            )}
          </select>

          <select
            className="nec-app-select"
            value={filterScope}
            onChange={(e) => {
              setFilterScope(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Scopes</option>
            <option value="College">College Level</option>
            <option value="Department">Department Level</option>
          </select>

          <select
            className="nec-app-select"
            value={filterGender}
            onChange={(e) => {
              setFilterGender(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Wings / Genders</option>
            <option value="Male">👨 Boys Wing (Male)</option>
            <option value="Female">👩 Girls Wing (Female)</option>
          </select>

          <select
            className="nec-app-select"
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id || d.department_id} value={d.id || d.department_id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {activeTab === "history" && (
            <select
              className="nec-app-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Revoked">Revoked</option>
            </select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterYear("ALL");
              setFilterScope("ALL");
              setFilterGender("ALL");
              setFilterDept("ALL");
              setFilterRole("ALL");
              setFilterStatus("ALL");
              setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* ── Appointments Table ─────────────────────────────────────── */}
      <div className="nec-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "30px" }}>
            <SkeletonLoader rows={6} />
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: "40px 20px" }}>
            <EmptyState
              title={activeTab === "current" ? "No Active Appointments Found" : "No Appointments on Record"}
              message={activeTab === "current" 
                ? "There are no student leaders currently active for the selected filters. Use 'Appoint Student Leader' to establish appointments."
                : "No historical or archived student appointment records match your criteria."}
            />
          </div>
        ) : (
          <div className="nec-table-responsive-wrapper">
            <table className="nec-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>Appt #</th>
                  <th>Student Name</th>
                  <th style={{ width: "125px" }}>Register #</th>
                  <th>Appointment Title</th>
                  <th style={{ width: "125px" }}>Position Category</th>
                  <th style={{ width: "135px" }}>Dept / Scope</th>
                  <th style={{ width: "95px" }}>Academic Year</th>
                  <th style={{ width: "170px" }}>Tenure Period</th>
                  <th style={{ width: "95px" }}>Status</th>
                  <th style={{ width: "135px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const targetDept = a.department_name ? `${a.department_code || "DEPT"}` : (a.student_home_dept_code || "N/A");
                  const startDate = a.tenure_start ? new Date(a.tenure_start).toLocaleDateString() : "";
                  const endDate = a.tenure_end ? new Date(a.tenure_end).toLocaleDateString() : "";
                  const category = a.position_category || a.gender || "Male";

                  return (
                    <tr key={a.appointment_id || a.id}>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#64748b" }}>
                          #{a.appointment_id || a.id}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "0.92rem", color: "var(--nec-text-main, #0f172a)" }}>
                          {a.student_name || a.studentName}
                        </strong>
                        {a.batch && (
                          <div style={{ fontSize: "0.74rem", color: "var(--nec-text-muted, #64748b)" }}>
                            Batch: {a.batch} {a.section ? `(${a.section})` : ""}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.88rem" }}>
                          {a.register_number || a.registerNumber || "N/A"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "0.9rem", color: "var(--nec-text-main, #0f172a)" }}>
                          {a.appointment_role || a.role}
                        </strong>
                      </td>
                      <td>
                        <span className={`nec-gender-pill ${category.toLowerCase()}`}>
                          {category === "Female" ? "♀ Female" : "♂ Male"}
                        </span>
                      </td>
                      <td>
                        <span className="nec-dept-pill">
                          {targetDept}
                        </span>
                        <div style={{ marginTop: "3px" }}>
                          <span className={`nec-scope-pill ${a.appointment_scope === "College" ? "college" : "department"}`}>
                            {a.appointment_scope}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {a.academic_year}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted, #64748b)" }}>
                          {startDate} → {endDate}
                        </span>
                      </td>
                      <td>
                        {renderStatusBadge(a.status)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="nec-icon-btn"
                            title="View Appointment Dossier"
                            onClick={() => {
                              setSelectedAppointment(a);
                              setViewModalOpen(true);
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {a.status !== "Revoked" && (
                            <button
                              type="button"
                              className="nec-icon-btn"
                              title="Edit Appointment Details"
                              onClick={() => {
                                setSelectedAppointment({ ...a });
                                setModalError(null);
                                setEditModalOpen(true);
                              }}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {a.status === "Active" && (
                            <button
                              type="button"
                              className="nec-icon-btn"
                              title="Revoke Official Appointment"
                              style={{ color: "#d97706" }}
                              onClick={() => {
                                setSelectedAppointment(a);
                                setRevocationReason("");
                                setModalError(null);
                                setRevokeModalOpen(true);
                              }}
                            >
                              <XCircle size={15} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="nec-icon-btn danger"
                            title="Delete Appointment Record"
                            onClick={() => {
                              setSelectedAppointment(a);
                              setModalError(null);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ──────────────────────────────────────── */}
        {appointments.length > 0 && (
          <div className="nec-ct-pagination-bar" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
            <div className="nec-ct-page-size-selector">
              <span>Showing {Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)} of {totalCount} records</span>
            </div>
            <div className="nec-ct-pagination-controls">
              <button
                type="button"
                className="nec-ct-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: "0.85rem", padding: "0 8px", fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="nec-ct-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 1: CREATE NEW LEADERSHIP APPOINTMENT
         ════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Appoint Student Leader"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {modalError && (
            <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem" }}>
              <AlertCircle size={16} />
              <span>{modalError}</span>
            </div>
          )}

          {/* Academic Year, Scope & Gender */}
          <div className="nec-app-form-grid">
            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Academic Year <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                className="nec-app-form-input"
                placeholder="e.g. 2026-2027"
                required
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </div>

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Appointment Scope <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "16px", height: "38px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.88rem" }}>
                  <input
                    type="radio"
                    name="scope"
                    value="College"
                    checked={formData.scope === "College"}
                    onChange={() => handleScopeChange("College")}
                  />
                  <span><strong>College</strong> (Varsity/Council)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.88rem" }}>
                  <input
                    type="radio"
                    name="scope"
                    value="Department"
                    checked={formData.scope === "Department"}
                    onChange={() => handleScopeChange("Department")}
                  />
                  <span><strong>Department</strong> (Coordinator)</span>
                </label>
              </div>
            </div>

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Position Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="nec-app-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Student Picker */}
          <div className="nec-app-form-group full-width" style={{ position: "relative" }}>
            <label className="nec-app-form-label">
              Select Student Athlete <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  className="nec-app-form-input"
                  style={{ width: "100%", paddingLeft: "34px" }}
                  placeholder="Type student name or register number to search registry..."
                  value={studentQuery}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                />
                <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>
            </div>

            {searchingStudents && (
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Searching Student Registry...</div>
            )}

            {studentCandidates.length > 0 && (
              <div className="nec-student-picker-results">
                {studentCandidates.map((stu) => (
                  <div
                    key={stu.student_id || stu.id}
                    className="nec-student-picker-item"
                    onClick={() => handleSelectStudent(stu)}
                  >
                    <div>
                      <strong style={{ fontSize: "0.88rem" }}>{stu.student_name || stu.name}</strong>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "8px" }}>
                        Reg: {stu.register_number || stu.rollNo}
                      </span>
                    </div>
                    <span className="nec-dept-pill">
                      {stu.department_code || stu.deptCode || "DEPT"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Display Selected Student Info */}
            {formData.studentId && (
              <div style={{ marginTop: "8px", padding: "10px 14px", background: "rgba(0, 86, 179, 0.05)", border: "1px solid rgba(0, 86, 179, 0.2)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--nec-primary, #0056b3)" }}>
                    {formData.studentName}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Register #: <strong>{formData.registerNumber || "N/A"}</strong> • Department: <strong>{formData.studentDept || "N/A"}</strong>
                  </div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "#059669", fontWeight: 700 }}>
                  <Check size={14} /> Selected
                </span>
              </div>
            )}
          </div>

          {/* Department (required if Department scope) */}
          {formData.scope === "Department" && (
            <div className="nec-app-form-group full-width">
              <label className="nec-app-form-label">
                Department <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="nec-app-select"
                style={{ width: "100%" }}
                required
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id || d.department_id} value={d.id || d.department_id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Selection */}
          <div className="nec-app-form-grid">
            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Appointment Role / Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="nec-app-select"
                style={{ width: "100%" }}
                value={formData.roleSelect}
                onChange={(e) => setFormData({ ...formData, roleSelect: e.target.value })}
              >
                {(formData.scope === "College" ? COLLEGE_ROLES : DEPARTMENT_ROLES).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {formData.roleSelect === "Custom Role..." && (
              <div className="nec-app-form-group">
                <label className="nec-app-form-label">
                  Custom Role Title <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="nec-app-form-input"
                  placeholder="e.g. Athletics Captain / Coordinator"
                  required
                  value={formData.customRole}
                  onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                />
              </div>
            )}

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Official Appointment Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                className="nec-app-form-input"
                required
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
          </div>

          {/* Tenure Period */}
          <div className="nec-app-form-grid">
            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Tenure Start Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                className="nec-app-form-input"
                required
                value={formData.tenureStart}
                onChange={(e) => setFormData({ ...formData, tenureStart: e.target.value })}
              />
            </div>

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Tenure End Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                className="nec-app-form-input"
                required
                value={formData.tenureEnd}
                onChange={(e) => setFormData({ ...formData, tenureEnd: e.target.value })}
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="nec-app-form-group full-width">
            <label className="nec-app-form-label">
              Official Order Reference / Remarks
            </label>
            <textarea
              className="nec-app-form-textarea"
              rows={2}
              placeholder="e.g. Appointed vide Sports Council Circular No. 2026/04. Approved by Director of Physical Education."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Confirm &amp; Record Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 2: VIEW APPOINTMENT DOSSIER
         ════════════════════════════════════════════════════════════════════ */}
      {selectedAppointment && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Appointment Dossier · #${selectedAppointment.appointment_id || selectedAppointment.id}`}
          size="md"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--nec-text-main, #0f172a)" }}>
                  {selectedAppointment.appointment_role}
                </h3>
                <span className={`nec-scope-pill ${selectedAppointment.appointment_scope === "College" ? "college" : "department"}`} style={{ marginTop: "4px" }}>
                  {selectedAppointment.appointment_scope} Level Appointment
                </span>
              </div>
              {renderStatusBadge(selectedAppointment.status)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.88rem" }}>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Student Name</span>
                <strong>{selectedAppointment.student_name}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Register Number</span>
                <strong style={{ fontFamily: "monospace" }}>{selectedAppointment.register_number || "N/A"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Position Category</span>
                <span className={`nec-gender-pill ${String(selectedAppointment.position_category || selectedAppointment.gender || "Male").toLowerCase()}`} style={{ marginTop: "3px" }}>
                  {(selectedAppointment.position_category || selectedAppointment.gender) === "Female" ? "♀ Female" : "♂ Male"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Academic Year</span>
                <strong>AY {selectedAppointment.academic_year}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Department</span>
                <strong>{selectedAppointment.department_name || selectedAppointment.student_home_dept_name || "All Departments"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Tenure Start</span>
                <strong>{selectedAppointment.tenure_start ? new Date(selectedAppointment.tenure_start).toLocaleDateString() : "N/A"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Tenure End</span>
                <strong>{selectedAppointment.tenure_end ? new Date(selectedAppointment.tenure_end).toLocaleDateString() : "N/A"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Appointment Date</span>
                <strong>{selectedAppointment.appointment_date ? new Date(selectedAppointment.appointment_date).toLocaleDateString() : "N/A"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Appointed By</span>
                <strong>{selectedAppointment.appointed_by_username || "Sports System Admin"}</strong>
              </div>
            </div>

            {selectedAppointment.remarks && (
              <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Remarks / Official Order
                </span>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "#334155" }}>{selectedAppointment.remarks}</p>
              </div>
            )}

            {selectedAppointment.status === "Revoked" && (
              <div style={{ background: "#fef2f2", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                <span style={{ fontSize: "0.76rem", color: "#dc2626", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Revocation Rationale
                </span>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "#991b1b" }}>{selectedAppointment.revoked_reason}</p>
                {selectedAppointment.revoked_at && (
                  <span style={{ fontSize: "0.74rem", color: "#b91c1c", marginTop: "4px", display: "block" }}>
                    Revoked on: {new Date(selectedAppointment.revoked_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 3: EDIT APPOINTMENT DETAILS
         ════════════════════════════════════════════════════════════════════ */}
      {selectedAppointment && editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Appointment · #${selectedAppointment.appointment_id || selectedAppointment.id}`}
          size="md"
        >
          <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {modalError && (
              <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">Student Leader</label>
              <input
                type="text"
                className="nec-app-form-input"
                disabled
                value={`${selectedAppointment.student_name} (${selectedAppointment.register_number || "N/A"})`}
              />
            </div>

            <div className="nec-app-form-grid">
              <div className="nec-app-form-group">
                <label className="nec-app-form-label">Appointment Role / Title</label>
                <input
                  type="text"
                  className="nec-app-form-input"
                  required
                  value={selectedAppointment.appointment_role || ""}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, appointment_role: e.target.value })}
                />
              </div>

              <div className="nec-app-form-group">
                <label className="nec-app-form-label">Position Category</label>
                <select
                  className="nec-app-select"
                  value={selectedAppointment.position_category || selectedAppointment.gender || "Male"}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, position_category: e.target.value, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="nec-app-form-grid">
              <div className="nec-app-form-group">
                <label className="nec-app-form-label">Academic Year</label>
                <input
                  type="text"
                  className="nec-app-form-input"
                  required
                  value={selectedAppointment.academic_year || ""}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, academic_year: e.target.value })}
                />
              </div>
            </div>

            <div className="nec-app-form-grid">
              <div className="nec-app-form-group">
                <label className="nec-app-form-label">Tenure Start</label>
                <input
                  type="date"
                  className="nec-app-form-input"
                  required
                  value={selectedAppointment.tenure_start ? String(selectedAppointment.tenure_start).split("T")[0] : ""}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, tenure_start: e.target.value })}
                />
              </div>

              <div className="nec-app-form-group">
                <label className="nec-app-form-label">Tenure End</label>
                <input
                  type="date"
                  className="nec-app-form-input"
                  required
                  value={selectedAppointment.tenure_end ? String(selectedAppointment.tenure_end).split("T")[0] : ""}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, tenure_end: e.target.value })}
                />
              </div>
            </div>

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">Status</label>
              <select
                className="nec-app-select"
                value={selectedAppointment.status || "Active"}
                onChange={(e) => setSelectedAppointment({ ...selectedAppointment, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Revoked">Revoked</option>
              </select>
            </div>

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">Remarks / Official Order</label>
              <textarea
                className="nec-app-form-textarea"
                rows={2}
                value={selectedAppointment.remarks || ""}
                onChange={(e) => setSelectedAppointment({ ...selectedAppointment, remarks: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <Button variant="ghost" type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 4: REVOKE APPOINTMENT
         ════════════════════════════════════════════════════════════════════ */}
      {selectedAppointment && revokeModalOpen && (
        <Modal
          isOpen={revokeModalOpen}
          onClose={() => setRevokeModalOpen(false)}
          title="Revoke Official Leadership Appointment"
          size="sm"
        >
          <form onSubmit={handleRevokeSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {modalError && (
              <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <div style={{ padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", display: "flex", gap: "10px" }}>
              <ShieldAlert size={20} style={{ color: "#dc2626", flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "0.88rem", color: "#991b1b" }}>
                Are you sure you want to revoke the appointment of <strong>{selectedAppointment.student_name}</strong> as <strong>{selectedAppointment.appointment_role}</strong>?
                This action is preserved in the institutional audit log.
              </div>
            </div>

            <div className="nec-app-form-group">
              <label className="nec-app-form-label">
                Revocation Reason <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                className="nec-app-form-textarea"
                rows={3}
                required
                placeholder="State the institutional reason for revocation (e.g. academic leave, disciplinary action, voluntary resignation)..."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <Button variant="ghost" type="button" onClick={() => setRevokeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" type="submit" loading={submitting}>
                Revoke Appointment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 5: DELETE APPOINTMENT (CRUD: DELETE)
         ════════════════════════════════════════════════════════════════════ */}
      {selectedAppointment && deleteModalOpen && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Appointment Record"
          size="sm"
        >
          <form onSubmit={handleDeleteSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {modalError && (
              <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <div style={{ padding: "14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", display: "flex", gap: "10px" }}>
              <Trash2 size={22} style={{ color: "#dc2626", flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "0.88rem", color: "#991b1b" }}>
                Are you sure you want to permanently delete the appointment record of <strong>{selectedAppointment.student_name}</strong> as <strong>{selectedAppointment.appointment_role}</strong> ({selectedAppointment.academic_year})?
                <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#b91c1c" }}>
                  This action cannot be undone.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <Button variant="ghost" type="button" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" type="submit" loading={submitting}>
                Delete Permanently
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
