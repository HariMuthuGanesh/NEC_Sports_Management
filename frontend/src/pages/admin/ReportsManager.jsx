import React, { useState } from "react";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { FileText, Printer, Download, Filter } from "lucide-react";
import "./AdminPortal.css";

export default function ReportsManager() {
  const [reportType, setReportType] = useState("dept_perf");

  const deptPerformanceData = [
    { dept: "Computer Science (CSE)", totalEvents: 12, gold: 5, silver: 3, bronze: 2, points: 145, participation: "98%" },
    { dept: "Electronics & Comm (ECE)", totalEvents: 12, gold: 4, silver: 4, bronze: 1, points: 130, participation: "94%" },
    { dept: "Mechanical Engg (MECH)", totalEvents: 10, gold: 3, silver: 2, bronze: 4, points: 110, participation: "91%" },
    { dept: "Electrical Engg (EEE)", totalEvents: 10, gold: 2, silver: 3, bronze: 2, points: 90, participation: "88%" },
    { dept: "Civil Engg (CIVIL)", totalEvents: 8, gold: 2, silver: 1, bronze: 3, points: 75, participation: "85%" }
  ];

  const columns = [
    { key: "dept", label: "Department", render: (val) => <strong>{val}</strong> },
    { key: "totalEvents", label: "Events Entered", width: "120px" },
    { key: "gold", label: "🥇 Gold", width: "90px" },
    { key: "silver", label: "🥈 Silver", width: "90px" },
    { key: "bronze", label: "🥉 Bronze", width: "90px" },
    { key: "points", label: "Total Points", width: "110px", render: (val) => <strong>{val} pts</strong> },
    { key: "participation", label: "Athlete Participation Rate", width: "180px" }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Institutional Sports Performance Reports</h2>
          <p className="nec-page-desc">Generate official sports audit, department rankings, and participation summaries for college leadership.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="outline" icon={Printer} onClick={handlePrint}>
            Print Report
          </Button>
          <Button variant="primary" icon={Download} onClick={() => alert("Report downloaded in CSV / Excel format!")}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="nec-card" style={{ padding: "14px 20px" }}>
        <label style={{ fontWeight: 600, marginRight: "12px" }}>Select Report Category:</label>
        <select
          className="nec-table-search-input"
          style={{ display: "inline-block", width: "auto" }}
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        >
          <option value="dept_perf">Inter-Department Medal Tally & Performance</option>
          <option value="attendance_summary">Athletic Attendance & Participation Summary</option>
          <option value="tournament_audit">Tournament Match Result Audit</option>
        </select>
      </div>

      <Card title="Report Preview: National Engineering College Sports Office">
        <Table
          columns={columns}
          data={deptPerformanceData}
          searchable={false}
        />
      </Card>
    </div>
  );
}
