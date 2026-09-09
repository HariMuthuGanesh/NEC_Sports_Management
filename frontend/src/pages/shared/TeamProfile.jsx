import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { teamsApi } from '../../services/api/apiServices';
import { 
  Shield, 
  User, 
  Award, 
  Calendar, 
  MapPin, 
  ChevronLeft, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Activity,
  Layers,
  Phone,
  Mail,
  Shirt
} from 'lucide-react';

const TeamProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamsApi.getTeamDetails(id);
      setTeam(data);
    } catch (err) {
      console.error('Failed to load team profile:', err);
      setError(err.message || 'Could not load team details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Loading team profile & roster...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Team Profile Not Found</h2>
          <p className="text-gray-400">{error || 'The requested team could not be loaded.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition inline-flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  const deptColors = {
    CSE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ECE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    MECH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    CIVIL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    EEE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    IT: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    AIDS: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    OTHER: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved Team</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{status || 'Disqualified'}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800/60"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Overview</span>
        </button>
        {getStatusBadge(team.status)}
      </div>

      {/* Main Team Banner Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold uppercase tracking-wider">
                {team.sportName} • {team.sportCategory || 'Outdoor'}
              </span>
              <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-xs font-medium">
                {team.deptName || team.deptCode}
              </span>
              {team.academicYear && (
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-xs font-medium">
                  {team.academicYear}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <Shield className="w-9 h-9 md:w-12 md:h-12 text-indigo-400" />
              <span>{team.name}</span>
            </h1>
            
            <p className="text-gray-400 text-sm max-w-2xl flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Registered in <strong>{team.tournamentName || 'Inter-Collegiate Tournament'}</strong> ({team.tournamentTier || 'Institutional'})</span>
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-3 shrink-0">
            {team.coachName && (
              <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl px-4 py-2.5">
                <p className="text-xs text-gray-400">Head Coach</p>
                <p className="text-sm font-semibold text-white">{team.coachName}</p>
              </div>
            )}
            {team.jerseyColor && (
              <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl px-4 py-2.5 flex items-center space-x-2">
                <Shirt className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs text-gray-400">Jersey Color</p>
                  <p className="text-sm font-semibold text-white">{team.jerseyColor}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Captain & Multi-Department Representation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Captain Profile Card */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Team Captain</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Squad Lead
            </span>
          </div>

          {team.captain ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {team.captain.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="text-base font-bold text-white">{team.captain.name}</p>
                  <p className="text-xs text-gray-400">Roll: {team.captain.rollNo || team.captain.studentId}</p>
                </div>
              </div>

              <div className="pt-2 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Department</span>
                  <span className="font-semibold text-white">{team.captain.dept_code || team.captain.dept}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Batch / Year</span>
                  <span className="font-semibold text-white">Class of {team.captain.year || 2026}</span>
                </div>
                {team.captain.personal_email && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                    <span className="font-medium text-gray-300 truncate max-w-[160px]">{team.captain.personal_email}</span>
                  </div>
                )}
                {team.captain.personal_phone && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
                    <span className="font-medium text-gray-300">{team.captain.personal_phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-gray-400 text-sm">
              No designated team captain found for this squad.
            </div>
          )}
        </div>

        {/* Cross-Department Roster Breakdown */}
        <div className="lg:col-span-2 bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Multi-Department Athlete Representation</span>
            </h3>
            <span className="text-xs text-gray-400 font-medium">
              Total Roster: {team.players?.length || 0} Athletes
            </span>
          </div>

          <p className="text-xs text-gray-400">
            This sport squad represents athletes from across academic branches. Matchday attendance logs route back to each player's respective academic coordinator.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {Object.entries(team.deptBreakdown || {}).map(([dept, count]) => {
              const colorClass = deptColors[dept] || deptColors.OTHER;
              return (
                <div 
                  key={dept}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${colorClass}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">{dept}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black">{count}</span>
                    <span className="text-xs opacity-70">
                      {Math.round((count / (team.players?.length || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Player Roster Table */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Official Squad Roster</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Verified players enrolled for official inter-departmental and collegiate fixtures
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs font-semibold rounded-lg">
              {team.players?.length || 0} Players
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Athlete Name</th>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Squad Role</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Fitness Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-sm">
              {team.players && team.players.length > 0 ? (
                team.players.map((player, idx) => (
                  <tr key={player.id || idx} className="hover:bg-gray-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      {player.jerseyNo ? `#${player.jerseyNo}` : `${idx + 1}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white flex items-center space-x-2">
                        <span>{player.name}</span>
                        {player.role === 'Captain' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            CAPTAIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300 text-xs">
                      {player.rollNo || player.studentId}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-800 text-gray-200 border border-gray-700">
                        {player.dept_code || player.dept}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 text-xs font-medium">
                      {player.role || player.position || 'Player'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs font-mono">
                      {player.blood_group || 'O+'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Medical Fit</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400 text-sm">
                    No players registered in this squad roster yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match History & Schedule */}
      {team.matches && team.matches.length > 0 && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <span>Fixtures & Match Log</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {team.matches.map((m) => (
              <div 
                key={m.id}
                className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-semibold">
                    {m.pool || 'Pool A'} • {m.round}
                  </span>
                  <span>{new Date(m.date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between font-bold text-white">
                  <span>{m.teamA}</span>
                  <div className="px-3 py-1 bg-gray-900 rounded-lg text-sm font-mono text-indigo-400">
                    {m.scoreA} : {m.scoreB}
                  </div>
                  <span>{m.teamB}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-700/40">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {m.ground || m.venue || 'Main Ground'}
                  </span>
                  <span className={m.status === 'Completed' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamProfile;
