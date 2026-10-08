import React, { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppShell.css";

const DESKTOP_QUERY = "(min-width: 901px)"; // must match the header toggle breakpoint (Header.css, max-width: 900px)
const DRAWER_KEY = "nec-sidebar-open";
const COLLAPSED_KEY = "nec-sidebar-collapsed";
const WIDTH_KEY = "nec-sidebar-width";
const DEFAULT_WIDTH = 248;

const readFlag = (storage, key) => {
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const writeFlag = (storage, key, value) => {
  try {
    storage.setItem(key, value ? "1" : "0");
  } catch {
    /* storage unavailable: keep in-memory state only */
  }
};

// Desktop: docked sidebar that expands or collapses to an icon rail (remembered per browser).
// Small screens: overlay drawer opened from the header toggle (remembered per session).
export default function AppShell({ activeNav, onSelectNav, onRoleChange, children }) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );
  const [isCollapsed, setIsCollapsed] = useState(() => readFlag(localStorage, COLLAPSED_KEY));
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => readFlag(sessionStorage, DRAWER_KEY));
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem(WIDTH_KEY), 10);
      return Number.isFinite(v) ? Math.min(360, Math.max(200, v)) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => { writeFlag(localStorage, COLLAPSED_KEY, isCollapsed); }, [isCollapsed]);
  useEffect(() => { writeFlag(sessionStorage, DRAWER_KEY, isDrawerOpen); }, [isDrawerOpen]);
  useEffect(() => {
    try { localStorage.setItem(WIDTH_KEY, String(sidebarWidth)); } catch { /* ignore */ }
  }, [sidebarWidth]);

  const toggleSidebar = useCallback(() => {
    if (isDesktop) setIsCollapsed(prev => !prev);
    else setIsDrawerOpen(prev => !prev);
  }, [isDesktop]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Return focus to the trigger so keyboard users keep their place.
    requestAnimationFrame(() => document.getElementById("nec-menu-toggle")?.focus());
  }, []);

  const sidebarExpanded = isDesktop ? !isCollapsed : isDrawerOpen;

  return (
    <div className="nec-app-shell">
      <Header
        activeNav={activeNav}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={sidebarExpanded}
        onRoleChange={onRoleChange}
        onSelectNav={onSelectNav}
      />
      <div className="nec-app-body">
        <Sidebar
          activeNav={activeNav}
          onSelectNav={onSelectNav}
          variant={isDesktop ? "docked" : "drawer"}
          collapsed={isCollapsed}
          onToggleCollapse={toggleSidebar}
          drawerOpen={isDrawerOpen}
          onCloseDrawer={closeDrawer}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          onCollapsedChange={setIsCollapsed}
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
