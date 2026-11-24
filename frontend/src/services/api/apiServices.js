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
// Competition levels master (tournament tiers).
export const competitionLevelsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch(`/competition-levels${suffix}`);
  },
  getLevels: (params = {}) => {
    const query = new URLSearchParams();
    if (params.includeInactive !== undefined) query.set('includeInactive', params.includeInactive);
    if (params.all !== undefined) query.set('all', params.all);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    const qs = query.toString();
    return apiFetch(`/competition-levels${qs ? `?${qs}` : ''}`);
  },
  get: (id) => apiFetch(`/competition-levels/${id}`),
  getLevelById: (id) => apiFetch(`/competition-levels/${id}`),
  create: (body) => apiFetch("/competition-levels", "POST", body),
  createLevel: (data) => apiFetch("/competition-levels", "POST", data),
  update: (id, body) => apiFetch(`/competition-levels/${id}`, "PUT", body),
  updateLevel: (id, data) => apiFetch(`/competition-levels/${id}`, "PUT", data),
  remove: (id) => apiFetch(`/competition-levels/${id}`, "DELETE"),
  deleteLevel: (id) => apiFetch(`/competition-levels/${id}`, "DELETE"),
};

export const sportsApi = {
  getDepartments: () => apiFetch("/departments"),
  createDepartment: (deptData) => apiFetch("/departments", "POST", deptData),
  updateDepartment: (deptId, deptData) => apiFetch(`/departments/${deptId}`, "PUT", deptData),
  deleteDepartment: (deptId) => apiFetch(`/departments/${deptId}`, "DELETE"),
  getCoordinators: () => apiFetch("/coordinators"),
  createCoordinator: (body) => apiFetch("/coordinators", "POST", body),
  updateCoordinator: (staffId, body) => apiFetch(`/coordinators/${staffId}`, "PUT", body),
  setCoordinatorStatus: (staffId, isActive) => apiFetch(`/coordinators/${staffId}/status`, "PATCH", { isActive }),
  getEventStaffAssignments: () => apiFetch("/coordinators/assignments"),
  assignStaffToEvent: (body) => apiFetch("/coordinators/assignments", "POST", body),
  removeStaffFromEvent: (id) => apiFetch(`/coordinators/assignments/${id}`, "DELETE"),
  getSportCategories: (sportId) => apiFetch(`/sports/${sportId}/categories`),
  createSportCategory: (sportId, body) => apiFetch(`/sports/${sportId}/categories`, "POST", body),
  deleteSportCategory: (categoryId) => apiFetch(`/sport-categories/${categoryId}`, "DELETE"),
  getSports: (params = {}) => {
    const qs = typeof params === 'object' && params !== null ? 
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
    return apiFetch(`/sports${qs ? `?${qs}` : ''}`);
  },
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
  getTournaments: (params = {}) => {
    const qs = typeof params === 'object' && params !== null ? 
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
    return apiFetch(`/tournaments${qs ? `?${qs}` : ''}`);
  },
  getTournamentById: (id) => apiFetch(`/tournaments/${id}`),
  getTournamentEvents: (tournamentId, params = {}) => {
    const qs = typeof params === 'object' && params !== null ? 
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
    return apiFetch(`/tournaments/${tournamentId}/events${qs ? `?${qs}` : ''}`);
  },
  getTournamentRegistrations: (tournamentId) => apiFetch(`/tournaments/${tournamentId}/registrations`),
  getTournamentSchedule: (tournamentId) => apiFetch(`/tournaments/${tournamentId}/schedule`),
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
  getPublicTournamentDetails: (id) => apiFetch(`/tournaments/${id}/public`),
  
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
  getEvents: (params = null) => {
    let queryParams = {};
    if (typeof params === 'string' || typeof params === 'number') {
      queryParams = { tournamentId: params };
    } else if (typeof params === 'object' && params !== null) {
      queryParams = params;
    }
    const qs = Object.entries(queryParams)
      .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return apiFetch(`/events${qs ? `?${qs}` : ''}`);
  },
  getEventById: (eventId) => apiFetch(`/events/${eventId}`),
  getEventCompetitions: (eventId) => apiFetch(`/events/${eventId}/competitions`),
  createEvent: (data) => apiFetch("/events", "POST", {
    ...data,
    name: sanitizeInput(data.name || data.title),
    title: sanitizeInput(data.title || data.name)
  }),
  updateEvent: (eventId, data) => apiFetch(`/events/${eventId}`, "PUT", data),
  deleteEvent: (eventId) => apiFetch(`/events/${eventId}`, "DELETE"),
  toggleEventStatus: (eventId, status) => apiFetch(`/events/${eventId}/toggle`, "POST", { status }),
  getEventTeams: (eventId) => apiFetch(`/events/${eventId}/teams`),
  getEventEntries: (eventId) => apiFetch(`/events/${eventId}/entries`),
  addEventEntry: (eventId, body) => apiFetch(`/events/${eventId}/entries`, "POST", body),
  removeEventEntry: (entryId) => apiFetch(`/event-entries/${entryId}`, "DELETE"),
  getEventResults: (eventId) => apiFetch(`/events/${eventId}/results`),
  recordEventResult: (eventId, data) => apiFetch(`/events/${eventId}/results`, "POST", data),
  recordEventAttempts: (eventId, data) => apiFetch(`/events/${eventId}/results/attempts`, "POST", data),
  finalizeEventResults: (eventId) => apiFetch(`/events/${eventId}/results/finalize`, "POST"),
  deleteEventResult: (eventId, resultId) => apiFetch(`/events/${eventId}/results/${resultId}`, "DELETE")
};

/* --- Event Results API --- */
export const eventResultsApi = {
  getResults: (eventId) => apiFetch(`/events/${eventId}/results`),
  recordResult: (eventId, data) => apiFetch(`/events/${eventId}/results`, "POST", data),
  recordAttempts: (eventId, data) => apiFetch(`/events/${eventId}/results/attempts`, "POST", data),
  finalizeResults: (eventId) => apiFetch(`/events/${eventId}/results/finalize`, "POST"),
  deleteResult: (eventId, resultId) => apiFetch(`/events/${eventId}/results/${resultId}`, "DELETE")
};

/* --- Competitions API --- */
export const competitionsApi = {
  getCompetitions: (params = {}) => {
    const qs = typeof params === 'object' && params !== null ? 
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
    return apiFetch(`/competitions${qs ? `?${qs}` : ''}`);
  },
  getCompetitionDetails: (id) => apiFetch(`/competitions/${id}`),
  createCompetition: (data) => apiFetch("/competitions", "POST", data),
  updateCompetition: (id, data) => apiFetch(`/competitions/${id}`, "PATCH", data),
  deleteCompetition: (id) => apiFetch(`/competitions/${id}`, "DELETE"),
  registerEntry: (id, data) => apiFetch(`/competitions/${id}/entries`, "POST", data),
  removeEntry: (id, entryId) => apiFetch(`/competitions/${id}/entries/${entryId}`, "DELETE")
};

/* --- Teams & Roster API --- */
export const teamsApi = {
  getTeams: (deptId = null) => {
    const url = deptId ? `/teams?deptId=${encodeURIComponent(deptId)}` : "/teams";
    return apiFetch(url).then(teams => {
      const tList = Array.isArray(teams) ? teams : [];
      if (!deptId) return tList;
      return tList.filter(t => 
        Number(t.department_id || t.dept_id || t.deptId) === Number(deptId) ||
        (t.deptCode && String(t.deptCode).toUpperCase() === String(deptId).toUpperCase())
      );
    });
  },
  getTeamDetails: (teamId) => apiFetch(`/teams/${teamId}`),
  getCaptainTeams: () => apiFetch("/captain/teams"),
  registerTeam: (teamData) => apiFetch("/teams", "POST", teamData),
  updateTeam: (teamId, teamData) => apiFetch(`/teams/${teamId}`, "PUT", teamData),
  updateTeamStatus: (teamId, status) => apiFetch(`/teams/${teamId}/status`, "PUT", { status }),
  setTeamCaptain: (teamId, studentId) => apiFetch(`/teams/${teamId}/captain`, "PUT", { student_id: studentId }),
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
  // The logged-in student's own record and teams. Resolves to null when no student record is linked (404).
  getMyProfile: () => apiFetch("/students/me").catch((err) => (err?.status === 404 ? null : Promise.reject(err))),
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
  getMatches: (params = null) => {
    let queryParams = {};
    if (typeof params === 'string' || typeof params === 'number') {
      queryParams = { tournamentId: params };
    } else if (typeof params === 'object' && params !== null) {
      queryParams = params;
    }
    const qs = Object.entries(queryParams)
      .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return apiFetch(`/matches${qs ? `?${qs}` : ''}`);
  },
  createMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  scheduleMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  generateBracket: (data) => apiFetch("/matches/generate-bracket", "POST", data),
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
  getActivityReport: (params) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/reports/activity${qs ? `?${qs}` : ''}`);
  },
  getActivityReportExcelUrl: (params) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
    const qs = new URLSearchParams(params).toString();
    return `${base}/reports/activity/export${qs ? `?${qs}` : ''}`;
  },
  getTournamentReport: (id) => apiFetch(`/reports/tournament/${id}`),
  getTournamentReportExcelUrl: (id) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
    return `${base}/reports/tournament/${id}/export`;
  },
  getEventReport: (id) => apiFetch(`/reports/event/${id}`),
  getEventReportExcelUrl: (id) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
    return `${base}/reports/event/${id}/export`;
  },
  // params: { timeframe } or { from, to } with YYYY-MM-DD dates (inclusive)
  getPerformanceReport: (params = { timeframe: '1month' }) => {
    const qs = new URLSearchParams(
      typeof params === 'string' ? { timeframe: params } : params
    ).toString();
    return apiFetch(`/reports/performance?${qs}`);
  },
  getPlayerPerformanceReport: () => apiFetch('/players/me/performance-report')
};

/* --- Leaderboard API --- */
export const leaderboardApi = {
  getLeaderboard: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
    ).toString();
    return apiFetch(`/leaderboard${qs ? `?${qs}` : ''}`);
  },
  getDepartmentMatches: (deptId) => apiFetch(`/leaderboard/${deptId}/matches`)
};

/* --- Public Portal API --- */
export const publicApi = {
  getHomeSummary: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
    ).toString();
    return apiFetch(`/public/home-summary${qs ? `?${qs}` : ''}`);
  },
  getTournamentDetails: (id) => apiFetch(`/tournaments/${id}/public`)
};

/* --- Announcements API --- */
export const announcementsApi = {
  getAnnouncements: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
    ).toString();
    return apiFetch(`/announcements${qs ? `?${qs}` : ''}`);
  },
  getAll: (params = {}) => announcementsApi.getAnnouncements(params),
  addAnnouncement: (data) => apiFetch("/announcements", "POST", data),
  createAnnouncement: (data) => apiFetch("/announcements", "POST", data),
  updateAnnouncement: (id, data) => apiFetch(`/announcements/${id}`, "PUT", data),
  cancelAnnouncement: (id) => apiFetch(`/announcements/${id}/cancel`, "PATCH"),
  deleteAnnouncement: (id) => apiFetch(`/announcements/${id}`, "DELETE")
};

/* --- Event Photos (formerly Media Gallery) API --- */
export const eventPhotosApi = {
  getPhotos: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL' && v !== 'all')
    ).toString();
    const query = qs ? `?${qs}` : '';
    return apiFetch(`/event-photos${query}`).catch(() => apiFetch(`/gallery${query}`));
  },
  getGallery: (params = {}) => eventPhotosApi.getPhotos(params),
  getAll: (params = {}) => eventPhotosApi.getPhotos(params),
  uploadPhoto: (formData) => apiFetch("/event-photos/upload", "POST", formData),
  uploadMedia: (formData) => apiFetch("/event-photos/upload", "POST", formData),
  updatePhoto: (id, data) => apiFetch(`/event-photos/${id}`, "PUT", data),
  updateMedia: (id, data) => apiFetch(`/event-photos/${id}`, "PUT", data),
  deletePhoto: (id) => apiFetch(`/event-photos/${id}`, "DELETE"),
  deleteMedia: (id) => apiFetch(`/event-photos/${id}`, "DELETE")
};

export const galleryApi = eventPhotosApi;

/* --- Notifications API --- */
export const dispatchNotificationUpdate = (count) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notifications-updated", { detail: { unreadCount: count } }));
  }
};

export const notificationsApi = {
  getNotifications: () => apiFetch("/notifications"),
  markAsRead: async (id) => {
    const res = await apiFetch(`/notifications/${id}/read`, "PATCH");
    dispatchNotificationUpdate();
    return res;
  },
  markAllRead: async () => {
    const res = await apiFetch("/notifications/read-all", "PATCH");
    dispatchNotificationUpdate(0);
    return res;
  }
};


/* --- Audit Log API --- */
export const auditApi = {
  getEntries: (params = {}) => {
    const queryObj = typeof params === 'number' || typeof params === 'string' ? { limit: params } : (params || {});
    const qs = new URLSearchParams(
      Object.entries(queryObj).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
    ).toString();
    return apiFetch(`/admin/audit-log${qs ? `?${qs}` : ''}`);
  },
  getExportUrl: (params = {}) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
    ).toString();
    return `${base}/admin/audit-log/export${qs ? `?${qs}` : ''}`;
  }
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
  reject: (requestId, reason) => apiFetch(`/od/${requestId}/reject`, 'PATCH', { reason }),
  getPublicOdList: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiFetch(`/od/public${qs ? '?' + qs : ''}`);
  },
  getPublicOdSports: () => apiFetch('/od/public/sports'),
  
  // Official Signed OD Documents (Sport-wise & Dept-wise Principal approved PDF)
  uploadOfficialDoc: (formData) => apiFetchFull('/od/official-documents/upload', 'POST', formData),
  getOfficialDocs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiFetch(`/od/official-documents${qs ? '?' + qs : ''}`);
  },
  deleteOfficialDoc: (id) => apiFetch(`/od/official-documents/${id}`, 'DELETE'),
  getPublicOfficialDocs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiFetch(`/od/public/official-documents${qs ? '?' + qs : ''}`);
  },
  getPublicOfficialDocOptions: () => apiFetch('/od/public/official-documents/options')
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
  assignDepartmentSportCaptain: (sportId, identifier, name = "", dept = "", year = null) => 
    apiFetch("/department-sport-captains", "POST", { 
      sport_id: sportId, 
      register_number: identifier,
      name,
      dept,
      year
    }),
  // Captain: view their own assigned squad (sport + department + active roster)
  getMySquad: (sportId) => apiFetch(`/my-squad${sportId ? `?sportId=${sportId}` : ""}`),
  addSquadMember: (studentId, sportId) => apiFetch("/my-squad/members", "POST", { student_id: studentId, sport_id: sportId }),
  removeSquadMember: (studentId, sportId) => apiFetch(`/my-squad/members/${studentId}${sportId ? `?sportId=${sportId}` : ""}`, "DELETE")
};

/* --- College Team Builder API --- */
export const collegeTeamsApi = {
  getCollegeTeams: () => apiFetch('/college-teams'),
  getCollegeTeamMembers: (teamId) => apiFetch(`/college-teams/${teamId}/members`),
  deleteCollegeTeam: (teamId) => apiFetch(`/college-teams/${teamId}`, "DELETE"),
  getSuggestions: (sportId) => apiFetch(`/college-teams/${sportId}/suggestions`),
  confirmTeam: (sportId, players, teamName = null) => 
    apiFetch(`/college-teams/${sportId}/confirm`, "POST", { players, team_name: teamName })
};

/* --- Public Stats API --- */
export const statsApi = {
  getOverview: () => apiFetch("/stats/overview")
};

/* --- Auth & OAuth 2.0 API --- */
export const authApi = {
  getOAuthProviders: () => apiFetch('/auth/oauth/providers'),
  getOAuthStartUrl: (providerId) => `${API_URL}/auth/oauth/${providerId}/start`,
  login: (credentials) => apiFetch('/auth/login', 'POST', credentials),
  signup: (userData) => apiFetch('/auth/signup', 'POST', userData),
  logout: () => apiFetch('/auth/logout', 'POST'),
  getCurrentUser: () => apiFetch('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    apiFetch('/auth/change-password', 'POST', { currentPassword, newPassword }),
  // Self-service forgot password (public, timing-safe)
  forgotPassword: (identifier) =>
    apiFetch('/auth/forgot-password', 'POST', { identifier }),
  // Admin / President / Coordinator reset another user's password
  adminResetPassword: (targetUserId, newPassword = null) =>
    apiFetch('/auth/admin-reset-password', 'POST', { targetUserId, newPassword }),
  // Search users by username / email / roll for admin reset UI
  searchUsers: (query) =>
    apiFetch(`/users/search?q=${encodeURIComponent(query)}`),
};

/* --- System & Lifecycle Sync API --- */
export const systemApi = {
  syncScheduledStatuses: () => apiFetch("/system/sync-scheduled-statuses", "POST")
};

/* --- Leadership Appointments API --- */
export const appointmentsApi = {
  getAppointments: (params = {}) => {
    const qs = typeof params === 'object' && params !== null ? 
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&') : '';
    return apiFetch(`/appointments${qs ? `?${qs}` : ''}`);
  },
  getAppointmentById: (id) => apiFetch(`/appointments/${id}`),
  createAppointment: (data) => apiFetch('/appointments', 'POST', data),
  updateAppointment: (id, data) => apiFetch(`/appointments/${id}`, 'PUT', data),
  revokeAppointment: (id, reason) => apiFetch(`/appointments/${id}/revoke`, 'PATCH', { reason }),
  getAppointmentsMetadata: () => apiFetch('/appointments/meta')
};

