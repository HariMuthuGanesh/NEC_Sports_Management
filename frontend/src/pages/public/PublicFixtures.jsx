import React, { useMemo, useState } from "react";
import { matchesApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Calendar, Clock, MapPin, ArrowUpDown, Filter } from "lucide-react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import "./PublicPortal.css";

// Helper for formatting ISO date/time into clean separated strings
function formatDateTime(val) {
  if (!val) return { dateStr: "TBD", timeStr: "" };
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return { dateStr: String(val), timeStr: "" };
    const dateStr = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: String(val), timeStr: "" };
  }
}

// Sport icon helper for visual distinction
function getSportIcon(sportName = "") {
  const s = String(sportName).toLowerCase();
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

export default function PublicFixtures({ departmentCode }) {
  const { data: rawMatches, loading, error } = useAutoRefresh(
    () => matchesApi.getMatches(),
    { interval: 15000, deps: [departmentCode] }
  );

  const [selectedSport, setSelectedSport] = useState("ALL");
  const [sortOption, setSortOption] = useState("date_asc");

  // Filter scheduled matches by department if provided
  const baseMatches = useMemo(() => {
    if (!rawMatches || !Array.isArray(rawMatches)) return [];
    const scheduledMatches = rawMatches.filter((match) => match.status === "Scheduled");
    const effectiveDept = departmentCode && departmentCode !== "All" ? departmentCode : null;
    return effectiveDept
      ? scheduledMatches.filter((match) => match.deptA === effectiveDept || match.deptB === effectiveDept)
      : scheduledMatches;
  }, [rawMatches, departmentCode]);

  // Extract available sports from scheduled matches
  const availableSports = useMemo(() => {
    const set = new Set();
    baseMatches.forEach(m => {
      if (m.sport) set.add(m.sport);
    });
    return Array.from(set).sort();
  }, [baseMatches]);

  // Apply sport filter and sorting
  const processedMatches = useMemo(() => {
    let result = [...baseMatches];

    // Sport filter
    if (selectedSport && selectedSport !== "ALL") {
      result = result.filter(m => (m.sport || "").toLowerCase() === selectedSport.toLowerCase());
    }

    // Sort by Date & Time or Sport
    result.sort((a, b) => {
      const timeA = new Date(a.date || a.scheduled_time || 0).getTime();
      const timeB = new Date(b.date || b.scheduled_time || 0).getTime();
      const sportA = (a.sport || "").toLowerCase();
      const sportB = (b.sport || "").toLowerCase();

      switch (sortOption) {
        case "date_asc":
          return timeA - timeB;
        case "date_desc":
          return timeB - timeA;
        case "sport_asc":
          return sportA.localeCompare(sportB) || (timeA - timeB);
        case "sport_desc":
          return sportB.localeCompare(sportA) || (timeA - timeB);
        default:
          return timeA - timeB;
      }
    });

    return result;
  }, [baseMatches, selectedSport, sortOption]);

  const columns = [
    {
      key: "date",
      label: "Date & Time",
      render: (val, row) => {
        const { dateStr, timeStr } = formatDateTime(val || row.scheduled_time);
        return (
          <div className="nec-fixture-date-cell">
            <span className="nec-fixture-date">{dateStr}</span>
            {timeStr && (
              <span className="nec-fixture-time">
                <Clock size={12} /> {timeStr}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "sport",
      label: "Sport",
      render: (val) => (
        <div className="nec-fixture-sport-cell">
          <span className="nec-fixture-sport-icon">{getSportIcon(val)}</span>
          <span className="nec-fixture-sport-name">{val}</span>
        </div>
      )
    },
    {
      key: "round",
      label: "Round",
      render: (val) => <span className="nec-fixture-round-pill">{val || "League"}</span>
    },
    {
      key: "matchup",
      label: "Match",
      render: (_, row) => (
        <div className="nec-fixture-matchup-cell">
          <div className="nec-fixture-team">
            <span className="nec-fixture-dept-tag">{row?.deptA || row?.dept_a_code || "DEP"}</span>
            <span className="nec-fixture-team-name">{row?.teamA || row?.team_a_name || "Team A"}</span>
          </div>
          <span className="nec-fixture-vs">VS</span>
          <div className="nec-fixture-team">
            <span className="nec-fixture-dept-tag">{row?.deptB || row?.dept_b_code || "DEP"}</span>
            <span className="nec-fixture-team-name">{row?.teamB || row?.team_b_name || "Team B"}</span>
          </div>
        </div>
      )
    },
    {
      key: "venue",
      label: "Venue",
      render: (val) => (
        <span className="nec-fixture-venue">
          <MapPin size={13} /> {val || "Campus Ground"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <Badge status="scheduled">{val || "Scheduled"}</Badge>
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{departmentCode ? "Department Match Fixtures" : "Match Fixtures & Schedules"}</h2>
      </div>

      {(error || (!loading && baseMatches.length === 0)) ? (
        <PublicInfoCard
          icon={Calendar}
          title="No Upcoming Fixtures"
          message="No upcoming fixtures scheduled."
        />
      ) : (
        <>
          {/* Controls toolbar for sorting by Date & Time, Sport, and Sport filtering */}
          <div className="nec-fixtures-toolbar">
            <div className="nec-fixtures-toolbar-left">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Filter size={15} color="var(--nec-text-muted, #94a3b8)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Sport:</span>
                <select
                  className="nec-fixture-select"
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  aria-label="Filter fixtures by sport"
                >
                  <option value="ALL">All Sports ({baseMatches.length})</option>
                  {availableSports.map(sp => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="nec-fixtures-toolbar-right">
              <ArrowUpDown size={15} color="var(--nec-text-muted, #94a3b8)" />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Sort:</span>
              <select
                className="nec-fixture-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label="Sort fixtures"
              >
                <option value="date_asc">Date & Time (Earliest First)</option>
                <option value="date_desc">Date & Time (Latest First)</option>
                <option value="sport_asc">Sport (A to Z)</option>
                <option value="sport_desc">Sport (Z to A)</option>
              </select>
            </div>
          </div>

          <Table
            columns={columns}
            data={processedMatches}
            loading={loading}
            searchPlaceholder="Search by team, sport, date, venue..."
          />
        </>
      )}
    </div>
  );
}
