/* API Service Abstraction Layer for NEC Sports Management System
   Provides JWT Authorization, Input Sanitization, and Category enrichment.
   STRICTLY BACKEND API ONLY - NO MOCK DATA OR LOCAL STORAGE FALLBACKS.
*/

import { getAuthToken, sanitizeInput } from "../../utils/security";

const API_URL = 'http://localhost:5000/api';

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
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const options = {
      method,
      headers,
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

/* --- Sports & Departments API --- */
export const sportsApi = {
  getDepartments: () => apiFetch("/departments"),
  getSports: () => apiFetch("/sports"),
  getVenues: () => apiFetch("/venues"),
  saveVenues: (venues) => apiFetch("/venues", "POST", venues), // if bulk save needed
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
  updateTeamStatus: (teamId, status) => apiFetch(`/teams/${teamId}/status`, "PATCH", { status })
};

/* --- Student Lookup API --- */
export const studentLookupApi = {
  searchStudent: (query) => apiFetch(`/students/search?q=${encodeURIComponent(query)}`)
};

/* --- Players API --- */
export const playersApi = {
  getPlayersByTeam: (teamId) => apiFetch(`/teams/${teamId}/players`),
  addPlayerToTeam: (teamId, playerData) => apiFetch(`/teams/${teamId}/players`, "POST", playerData),
  removePlayer: (playerId) => apiFetch(`/players/${playerId}`, "DELETE"),
  saveSquadAttendance: (teamId, attendanceMap) => apiFetch(`/teams/${teamId}/attendance`, "POST", { attendance: attendanceMap })
};

/* --- Matches & Scheduling API --- */
export const matchesApi = {
  getMatches: () => apiFetch("/matches"),
  createMatch: (matchData) => apiFetch("/matches", "POST", matchData),
  updateMatchStatus: (matchId, status) => apiFetch(`/matches/${matchId}/status`, "PATCH", { status }),
  deleteMatch: (matchId) => apiFetch(`/matches/${matchId}`, "DELETE"),
  updateScore: (matchId, scoreA, scoreB, detailScore, winner) => apiFetch(`/matches/${matchId}/score`, "PATCH", { scoreA, scoreB, detailScore, winner })
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
  markAsRead: (id) => apiFetch(`/notifications/${id}/read`, "PATCH")
};

/* --- Development Demo Data API --- */
export const devApi = {
  loadDemoData: () => apiFetch("/dev/load-demo-data", "POST"),
  clearDemoData: () => apiFetch("/dev/clear-demo-data", "POST")
};

