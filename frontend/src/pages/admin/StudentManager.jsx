import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  Activity,
  Award,
  Users,
  Trophy,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Trash2,
  Calendar,
  Building2,
  Tag,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { playersApi, sportsApi } from "../../services/api/apiServices";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import EmptyState from "../../components/common/EmptyState";
import "./StudentManager.css";

export default function StudentManager() {
  // Directory state
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedSport, setSelectedSport] = useState("ALL");
  const [activityType, setActivityType] = useState("ALL");
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [appointmentStatus, setAppointmentStatus] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Quick Registration Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regSuccess, setRegSuccess] = useState(null);
  const [newRegNo, setNewRegNo] = useState("");

  // Detailed Sports Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [activeTab, setActiveTab] = useState("interests");

  // Add Sport Interest inside Profile
  const [newInterestSportId, setNewInterestSportId] = useState("");
  const [newInterestStatus, setNewInterestStatus] = useState("Interested");
  const [addingInterest, setAddingInterest] = useState(false);
  const [interestActionMsg, setInterestActionMsg] = useState(null);

  // Load Departments & Sports Reference Data
  useEffect(() => {
    Promise.all([
      sportsApi.getDepartments ? sportsApi.getDepartments() : Promise.resolve([]),
      sportsApi.getSports ? sportsApi.getSports() : Promise.resolve([])
    ])
      .then(([deptsData, sportsData]) => {
        setDepartments(Array.isArray(deptsData) ? deptsData : []);
        setSportsList(Array.isArray(sportsData) ? sportsData : []);
      })
      .catch((err) => {
        console.error("Failed to load reference metadata:", err);
      });
  }, []);

  // Fetch Directory Data
  const fetchDirectory = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      search: search.trim() || undefined,
      departmentId: selectedDept !== "ALL" ? selectedDept : undefined,
      sportId: selectedSport !== "ALL" ? selectedSport : undefined,
      activityType: activityType !== "ALL" ? activityType : undefined,
      batch: selectedBatch !== "ALL" ? selectedBatch : undefined,
      appointmentStatus: appointmentStatus !== "ALL" ? appointmentStatus : undefined,
      page,
      limit
    };

    playersApi
      .getStudentsDirectory(params)
      .then((resp) => {
        const rows = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp)
          ? resp
          : [];
        setStudents(rows);
        setTotalRecords(resp?.total || rows.length || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Directory fetch error:", err);
        setError(err.message || "Failed to load student sports directory.");
        setLoading(false);
      });
  }, [search, selectedDept, selectedSport, activityType, selectedBatch, appointmentStatus, page, limit]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedDept("ALL");
    setSelectedSport("ALL");
    setActivityType("ALL");
    setSelectedBatch("ALL");
    setAppointmentStatus("ALL");
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim() !== "" ||
      selectedDept !== "ALL" ||
      selectedSport !== "ALL" ||
      activityType !== "ALL" ||
      selectedBatch !== "ALL" ||
      appointmentStatus !== "ALL"
    );
  }, [search, selectedDept, selectedSport, activityType, selectedBatch, appointmentStatus]);

  // Load Detailed Sports Profile
  const handleOpenProfile = (studentId) => {
    setSelectedStudentId(studentId);
    setProfileLoading(true);
    setProfileError(null);
    setProfileData(null);
    setActiveTab("interests");
    setInterestActionMsg(null);
    setProfileModalOpen(true);

    playersApi
      .getStudentSportsProfile(studentId)
      .then((resp) => {
        setProfileData(resp?.data || resp);
        setProfileLoading(false);
      })
      .catch((err) => {
        console.error("Error loading student profile:", err);
        setProfileError(err.message || "Failed to load student sports profile.");
        setProfileLoading(false);
      });
  };

  // Add Sport Interest
  const handleAddInterest = async (e) => {
    e.preventDefault();
    if (!newInterestSportId) return;

    setAddingInterest(true);
    setInterestActionMsg(null);
    try {
      await playersApi.addStudentSportInterest(selectedStudentId, {
        sportId: newInterestSportId,
        interestStatus: newInterestStatus,
        source: "Local Admin"
      });
      setInterestActionMsg({ type: "success", text: "Sports interest added successfully." });
      setNewInterestSportId("");
      // Reload profile
      const updated = await playersApi.getStudentSportsProfile(selectedStudentId);
      setProfileData(updated?.data || updated);
      fetchDirectory();
    } catch (err) {
      setInterestActionMsg({ type: "error", text: err.message || "Failed to add sports interest." });
    } finally {
      setAddingInterest(false);
    }
  };

  // Remove Sport Interest
  const handleRemoveInterest = async (sportId) => {
    if (!window.confirm("Remove this sports interest association?")) return;
    setInterestActionMsg(null);
    try {
      await playersApi.removeStudentSportInterest(selectedStudentId, sportId);
      setInterestActionMsg({ type: "success", text: "Sports interest removed." });
      const updated = await playersApi.getStudentSportsProfile(selectedStudentId);
      setProfileData(updated?.data || updated);
      fetchDirectory();
    } catch (err) {
      setInterestActionMsg({ type: "error", text: err.message || "Failed to remove interest." });
    }
  };

  // Quick Register Athlete
  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    if (!newRegNo.trim()) {
      setRegError("Register Number is required.");
      return;
    }

    setSubmittingStudent(true);
    setRegError(null);
    try {
      await playersApi.createStudent({ registerNumber: newRegNo.trim() });
      setRegSuccess("Student athlete registered successfully.");
      setTimeout(() => {
        setIsAddModalOpen(false);
        setRegSuccess(null);
        setNewRegNo("");
        fetchDirectory();
      }, 700);
    } catch (err) {
      setRegError(err.message || "Failed to register student athlete.");
    } finally {
      setSubmittingStudent(false);
    }
  };

  // Stats summary counts
  const stats = useMemo(() => {
    const withInterests = students.filter((s) => s.sports_interests_list).length;
    const withEvents = students.filter((s) => Number(s.participations_count) > 0).length;
    const leaders = students.filter((s) => s.active_appointment_title).length;
    return {
      total: totalRecords,
      withInterests,
      withEvents,
      leaders
    };
  }, [students, totalRecords]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <div className="nec-directory-container">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="nec-directory-header">
        <div className="nec-directory-header-titles">
          <h1 className="nec-directory-title">
            <Users size={28} color="#0056b3" />
            Student Sports Directory
          </h1>
          <p className="nec-directory-desc">
            Centralized student information and athletic directory across all departments — verified sports interests, event participation history, and leadership appointments.
            <span className="nec-directory-chip ims-ready">
              <Database size={11} />
              Local Records (IMS Ready)
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => fetchDirectory()}
            title="Refresh Directory"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setRegError(null);
              setRegSuccess(null);
              setNewRegNo("");
              setIsAddModalOpen(true);
            }}
          >
            Register Student Athlete
          </Button>
        </div>
      </div>

      {/* ── Overview Metrics Cards ─────────────────────────────── */}
      <div className="nec-directory-stats">
        <div className="nec-directory-stat-card">
          <div className="nec-directory-stat-icon blue">
            <Users size={22} />
          </div>
          <div>
            <div className="nec-directory-stat-val">{stats.total}</div>
            <div className="nec-directory-stat-lbl">Registered Student Athletes</div>
          </div>
        </div>

        <div className="nec-directory-stat-card">
          <div className="nec-directory-stat-icon green">
            <Tag size={22} />
          </div>
          <div>
            <div className="nec-directory-stat-val">{stats.withInterests}</div>
            <div className="nec-directory-stat-lbl">Expressed Sports Interests</div>
          </div>
        </div>

        <div className="nec-directory-stat-card">
          <div className="nec-directory-stat-icon amber">
            <Trophy size={22} />
          </div>
          <div>
            <div className="nec-directory-stat-val">{stats.withEvents}</div>
            <div className="nec-directory-stat-lbl">Active Event Participants</div>
          </div>
        </div>

        <div className="nec-directory-stat-card">
          <div className="nec-directory-stat-icon purple">
            <Award size={22} />
          </div>
          <div>
            <div className="nec-directory-stat-val">{stats.leaders}</div>
            <div className="nec-directory-stat-lbl">Active Leadership Appointments</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Multi-Filter Card ─────────────────────────── */}
      <div className="nec-directory-toolbar">
        <div className="nec-directory-search-row">
          <div className="nec-directory-search-box">
            <Search size={16} className="nec-directory-search-icon" />
            <input
              type="text"
              placeholder="Search by student name, register number, department..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" icon={X} onClick={handleResetFilters} size="sm">
              Reset Filters
            </Button>
          )}
        </div>

        <div className="nec-directory-filters-grid">
          {/* Department Filter */}
          <div className="nec-filter-group">
            <label>Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || d.code} value={d.code || d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sport Filter */}
          <div className="nec-filter-group">
            <label>Sport</label>
            <select
              value={selectedSport}
              onChange={(e) => {
                setSelectedSport(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Sports</option>
              {sportsList.map((sp) => (
                <option key={sp.sport_id || sp.id} value={sp.sport_id || sp.id}>
                  {sp.name} ({sp.category || sp.sport_type || "Sport"})
                </option>
              ))}
            </select>
          </div>

          {/* Activity / Engagement Type */}
          <div className="nec-filter-group">
            <label>Activity Scope</label>
            <select
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Engagement Types</option>
              <option value="INTEREST">Sports Interest Expressed</option>
              <option value="PARTICIPATION">Verified Event Participation</option>
              <option value="TEAM">Team Roster Member</option>
            </select>
          </div>

          {/* Batch / Academic Year */}
          <div className="nec-filter-group">
            <label>Batch / Academic Year</label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Batches</option>
              <option value="2026">Batch 2026 (Final Year)</option>
              <option value="2025">Batch 2025 (Graduated)</option>
              <option value="2027">Batch 2027 (Pre-Final)</option>
              <option value="2028">Batch 2028 (Sophomore)</option>
            </select>
          </div>

          {/* Leadership Status */}
          <div className="nec-filter-group">
            <label>Leadership Status</label>
            <select
              value={appointmentStatus}
              onChange={(e) => {
                setAppointmentStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Leadership Statuses</option>
              <option value="ACTIVE_LEADER">Any Active Leader</option>
              <option value="SPORTS_PRESIDENT">Sports President (College)</option>
              <option value="DEPT_COORDINATOR">Dept Sports Coordinator</option>
              <option value="NO_APPOINTMENT">No Active Appointment</option>
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="nec-active-filters-bar">
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b" }}>
              Active Filters:
            </span>
            {search.trim() && (
              <span className="nec-filter-tag">
                Search: "{search}"
                <button type="button" onClick={() => setSearch("")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedDept !== "ALL" && (
              <span className="nec-filter-tag">
                Dept: {selectedDept}
                <button type="button" onClick={() => setSelectedDept("ALL")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedSport !== "ALL" && (
              <span className="nec-filter-tag">
                Sport: {sportsList.find((s) => String(s.sport_id) === String(selectedSport))?.name || selectedSport}
                <button type="button" onClick={() => setSelectedSport("ALL")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {activityType !== "ALL" && (
              <span className="nec-filter-tag">
                Scope: {activityType}
                <button type="button" onClick={() => setActivityType("ALL")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedBatch !== "ALL" && (
              <span className="nec-filter-tag">
                Batch: {selectedBatch}
                <button type="button" onClick={() => setSelectedBatch("ALL")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {appointmentStatus !== "ALL" && (
              <span className="nec-filter-tag">
                Leader: {appointmentStatus}
                <button type="button" onClick={() => setAppointmentStatus("ALL")}>
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Table Card ─────────────────────────────────────────── */}
      <div className="nec-directory-table-card">
        {loading ? (
          <div style={{ padding: "40px" }}>
            <SkeletonLoader rows={6} />
          </div>
        ) : error ? (
          <div style={{ padding: "40px" }}>
            <EmptyState
              title="Unable to Load Student Directory"
              description={error}
              actionLabel="Try Again"
              onAction={fetchDirectory}
            />
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: "40px" }}>
            <EmptyState
              title="No Student Records Found"
              description="No students matched your search or selected filter criteria. Try clearing filters or registering a new athlete."
              actionLabel={hasActiveFilters ? "Reset Filters" : "Register Student Athlete"}
              onAction={hasActiveFilters ? handleResetFilters : () => setIsAddModalOpen(true)}
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="nec-dir-table">
              <thead>
                <tr>
                  <th>Register Number</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Batch</th>
                  <th>Sports Interests</th>
                  <th>Athletic Activity</th>
                  <th>Leadership Appointment</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const interests = student.sports_interests_list
                    ? student.sports_interests_list.split(",").map((s) => s.trim())
                    : [];
                  const participations = Number(student.participations_count) || 0;
                  const teams = Number(student.teams_count) || 0;
                  const leaderTitle = student.active_appointment_title;
                  const isPresident = leaderTitle && leaderTitle.toLowerCase().includes("president");
                  const isCoord = leaderTitle && leaderTitle.toLowerCase().includes("coordinator");

                  return (
                    <tr key={student.student_id || student.id}>
                      {/* Register Number */}
                      <td>
                        <div className="nec-reg-no">
                          {student.register_number || student.rollNo || "—"}
                        </div>
                        <div style={{ marginTop: "3px" }}>
                          <span className="nec-directory-chip">
                            <Database size={9} />
                            Local
                          </span>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                          {student.student_name || student.name || "Unnamed"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Mail size={11} />
                          {student.personal_email || student.email || "No email"}
                        </div>
                        {student.personal_phone && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Phone size={11} />
                            {student.personal_phone}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td>
                        <strong style={{ color: "#0056b3" }}>
                          {student.department_code || student.deptCode || "—"}
                        </strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {student.department_name || "Department"}
                        </div>
                      </td>

                      {/* Batch */}
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {student.batch ? `Batch ${student.batch}` : "—"}
                        </div>
                        {student.section && (
                          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                            Sec {student.section}
                          </div>
                        )}
                      </td>

                      {/* Sports Interests */}
                      <td>
                        {interests.length > 0 ? (
                          <div className="nec-sports-tag-wrap">
                            {interests.slice(0, 2).map((sp, idx) => (
                              <span key={idx} className="nec-sport-tag">
                                {sp}
                              </span>
                            ))}
                            {interests.length > 2 && (
                              <span className="nec-sport-tag more">
                                +{interests.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>

                      {/* Athletic Activity */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                          {participations > 0 ? (
                            <span className="nec-eng-badge events" title={`${participations} Event Entries`}>
                              <Trophy size={11} />
                              {participations} {participations === 1 ? "Event" : "Events"}
                            </span>
                          ) : null}
                          {teams > 0 ? (
                            <span className="nec-eng-badge teams" title={`${teams} Team Memberships`}>
                              <Users size={11} />
                              {teams} {teams === 1 ? "Team" : "Teams"}
                            </span>
                          ) : null}
                          {participations === 0 && teams === 0 && (
                            <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>No participation</span>
                          )}
                        </div>
                      </td>

                      {/* Leadership Appointment */}
                      <td>
                        {leaderTitle ? (
                          <span
                            className={`nec-appt-pill ${
                              isPresident ? "president" : isCoord ? "coordinator" : "coordinator"
                            }`}
                          >
                            <ShieldCheck size={12} />
                            {leaderTitle}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenProfile(student.student_id || student.id)}
                        >
                          Sports Profile
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Footer & Pagination ───────────────────────── */}
        <div className="nec-directory-pagination">
          <div>
            Showing{" "}
            <strong>
              {totalRecords === 0
                ? 0
                : (page - 1) * limit + 1}
            </strong>{" "}
            to <strong>{Math.min(page * limit, totalRecords)}</strong> of{" "}
            <strong>{totalRecords}</strong> student records
          </div>

          <div className="nec-pagination-controls">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, padding: "0 6px" }}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{
                height: "32px",
                marginLeft: "8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem"
              }}
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Student Sports Profile Modal ───────────────────────── */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Student Sports Dossier & Athletic Profile"
        size="lg"
      >
        {profileLoading ? (
          <div style={{ padding: "30px" }}>
            <SkeletonLoader rows={6} />
          </div>
        ) : profileError ? (
          <div style={{ padding: "20px" }}>
            <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "center" }}>
              <AlertCircle size={18} />
              <span>{profileError}</span>
            </div>
          </div>
        ) : !profileData ? null : (
          <div className="nec-profile-modal-body">
            {/* Student Header Banner */}
            <div className="nec-profile-banner">
              <div className="nec-profile-banner-left">
                <div className="nec-profile-avatar">
                  {(profileData.student?.student_name || "S").charAt(0)}
                </div>
                <div className="nec-profile-banner-info">
                  <h2>{profileData.student?.student_name}</h2>
                  <div className="nec-profile-banner-sub">
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {profileData.student?.register_number}
                    </span>
                    <span>•</span>
                    <span>
                      {profileData.student?.department_name} ({profileData.student?.department_code})
                    </span>
                    <span>•</span>
                    <span>Batch {profileData.student?.batch || "—"}</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="nec-directory-chip" style={{ background: "rgba(255,255,255,0.2)", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}>
                  <Database size={11} />
                  Local Records (IMS Ready)
                </span>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="nec-profile-tabs">
              <button
                type="button"
                className={`nec-profile-tab-btn ${activeTab === "interests" ? "active" : ""}`}
                onClick={() => setActiveTab("interests")}
              >
                <Tag size={14} />
                Sports Interests
                <span className="nec-profile-tab-count">
                  {profileData.interests?.length || 0}
                </span>
              </button>
              <button
                type="button"
                className={`nec-profile-tab-btn ${activeTab === "participations" ? "active" : ""}`}
                onClick={() => setActiveTab("participations")}
              >
                <Activity size={14} />
                Event Participations
                <span className="nec-profile-tab-count">
                  {profileData.participations?.length || 0}
                </span>
              </button>
              <button
                type="button"
                className={`nec-profile-tab-btn ${activeTab === "teams" ? "active" : ""}`}
                onClick={() => setActiveTab("teams")}
              >
                <Users size={14} />
                Registered Teams
                <span className="nec-profile-tab-count">
                  {profileData.teams?.length || 0}
                </span>
              </button>
              <button
                type="button"
                className={`nec-profile-tab-btn ${activeTab === "achievements" ? "active" : ""}`}
                onClick={() => setActiveTab("achievements")}
              >
                <Trophy size={14} />
                Achievements
                <span className="nec-profile-tab-count">
                  {profileData.achievements?.length || 0}
                </span>
              </button>
              <button
                type="button"
                className={`nec-profile-tab-btn ${activeTab === "appointments" ? "active" : ""}`}
                onClick={() => setActiveTab("appointments")}
              >
                <Award size={14} />
                Leadership
                <span className="nec-profile-tab-count">
                  {profileData.appointments?.length || 0}
                </span>
              </button>
              <button
                type="button"
                className={`nec-profile-tab-btn ${activeTab === "demographics" ? "active" : ""}`}
                onClick={() => setActiveTab("demographics")}
              >
                <UserCheck size={14} />
                Identity Details
              </button>
            </div>

            {/* Tab: Sports Interests */}
            {activeTab === "interests" && (
              <div className="nec-profile-panel">
                {interestActionMsg && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      background: interestActionMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                      color: interestActionMsg.type === "success" ? "#065f46" : "#b91c1c",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {interestActionMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {interestActionMsg.text}
                  </div>
                )}

                {/* List of Interests */}
                {profileData.interests && profileData.interests.length > 0 ? (
                  <div className="nec-interests-list">
                    {profileData.interests.map((item) => (
                      <div key={item.id} className="nec-interest-item">
                        <div>
                          <div className="nec-interest-name">
                            {item.sport_name}{" "}
                            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>
                              ({item.sport_category || "Sport"})
                            </span>
                          </div>
                          <div className="nec-interest-meta">
                            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              {item.interest_status || "Interested"}
                            </span>
                            <span>Source: {item.source || "Local Record"}</span>
                            <span>
                              Recorded:{" "}
                              {item.recorded_at
                                ? new Date(item.recorded_at).toLocaleDateString("en-IN")
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleRemoveInterest(item.sport_id)}
                          title="Remove Sports Interest"
                          style={{ color: "#ef4444" }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="nec-profile-empty">
                    <Tag size={28} color="#94a3b8" />
                    <h4>No Sports Interests Recorded</h4>
                    <p>Add a sport below to associate this student with departmental sports interests.</p>
                  </div>
                )}

                {/* Add Sport Interest Form */}
                <form onSubmit={handleAddInterest} className="nec-add-interest-box">
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>
                      Select Sport to Add:
                    </label>
                    <select
                      value={newInterestSportId}
                      onChange={(e) => setNewInterestSportId(e.target.value)}
                      required
                      style={{ width: "100%", height: "36px", borderRadius: "6px", border: "1px solid #86efac", padding: "0 8px", fontSize: "0.85rem" }}
                    >
                      <option value="">-- Choose Sport --</option>
                      {sportsList
                        .filter(
                          (sp) =>
                            !profileData.interests?.some(
                              (i) => String(i.sport_id) === String(sp.sport_id)
                            )
                        )
                        .map((sp) => (
                          <option key={sp.sport_id} value={sp.sport_id}>
                            {sp.name} ({sp.category || "General"})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div style={{ width: "160px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>
                      Interest Status:
                    </label>
                    <select
                      value={newInterestStatus}
                      onChange={(e) => setNewInterestStatus(e.target.value)}
                      style={{ width: "100%", height: "36px", borderRadius: "6px", border: "1px solid #86efac", padding: "0 8px", fontSize: "0.85rem" }}
                    >
                      <option value="Interested">Interested</option>
                      <option value="Competitive">Competitive</option>
                      <option value="Recreational">Recreational</option>
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    icon={Plus}
                    disabled={addingInterest || !newInterestSportId}
                  >
                    {addingInterest ? "Adding..." : "Add Interest"}
                  </Button>
                </form>
              </div>
            )}

            {/* Tab: Event Participations */}
            {activeTab === "participations" && (
              <div className="nec-profile-panel">
                {profileData.participations && profileData.participations.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="nec-dir-table">
                      <thead>
                        <tr>
                          <th>Tournament & AY</th>
                          <th>Event Name</th>
                          <th>Sport / Category</th>
                          <th>Stage</th>
                          <th>Dates</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.participations.map((part) => (
                          <tr key={part.entry_id}>
                            <td>
                              <strong>{part.tournament_name || "Official Meet"}</strong>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {part.academic_year || "—"}
                              </div>
                            </td>
                            <td>{part.event_name}</td>
                            <td>
                              {part.sport_name}{" "}
                              {part.category_name && (
                                <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                                  ({part.category_name})
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                                {part.stage || "Stage"}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                              {part.start_date
                                ? new Date(part.start_date).toLocaleDateString("en-IN")
                                : "—"}
                            </td>
                            <td>
                              <span style={{ color: "#059669", fontWeight: 700, fontSize: "0.78rem" }}>
                                {part.event_status || "Recorded"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="nec-profile-empty">
                    <Activity size={28} color="#94a3b8" />
                    <h4>No Event Entries on Record</h4>
                    <p>This student has not yet been rostered into individual or team competition fixtures.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Registered Teams */}
            {activeTab === "teams" && (
              <div className="nec-profile-panel">
                {profileData.teams && profileData.teams.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="nec-dir-table">
                      <thead>
                        <tr>
                          <th>Team Name</th>
                          <th>Sport</th>
                          <th>Academic Year</th>
                          <th>Role</th>
                          <th>Jersey #</th>
                          <th>Team Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.teams.map((tm) => (
                          <tr key={tm.membership_id}>
                            <td>
                              <strong>{tm.team_name}</strong>
                            </td>
                            <td>{tm.sport_name || "—"}</td>
                            <td>{tm.academic_year || "—"}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: tm.team_role === "Captain" ? "#d97706" : "#0f172a" }}>
                                {tm.team_role || "Member"}
                              </span>
                            </td>
                            <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                              {tm.jersey_number || "—"}
                            </td>
                            <td>
                              <span style={{ background: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: "999px", fontSize: "0.74rem", fontWeight: 700 }}>
                                {tm.team_status || "Approved"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="nec-profile-empty">
                    <Users size={28} color="#94a3b8" />
                    <h4>No Team Memberships Found</h4>
                    <p>Student is not currently registered in any departmental sports teams or squads.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Achievements */}
            {activeTab === "achievements" && (
              <div className="nec-profile-panel">
                {profileData.achievements && profileData.achievements.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="nec-dir-table">
                      <thead>
                        <tr>
                          <th>Rank / Podium</th>
                          <th>Competition</th>
                          <th>Event & Tournament</th>
                          <th>Sport</th>
                          <th>Result Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.achievements.map((ach) => (
                          <tr key={ach.entry_id}>
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontWeight: 800,
                                  fontSize: "0.8rem",
                                  background:
                                    ach.rank === 1
                                      ? "#fef3c7"
                                      : ach.rank === 2
                                      ? "#f1f5f9"
                                      : "#ffedd5",
                                  color:
                                    ach.rank === 1
                                      ? "#b45309"
                                      : ach.rank === 2
                                      ? "#475569"
                                      : "#c2410c"
                                }}
                              >
                                <Trophy size={12} />
                                {ach.rank === 1 ? "1st (Gold)" : ach.rank === 2 ? "2nd (Silver)" : `${ach.rank}th Place`}
                              </span>
                            </td>
                            <td>
                              <strong>{ach.competition_name || "Official Match"}</strong>
                            </td>
                            <td>
                              <div>{ach.event_name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {ach.tournament_name} ({ach.academic_year})
                              </div>
                            </td>
                            <td>{ach.sport_name}</td>
                            <td style={{ fontSize: "0.82rem" }}>
                              {ach.result_summary || (ach.score ? `Score: ${ach.score}` : "Verified Result")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="nec-profile-empty">
                    <Trophy size={28} color="#94a3b8" />
                    <h4>No Finalized Competition Results</h4>
                    <p>Podium standings and verified results will populate here upon tournament completion.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Leadership Appointments */}
            {activeTab === "appointments" && (
              <div className="nec-profile-panel">
                {profileData.appointments && profileData.appointments.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="nec-dir-table">
                      <thead>
                        <tr>
                          <th>Appointment Title</th>
                          <th>Category</th>
                          <th>Scope / Dept</th>
                          <th>Academic Year</th>
                          <th>Tenure Period</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.appointments.map((appt) => (
                          <tr key={appt.appointment_id}>
                            <td>
                              <strong>{appt.appointment_role}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: appt.position_category === "Male" ? "#1e40af" : "#be185d" }}>
                                {appt.position_category === "Male" ? "♂ Male" : "♀ Female"}
                              </span>
                            </td>
                            <td>
                              {appt.appointment_scope === "College"
                                ? "College-Wide"
                                : `${appt.department_code || "Dept"}`}
                            </td>
                            <td>
                              <strong>{appt.academic_year}</strong>
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                              {appt.tenure_start
                                ? new Date(appt.tenure_start).toLocaleDateString("en-IN")
                                : "—"}{" "}
                              to{" "}
                              {appt.tenure_end
                                ? new Date(appt.tenure_end).toLocaleDateString("en-IN")
                                : "Present"}
                            </td>
                            <td>
                              <span
                                style={{
                                  background:
                                    appt.status === "Active"
                                      ? "#ecfdf5"
                                      : appt.status === "Archived"
                                      ? "#f8fafc"
                                      : "#fef2f2",
                                  color:
                                    appt.status === "Active"
                                      ? "#059669"
                                      : appt.status === "Archived"
                                      ? "#64748b"
                                      : "#dc2626",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontSize: "0.74rem",
                                  fontWeight: 700
                                }}
                              >
                                {appt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="nec-profile-empty">
                    <Award size={28} color="#94a3b8" />
                    <h4>No Leadership Appointments</h4>
                    <p>This student has not been appointed to a Sports President or Department Sports Coordinator role.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Identity Details */}
            {activeTab === "demographics" && (
              <div className="nec-profile-panel">
                <div className="nec-profile-details-grid">
                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Internal Student ID</div>
                    <div className="nec-profile-field-value">
                      #{profileData.student?.student_id}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">College Register Number</div>
                    <div className="nec-profile-field-value" style={{ fontFamily: "monospace" }}>
                      {profileData.student?.register_number}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Department</div>
                    <div className="nec-profile-field-value">
                      {profileData.student?.department_name} ({profileData.student?.department_code})
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Batch & Programme</div>
                    <div className="nec-profile-field-value">
                      Batch {profileData.student?.batch || "—"}{" "}
                      {profileData.student?.degree ? `(${profileData.student?.degree})` : ""}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Institutional / Personal Email</div>
                    <div className="nec-profile-field-value">
                      {profileData.student?.personal_email || "Not Provided"}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Contact Phone</div>
                    <div className="nec-profile-field-value">
                      {profileData.student?.personal_phone || "Not Provided"}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Student Type</div>
                    <div className="nec-profile-field-value">
                      {profileData.student?.student_type || "Day Scholar"}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Medical Fitness</div>
                    <div className="nec-profile-field-value">
                      {profileData.student?.medical_fitness || "Fit for Sports"}
                    </div>
                  </div>

                  <div className="nec-profile-field">
                    <div className="nec-profile-field-label">Data Integration Status</div>
                    <div className="nec-profile-field-value" style={{ color: "#1d4ed8" }}>
                      Local Records (Future IMS Ready)
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "0.82rem",
                    color: "#64748b",
                    marginTop: "8px"
                  }}
                >
                  <strong>Institutional Integration Notice:</strong> Student demographics are currently managed in the local Sports Management database. Once the National Engineering College IMS server connection is activated, identity attributes will automatically synchronize with authoritative institutional records while retaining sports-specific history.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Add / Register Athlete Modal ──────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Student Athlete"
      >
        <form onSubmit={handleRegisterStudent} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {regError && (
            <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} />
              <span>{regError}</span>
            </div>
          )}
          {regSuccess && (
            <div style={{ background: "#ecfdf5", color: "#10b981", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} />
              <span>{regSuccess}</span>
            </div>
          )}

          <div className="nec-form-group">
            <label htmlFor="college-student-register" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e293b" }}>
              College Register Number / Roll No. <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="college-student-register"
              className="nec-form-control"
              required
              value={newRegNo}
              onChange={(e) => {
                setNewRegNo(e.target.value);
                if (regError) setRegError(null);
              }}
              placeholder="e.g. 2112001 or 2215045"
              style={{
                width: "100%",
                height: "40px",
                padding: "0 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontFamily: "monospace"
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", display: "block" }}>
              Registers athlete in local database. Demographics and department mapping will be inferred or resolved via local records.
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submittingStudent}>
              {submittingStudent ? "Registering..." : "Register Athlete"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
