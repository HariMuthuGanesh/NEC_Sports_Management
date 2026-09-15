/* API Service Abstraction Layer for NEC Sports Management System
   Provides JWT Authorization, Automated CSRF handling & retry, Typed ApiError, and Input Sanitization.
   STRICTLY BACKEND API ONLY - NO MOCK DATA OR LOCAL STORAGE FALLBACKS.
*/

import { getAuthToken, sanitizeInput } from "../../utils/security";

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

/**
 * Custom Typed API Error
 */
export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR', data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// In-memory CSRF token cache
let cachedCsrfToken = null;

// Fetch a CSRF token from the server and cache it
export const initCsrf = async () => {
  try {
    const res = await fetch(`${API_URL}/auth/csrf-token`, { credentials: 'include' });
    const json = await res.json();
    if (json?.data?.csrfToken) {
      cachedCsrfToken = json.data.csrfToken;
      try {
        sessionStorage.setItem('nec_csrf_token', json.data.csrfToken);
      } catch {}
      return cachedCsrfToken;
    }
  } catch {
    console.warn('[CSRF] Failed to fetch CSRF token on init.');
  }
  return null;
};

// Helper for security header injection
export const getSecurityHeaders = () => {
  const token = getAuthToken();
  const csrf = cachedCsrfToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('nec_csrf_token') : '') || '';
  
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
    "X-Client-Version": "1.0.0",
    "X-CSRF-Token": csrf,
  };
};

/**
 * Strict API fetcher with automatic CSRF initialization and single-retry on 403 CSRF error
 */
export const apiFetch = async (endpoint, method = 'GET', body = null, isRetry = false) => {
  const upperMethod = method.toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod);

  // Ensure we have a CSRF token before mutating requests
  if (isMutating && !cachedCsrfToken && !sessionStorage.getItem('nec_csrf_token')) {
    await initCsrf();
  }

  try {
    const headers = getSecurityHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const options = {
      method: upperMethod,
      headers,
      credentials: "include",
      signal: controller.signal
    };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
        delete options.headers["Content-Type"]; // Let browser set multipart/form-data boundary
      } else {
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    if (response.ok) {
      const resJson = await response.json();
      return resJson.data !== undefined ? resJson.data : resJson;
    }

    const errorJson = await response.json().catch(() => null);
    const errorMessage = errorJson?.error?.message || `Server returned ${response.status}: ${response.statusText}`;
    const errorCode = errorJson?.error?.code || (response.status === 403 ? 'FORBIDDEN' : 'API_ERROR');

    // If CSRF error occurred on a mutating call and we haven't retried yet, refresh token and retry
    if (response.status === 403 && (errorMessage.toLowerCase().includes('csrf') || errorCode === 'EBADCSRFTOKEN') && !isRetry) {
      console.log('[CSRF] Refreshing CSRF token and retrying request...');
      await initCsrf();
      return await apiFetch(endpoint, method, body, true);
    }

    throw new ApiError(errorMessage, response.status, errorCode, errorJson?.error);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error(`[API Error] Failed to fetch ${endpoint}:`, err.message);
    throw new ApiError(
      err.name === 'AbortError' ? "Request timed out. Please try again." : (err.message || "Cannot reach server. Please check your connection."),
      0,
      'NETWORK_ERROR'
    );
  }
};

/**
 * Full response fetcher (returns { success, data, meta })
 */
export const apiFetchFull = async (endpoint, method = 'GET', body = null, isRetry = false) => {
  const upperMethod = method.toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod);

  if (isMutating && !cachedCsrfToken && !sessionStorage.getItem('nec_csrf_token')) {
    await initCsrf();
  }

  try {
    const headers = getSecurityHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const options = {
      method: upperMethod,
      headers,
      credentials: "include",
      signal: controller.signal
    };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
        delete options.headers["Content-Type"];
      } else {
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }

    const errorJson = await response.json().catch(() => null);
    const errorMessage = errorJson?.error?.message || `Server returned ${response.status}: ${response.statusText}`;
    const errorCode = errorJson?.error?.code || 'API_ERROR';

    if (response.status === 403 && (errorMessage.toLowerCase().includes('csrf') || errorCode === 'EBADCSRFTOKEN') && !isRetry) {
      await initCsrf();
      return await apiFetchFull(endpoint, method, body, true);
    }

    throw new ApiError(errorMessage, response.status, errorCode, errorJson?.error);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error(`[API Error] Failed to fetch ${endpoint}:`, err.message);
    throw new ApiError(
      err.name === 'AbortError' ? "Request timed out." : (err.message || "Cannot reach server."),
      0,
      'NETWORK_ERROR'
    );
  }
};

/* --- Sports & Departments API --- */
export const sportsApi = {
  getDepartments: () => apiFetch("/departments"),
  createDepartment: (deptData) => apiFetch("/departments", "POST", deptData),
  updateDepartment: (deptId, deptData) => apiFetch(`/departments/${deptId}`, "PUT", deptData),
  deleteDepartment: (deptId) => apiFetch(`/departments/${deptId}`, "DELETE"),
  getCoordinators: () => apiFetch("/coordinators"),
  getSports: () => apiFetch("/sports"),
  addSport: (sportData) => apiFetch("/sports", "POST", sportData),
  updateSport: (sportId, sportData) => apiFetch(`/sports/${sportId}`, "PUT", sportData),
  assignCaptain: (sportId, captainUserId) => apiFetch(`/sports/${sportId}/captain`, "PUT", { captainUserId }),
  deleteSport: (sportId) => apiFetch(`/sports/${sportId}`, "DELETE"),
  getVenues: () => apiFetch("/venues"),
  createVenue: (venueData) => apiFetch("/venues", "POST", venueData),
  updateVenue: (venueId, venueData) => apiFetch(`/venues/${venueId}`, "PUT", venueData),
  deleteVenue: (venueId) => apiFetch(`/venues/${venueId}`, "DELETE"),
  saveVenues: (venues) => apiFetch("/venues", "POST", venues),
  saveDepartments: (depts) => apiFetch("/departments", "POST", depts)
};

/* --- Tournaments API --- */
export const tournamentsApi = {
  getTournaments: () => apiFetch("/tournaments"),
  getTournamentById: (id) => apiFetch(`/tournaments/${id}`),
  createTournament: (data) => apiFetch("/tournaments", "POST", {
    ...data,
    name: sanitizeInput(data.name || data.title),
    title: sanitizeInput(data.title || data.name)
  }),
  updateTournament: (id, data) => apiFetch(`/tournaments/${id}`, "PUT", data),
  deleteTournament: (id) => apiFetch(`/tournaments/${id}`, "DELETE"),
  getTournamentMatches: (tournamentId) => apiFetch(`/tournaments/${tournamentId}/matches`),
  createTournamentMatch: (tournamentId, matchData) => apiFetch(`/tournaments/${tournamentId}/matches`, "POST", matchData),
  getTournamentTeams: (tournamentId) => apiFetch(`/tournaments/${tournamentId}/teams`),
  
  // Legacy aliases
  getEvents: (tournamentId = null) => eventsApi.getEvents(tournamentId),
  getEventById: (eventId) => eventsApi.getEventById(eventId),
  createEvent: (data) => eventsApi.createEvent(data),
  updateEvent: (eventId, data) => eventsApi.updateEvent(eventId, data),
  deleteEvent: (eventId) => eventsApi.deleteEvent(eventId),
  toggleEventStatus: (eventId, status) => eventsApi.toggleEventStatus(eventId, status)
};

/* --- Events API --- */
export const eventsApi = {
  getEvents: (tournamentId = null) => {
    return apiFetch("/events").then(events => {
      const evList = Array.isArray(events) ? events : [];
      return tournamentId ? evList.filter(e => String(e.tournament_id || e.tournamentId) === String(tournamentId)) : evList;
    });
  },
  getEventById: (eventId) => apiFetch(`/events/${eventId}`),
  createEvent: (data) => apiFetch("/events", "POST", {
    ...data,
    name: sanitizeInput(data.name || data.title),
    title: sanitizeInput(data.title || data.name)
  }),
  updateEvent: (eventId, data) => apiFetch(`/events/${eventId}`, "PUT", data),
  deleteEvent: (eventId) => apiFetch(`/events/${eventId}`, "DELETE"),
  toggleEventStatus: (eventId, status) => apiFetch(`/events/${eventId}/toggle`, "POST", { status })
};

/* --- Teams & Roster API --- */
export const teamsApi = {
  getTeams: (deptId = null) => {
    return apiFetch("/teams").then(teams => {
      const tList = Array.isArray(teams) ? teams : [];
      return deptId ? tList.filter(t => t.department_id === deptId || t.dept_id === deptId || t.deptId === deptId) : tList;
    });
  },
  getTeamDetails: (teamId) => apiFetch(`/teams/${teamId}`),
  getCaptainTeams: () => apiFetch("/captain/teams"),
  registerTeam: (teamData) => apiFetch("/teams", "POST", teamData),
  updateTeamStatus: (teamId, status) => apiFetch(`/teams/${teamId}/status`, "PUT", { status }),
  deleteTeam: (teamId) => apiFetch(`/teams/${teamId}`, "DELETE")
};

/* --- Attendance API --- */
export const attendanceApi = {
  saveSquadAttendance: (teamId, attendanceMap, matchId = null) => apiFetch(`/teams/${teamId}/attendance`, "POST", { attendance: attendanceMap, matchId }),
  getTeamAttendance: (teamId) => apiFetch(`/teams/${teamId}/attendance`),
  getDepartmentAttendance: (deptId) => apiFetch(`/departments/${deptId}/attendance`),
  getMatchAttendance: (matchId) => apiFetch(`/attendance/match/${matchId}`)
};

/* --- Student Lookup & Players API --- */
export const studentLookupApi = {
  searchStudent: (query) => apiFetch(`/students/search?q=${encodeURIComponent(query)}`)
};

export const playersApi = {
  getAllPlayers: (query = "") => apiFetchFull(`/students?q=${encodeURIComponent(query)}`),
  createStudent: (studentData) => apiFetch("/students", "POST", studentData),
  getPlayersByTeam: (teamId) => apiFetch(`/teams/${teamId}/players`),
  addPlayerToTeam: (teamId, playerData) => apiFetch(`/teams/${teamId}/players`, "POST", playerData),
  removePlayer: (playerId) => apiFetch(`/players/${playerId}`, "DELETE"),
  saveSquadAttendance: (teamId, attendanceMap, matchId = null) => apiFetch(`/teams/${teamId}/attendance`, "POST", { attendance: attendanceMap, matchId }),
  getSquadAttendance: (teamId) => apiFetch(`/teams/${teamId}/attendance`),
  getStudentAttendance: (registerNumber) => apiFetch(`/students/${encodeURIComponent(registerNumber)}/attendance`)
};

/* --- Matches & Scheduling API --- */
export const matchesApi = {
  getMatches: () => apiFetch("/matches"),
  createMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  scheduleMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  updateMatchStatus: (matchId, status) => apiFetch(`/matches/${matchId}/status`, "PATCH", { status }),
  deleteMatch: (matchId) => apiFetch(`/matches/${matchId}`, "DELETE"),
  updateScore: (matchId, scoreA, scoreB, detailScore = "", isFinal = false) => 
    apiFetch(`/matches/${matchId}/score`, "PATCH", { 
      scoreA: Number(scoreA), 
      scoreB: Number(scoreB), 
      detailScore: String(detailScore), 
      isFinal: Boolean(isFinal) 
    }),
  updateMatchScore: (matchId, scoreA, scoreB, detailScore = "", isFinal = false) => 
    apiFetch(`/matches/${matchId}/score`, "PATCH", { 
      scoreA: Number(scoreA), 
      scoreB: Number(scoreB), 
      detailScore: String(detailScore), 
      isFinal: Boolean(isFinal) 
    })
};

/* --- Reports API --- */
export const reportsApi = {
  getPerformanceReport: (timeframe = '1month') => apiFetch(`/reports/performance?timeframe=${timeframe}`)
};

/* --- Leaderboard API --- */
export const leaderboardApi = {
  getLeaderboard: () => apiFetch("/leaderboard")
};

/* --- Announcements API --- */
export const announcementsApi = {
  getAnnouncements: () => apiFetch("/announcements"),
  getAll: () => apiFetch("/announcements"),
  addAnnouncement: (data) => apiFetch("/announcements", "POST", data),
  createAnnouncement: (data) => apiFetch("/announcements", "POST", data),
  deleteAnnouncement: (id) => apiFetch(`/announcements/${id}`, "DELETE")
};

/* --- Media Gallery API --- */
export const galleryApi = {
  getGallery: () => apiFetch("/gallery"),
  getAll: () => apiFetch("/gallery"),
  uploadMedia: (formData) => apiFetch("/gallery/upload", "POST", formData),
  updateMedia: (id, data) => apiFetch(`/gallery/${id}`, "PUT", data),
  deleteMedia: (id) => apiFetch(`/gallery/${id}`, "DELETE")
};

/* --- Notifications API --- */
export const notificationsApi = {
  getNotifications: () => apiFetch("/notifications"),
  markAsRead: (id) => apiFetch(`/notifications/${id}/read`, "PATCH"),
  markAllRead: () => apiFetch("/notifications/read-all", "PATCH")
};

/* --- Audit Log API --- */
export const auditApi = {
  getEntries: (limit = 100) => apiFetch(`/admin/audit-log?limit=${limit}`)
};

/* --- OD (On Duty) API --- */
export const odApi = {
  createForMatch: (matchId) => apiFetch(`/od/match/${matchId}`, 'POST'),
  getMatchOdStatus: (matchId) => apiFetch(`/od/match/${matchId}`),
  bulkApproveForMatch: (matchId) => apiFetch(`/od/match/${matchId}/bulk-approve`, 'POST'),
  getMyOd: () => apiFetch('/od/my'),
  getAll: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/od${qs ? '?' + qs : ''}`);
  },
  getById: (requestId) => apiFetch(`/od/${requestId}`),
  approve: (requestId) => apiFetch(`/od/${requestId}/approve`, 'PATCH'),
  reject: (requestId, reason) => apiFetch(`/od/${requestId}/reject`, 'PATCH', { reason })
};

/* --- Department Sport Captains & Squad API ---
   Backed by squadController.js / department_sport_captains + department_squad_members
   (the live V2 tables — see schema.sql's "DEPRECATED V2 PARALLEL TABLES" note,
   which documents that the older department_teams / department_team_members
   tables and their V1 endpoints are no longer wired up). */
export const squadApi = {
  // Coordinator: list this coordinator's own department's sport-captain assignments
  getDepartmentSportCaptains: () => apiFetch("/department-sport-captains"),
  // Coordinator: list users with the Captain role, to pick from when assigning
  getEligibleCaptains: () => apiFetch("/department-sport-captains/eligible-captains"),
  // Coordinator: assign (or transfer) the captain for a sport in their department
  assignDepartmentSportCaptain: (sportId, userId) => apiFetch("/department-sport-captains", "POST", { sport_id: sportId, user_id: userId }),
  // Captain: view their own assigned squad (sport + department + active roster)
  getMySquad: () => apiFetch("/my-squad"),
  addSquadMember: (studentId) => apiFetch("/my-squad/members", "POST", { student_id: studentId }),
  removeSquadMember: (studentId) => apiFetch(`/my-squad/members/${studentId}`, "DELETE")
};

/* --- College Team Builder API --- */
export const collegeTeamsApi = {
  getSuggestions: (sportId) => apiFetch(`/college-teams/${sportId}/suggestions`),
  confirmTeam: (sportId, players) => apiFetch(`/college-teams/${sportId}/confirm`, "POST", players)
};

/* --- Public Stats API --- */
export const statsApi = {
  getOverview: () => apiFetch("/stats/overview")
};
