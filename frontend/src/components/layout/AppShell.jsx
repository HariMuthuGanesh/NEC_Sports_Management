import React, { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppShell.css";

const STORAGE_KEY = "nec-sidebar-open";

// The drawer starts collapsed. Its open/closed state is remembered for the browser session.
export default function AppShell({ activeNav, onSelectNav, onRoleChange, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, isSidebarOpen ? "1" : "0");
    } catch {
      /* storage unavailable: keep in-memory state only */
    }
  }, [isSidebarOpen]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    // Return focus to the trigger so keyboard users keep their place.
    requestAnimationFrame(() => document.getElementById("nec-menu-toggle")?.focus());
  }, []);

  return (
    <div className="nec-app-shell">
      <Header
        activeNav={activeNav}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onRoleChange={onRoleChange}
        onSelectNav={onSelectNav}
      />
      <div className="nec-app-body">
        <Sidebar
          activeNav={activeNav}
          onSelectNav={onSelectNav}
          isOpen={isSidebarOpen}
          onCloseMobile={closeSidebar}
        />
        <main className="nec-main-content">
          <div className="nec-content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
