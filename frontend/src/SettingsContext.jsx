import { createContext, useContext, useState, useEffect } from "react";

/* ── Translations ─────────────────────────────────────────────────────────── */
export const TRANSLATIONS = {
  en: {
    // Login page
    sportsPortal: "Sports Portal",
    signIn: "Sign in to your account",
    rollNumber: "Roll Number / Username",
    rollPlaceholder: "Enter your roll number",
    fullName: "Full Name",
    namePlaceholder: "Enter your full name",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    login: "Login",
    noAccount: "Don't have an account?",
    register: "Register",
    roll: "Roll",
    name: "Name",
    pass: "Pass",

    // Dashboard nav & Staff modules
    menu: "Menu",
    overview: "Overview",
    matches: "Matches",
    leaderboard: "Leaderboard",
    analytics: "Analytics",
    announcements: "Announcements",
    dashboard: "Dashboard",
    logout: "Logout",
    activities: "Activities",
    events: "Events",
    registrations: "Registrations",
    participants: "Participants",
    teams: "Teams",
    schedules: "Schedules",
    results: "Results",
    achievements: "Achievements",
    reports: "Reports",
    aiAssistant: "AI Assistant",

    // Overview section
    overviewTitle: "Overview",
    overviewSub: "Live operational summary and statistics",
    totalMatches: "Total Matches",
    liveRightNow: "Live Right Now",
    teamsRegistered: "Teams Registered",
    totalPlayers: "Total Players",
    departments: "Departments",

    // Matches section
    matchesTitle: "Matches",
    matchesShown: (n) => `${n} match${n !== 1 ? "es" : ""} shown`,
    allSports: "All Sports",
    allStatus: "All Status",
    live: "Live",
    scheduled: "Scheduled",
    completed: "Completed",
    reset: "Reset",
    noMatchesFound: "No matches found",
    noMatchesSub: "Try adjusting the sport or status filter above",
    matchDrawn: "Match Drawn",
    won: "won",
    vs: "VS",

    // Staff Module Subtitles & Forms
    activitiesSub: "Create and manage sports activities & tournaments",
    createActivity: "Create Activity",
    eventsSub: "Add and organize events inside active tournaments",
    addEvent: "Add Event",
    registrationsSub: "Review and manage student registration requests",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    participantsSub: "View approved participants and verified athletes",
    teamsSub: "Create and manage departmental sports teams",
    createTeam: "Create Team",
    schedulesSub: "Create fixtures, set times, and assign venues",
    addFixture: "Add Fixture",
    resultsSub: "Record scores, match outcomes, and positions",
    recordScore: "Record Score",
    achievementsSub: "Add awards, medals, and student achievements",
    addAward: "Add Award",
    announcementsSub: "Publish notices and official communications",
    publishNotice: "Publish Notice",
    reportsSub: "Generate and review operational sports reports",
    generateReport: "Generate Report",
    aiAssistantSub: "Analyze activity data and get AI-driven sports insights",
    askAi: "Ask Assistant",

    // Leaderboard section
    leaderboardTitle: "Department Leaderboard",
    leaderboardSub: "Ranked by total points earned this season",
    rank: "Rank",
    department: "Department",
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze",
    points: "Points",
    progress: "Progress",

    // Analytics section
    analyticsTitle: "Analytics",
    analyticsSub: "Match distribution across sports this season",

    // Announcements section
    announcementsTitle: "Announcements",
    recentUpdates: (n) => `${n} recent updates`,

    // Settings panel
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    lightMode: "Light",
    darkMode: "Dark",
    admin: "Admin",
    sportsOffice: "Sports Office",
  },
  hi: {
    // Login page
    sportsPortal: "स्पोर्ट्स पोर्टल",
    signIn: "अपने खाते में साइन इन करें",
    rollNumber: "रोल नंबर / यूज़रनेम",
    rollPlaceholder: "अपना रोल नंबर दर्ज करें",
    fullName: "पूरा नाम",
    namePlaceholder: "अपना पूरा नाम दर्ज करें",
    password: "पासवर्ड",
    passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
    login: "लॉगिन",
    noAccount: "खाता नहीं है?",
    register: "रजिस्टर करें",
    roll: "रोल",
    name: "नाम",
    pass: "पास",

    // Dashboard nav & Staff modules
    menu: "मेनू",
    overview: "अवलोकन",
    matches: "मैच",
    leaderboard: "लीडरबोर्ड",
    analytics: "विश्लेषण",
    announcements: "घोषणाएं",
    dashboard: "डैशबोर्ड",
    logout: "लॉगआउट",
    activities: "गतिविधियां",
    events: "इवेंट्स",
    registrations: "पंजीकरण",
    participants: "प्रतिभागी",
    teams: "टीमें",
    schedules: "अनुसूची",
    results: "परिणाम",
    achievements: "उपलब्धियां",
    reports: "रिपोर्ट्स",
    aiAssistant: "एआई सहायक",

    // Overview section
    overviewTitle: "अवलोकन",
    overviewSub: "लाइव परिचालन सारांश और आंकड़े",
    totalMatches: "कुल मैच",
    liveRightNow: "अभी लाइव",
    teamsRegistered: "पंजीकृत टीमें",
    totalPlayers: "कुल खिलाड़ी",
    departments: "विभाग",

    // Matches section
    matchesTitle: "मैच",
    matchesShown: (n) => `${n} मैच दिखाए गए`,
    allSports: "सभी खेल",
    allStatus: "सभी स्थिति",
    live: "लाइव",
    scheduled: "निर्धारित",
    completed: "पूर्ण",
    reset: "रीसेट",
    noMatchesFound: "कोई मैच नहीं मिला",
    noMatchesSub: "ऊपर खेल या स्थिति फ़िल्टर समायोजित करें",
    matchDrawn: "मैच ड्रा",
    won: "जीता",
    vs: "बनाम",

    // Staff Module Subtitles & Forms
    activitiesSub: "खेल गतिविधियों और टूर्नामेंटों को बनाएं और प्रबंधित करें",
    createActivity: "गतिविधि बनाएं",
    eventsSub: "सक्रिय टूर्नामेंटों में कार्यक्रम जोड़ें और व्यवस्थित करें",
    addEvent: "इवेंट जोड़ें",
    registrationsSub: "छात्र पंजीकरण अनुरोधों की समीक्षा और प्रबंधन करें",
    approve: "स्वीकृत करें",
    reject: "अस्वीकृत करें",
    pending: "लंबित",
    participantsSub: "स्वीकृत प्रतिभागियों और सत्यापित एथलीटों को देखें",
    teamsSub: "विभागीय खेल टीमों को बनाएं और प्रबंधित करें",
    createTeam: "टीम बनाएं",
    schedulesSub: "फिक्स्चर बनाएं, समय निर्धारित करें और स्थान आवंटित करें",
    addFixture: "फिक्स्चर जोड़ें",
    resultsSub: "स्कोर, मैच परिणाम और स्थिति रिकॉर्ड करें",
    recordScore: "स्कोर दर्ज करें",
    achievementsSub: "पुरस्कार, पदक और छात्र उपलब्धियां जोड़ें",
    addAward: "पुरस्कार जोड़ें",
    announcementsSub: "सूचनाएं और आधिकारिक संचार प्रकाशित करें",
    publishNotice: "सूचना प्रकाशित करें",
    reportsSub: "परिचालन खेल रिपोर्ट उत्पन्न करें और समीक्षा करें",
    generateReport: "रिपोर्ट बनाएं",
    aiAssistantSub: "गतिविधि डेटा का विश्लेषण करें और एआई अंतर्दृष्टि प्राप्त करें",
    askAi: "सहायक से पूछें",

    // Leaderboard section
    leaderboardTitle: "विभाग लीडरबोर्ड",
    leaderboardSub: "इस सत्र में अर्जित कुल अंकों के आधार पर",
    rank: "रैंक",
    department: "विभाग",
    gold: "स्वर्ण",
    silver: "रजत",
    bronze: "कांस्य",
    points: "अंक",
    progress: "प्रगति",

    // Analytics section
    analyticsTitle: "विश्लेषण",
    analyticsSub: "इस सत्र में खेलों में मैच वितरण",

    // Announcements section
    announcementsTitle: "घोषणाएं",
    recentUpdates: (n) => `${n} हालिया अपडेट`,

    // Settings panel
    settings: "सेटिंग्स",
    theme: "थीम",
    language: "भाषा",
    lightMode: "लाइट",
    darkMode: "डार्क",
    admin: "एडमिन",
    sportsOffice: "खेल कार्यालय",
  },
};

/* ── Context ──────────────────────────────────────────────────────────────── */
export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("sp-theme") || "light";
  });
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("sp-lang") || "en";
  });

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("sp-theme", t);
  };

  const setLanguage = (l) => {
    setLanguageState(l);
    localStorage.setItem("sp-lang", l);
  };

  // Apply theme to document root (for Dashboard CSS variables)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    }
  }, [theme]);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
