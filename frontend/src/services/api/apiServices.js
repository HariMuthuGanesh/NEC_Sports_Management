/* API Service Abstraction Layer for NEC Sports Management System
   Provides JWT Authorization, Input Sanitization, and Category enrichment.
   STRICTLY BACKEND API ONLY - NO MOCK DATA OR LOCAL STORAGE FALLBACKS.
*/

import { getAuthToken, sanitizeInput } from "../../utils/security";

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// Helper for security header injection
export const getSecurityHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
    "X-Client-Version": "1.0.0",
  };
};

// Strict API fetcher: Primary fetch to backend API with NO fallback
const apiFetch = async (endpoint, method = 'GET', body = null) => {
  try {
    const headers = getSecurityHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const options = {
      method,
      headers,
      credentials: "include",
      signal: controller.signal
    };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
        delete options.headers["Content-Type"]; // Let browser set multipart/form-data with boundary
      } else {
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    if (response.ok) {
      const resJson = await response.json();
      return resJson.data !== undefined ? resJson.data : resJson;
    } else {
      const errorJson = await response.json().catch(() => null);
      throw new Error(errorJson?.error?.message || `Server returned ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[API Error] Failed to fetch ${endpoint}:`, err.message);
    throw new Error(err.message || "Cannot reach server. Please check your connection and try again.", { cause: err });
  }
};

// Like apiFetch but returns the full response JSON instead of just .data.
// Use for endpoints that include a `meta` field alongside `data`.
const apiFetchFull = async (endpoint, method = 'GET', body = null) => {
  try {
    const headers = getSecurityHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const options = { method, headers, credentials: "include", signal: controller.signal };
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
      return await response.json(); // full body: { success, data, meta }
    } else {
      const errorJson = await response.json().catch(() => null);
      throw new Error(errorJson?.error?.message || `Server returned ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[API Error] Failed to fetch ${endpoint}:`, err.message);
    throw new Error(err.message || "Cannot reach server. Please check your connection and try again.", { cause: err });
  }
};

/* --- Sports & Departments API --- */
export const sportsApi = {
  getDepartments: () => apiFetch("/departments"),
  getSports: () => apiFetch("/sports"),
  getVenues: () => apiFetch("/venues"),
  createVenue: (venueData) => apiFetch("/venues", "POST", venueData),
  updateVenue: (venueId, venueData) => apiFetch(`/venues/${venueId}`, "PUT", venueData),
  deleteVenue: (venueId) => apiFetch(`/venues/${venueId}`, "DELETE"),
  saveVenues: (venues) => apiFetch("/venues", "POST", venues),
  saveDepartments: (depts) => apiFetch("/departments", "POST", depts),
  addSport: (sportData) => apiFetch("/sports", "POST", sportData),
  deleteSport: (sportId) => apiFetch(`/sports/${sportId}`, "DELETE")
};

/* --- Tournaments & Events API --- */
export const tournamentsApi = {
  getTournaments: () => apiFetch("/tournaments"),
  getEvents: (tournamentId = null) => {
    return apiFetch("/events").then(events => tournamentId ? events.filter(e => e.tournamentId === tournamentId) : events);
  },
  createTournament: (data) => apiFetch("/tournaments", "POST", {
    ...data,
    title: sanitizeInput(data.title),
    description: sanitizeInput(data.description)
  }),
  createEvent: (data) => apiFetch("/events", "POST", {
    ...data,
    title: sanitizeInput(data.title)
  }),
  toggleEventStatus: (eventId) => apiFetch(`/events/${eventId}/toggle`, "POST")
};

/* --- Teams & Roster API --- */
export const teamsApi = {
  getTeams: (deptId = null) => {
    return apiFetch("/teams").then(teams => deptId ? teams.filter(t => t.dept_id === deptId || t.deptId === deptId) : teams);
  },
  registerTeam: (teamData) => apiFetch("/teams", "POST", teamData),
  updateTeamStatus: (teamId, status) => apiFetch(`/teams/${teamId}/status`, "PUT", { status })
};

/* --- Student Lookup API --- */
export const studentLookupApi = {
  searchStudent: (query) => apiFetch(`/students/search?q=${encodeURIComponent(query)}`)
};

/* --- Players API --- */
export const playersApi = {
  // Returns the full response { success, data, meta } so callers can read meta.source and meta.imsPopulated
  getAllPlayers: (query = "") => apiFetchFull(`/students?q=${encodeURIComponent(query)}`),
  createStudent: (studentData) => apiFetch("/students", "POST", studentData),
  getPlayersByTeam: (teamId) => apiFetch(`/teams/${teamId}/players`),
  addPlayerToTeam: (teamId, playerData) => apiFetch(`/teams/${teamId}/players`, "POST", playerData),
  removePlayer: (playerId) => apiFetch(`/players/${playerId}`, "DELETE"),
  saveSquadAttendance: (teamId, attendanceMap) => apiFetch(`/teams/${teamId}/attendance`, "POST", { attendance: attendanceMap }),
  // IMS attendance per student (by register number)
  getStudentAttendance: (registerNumber) => apiFetch(`/students/${encodeURIComponent(registerNumber)}/attendance`)
};

/* --- Matches & Scheduling API --- */
export const matchesApi = {
  getMatches: () => apiFetch("/matches"),
  createMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  // scheduleMatch is an alias for createMatch used by MatchesManager
  scheduleMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  updateMatchStatus: (matchId, status) => apiFetch(`/matches/${matchId}/status`, "PATCH", { status }),
  deleteMatch: (matchId) => apiFetch(`/matches/${matchId}`, "DELETE"),
  updateScore: (matchId, scoreA, scoreB, detailScore, isFinal) => apiFetch(`/matches/${matchId}/score`, "PATCH", { scoreA, scoreB, detailScore, isFinal })
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
  // Coordinator/Admin: batch-create OD for all players in a match
  createForMatch: (matchId) => apiFetch(`/od/match/${matchId}`, 'POST'),
  // Coordinator/Admin: get OD status for all players in a match
  getMatchOdStatus: (matchId) => apiFetch(`/od/match/${matchId}`),
  // Admin: bulk-approve all pending OD for a match
  bulkApproveForMatch: (matchId) => apiFetch(`/od/match/${matchId}/bulk-approve`, 'POST'),
  // Player: own OD list
  getMyOd: () => apiFetch('/od/my'),
  // Admin/Coordinator: list all OD requests
  getAll: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/od${qs ? '?' + qs : ''}`);
  },
  // Admin/Coordinator: get single OD by ID
  getById: (requestId) => apiFetch(`/od/${requestId}`),
  // Admin: approve
  approve: (requestId) => apiFetch(`/od/${requestId}/approve`, 'PATCH'),
  // Admin: reject with reason
  reject: (requestId, reason) => apiFetch(`/od/${requestId}/reject`, 'PATCH', { reason })
};
