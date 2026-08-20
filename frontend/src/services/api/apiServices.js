/* API Service Abstraction Layer for NEC Sports Management System
   Includes JWT Authorization Headers, Request Input Sanitization, and Security Error Handlers.
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

// Helper to simulate network latency for legacy routes
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const API_URL = 'http://localhost:8000/api';

const fetchApi = async (endpoint, options = {}) => {
  const headers = getSecurityHeaders();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    }
  });
  if (!response.ok) {
     throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

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

// Helper for local storage persistence fallback
const getStored = (key, fallback) => {
  try {
    const item = localStorage.getItem(`nec_sports_${key}`);
    return item ? JSON.parse(item) : fallback;
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

/* --- Sports & Departments API --- */
export const sportsApi = {
  getDepartments: async () => {
    await delay();
    return getStored("departments", INITIAL_DEPARTMENTS);
  },
  getSports: async () => {
    return fetchApi('/sports');
  },
  getVenues: async () => {
    return fetchApi('/venues');
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
    await delay(250);
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
    await delay(200);
    const sports = getStored("sports", INITIAL_SPORTS);
    const updated = sports.filter(s => s.id !== sportId);
    setStored("sports", updated);
    return true;
  }
};

/* --- Tournaments & Events API --- */
export const tournamentsApi = {
  getTournaments: async () => {
    return fetchApi('/tournaments');
  },
  getEvents: async (tournamentId = null) => {
    const events = await fetchApi('/events');
    if (tournamentId) return events.filter(e => e.tournamentId === tournamentId);
    return events;
  },
  createTournament: async (tournamentData) => {
    await delay(300);
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
    await delay(250);
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
    await delay(200);
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
    const teams = await fetchApi('/teams');
    if (deptId) return teams.filter(t => t.deptId === deptId || t.deptCode === deptId);
    return teams;
  },
  registerTeam: async (teamData) => {
    await delay(300);
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
    await delay(200);
    const teams = getStored("teams", INITIAL_TEAMS);
    const updated = teams.map(t => t.id === teamId ? { ...t, status: sanitizeInput(status) } : t);
    setStored("teams", updated);
    return updated.find(t => t.id === teamId);
  }
};

/* --- External Student Lookup Boundary API (Simulating NEC IMS Student Data) --- */
export const studentLookupApi = {
  searchStudent: async (studentIdOrName) => {
    await delay(200);
    const query = sanitizeInput(String(studentIdOrName)).trim().toLowerCase();
    if (!query) return [];
    return EXTERNAL_STUDENT_DATABASE.filter(
      s => s.studentId.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
    );
  }
};

/* --- Players API --- */
export const playersApi = {
  getPlayersByTeam: async (teamId) => {
    const players = await fetchApi('/players');
    return players.filter(p => p.teamId === teamId);
  },
  getAllPlayers: async () => {
    return fetchApi('/players');
  },
  addPlayerToRoster: async (teamId, playerData) => {
    await delay(250);
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
    await delay(200);
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
    await delay(300);
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
    const matches = await fetchApi('/matches');
    const events = await fetchApi('/events');
    
    // Map event category to matches
    return matches.map(match => {
      const event = events.find(e => e.id === match.eventId);
      return {
        ...match,
        eventCategory: event ? event.eventCategory : "Unknown"
      };
    });
  },
  scheduleMatch: async (matchData) => {
    await delay(300);
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
    await delay(200);
    const matches = getStored("matches", INITIAL_MATCHES);
    const updated = matches.filter(m => m.id !== matchId);
    setStored("matches", updated);
    return true;
  },
  updateMatchScore: async (matchId, scoreA, scoreB, detailScore = "", isFinal = false) => {
    await delay(300);
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
    return fetchApi('/leaderboard');
  }
};

/* --- Announcements & Media API --- */
export const announcementsApi = {
  getAnnouncements: async () => {
    return fetchApi('/announcements');
  },
  createAnnouncement: async (data) => {
    await delay(250);
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
    await delay(200);
    const list = getStored("announcements", INITIAL_ANNOUNCEMENTS);
    const updated = list.filter(a => a.id !== id);
    setStored("announcements", updated);
    return true;
  }
};

export const galleryApi = {
  getGallery: async () => {
    return fetchApi('/gallery');
  }
};

export const notificationsApi = {
  getNotifications: async () => {
    return fetchApi('/notifications');
  },
  markAllRead: async () => {
    await delay(150);
    const notifs = getStored("notifications", INITIAL_NOTIFICATIONS);
    const updated = notifs.map(n => ({ ...n, read: true }));
    setStored("notifications", updated);
    return updated;
  }
};
