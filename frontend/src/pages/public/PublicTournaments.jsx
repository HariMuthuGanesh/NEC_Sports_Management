import React, { useState, useEffect, useMemo, useCallback } from "react";
import { tournamentsApi, publicApi, competitionLevelsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import ErrorState from "../../components/common/ErrorState";
import {
  Trophy, Calendar, MapPin, Building, Search,
  X, ChevronRight
} from "lucide-react";
import "./PublicPortal.css";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export default function PublicTournaments() {
  const [scope, setScope] = useState("ALL"); // 'ALL', 'Intramural', 'Inter-Collegiate'
  const [tournaments, setTournaments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");

  // Detail Modal state
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [tournamentDetail, setTournamentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState("events"); // 'events', 'teams', 'matches'

  const fetchTournamentsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tourRes, levelsRes] = await Promise.all([
        tournamentsApi.getTournaments({ scope: scope === "ALL" ? "" : scope }),
        competitionLevelsApi.list({ isActive: 1 }).catch(() => [])
      ]);
      const list = Array.isArray(tourRes) ? tourRes : (tourRes?.items || tourRes?.data || []);
      setTournaments(list);
      setLevels(Array.isArray(levelsRes) ? levelsRes : (levelsRes?.data || []));
    } catch (err) {
      console.error("[PublicTournaments] error:", err);
      setError(err.message || "Failed to load institutional tournaments catalog.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchTournamentsData();
  }, [fetchTournamentsData]);

  // Open detail modal
  const openDetail = async (tourId) => {
    setSelectedTournamentId(tourId);
    setLoadingDetail(true);
    setDetailTab("events");
    try {
      const data = await publicApi.getTournamentDetails(tourId);
      setTournamentDetail(data);
    } catch (err) {
      console.error("[PublicTournaments] detail fetch error:", err);
      setTournamentDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedTournamentId(null);
    setTournamentDetail(null);
  };

  // Distinct academic years
  const academicYears = useMemo(() => {
    const set = new Set();
    tournaments.forEach(t => {
      if (t.academic_year) set.add(t.academic_year);
      if (t.academicYear) set.add(t.academicYear);
    });
    return Array.from(set).sort().reverse();
  }, [tournaments]);

  // Filtered list
  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const tScope = t.scope || t.tournament_scope || "Intramural";
      if (scope !== "ALL" && tScope !== scope) return false;

      if (selectedStatus !== "ALL" && t.status !== selectedStatus) return false;

      const tYear = t.academic_year || t.academicYear || "";
      if (selectedYear !== "ALL" && tYear !== selectedYear) return false;

      const tLevel = String(t.competition_level_id || t.tier || "").toLowerCase();
      if (selectedLevel !== "ALL") {
        const matchesLevel = tLevel === selectedLevel.toLowerCase() || String(t.tier).toLowerCase() === selectedLevel.toLowerCase();
        if (!matchesLevel) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (t.name || t.title || "").toLowerCase();
        const organizer = (t.organizer || "").toLowerCase();
        const venue = (t.venue || "").toLowerCase();
        if (!name.includes(q) && !organizer.includes(q) && !venue.includes(q)) return false;
      }

      return true;
    });
  }, [tournaments, scope, selectedStatus, selectedYear, selectedLevel, search]);

  return (
    <div className="nec-portal-page nec-public-tournaments">
      {/* Header Banner */}
      <div className="nec-portal-header" style={{
        background: "linear-gradient(135deg, #0d233a 0%, #153e67 60%, #1e5a8a 100%)",
        color: "#fff",
        padding: "36px 32px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f5c451", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}>
          <Trophy size={18} /> NATIONAL ENGINEERING COLLEGE • ATHLETIC DIRECTORATE
        </div>
        <h1 style={{ margin: 0, fontSize: "2.1rem", fontFamily: "var(--nec-font-display)", fontWeight: 800 }}>
          Tournaments & Athletic Meets
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", maxWidth: "780px", fontSize: "1rem", lineHeight: 1.5 }}>
          Official institutional catalog of Intramural departmental championships and Inter-Collegiate state/national invitation tournaments hosted by and participated in by NEC athletes.
        </p>

        {/* Scope Selector Tabs */}
        <div style={{
          display: "inline-flex",
          background: "rgba(0,0,0,0.25)",
          padding: "4px",
          borderRadius: "10px",
          marginTop: "12px",
          width: "fit-content",
          gap: "4px"
        }}>
          {[
            { id: "ALL", label: "All Tournaments" },
            { id: "Intramural", label: "Intramural (Inter-Departmental)" },
            { id: "Inter-Collegiate", label: "Inter-Collegiate (State / National)" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: scope === tab.id ? "#f5c451" : "transparent",
                color: scope === tab.id ? "#0d233a" : "#fff"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="nec-filter-toolbar" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px", flex: "1 1 280px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
            <input
              type="text"
              placeholder="Search tournaments, venues, or organizers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--nec-text-muted)" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
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
              <option value="ALL">All Statuses</option>
              <option value="Ongoing">🟢 Ongoing</option>
              <option value="Upcoming">📅 Upcoming</option>
              <option value="Completed">🏁 Completed</option>
              <option value="Cancelled">❌ Cancelled</option>
            </select>

            {/* Academic Year */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
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

            {/* Competition Level */}
            {levels.length > 0 && (
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
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
                <option value="ALL">All Competition Levels</option>
                {levels.map(lvl => (
                  <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                ))}
              </select>
            )}

            {(search || selectedStatus !== "ALL" || selectedYear !== "ALL" || selectedLevel !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedStatus("ALL");
                  setSelectedYear("ALL");
                  setSelectedLevel("ALL");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Content Area */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTournamentsData} />
      ) : filteredTournaments.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <Trophy size={48} style={{ color: "var(--nec-gold)", margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 8px", color: "var(--nec-text-main)" }}>No Tournaments Found</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", maxWidth: "460px", marginInline: "auto" }}>
            No tournaments match your current filter selection. Try switching between Intramural and Inter-Collegiate views or clearing the search terms.
          </p>
          <div style={{ marginTop: "20px" }}>
            <Button variant="secondary" onClick={() => { setScope("ALL"); setSearch(""); setSelectedStatus("ALL"); }}>
              Show All Tournaments
            </Button>
          </div>
        </Card>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "20px"
        }}>
          {filteredTournaments.map(t => {
            const tScope = t.scope || t.tournament_scope || "Intramural";
            const isInter = tScope === "Inter-Collegiate";
            const isOngoing = t.status === "Ongoing";

            return (
              <Card
                key={t.tournament_id || t.id}
                className="nec-tournament-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRadius: "14px",
                  border: isOngoing ? "2px solid #22c55e" : "1px solid var(--nec-border)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  padding: "20px"
                }}
              >
                {/* Top Badge Row */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      <Badge
                        variant={isInter ? "primary" : "secondary"}
                        style={{
                          background: isInter ? "#1e3a8a" : "#4338ca",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          letterSpacing: "0.5px"
                        }}
                      >
                        {isInter ? "🌐 Inter-Collegiate" : "🏛️ Intramural"}
                      </Badge>
                      {t.tier && (
                        <Badge variant="outline" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                          {t.tier}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={isOngoing ? "success" : t.status === "Upcoming" ? "primary" : "default"}
                      style={{ fontSize: "0.75rem", fontWeight: 700 }}
                    >
                      {isOngoing ? "🟢 LIVE / ONGOING" : t.status}
                    </Badge>
                  </div>

                  {/* Title & Academic Year */}
                  <h3 style={{
                    margin: "0 0 6px",
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "var(--nec-text-main)",
                    lineHeight: 1.3
                  }}>
                    {t.name || t.title}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", fontWeight: 600, marginBottom: "14px" }}>
                    Academic Year: {t.academic_year || t.academicYear || "-"}
                  </div>

                  {/* Details metadata */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "var(--nec-text-muted)", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Calendar size={15} style={{ flexShrink: 0, color: "var(--nec-blue-accent)" }} />
                      <span>{formatDate(t.start_date || t.startDate)} – {formatDate(t.end_date || t.endDate)}</span>
                    </div>
                    {t.venue && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <MapPin size={15} style={{ flexShrink: 0, color: "#e11d48" }} />
                        <span>{t.venue}</span>
                      </div>
                    )}
                    {t.organizer && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Building size={15} style={{ flexShrink: 0, color: "#059669" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.organizer}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Stats & Action */}
                <div style={{
                  borderTop: "1px solid var(--nec-border)",
                  paddingTop: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", gap: "14px", fontSize: "0.82rem" }}>
                    <div>
                      <span style={{ fontWeight: 800, color: "var(--nec-text-main)" }}>{t.total_events || 0}</span>
                      <span style={{ color: "var(--nec-text-muted)", marginLeft: "4px" }}>Events</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, color: "var(--nec-text-main)" }}>{t.total_competitions || 0}</span>
                      <span style={{ color: "var(--nec-text-muted)", marginLeft: "4px" }}>Matches</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openDetail(t.tournament_id || t.id)}
                    style={{ fontWeight: 700 }}
                  >
                    View Details <ChevronRight size={14} style={{ marginLeft: "4px" }} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tournament Detail Modal */}
      {selectedTournamentId && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }} onClick={closeDetail}>
          <div style={{
            background: "var(--nec-surface)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "840px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
            border: "1px solid var(--nec-border)"
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px",
              background: "linear-gradient(135deg, #0d233a 0%, #153e67 100%)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start"
            }}>
              <div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <Badge style={{ background: "#f5c451", color: "#0d233a", fontWeight: 800 }}>
                    {tournamentDetail?.tournament?.scope || "Tournament"}
                  </Badge>
                  {tournamentDetail?.tournament?.tier && (
                    <Badge variant="outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
                      {tournamentDetail.tournament.tier}
                    </Badge>
                  )}
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.45rem", fontWeight: 800 }}>
                  {tournamentDetail?.tournament?.name || "Tournament Overview"}
                </h2>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
                  Academic Year: {tournamentDetail?.tournament?.academic_year || "-"} • Status: {tournamentDetail?.tournament?.status || "-"}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid var(--nec-border)",
              background: "var(--nec-surface-raised)",
              padding: "0 24px"
            }}>
              {[
                { id: "events", label: `Events (${tournamentDetail?.events?.length || 0})` },
                { id: "teams", label: `Teams / Colleges (${tournamentDetail?.teams?.length || 0})` },
                { id: "matches", label: `Matches & Fixtures (${tournamentDetail?.matches?.length || 0})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetailTab(tab.id)}
                  style={{
                    padding: "12px 18px",
                    border: "none",
                    background: "none",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    color: detailTab === tab.id ? "var(--nec-blue-accent)" : "var(--nec-text-muted)",
                    borderBottom: detailTab === tab.id ? "3px solid var(--nec-blue-accent)" : "3px solid transparent",
                    transition: "all 0.15s"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: "1 1 auto" }}>
              {loadingDetail ? (
                <SkeletonLoader rows={4} />
              ) : !tournamentDetail ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--nec-text-muted)" }}>
                  Unable to load tournament details.
                </div>
              ) : (
                <>
                  {/* Events Tab */}
                  {detailTab === "events" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {tournamentDetail.events?.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--nec-text-muted)" }}>
                          No individual sports events registered under this tournament yet.
                        </div>
                      ) : (
                        tournamentDetail.events.map(ev => (
                          <div
                            key={ev.event_id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--nec-border)",
                              background: "var(--nec-surface)"
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--nec-text-main)", fontSize: "0.95rem" }}>
                                {ev.name}
                              </div>
                              <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                                Sport: <strong>{ev.sport_name}</strong> • Category: {ev.category || "General"} {ev.gender_category ? `(${ev.gender_category})` : ""}
                              </div>
                            </div>
                            <Badge variant={ev.event_status === "Completed" ? "success" : "default"}>
                              {ev.event_status || "Active"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Teams Tab */}
                  {detailTab === "teams" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {tournamentDetail.teams?.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--nec-text-muted)" }}>
                          No team entries recorded under this tournament yet.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                          {tournamentDetail.teams.map(tm => (
                            <div
                              key={tm.team_id}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "10px",
                                border: "1px solid var(--nec-border)",
                                background: "var(--nec-surface)"
                              }}
                            >
                              <div style={{ fontWeight: 700, color: "var(--nec-text-main)", fontSize: "0.92rem", marginBottom: "4px" }}>
                                {tm.name}
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                                {tm.department_name ? (
                                  <span>Dept: <strong>{tm.department_code || tm.department_name}</strong></span>
                                ) : (
                                  <span>Inst: <strong>{tm.institution_name}</strong></span>
                                )}
                                {tm.sport_name && <span> • {tm.sport_name}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Matches Tab */}
                  {detailTab === "matches" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {tournamentDetail.matches?.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--nec-text-muted)" }}>
                          No matches scheduled under this tournament yet.
                        </div>
                      ) : (
                        tournamentDetail.matches.map(m => (
                          <div
                            key={m.match_id}
                            style={{
                              padding: "14px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--nec-border)",
                              background: "var(--nec-surface)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 700, marginBottom: "4px" }}>
                                {m.sport_name} • {m.round} {m.pool ? `(${m.pool})` : ""} • {formatDate(m.scheduled_time)}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--nec-text-main)" }}>
                                {m.team_a_name} {m.dept_a_code ? `(${m.dept_a_code})` : ""}
                                <span style={{ color: "var(--nec-text-muted)", margin: "0 8px" }}>vs</span>
                                {m.team_b_name} {m.dept_b_code ? `(${m.dept_b_code})` : ""}
                              </div>
                              {m.status === "Completed" && (
                                <div style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 700, marginTop: "4px" }}>
                                  Score: {m.score_a} - {m.score_b} • Winner: {m.winner || m.winner_team_name || "Winner Decided"}
                                </div>
                              )}
                            </div>
                            <Badge variant={m.status === "Ongoing" ? "success" : m.status === "Completed" ? "default" : "primary"}>
                              {m.status === "Ongoing" ? "🟢 Live" : m.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 24px",
              background: "var(--nec-surface-raised)",
              borderTop: "1px solid var(--nec-border)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <Button variant="secondary" onClick={closeDetail}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
