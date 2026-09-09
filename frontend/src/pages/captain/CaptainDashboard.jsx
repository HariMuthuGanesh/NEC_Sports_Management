import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  AlertCircle, 
  Search, 
  Clock, 
  MapPin, 
  UserPlus, 
  Trash2, 
  Trophy,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  teamsApi, 
  tournamentsApi, 
  sportsApi, 
  playersApi, 
  attendanceApi, 
  matchesApi 
} from '../../services/api/apiServices';
import { useAuth } from '../../context/AuthContext';

const CaptainDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'register' | 'attendance' | 'fixtures'
  const [myTeams, setMyTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add player modal state
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [playerForm, setPlayerForm] = useState({ studentId: '', role: 'Player', jerseyNo: '' });

  // Team registration state
  const [newTeam, setNewTeam] = useState({
    name: '',
    sportId: '',
    tournamentId: '',
    coachName: '',
    jerseyColor: ''
  });

  // Attendance state
  const [selectedTeamForAttendance, setSelectedTeamForAttendance] = useState(null);
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  useEffect(() => {
    loadCaptainData();
  }, [user]);

  const loadCaptainData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsData, toursData, sportsData, matchesData] = await Promise.all([
        teamsApi.getCaptainTeams().catch(() => []),
        tournamentsApi.getTournaments().catch(() => []),
        sportsApi.getSports().catch(() => []),
        matchesApi.getMatches().catch(() => [])
      ]);

      setMyTeams(teamsData || []);
      setTournaments(toursData || []);
      setSports(sportsData || []);

      if (sportsData.length > 0 && !newTeam.sportId) {
        setNewTeam(prev => ({ ...prev, sportId: sportsData[0].sport_id || sportsData[0].id }));
      }
      if (toursData.length > 0 && !newTeam.tournamentId) {
        setNewTeam(prev => ({ ...prev, tournamentId: toursData[0].tournament_id || toursData[0].id }));
      }

      // Filter matches for captain's teams
      const captainTeamIds = new Set((teamsData || []).map(t => t.id || t.team_id));
      const filteredMatches = (matchesData || []).filter(m => 
        captainTeamIds.has(m.team_a_id) || captainTeamIds.has(m.team_b_id) ||
        captainTeamIds.has(m.teamAId) || captainTeamIds.has(m.teamBId)
      );
      setMatches(filteredMatches.length > 0 ? filteredMatches : matchesData);

      if (teamsData && teamsData.length > 0) {
        loadTeamRosterForAttendance(teamsData[0].id || teamsData[0].team_id);
      }
    } catch (err) {
      console.error('Failed to load captain workspace:', err);
      setError(err.message || 'Could not load captain dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamRosterForAttendance = async (teamId) => {
    try {
      setSelectedTeamForAttendance(teamId);
      const players = await playersApi.getPlayersByTeam(teamId);
      setAttendanceRoster(players || []);
      const initMap = {};
      (players || []).forEach(p => {
        initMap[p.student_id || p.id] = true;
      });
      setAttendanceMap(initMap);
    } catch (err) {
      console.error('Failed to load squad for attendance:', err);
    }
  };

  const handleSearchStudents = async (query) => {
    setStudentSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearchingStudents(true);
      const res = await playersApi.getAllPlayers(query);
      setSearchResults(res.data || res || []);
    } catch (err) {
      console.error('Student search failed:', err);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!selectedTeamForPlayer || !playerForm.studentId) return;

    try {
      await playersApi.addPlayerToTeam(selectedTeamForPlayer, {
        studentId: playerForm.studentId,
        position: playerForm.role,
        jerseyNo: playerForm.jerseyNo ? Number(playerForm.jerseyNo) : null
      });

      setSuccessMsg('Player added successfully to team roster!');
      setTimeout(() => setSuccessMsg(null), 4000);
      setSelectedTeamForPlayer(null);
      setPlayerForm({ studentId: '', role: 'Player', jerseyNo: '' });
      setStudentSearchQuery('');
      setSearchResults([]);
      loadCaptainData();
    } catch (err) {
      setError(err.message || 'Failed to add player to team');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleRegisterTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.name) {
      setError('Please enter a team name');
      return;
    }

    try {
      await teamsApi.registerTeam({
        name: newTeam.name,
        sport_id: Number(newTeam.sportId),
        tournament_id: Number(newTeam.tournamentId),
        coach_name: newTeam.coachName,
        jersey_color: newTeam.jerseyColor,
        status: 'Pending'
      });

      setSuccessMsg('Team registered successfully! Sent to Admin (PET) for official approval.');
      setTimeout(() => setSuccessMsg(null), 5000);
      setNewTeam({ name: '', sportId: sports[0]?.sport_id || '', tournamentId: tournaments[0]?.tournament_id || '', coachName: '', jerseyColor: '' });
      setActiveTab('teams');
      loadCaptainData();
    } catch (err) {
      setError(err.message || 'Failed to register team');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedTeamForAttendance) return;
    try {
      setIsSavingAttendance(true);
      await attendanceApi.saveSquadAttendance(selectedTeamForAttendance, attendanceMap);
      setSuccessMsg('Matchday squad attendance recorded and synced across academic departments!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message || 'Failed to save attendance');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Initializing Sports Captain Portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Captain Welcome Hero */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>Sports Captain Workspace</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">
              Welcome, Captain {user?.username || 'Team Lead'}
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Lead your cross-department sports squads, register athletes from any academic department, submit event entries for PET approval, and record matchday attendance.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400">My Teams</p>
              <p className="text-2xl font-black text-white">{myTeams.length}</p>
            </div>
            <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400">Fixtures</p>
              <p className="text-2xl font-black text-indigo-400">{matches.length}</p>
            </div>
            <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400">Tournaments</p>
              <p className="text-2xl font-black text-amber-400">{tournaments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-3 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 space-x-2">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'teams'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>My Teams & Roster</span>
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'register'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Register Team for Event</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'attendance'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Squad Attendance Marker</span>
        </button>
        <button
          onClick={() => setActiveTab('fixtures')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'fixtures'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Match Schedule</span>
        </button>
      </div>

      {/* Tab 1: Teams & Roster Management */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">My Managed Teams</h2>
              <p className="text-xs text-gray-400">Click a team to inspect full details or add players across branches</p>
            </div>
            <button
              onClick={() => setActiveTab('register')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-xs rounded-xl transition flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Squad</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTeams.map(team => (
              <div 
                key={team.id || team.team_id}
                className="bg-gray-900/90 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex flex-col justify-between space-y-4 transition shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg uppercase">
                      {team.sportName || 'Sport Squad'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      team.status === 'Approved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {team.status || 'Pending'}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white">{team.name}</h3>

                  <p className="text-xs text-gray-400">
                    Tournament: <strong>{team.tournamentName || 'Inter-Collegiate Tournament'}</strong>
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-400 pt-2 border-t border-gray-800">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{team.memberCount || 0} Athletes</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{team.deptCode || 'Multi-Dept'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Link
                    to={`/teams/${team.id || team.team_id}`}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl text-center transition"
                  >
                    View Roster
                  </Link>
                  <button
                    onClick={() => setSelectedTeamForPlayer(team.id || team.team_id)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Player</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {myTeams.length === 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-12 text-center space-y-4">
              <Shield className="w-12 h-12 text-gray-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Registered Teams Found</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                You have not registered any sports squads yet. Register your sport squad for open tournaments to get started.
              </p>
              <button
                onClick={() => setActiveTab('register')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-xs rounded-xl transition inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register Team Now</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Team Registration Form */}
      {activeTab === 'register' && (
        <div className="max-w-2xl mx-auto bg-gray-900/90 border border-gray-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="border-b border-gray-800 pb-4">
            <h2 className="text-xl font-black text-white">Register Squad for Tournament</h2>
            <p className="text-xs text-gray-400 mt-1">
              Submit team information. The registration will be automatically marked as <strong>Pending</strong> and sent to PET Admin for official clearance.
            </p>
          </div>

          <form onSubmit={handleRegisterTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Team Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., NEC Volleyball Warriors"
                value={newTeam.name}
                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Sport *
                </label>
                <select
                  value={newTeam.sportId}
                  onChange={e => setNewTeam({ ...newTeam, sportId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {sports.map(s => (
                    <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                      {s.name} ({s.category || 'Outdoor'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Tournament Event *
                </label>
                <select
                  value={newTeam.tournamentId}
                  onChange={e => setNewTeam({ ...newTeam, tournamentId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {tournaments.map(t => (
                    <option key={t.tournament_id || t.id} value={t.tournament_id || t.id}>
                      {t.name || t.title} ({t.academic_year || t.academicYear || '2025-2026'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Head Coach / Staff Advisor
                </label>
                <input
                  type="text"
                  placeholder="e.g., Coach Ramesh"
                  value={newTeam.coachName}
                  onChange={e => setNewTeam({ ...newTeam, coachName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Jersey Color
                </label>
                <input
                  type="text"
                  placeholder="e.g., Navy Blue / Gold"
                  value={newTeam.jerseyColor}
                  onChange={e => setNewTeam({ ...newTeam, jerseyColor: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm rounded-xl transition shadow-lg mt-4"
            >
              Submit Team Registration
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Squad Attendance Marker */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Matchday Squad Attendance</h2>
              <p className="text-xs text-gray-400">
                Mark attendance for your team. Records are instantly routed to each player's academic department coordinator.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedTeamForAttendance || ''}
                onChange={e => loadTeamRosterForAttendance(Number(e.target.value))}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs font-bold focus:outline-none"
              >
                {myTeams.map(t => (
                  <option key={t.id || t.team_id} value={t.id || t.team_id}>
                    {t.name} ({t.sportName})
                  </option>
                ))}
              </select>

              <button
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance || attendanceRoster.length === 0}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingAttendance ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Attendance</th>
                  <th className="py-3.5 px-4">Jersey</th>
                  <th className="py-3.5 px-4">Athlete Name</th>
                  <th className="py-3.5 px-4">Register Number</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm">
                {attendanceRoster.length > 0 ? (
                  attendanceRoster.map(p => {
                    const isChecked = attendanceMap[p.student_id || p.id] ?? true;
                    return (
                      <tr key={p.student_id || p.id} className="hover:bg-gray-800/40 transition">
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => setAttendanceMap({ ...attendanceMap, [p.student_id || p.id]: e.target.checked })}
                            className="w-4 h-4 text-amber-500 rounded bg-gray-800 border-gray-700 focus:ring-amber-400"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                          {p.jerseyNo ? `#${p.jerseyNo}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-300 text-xs">
                          {p.rollNo || p.studentId}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
                            {p.dept_code || p.dept}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-400">
                          {p.role || p.position || 'Player'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 text-sm">
                      No athletes found in this squad roster.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Match Fixtures */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Upcoming & Completed Fixtures</h2>
            <p className="text-xs text-gray-400">Matches scheduled for your sports squad across collegiate grounds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map(m => (
              <div 
                key={m.id || m.match_id}
                className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {m.pool || 'Pool A'} • {m.round}
                  </span>
                  <span className="text-gray-400">{new Date(m.date || m.scheduled_time).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between font-bold text-white text-base">
                  <span className="truncate max-w-[140px]">{m.teamA || m.team_a_name}</span>
                  <div className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-xl text-indigo-400 font-mono text-sm">
                    {m.scoreA ?? 0} : {m.scoreB ?? 0}
                  </div>
                  <span className="truncate max-w-[140px]">{m.teamB || m.team_b_name}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{m.ground || m.venue || 'National Engineering College Ground'}</span>
                  </span>
                  <span className={m.status === 'Completed' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Player Search Modal */}
      {selectedTeamForPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Add Athlete to Squad Roster</span>
              </h3>
              <button 
                onClick={() => setSelectedTeamForPlayer(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Live Student Search */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Search Student (Name or Roll Number)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="e.g., Hari or 2212001..."
                  value={studentSearchQuery}
                  onChange={e => handleSearchStudents(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Search Suggestions */}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700/60">
                  {searchResults.map(s => (
                    <button
                      key={s.student_id || s.id}
                      type="button"
                      onClick={() => {
                        setPlayerForm({ ...playerForm, studentId: s.register_number || s.studentId || s.id });
                        setStudentSearchQuery(`${s.student_name || s.name} (${s.register_number || s.studentId})`);
                        setSearchResults([]);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-700/60 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white">{s.student_name || s.name}</span>
                      <span className="text-gray-400 font-mono">{s.register_number || s.studentId} • {s.department_code || s.deptCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Selected Student Identifier / Roll No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Roll number / Register number"
                  value={playerForm.studentId}
                  onChange={e => setPlayerForm({ ...playerForm, studentId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Squad Role
                  </label>
                  <select
                    value={playerForm.role}
                    onChange={e => setPlayerForm({ ...playerForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="Player">Player</option>
                    <option value="Vice Captain">Vice Captain</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Reserve">Reserve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Jersey No.
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={playerForm.jerseyNo}
                    onChange={e => setPlayerForm({ ...playerForm, jerseyNo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeamForPlayer(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg"
                >
                  Enroll Athlete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainDashboard;
