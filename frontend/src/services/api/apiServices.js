/* API Service Abstraction Layer for NEC Sports Management System
   This layer simulates asynchronous network calls to a backend service.
   It encapsulates data persistence in local memory / localStorage so the UI
   components remain 100% decoupled from the backend technology (MySQL, MongoDB, etc.).
*/

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

// Helper to simulate network latency
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await delay();
    return getStored("sports", INITIAL_SPORTS);
  },
  getVenues: async () => {
    await delay();
    return getStored("venues", INITIAL_VENUES);
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
    await delay(300);
    const tournaments = getStored("tournaments", INITIAL_TOURNAMENTS);
    const newTournament = {
      ...tournamentData,
      id: `tn_${Date.now()}`,
      status: tournamentData.status || "Registration Open"
    };
    const updated = [newTournament, ...tournaments];
    setStored("tournaments", updated);
    return newTournament;
  }
};

/* --- Teams & Roster API --- */
export const teamsApi = {
  getTeams: async (deptId = null) => {
    await delay();
    const teams = getStored("teams", INITIAL_TEAMS);
    if (deptId) return teams.filter(t => t.deptId === deptId);
    return teams;
  },
  registerTeam: async (teamData) => {
    await delay(300);
    const teams = getStored("teams", INITIAL_TEAMS);
    const newTeam = {
      ...teamData,
      id: `tm_${Date.now()}`,
      status: "Pending",
      memberCount: teamData.players ? teamData.players.length : 0
    };
    const updated = [newTeam, ...teams];
    setStored("teams", updated);
    return newTeam;
  },
  updateTeamStatus: async (teamId, status) => {
    await delay(200);
    const teams = getStored("teams", INITIAL_TEAMS);
    const updated = teams.map(t => t.id === teamId ? { ...t, status } : t);
    setStored("teams", updated);
    return updated.find(t => t.id === teamId);
  }
};

/* --- External Student Lookup Boundary API (Simulating NEC IMS Student Data) --- */
export const studentLookupApi = {
  searchStudent: async (studentIdOrName) => {
    await delay(200);
    const query = String(studentIdOrName).trim().toLowerCase();
    if (!query) return [];
    return EXTERNAL_STUDENT_DATABASE.filter(
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
  addPlayerToRoster: async (teamId, playerData) => {
    await delay(250);
    const players = getStored("players", INITIAL_PLAYERS);
    const newPlayer = {
      ...playerData,
      id: `pl_${Date.now()}`,
      teamId,
      attendancePct: 100
    };
    const updated = [...players, newPlayer];
    setStored("players", updated);
    return newPlayer;
  },
  removePlayer: async (playerId) => {
    await delay(200);
    const players = getStored("players", INITIAL_PLAYERS);
    const updated = players.filter(p => p.id !== playerId);
    setStored("players", updated);
    return true;
  }
};

/* --- Matches & Scheduling API --- */
export const matchesApi = {
  getMatches: async () => {
    await delay();
    return getStored("matches", INITIAL_MATCHES);
  },
  scheduleMatch: async (matchData) => {
    await delay(300);
    const matches = getStored("matches", INITIAL_MATCHES);
    const newMatch = {
      ...matchData,
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
          detailScore,
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
    await delay(250);
    const list = getStored("announcements", INITIAL_ANNOUNCEMENTS);
    const newItem = {
      ...data,
      id: `ann_${Date.now()}`,
      date: new Date().toISOString().split("T")[0]
    };
    const updated = [newItem, ...list];
    setStored("announcements", updated);
    return newItem;
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
    await delay(150);
    const notifs = getStored("notifications", INITIAL_NOTIFICATIONS);
    const updated = notifs.map(n => ({ ...n, read: true }));
    setStored("notifications", updated);
    return updated;
  }
};
