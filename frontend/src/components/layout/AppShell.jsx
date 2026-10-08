import React, { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppShell.css";

export default function AppShell({ activeNav, onSelectNav, onRoleChange, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const stored = sessionStorage.getItem("nec_sidebar_open");
      if (stored !== null) {
        return stored === "true";
      }
      // Side panel defaults to ALWAYS OPEN on desktop, collapsed on mobile
      return typeof window !== "undefined" ? window.innerWidth >= 1024 : true;
    } catch {
      return true;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem("nec_sidebar_open", String(next));
      } catch {}
      return next;
    });
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    try {
      sessionStorage.setItem("nec_sidebar_open", "false");
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key only closes overlay on mobile viewports (< 1024px)
      if (e.key === "Escape" && isSidebarOpen && window.innerWidth < 1024) {
        handleCloseSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className={`nec-app-shell ${isSidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <Header
        activeNav={activeNav}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onRoleChange={onRoleChange}
        onSelectNav={onSelectNav}
      />
      <div className="nec-app-body">
        <Sidebar
          activeNav={activeNav}
          onSelectNav={onSelectNav}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          onCloseMobile={handleCloseSidebar}
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
