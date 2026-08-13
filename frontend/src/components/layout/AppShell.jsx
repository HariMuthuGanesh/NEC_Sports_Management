import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppShell.css";

export default function AppShell({ activeNav, onSelectNav, onRoleChange, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="nec-app-shell">
      <Header
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
        onRoleChange={onRoleChange}
      />
      <div className="nec-app-body">
        <Sidebar
          activeNav={activeNav}
          onSelectNav={onSelectNav}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
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
