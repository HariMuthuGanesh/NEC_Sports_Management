import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  tournamentsApi, 
  teamsApi, 
  sportsApi, 
  matchesApi 
} from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { 
  Plus, 
  Calendar, 
  Trophy, 
  Shield, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Layers,
  ArrowLeft,
  ExternalLink,
  Edit,
  Check
} from "lucide-react";
import "./AdminPortal.css";

export default function TournamentsManager() {
  const { t } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState("teams"); // 'teams' | 'fixtures' | 'details'
  
  // Data for selected tournament
  const [registeredTeams, setRegisteredTeams] = useState([]);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [venues, setVenues] = useState([]);
  const [sports, setSports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);

  // New Tournament Form
  const [newTournament, setNewTournament] = useState({
    title: "",
    academicYear: "2025-2026",
    tier: "Intramural",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "2026-09-30"
  });

  // New Match Fixture Form (matches the official fixture sheet: Ground, Pool, Date, Time, Team A, Team B)
  const [newMatch, setNewMatch] = useState({
    sportId: "",
    teamAId: "",
    teamBId: "",
    venueId: "",
    pool: "Pool A",
    round: "League",
    date: new Date().toISOString().split("T")[0],
    time: "09:00 AM",
    scheduledTime: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    loadTournaments();
    loadVenuesAndSports();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentWorkspace(selectedTournament.id || selectedTournament.tournament_id);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentsApi.getTournaments();
      setTournaments(data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadVenuesAndSports = async () => {
    try {
      const [vData, sData] = await Promise.all([
        sportsApi.getVenues().catch(() => []),
        sportsApi.getSports().catch(() => [])
      ]);
      setVenues(vData || []);
      setSports(sData || []);
      if (sData[0]) setNewMatch(prev => ({ ...prev, sportId: sData[0].sport_id || sData[0].id }));
      if (vData[0]) setNewMatch(prev => ({ ...prev, venueId: vData[0].venue_id || vData[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadTournamentWorkspace = async (tournamentId) => {
    try {
      setLoading(true);
      const [teamsData, matchesData] = await Promise.all([
        tournamentsApi.getTournamentTeams(tournamentId).catch(() => []),
        tournamentsApi.getTournamentMatches(tournamentId).catch(() => [])
      ]);
      setRegisteredTeams(teamsData || []);
      setTournamentMatches(matchesData || []);

      if (teamsData.length >= 2) {
        setNewMatch(prev => ({
          ...prev,
          teamAId: teamsData[0].id || teamsData[0].team_id,
          teamBId: teamsData[1].id || teamsData[1].team_id
        }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (!newTournament.title.trim()) return;

    try {
      await tournamentsApi.createTournament({
        title: newTournament.title,
        academicYear: newTournament.academicYear,
        tier: newTournament.tier,
        description: newTournament.description,
        startDate: newTournament.startDate,
        endDate: newTournament.endDate,
        organizer: "Physical Education Department & Sports Directorate"
      });

      setIsCreateModalOpen(false);
      setNewTournament({
        title: "",
        academicYear: "2025-2026",
        tier: "Intramural",
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "2026-09-30"
      });
      setSuccessMsg("Tournament created successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTournaments();
    } catch (err) {
      setError(err.message || "Failed to create tournament");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleUpdateTeamStatus = async (teamId, status) => {
    try {
      await teamsApi.updateTeamStatus(teamId, status);
      setSuccessMsg(`Team marked as ${status} successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (selectedTournament) {
        loadTournamentWorkspace(selectedTournament.id || selectedTournament.tournament_id);
      }
    } catch (err) {
      setError(err.message || "Failed to update team clearance status");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleCreateFixtureMatch = async (e) => {
    e.preventDefault();
    if (!selectedTournament || !newMatch.teamAId || !newMatch.teamBId) {
      setError("Please select both participating teams");
      return;
    }

    try {
      const tourId = selectedTournament.id || selectedTournament.tournament_id;
      await tournamentsApi.createTournamentMatch(tourId, {
        tournament_id: tourId,
        sport_id: Number(newMatch.sportId),
        team_a_id: Number(newMatch.teamAId),
        team_b_id: Number(newMatch.teamBId),
        venue_id: Number(newMatch.venueId),
        pool: newMatch.pool,
        round: newMatch.round,
        scheduled_time: newMatch.scheduledTime || `${newMatch.date} 09:00:00`,
        status: "Scheduled"
      });

      setIsAddMatchModalOpen(false);
      setSuccessMsg("Match fixture added to tournament pool successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTournamentWorkspace(tourId);
    } catch (err) {
      setError(err.message || "Failed to create match fixture");
      setTimeout(() => setError(null), 4000);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Unified Tournament Detail Workspace View
  // ─────────────────────────────────────────────────────────────
  if (selectedTournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Back & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedTournament(null)}
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800/60"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to All Tournaments</span>
          </button>
          
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {selectedTournament.status || "Active Tournament"}
          </span>
        </div>

        {/* Tournament Header Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                  {selectedTournament.academicYear || selectedTournament.academic_year || "2025-2026"}
                </span>
                <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium border border-gray-700">
                  {selectedTournament.eventCategory || selectedTournament.tier || "Intramural"}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-400" />
                <span>{selectedTournament.title || selectedTournament.name}</span>
              </h1>

              <p className="text-gray-400 text-xs max-w-2xl">
                Organized by <strong>{selectedTournament.organizer || "Physical Education Department"}</strong> • Dates: {selectedTournament.startDate || selectedTournament.start_date} to {selectedTournament.endDate || selectedTournament.end_date || "TBD"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddMatchModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>+ Schedule Match Fixture</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Banners */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="flex border-b border-gray-800 space-x-2">
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === "teams"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Registered Teams ({registeredTeams.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("fixtures")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === "fixtures"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pool Fixtures & Grounds ({tournamentMatches.length})</span>
          </button>
        </div>

        {/* TAB 1: Registered Teams & Clearance Approvals */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Registered Sports Squads</h3>
                <p className="text-xs text-gray-400">
                  Inspect team rosters, captain contacts, and approve clearance status for official tournament entry.
                </p>
              </div>
            </div>

            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Team Name</th>
                    <th className="py-3.5 px-4">Sport</th>
                    <th className="py-3.5 px-4">Lead Department</th>
                    <th className="py-3.5 px-4">Team Captain</th>
                    <th className="py-3.5 px-4">Roster Size</th>
                    <th className="py-3.5 px-4">Clearance Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-sm">
                  {registeredTeams.length > 0 ? (
                    registeredTeams.map((t) => (
                      <tr key={t.id || t.team_id} className="hover:bg-gray-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <Link 
                            to={`/teams/${t.id || t.team_id}`}
                            className="hover:text-indigo-400 flex items-center space-x-1.5 group"
                          >
                            <span>{t.name}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-indigo-400" />
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">{t.sportName}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
                            {t.deptCode || t.deptName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 text-xs">
                          {t.captainName ? (
                            <div>
                              <p className="font-semibold text-white">{t.captainName}</p>
                              <p className="text-gray-500 font-mono">{t.captainRoll}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Not Assigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-indigo-400 text-xs">
                          {t.memberCount || 0} Athletes
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : t.status === "Pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {t.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Link
                            to={`/teams/${t.id || t.team_id}`}
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                          >
                            <span>Inspect</span>
                          </Link>
                          {t.status !== "Approved" && (
                            <button
                              onClick={() => handleUpdateTeamStatus(t.id || t.team_id, "Approved")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400 text-sm">
                        No squads registered for this tournament yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Pool Fixtures & Grounds (Matches Official Collegiate Fixture Table) */}
        {activeTab === "fixtures" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Collegiate Match Fixture Sheet</h3>
                <p className="text-xs text-gray-400">
                  Official stage scheduling across home grounds and external university sports grounds.
                </p>
              </div>

              <button
                onClick={() => setIsAddMatchModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>+ Schedule Match</span>
              </button>
            </div>

            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">S.No</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Pool / Stage</th>
                    <th className="py-3.5 px-4">Ground / College Venue</th>
                    <th className="py-3.5 px-4 text-center">Match Fixture (Team vs Team)</th>
                    <th className="py-3.5 px-4 text-center">Score</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-sm">
                  {tournamentMatches.length > 0 ? (
                    tournamentMatches.map((m, idx) => (
                      <tr key={m.id || m.match_id} className="hover:bg-gray-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-gray-400 text-xs font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white text-xs">
                            {new Date(m.date || m.scheduled_time).toLocaleDateString()}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {new Date(m.date || m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {m.pool || "Pool A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5 text-xs text-gray-300">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-medium">{m.ground || m.venue || "National Engineering College Ground"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-white">
                          <div className="flex items-center justify-center space-x-3">
                            <span className="text-indigo-400">{m.teamA || m.team_a_name}</span>
                            <span className="text-gray-500 text-xs uppercase font-normal">vs</span>
                            <span className="text-purple-400">{m.teamB || m.team_b_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                          {m.status === "Completed" ? (
                            <span className="px-2 py-1 bg-gray-800 rounded text-emerald-400">
                              {m.scoreA} - {m.scoreB}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            m.status === "Completed" 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : m.status === "Ongoing" 
                              ? "bg-amber-500/10 text-amber-400 animate-pulse" 
                              : "bg-gray-800 text-gray-400"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400 text-sm">
                        No match fixtures generated for this tournament yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Match Fixture */}
        <Modal
          isOpen={isAddMatchModalOpen}
          onClose={() => setIsAddMatchModalOpen(false)}
          title="Schedule Tournament Match Fixture"
        >
          <form onSubmit={handleCreateFixtureMatch} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Sport *</label>
                <select
                  value={newMatch.sportId}
                  onChange={e => setNewMatch({ ...newMatch, sportId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                >
                  {sports.map(s => (
                    <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Pool / Stage *</label>
                <select
                  value={newMatch.pool}
                  onChange={e => setNewMatch({ ...newMatch, pool: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                >
                  <option value="Pool A">Pool A</option>
                  <option value="Pool B">Pool B</option>
                  <option value="Pool C">Pool C</option>
                  <option value="Pool D">Pool D</option>
                  <option value="Quarter-Final">Quarter-Final</option>
                  <option value="Semi-Final">Semi-Final</option>
                  <option value="Final">Final</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Team A *</label>
                <select
                  value={newMatch.teamAId}
                  onChange={e => setNewMatch({ ...newMatch, teamAId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                >
                  {registeredTeams.map(t => (
                    <option key={t.id || t.team_id} value={t.id || t.team_id}>
                      {t.name} ({t.deptCode || t.deptName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Team B *</label>
                <select
                  value={newMatch.teamBId}
                  onChange={e => setNewMatch({ ...newMatch, teamBId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                >
                  {registeredTeams.map(t => (
                    <option key={t.id || t.team_id} value={t.id || t.team_id}>
                      {t.name} ({t.deptCode || t.deptName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Ground / College Venue *</label>
              <select
                value={newMatch.venueId}
                onChange={e => setNewMatch({ ...newMatch, venueId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
              >
                {venues.map(v => (
                  <option key={v.venue_id || v.id} value={v.venue_id || v.id}>
                    {v.name} {v.college_name ? `(${v.college_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                value={newMatch.scheduledTime}
                onChange={e => setNewMatch({ ...newMatch, scheduledTime: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAddMatchModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Add Fixture Match</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Primary Tournaments Catalog View
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">{t.tournamentsManagement || "Tournaments Management"}</h2>
          <p className="nec-page-desc">
            Manage tournament series, configure collegiate pool fixtures across grounds, and approve squad clearances.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          {t.createTournament || "Create Tournament"}
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadTournaments} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {tournaments.map((t) => (
            <div
              key={t.id || t.tournament_id}
              onClick={() => setSelectedTournament(t)}
              className="bg-gray-900/90 border border-gray-800 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-4 cursor-pointer transition shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg">
                    {t.academicYear || t.academic_year || "2025-2026"}
                  </span>
                  <Badge status={t.status === "Ongoing" ? "live" : t.status === "Registration Open" ? "info" : "success"}>
                    {t.status || "Upcoming"}
                  </Badge>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition">
                  {t.title || t.name}
                </h3>

                <p className="text-xs text-gray-400 line-clamp-2">
                  {t.organizer || "Physical Education Department & Sports Directorate"}
                </p>

                <div className="flex items-center space-x-4 text-xs text-gray-400 pt-2 border-t border-gray-800">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t.startDate || t.start_date}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.eventCategory || t.tier || "Intramural"}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
                <span>Open Tournament Workspace</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Tournament */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Tournament Series"
      >
        <form onSubmit={handleCreateTournament} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Tournament Title *
            </label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="e.g. NEC Annual Inter-Department Championship 2026"
              value={newTournament.title}
              onChange={(e) => setNewTournament({ ...newTournament, title: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Academic Year *
              </label>
              <input
                type="text"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={newTournament.academicYear}
                onChange={(e) => setNewTournament({ ...newTournament, academicYear: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Tier / Category
              </label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={newTournament.tier}
                onChange={(e) => setNewTournament({ ...newTournament, tier: e.target.value })}
              >
                <option value="Intramural">Intramural</option>
                <option value="District">District</option>
                <option value="Zonal">Zonal</option>
                <option value="State">State</option>
                <option value="National">National</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Description & Rules
            </label>
            <textarea
              className="nec-table-search-input"
              style={{ maxWidth: "100%", height: "80px", fontFamily: "inherit" }}
              placeholder="Enter tournament description and clearance guidelines..."
              value={newTournament.description}
              onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Publish Tournament</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
