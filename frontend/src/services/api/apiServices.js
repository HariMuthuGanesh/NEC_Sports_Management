/* API Service Abstraction Layer for NEC Sports Management System
   Provides LocalStorage Mock Database Layer with fallback, JWT Authorization, 
   Input Sanitization, and Category enrichment.
*/

import { getAuthToken, getCsrfNonce, sanitizeInput } from "../../utils/security";
import {
  INITIAL_DEPARTMENTS,
  INITIAL_SPORTS,
  INITIAL_VENUES,
  INITIAL_TOURNAMENTS,
  INITIAL_EVENTS,
  INITIAL_TEAMS,
  INITIAL_PLAYERS,
  INITIAL_MATCHES,
  INITIAL_LEADERBOARD,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_GALLERY,
  EXTERNAL_STUDENT_DATABASE
} from "../../data/mock/mockData";

// Helper to simulate smooth local network latency
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const API_URL = 'http://localhost:8000/api';

// Helper for security header injection
export const getSecurityHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
    "X-CSRF-Token": getCsrfNonce(),
    "X-Client-Version": "1.0.0",
  };
};

// Helper for local storage persistence
const getStored = (key, fallback) => {
  try {
    const item = localStorage.getItem(`nec_sports_${key}`);
    if (!item) {
      localStorage.setItem(`nec_sports_${key}`, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (e) {
    return fallback;
  }
};

const setStored = (key, value) => {
  try {
    localStorage.setItem(`nec_sports_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error("Storage error:", e);
  }
};

// Safe API fetcher with graceful Mock DB fallback
const safeFetchWithFallback = async (endpoint, storageKey, fallbackData) => {
  try {
    const headers = getSecurityHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

    const response = await fetch(`${API_URL}${endpoint}`, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setStored(storageKey, data);
        return data;
      }
    }
  } catch (err) {
    // Graceful offline / mock mode fallback
  }
  return getStored(storageKey, fallbackData);
};

/* --- Global Mock DB Initializer / Reset --- */
export const initializeMockDatabase = (forceReset = false) => {
  const collections = [
    { key: "departments", data: INITIAL_DEPARTMENTS },
    { key: "sports", data: INITIAL_SPORTS },
    { key: "venues", data: INITIAL_VENUES },
    { key: "tournaments", data: INITIAL_TOURNAMENTS },
    { key: "events", data: INITIAL_EVENTS },
    { key: "teams", data: INITIAL_TEAMS },
    { key: "players", data: INITIAL_PLAYERS },
    { key: "matches", data: INITIAL_MATCHES },
    { key: "leaderboard", data: INITIAL_LEADERBOARD },
    { key: "announcements", data: INITIAL_ANNOUNCEMENTS },
    { key: "notifications", data: INITIAL_NOTIFICATIONS },
    { key: "gallery", data: INITIAL_GALLERY },
    { key: "student_registry", data: EXTERNAL_STUDENT_DATABASE }
  ];

  collections.forEach(({ key, data }) => {
    if (forceReset || !localStorage.getItem(`nec_sports_${key}`)) {
      localStorage.setItem(`nec_sports_${key}`, JSON.stringify(data));
    }
  });
};

// Auto-initialize mock database upon module load
initializeMockDatabase(false);

/* --- Sports & Departments API --- */
export const sportsApi = {
  getDepartments: async () => {
    await delay();
    return getStored("departments", INITIAL_DEPARTMENTS);
  },
  getSports: async () => {
    await delay();
    return getStored("sports", INITIAL_SPORTS);
  },
  getVenues: async () => {
    await delay();
    return getStored("venues", INITIAL_VENUES);
  },
  saveVenues: async (venues) => {
    await delay(150);
    setStored("venues", venues);
    return venues;
  },
  saveDepartments: async (depts) => {
    await delay(150);
    setStored("departments", depts);
    return depts;
  },
  addSport: async (sportData) => {
    await delay(200);
    const sports = getStored("sports", INITIAL_SPORTS);
    const newSport = {
      ...sportData,
      name: sanitizeInput(sportData.name),
      id: `sp_${sanitizeInput(sportData.name).toLowerCase().replace(/\s+/g, "_")}`
    };
    const updated = [newSport, ...sports];
    setStored("sports", updated);
    return newSport;
  },
  deleteSport: async (sportId) => {
    await delay(150);
    const sports = getStored("sports", INITIAL_SPORTS);
    const updated = sports.filter(s => s.id !== sportId);
    setStored("sports", updated);
    return true;
  }
};

/* --- Tournaments & Events API --- */
export const tournamentsApi = {
  getTournaments: async () => {
    await delay();
    return getStored("tournaments", INITIAL_TOURNAMENTS);
  },
  getEvents: async (tournamentId = null) => {
    await delay();
    const events = getStored("events", INITIAL_EVENTS);
    if (tournamentId) return events.filter(e => e.tournamentId === tournamentId);
    return events;
  },
  createTournament: async (tournamentData) => {
    await delay(200);
    const tournaments = getStored("tournaments", INITIAL_TOURNAMENTS);
    const newTournament = {
      ...tournamentData,
      title: sanitizeInput(tournamentData.title),
      description: sanitizeInput(tournamentData.description),
      id: `tn_${Date.now()}`,
      status: tournamentData.status || "Registration Open"
    };
    const updated = [newTournament, ...tournaments];
    setStored("tournaments", updated);
    return newTournament;
  },
  createEvent: async (eventData) => {
    await delay(200);
    const events = getStored("events", INITIAL_EVENTS);
    const newEvent = {
      ...eventData,
      title: sanitizeInput(eventData.title),
      id: `ev_${Date.now()}`,
      registeredTeams: 0,
      status: "Open"
    };
    const updated = [newEvent, ...events];
    setStored("events", updated);
    return newEvent;
  },
  toggleEventStatus: async (eventId) => {
    await delay(150);
    const events = getStored("events", INITIAL_EVENTS);
    const updated = events.map(ev => {
      if (ev.id === eventId) {
        const isOpen = ev.status === "Open" || ev.status === "Registration Open";
        return { ...ev, status: isOpen ? "Closed" : "Open" };
      }
      return ev;
    });
    setStored("events", updated);
    return updated.find(e => e.id === eventId);
  }
};

/* --- Teams & Roster API --- */
export const teamsApi = {
  getTeams: async (deptId = null) => {
    await delay();
    const teams = getStored("teams", INITIAL_TEAMS);
    if (deptId) return teams.filter(t => t.deptId === deptId || t.deptCode === deptId);
    return teams;
  },
  registerTeam: async (teamData) => {
    await delay(200);
    const teams = getStored("teams", INITIAL_TEAMS);
    const newTeam = {
      ...teamData,
      name: sanitizeInput(teamData.name),
      captainName: sanitizeInput(teamData.captainName),
      captainRoll: sanitizeInput(teamData.captainRoll || "2112000"),
      id: `tm_${Date.now()}`,
      status: "Pending",
      memberCount: teamData.players ? teamData.players.length : 1
    };
    const updated = [newTeam, ...teams];
    setStored("teams", updated);
    return newTeam;
  },
  updateTeamStatus: async (teamId, status) => {
    await delay(150);
    const teams = getStored("teams", INITIAL_TEAMS);
    const updated = teams.map(t => t.id === teamId ? { ...t, status: sanitizeInput(status) } : t);
    setStored("teams", updated);
    return updated.find(t => t.id === teamId);
  }
};

/* --- External Student Lookup Boundary API (Simulating NEC IMS Student Data) --- */
export const studentLookupApi = {
  searchStudent: async (studentIdOrName) => {
    await delay(150);
    const registry = getStored("student_registry", EXTERNAL_STUDENT_DATABASE);
    const query = sanitizeInput(String(studentIdOrName)).trim().toLowerCase();
    if (!query) return [];
    return registry.filter(
      s => s.studentId.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
    );
  }
};

/* --- Players API --- */
export const playersApi = {
  getPlayersByTeam: async (teamId) => {
    await delay();
    const players = getStored("players", INITIAL_PLAYERS);
    return players.filter(p => p.teamId === teamId);
  },
  getAllPlayers: async () => {
    await delay();
    return getStored("players", INITIAL_PLAYERS);
  },
  addPlayerToRoster: async (teamId, playerData) => {
    await delay(200);
    const players = getStored("players", INITIAL_PLAYERS);
    const newPlayer = {
      ...playerData,
      name: sanitizeInput(playerData.name),
      position: sanitizeInput(playerData.position),
      jerseyNo: sanitizeInput(playerData.jerseyNo),
      id: `pl_${Date.now()}`,
      teamId,
      attendancePct: 100
    };
    const updated = [...players, newPlayer];
    setStored("players", updated);

    // Update team member count
    const teams = getStored("teams", INITIAL_TEAMS);
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return { ...t, memberCount: (t.memberCount || 0) + 1 };
      }
      return t;
    });
    setStored("teams", updatedTeams);

    return newPlayer;
  },
  removePlayer: async (playerId) => {
    await delay(150);
    const players = getStored("players", INITIAL_PLAYERS);
    const targetPlayer = players.find(p => p.id === playerId);
    const updated = players.filter(p => p.id !== playerId);
    setStored("players", updated);

    if (targetPlayer) {
      const teams = getStored("teams", INITIAL_TEAMS);
      const updatedTeams = teams.map(t => {
        if (t.id === targetPlayer.teamId && t.memberCount > 0) {
          return { ...t, memberCount: t.memberCount - 1 };
        }
        return t;
      });
      setStored("teams", updatedTeams);
    }
    return true;
  },
  saveSquadAttendance: async (teamId, attendanceMap) => {
    await delay(200);
    const players = getStored("players", INITIAL_PLAYERS);
    const updated = players.map(p => {
      if (p.teamId === teamId) {
        const isPresent = attendanceMap[p.id];
        let currentPct = p.attendancePct || 90;
        let newPct = isPresent ? Math.min(100, currentPct + 2) : Math.max(50, currentPct - 8);
        return { ...p, attendancePct: newPct };
      }
      return p;
    });
    setStored("players", updated);
    return true;
  }
};

/* --- Matches & Scheduling API --- */
export const matchesApi = {
  getMatches: async () => {
    await delay();
    const matches = getStored("matches", INITIAL_MATCHES);
    const events = getStored("events", INITIAL_EVENTS);
    
    // Map event category to matches
    return matches.map(match => {
      const event = events.find(e => e.id === match.eventId);
      return {
        ...match,
        eventCategory: event ? event.eventCategory : (match.eventCategory || "Inter-Department")
      };
    });
  },
  scheduleMatch: async (matchData) => {
    await delay(200);
    const matches = getStored("matches", INITIAL_MATCHES);
    const newMatch = {
      ...matchData,
      round: sanitizeInput(matchData.round),
      id: `m_${Date.now()}`,
      status: "Scheduled",
      scoreA: null,
      scoreB: null,
      winner: null
    };
    const updated = [newMatch, ...matches];
    setStored("matches", updated);
    return newMatch;
  },
  deleteMatch: async (matchId) => {
    await delay(150);
    const matches = getStored("matches", INITIAL_MATCHES);
    const updated = matches.filter(m => m.id !== matchId);
    setStored("matches", updated);
    return true;
  },
  updateMatchScore: async (matchId, scoreA, scoreB, detailScore = "", isFinal = false) => {
    await delay(200);
    const matches = getStored("matches", INITIAL_MATCHES);
    const updated = matches.map(m => {
      if (m.id === matchId) {
        let winner = null;
        if (isFinal) {
          if (Number(scoreA) > Number(scoreB)) winner = m.teamA;
          else if (Number(scoreB) > Number(scoreA)) winner = m.teamB;
          else winner = "Draw";
        }
        return {
          ...m,
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
          detailScore: sanitizeInput(detailScore),
          status: isFinal ? "Completed" : "Live",
          winner
        };
      }
      return m;
    });
    setStored("matches", updated);
    return updated.find(m => m.id === matchId);
  }
};

/* --- Leaderboard & Reports API --- */
export const leaderboardApi = {
  getLeaderboard: async () => {
    await delay();
    return getStored("leaderboard", INITIAL_LEADERBOARD);
  }
};

/* --- Announcements & Media API --- */
export const announcementsApi = {
  getAnnouncements: async () => {
    await delay();
    return getStored("announcements", INITIAL_ANNOUNCEMENTS);
  },
  createAnnouncement: async (data) => {
    await delay(200);
    const list = getStored("announcements", INITIAL_ANNOUNCEMENTS);
    const newItem = {
      ...data,
      title: sanitizeInput(data.title),
      content: sanitizeInput(data.content),
      category: sanitizeInput(data.category || "General"),
      author: sanitizeInput(data.author || "Physical Education Director"),
      id: `ann_${Date.now()}`,
      date: new Date().toISOString().split("T")[0]
    };
    const updated = [newItem, ...list];
    setStored("announcements", updated);
    return newItem;
  },
  deleteAnnouncement: async (id) => {
    await delay(150);
    const list = getStored("announcements", INITIAL_ANNOUNCEMENTS);
    const updated = list.filter(a => a.id !== id);
    setStored("announcements", updated);
    return true;
  }
};

export const galleryApi = {
  getGallery: async () => {
    await delay();
    return getStored("gallery", INITIAL_GALLERY);
  }
};

export const notificationsApi = {
  getNotifications: async () => {
    await delay();
    return getStored("notifications", INITIAL_NOTIFICATIONS);
  },
  markAllRead: async () => {
    await delay(100);
    const notifs = getStored("notifications", INITIAL_NOTIFICATIONS);
    const updated = notifs.map(n => ({ ...n, read: true }));
    setStored("notifications", updated);
    return updated;
  }
};
