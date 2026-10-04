import React, { useState, useEffect, useMemo, useCallback } from "react";
import { odApi, sportsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import {
  FileCheck,
  Search,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  ArrowUpDown,
  X,
  Trophy,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import "./PublicOdList.css";
import "./PublicPortal.css";

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

// Sport icon helper for visual distinction
function getSportIcon(sportName = "") {
  const s = sportName.toLowerCase();
  if (s.includes("cricket")) return "🏏";
  if (s.includes("football") || s.includes("soccer")) return "⚽";
  if (s.includes("badminton")) return "🏸";
  if (s.includes("volleyball")) return "🏐";
  if (s.includes("basketball")) return "🏀";
  if (s.includes("kabaddi")) return "🤼";
  if (s.includes("chess")) return "♟️";
  if (s.includes("table tennis")) return "🏓";
  if (s.includes("athletic") || s.includes("track")) return "🏃";
  return "🏆";
}

export default function PublicOdList({ onNavigate, initialSport = null }) {
  // Sports overview state
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [sportsError, setSportsError] = useState(null);

  // Selected sport state (null = show all sports cards, object = show sport-specific OD list)
  const [selectedSport, setSelectedSport] = useState(initialSport);

  // Sport search filter on overview
  const [sportSearch, setSportSearch] = useState("");
  const [showOnlyWithRecords, setShowOnlyWithRecords] = useState(false);

  // Students list state for selected sport
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState(null);

  // Filters on sport-specific view
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [nameSearch, setNameSearch] = useState("");
  const [sortDirection, setSortDirection] = useState("ASC"); // 'ASC' | 'DESC'

  // Master departments list for filtering dropdown
  const [allDepartments, setAllDepartments] = useState([]);

  // Fetch sports summary
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

  // Fetch all departments for filter dropdown
  useEffect(() => {
    sportsApi.getDepartments()
      .then(res => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setAllDepartments(list);
      })
      .catch(err => {
        console.warn("[PublicOdList] Could not fetch departments:", err);
      });
  }, []);

  // Fetch sports on mount
  useEffect(() => {
    fetchSportsSummary();
  }, [fetchSportsSummary]);

  // Fetch approved OD students when a sport is selected
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
    if (selectedSport) {
      fetchSportStudents(selectedSport);
    }
  }, [selectedSport, fetchSportStudents]);

  // Filter sports for the overview grid
  const filteredSports = useMemo(() => {
    return sports.filter(s => {
      const nameMatch = (s.sport_name || s.name || "").toLowerCase().includes(sportSearch.toLowerCase().trim());
      if (showOnlyWithRecords) {
        return nameMatch && (Number(s.approved_count) > 0);
      }
      return nameMatch;
    });
  }, [sports, sportSearch, showOnlyWithRecords]);

  // Dynamic departments list for selected sport (combines master departments with records)
  const availableDepartments = useMemo(() => {
    const map = new Map();
    // Add departments present in current sport's records
    students.forEach(st => {
      if (st.department_code && !map.has(st.department_code)) {
        map.set(st.department_code, st.department_name || st.department_code);
      }
    });
    // Add master departments
    allDepartments.forEach(d => {
      if (d.code && !map.has(d.code)) {
        map.set(d.code, d.name || d.code);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [students, allDepartments]);

  // Client-side filtering & sorting of students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Department filter
    if (deptFilter && deptFilter !== "ALL") {
      result = result.filter(st => {
        const code = (st.department_code || "").toUpperCase();
        const name = (st.department_name || "").toUpperCase();
        const target = deptFilter.toUpperCase();
        return code === target || name === target;
      });
    }

    // Name search
    if (nameSearch.trim()) {
      const q = nameSearch.toLowerCase().trim();
      result = result.filter(st =>
        (st.student_name || "").toLowerCase().includes(q)
      );
    }

    // Alphabetical name sorting
    result.sort((a, b) => {
      const nameA = (a.student_name || "").toLowerCase();
      const nameB = (b.student_name || "").toLowerCase();
      if (sortDirection === "DESC") {
        return nameB.localeCompare(nameA);
      }
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [students, deptFilter, nameSearch, sortDirection]);

  // Handle selecting a sport card
  const handleSelectSport = (sport) => {
    setSelectedSport(sport);
    setDeptFilter("ALL");
    setNameSearch("");
  };

  // Handle back to all sports
  const handleBackToSports = () => {
    setSelectedSport(null);
    setDeptFilter("ALL");
    setNameSearch("");
    // Refresh sport counts to keep numbers current
    fetchSportsSummary();
  };

  // Toggle alphabetical sort
  const toggleSort = () => {
    setSortDirection(prev => (prev === "ASC" ? "DESC" : "ASC"));
  };

  return (
    <div className="nec-portal-page nec-od-portal">
      {/* ── View 1: Sports Directory Grid ─────────────────────────────────── */}
      {!selectedSport ? (
        <>
          {/* Header */}
          <div className="nec-od-header">
            <div className="nec-od-title-row">
              <h1 className="nec-od-header-title">
                <FileCheck size={28} color="var(--nec-primary, #1e40af)" />
                OD Verification List
              </h1>
            </div>
          </div>

          {/* Search & Filter Bar */}
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
                <button
                  type="button"
                  className="nec-od-clear-btn"
                  onClick={() => setSportSearch("")}
                  title="Clear sport search"
                  aria-label="Clear sport search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <Button
              variant={showOnlyWithRecords ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowOnlyWithRecords(v => !v)}
            >
              <Filter size={14} style={{ marginRight: 6 }} />
              {showOnlyWithRecords ? "Showing Active ODs" : "All Sports"}
            </Button>
          </div>

          {/* Sports Cards Grid */}
          {loadingSports ? (
            <SkeletonLoader rows={4} />
          ) : sportsError ? (
            <div className="nec-od-empty-card">
              <div className="nec-od-empty-icon-wrap">
                <AlertCircle size={28} />
              </div>
              <h3 className="nec-od-empty-title">Unable to Load Sports List</h3>
              <p className="nec-od-empty-desc">{sportsError}</p>
              <Button variant="outline" size="sm" onClick={fetchSportsSummary}>
                Retry Loading
              </Button>
            </div>
          ) : filteredSports.length === 0 ? (
            <div className="nec-od-empty-card">
              <div className="nec-od-empty-icon-wrap">
                <Search size={28} />
              </div>
              <h3 className="nec-od-empty-title">No Sports Found</h3>
              <p className="nec-od-empty-desc">
                {sportSearch
                  ? `No sports matched your search query "${sportSearch}".`
                  : "No sports are currently registered in the catalog."}
              </p>
              {sportSearch && (
                <Button variant="outline" size="sm" onClick={() => setSportSearch("")}>
                  Clear Search Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="nec-od-sports-grid">
              {filteredSports.map((sp) => {
                const count = Number(sp.approved_count || 0);
                const icon = getSportIcon(sp.sport_name || sp.name);
                return (
                  <div
                    key={sp.sport_id || sp.name}
                    className="nec-od-sport-card"
                    onClick={() => handleSelectSport(sp)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectSport(sp);
                      }
                    }}
                  >
                    <div>
                      <div className="nec-od-sport-card-top">
                        <div className="nec-od-sport-icon-box">{icon}</div>
                        <span className={`nec-od-count-badge ${count > 0 ? "has-records" : "empty-records"}`}>
                          {count > 0 ? `${count} Student${count > 1 ? "s" : ""} Approved` : "No Active ODs"}
                        </span>
                      </div>
                      <h3 className="nec-od-sport-card-name">{sp.sport_name || sp.name}</h3>
                      <div className="nec-od-sport-card-cat">
                        Category: {sp.category || "Open"}
                      </div>
                    </div>

                    <div className="nec-od-sport-card-footer">
                      <span className="nec-od-days-subtext">
                        {sp.latest_date ? `Latest: ${formatDate(sp.latest_date)}` : "Verified Records"}
                      </span>
                      <span className="nec-od-view-action">
                        View List <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── View 2: Dedicated Sport OD Student Records Screen ─────────────── */
        <>
          {/* Header & Back Action */}
          <div className="nec-od-sport-view-header">
            <button
              type="button"
              className="nec-od-back-btn"
              onClick={handleBackToSports}
              aria-label="Back to all sports"
            >
              <ArrowLeft size={16} />
              <span>Back to All Sports</span>
            </button>

            <div className="nec-od-sport-title-bar">
              <div className="nec-od-sport-title-left">
                <div className="nec-od-sport-avatar">
                  {getSportIcon(selectedSport.sport_name || selectedSport.name)}
                </div>
                <div>
                  <h1 className="nec-od-sport-heading">
                    {selectedSport.sport_name || selectedSport.name}
                  </h1>
                </div>
              </div>

              <div className="nec-od-status-pill">
                <CheckCircle2 size={15} />
                <span>Approved</span>
              </div>
            </div>
          </div>

          {/* Filtering & Sorting Toolbar */}
          <div className="nec-od-toolbar">
            <div className="nec-od-toolbar-left">
              {/* Department Filter */}
              <div className="nec-od-filter-group">
                <label htmlFor="od-dept-select" className="nec-od-filter-label">
                  <Building2 size={15} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Department:
                </label>
                <select
                  id="od-dept-select"
                  className="nec-od-select"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="ALL">All Departments</option>
                  {availableDepartments.map(d => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name Search */}
              <div className="nec-od-name-search-box">
                <Search size={16} color="var(--nec-text-muted, #94a3b8)" />
                <input
                  type="text"
                  placeholder="Search student by name..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  aria-label="Search student by name"
                />
                {nameSearch && (
                  <button
                    type="button"
                    className="nec-od-clear-btn"
                    onClick={() => setNameSearch("")}
                    title="Clear student search"
                    aria-label="Clear student search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Sorting Toggle */}
            <div className="nec-od-toolbar-right">
              <button
                type="button"
                className="nec-od-sort-btn"
                onClick={toggleSort}
                title="Toggle alphabetical sort"
                aria-label={`Sort names ${sortDirection === "ASC" ? "Z to A" : "A to Z"}`}
              >
                <ArrowUpDown size={15} />
                <span>Name ({sortDirection === "ASC" ? "A-Z" : "Z-A"})</span>
              </button>
            </div>
          </div>

          {/* Student Verification Table */}
          {loadingStudents ? (
            <SkeletonLoader rows={5} />
          ) : studentsError ? (
            <div className="nec-od-empty-card">
              <div className="nec-od-empty-icon-wrap">
                <AlertCircle size={28} />
              </div>
              <h3 className="nec-od-empty-title">Error Loading OD Records</h3>
              <p className="nec-od-empty-desc">{studentsError}</p>
              <Button variant="outline" size="sm" onClick={() => fetchSportStudents(selectedSport)}>
                Retry
              </Button>
            </div>
          ) : students.length === 0 ? (
            /* Sport exists but currently has no approved OD students */
            <div className="nec-od-empty-card">
              <div className="nec-od-empty-icon-wrap">
                <Trophy size={28} />
              </div>
              <h3 className="nec-od-empty-title">No Approved OD Records</h3>
              <Button variant="outline" size="sm" onClick={handleBackToSports}>
                Browse Other Sports
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            /* Filters yielded no matches */
            <div className="nec-od-empty-card">
              <div className="nec-od-empty-icon-wrap">
                <Search size={28} />
              </div>
              <h3 className="nec-od-empty-title">No Students Found</h3>
              <p className="nec-od-empty-desc">
                {nameSearch && deptFilter !== "ALL"
                  ? `No student matching "${nameSearch}" found in department "${deptFilter}".`
                  : nameSearch
                  ? `No student found matching "${nameSearch}".`
                  : `No approved students found for department "${deptFilter}".`}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {deptFilter !== "ALL" && (
                  <Button variant="outline" size="sm" onClick={() => setDeptFilter("ALL")}>
                    Reset Department Filter
                  </Button>
                )}
                {nameSearch && (
                  <Button variant="outline" size="sm" onClick={() => setNameSearch("")}>
                    Clear Name Search
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="nec-od-table-wrapper">
              <table className="nec-od-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Sport</th>
                    <th>OD Validity Period</th>
                    <th>Tournament / Event</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st, idx) => {
                    const initials = (st.student_name || "S")
                      .split(" ")
                      .map(p => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const fromFormatted = formatDate(st.from_date);
                    const toFormatted = formatDate(st.to_date);
                    const isRange = st.from_date && st.to_date && fromFormatted !== toFormatted;

                    return (
                      <tr key={st.request_id || `${st.student_name}-${idx}`}>
                        <td style={{ color: "var(--nec-text-muted, #94a3b8)", width: 40 }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="nec-od-student-cell">
                            <div className="nec-od-student-avatar-pill">
                              {initials}
                            </div>
                            <span>{st.student_name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="nec-od-dept-cell">
                            <span className="nec-od-dept-code">{st.department_code || "GEN"}</span>
                            <span>{st.department_name || "-"}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{st.sport_name || selectedSport.sport_name}</span>
                        </td>
                        <td>
                          <div className="nec-od-date-cell">
                            <span className="nec-od-date-text">
                              {isRange ? `${fromFormatted} to ${toFormatted}` : fromFormatted}
                            </span>
                            <span className="nec-od-days-subtext">
                              <Clock size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
                              {st.total_days || 1} day{Number(st.total_days || 1) > 1 ? "s" : ""} OD
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: "var(--nec-text-secondary, #64748b)", fontSize: "0.86rem" }}>
                            {st.tournament_name || "Collegiate Tournament"}
                          </span>
                        </td>
                        <td>
                          <span className="nec-od-status-pill">
                            <CheckCircle2 size={13} />
                            Approved
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
