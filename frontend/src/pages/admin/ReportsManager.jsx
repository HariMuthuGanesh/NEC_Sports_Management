import React, { useState, useRef } from "react";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { FileText, Printer, Download, Filter, Award, Trophy } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./AdminPortal.css";

export default function ReportsManager() {
  const [activeTab, setActiveTab] = useState("reports");
  const [reportType, setReportType] = useState("dept_perf");
  const [certName, setCertName] = useState("");
  const [certSport, setCertSport] = useState("Basketball");
  const [certType, setCertType] = useState("Merit");
  const [generating, setGenerating] = useState(false);

  const certRef = useRef(null);
  const reportRef = useRef(null);

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

  const generatePDF = async (elementRef, filename) => {
    if (!elementRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(elementRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation failed", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Institutional Sports Performance & Documents</h2>
          <p className="nec-page-desc">Generate official sports audits, department rankings, and certificates.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant={activeTab === "reports" ? "primary" : "outline"} icon={FileText} onClick={() => setActiveTab("reports")}>
            Reports
          </Button>
          <Button variant={activeTab === "certificates" ? "primary" : "outline"} icon={Award} onClick={() => setActiveTab("certificates")}>
            Certificates
          </Button>
        </div>
      </div>

      {activeTab === "reports" && (
        <>
          <div className="nec-card" style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
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
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="outline" icon={Printer} onClick={handlePrint}>Print</Button>
              <Button variant="primary" icon={Download} onClick={() => generatePDF(reportRef, "Sports_Performance_Report.pdf")} loading={generating}>
                Export PDF
              </Button>
            </div>
          </div>

          <Card title="Report Preview: National Engineering College Sports Office">
            <div ref={reportRef} style={{ padding: "20px", backgroundColor: "#fff" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "var(--nec-primary-dark)" }}>National Engineering College</h3>
                <p style={{ margin: "4px 0", color: "#666" }}>Lakshmi Ammal Sports Academy (LASA)</p>
                <h4 style={{ margin: "10px 0", borderBottom: "2px solid var(--nec-gold)", display: "inline-block", paddingBottom: "4px" }}>
                  Inter-Department Performance Report 2026
                </h4>
              </div>
              <Table
                columns={columns}
                data={deptPerformanceData}
                searchable={false}
              />
              <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", color: "#666", fontSize: "0.9rem" }}>
                <p>Generated on: {new Date().toLocaleDateString()}</p>
                <p>Authorized by: Director of Physical Education</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {activeTab === "certificates" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          <Card title="Certificate Details" icon={Award}>
            <div className="nec-form-group">
              <label className="nec-form-label">Athlete Name</label>
              <input type="text" className="nec-input" value={certName} onChange={e => setCertName(e.target.value)} placeholder="e.g. Priya Patel" />
            </div>
            <div className="nec-form-group">
              <label className="nec-form-label">Sport / Event</label>
              <input type="text" className="nec-input" value={certSport} onChange={e => setCertSport(e.target.value)} />
            </div>
            <div className="nec-form-group">
              <label className="nec-form-label">Certificate Type</label>
              <select className="nec-input" value={certType} onChange={e => setCertType(e.target.value)}>
                <option value="Merit">Certificate of Merit (Winner)</option>
                <option value="Participation">Certificate of Participation</option>
              </select>
            </div>
            <Button 
              variant="primary" 
              icon={Download} 
              fullWidth 
              style={{ marginTop: "20px" }}
              loading={generating}
              onClick={() => generatePDF(certRef, `${certName.replace(/\s+/g, '_')}_Certificate.pdf`)}
              disabled={!certName}
            >
              Generate & Download PDF
            </Button>
          </Card>

          <Card title="Live Preview">
            <div style={{ overflowX: "auto", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
              {/* Certificate DOM Element to be captured by html2canvas */}
              <div 
                ref={certRef}
                style={{
                  width: "800px",
                  height: "560px",
                  padding: "40px",
                  backgroundColor: "#fff",
                  backgroundImage: "linear-gradient(to bottom right, #ffffff, #fdfbf5)",
                  border: "15px solid var(--nec-primary-dark)",
                  outline: "5px solid var(--nec-gold)",
                  outlineOffset: "-25px",
                  boxSizing: "border-box",
                  textAlign: "center",
                  position: "relative",
                  fontFamily: "serif",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <Trophy size={48} color="var(--nec-gold)" style={{ marginBottom: "10px" }} />
                  <h1 style={{ color: "var(--nec-primary-dark)", margin: "0", fontSize: "32px", textTransform: "uppercase", letterSpacing: "2px" }}>
                    National Engineering College
                  </h1>
                  <h3 style={{ color: "#555", margin: "5px 0 0 0", fontWeight: "normal" }}>
                    (An Autonomous Institution, Kovilpatti)
                  </h3>
                  <p style={{ color: "var(--nec-gold)", fontWeight: "bold", fontSize: "1.1rem", margin: "10px 0" }}>
                    LAKSHMI AMMAL SPORTS ACADEMY
                  </p>
                </div>
                
                <h2 style={{ fontSize: "42px", color: "var(--nec-primary)", margin: "30px 0 10px 0", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                  Certificate of {certType}
                </h2>
                
                <p style={{ fontSize: "1.2rem", margin: "20px 0" }}>
                  This is to certify that
                </p>
                
                <h2 style={{ fontSize: "36px", borderBottom: "2px dotted #333", display: "inline-block", minWidth: "400px", margin: "0 0 20px 0", paddingBottom: "5px", color: "#222" }}>
                  {certName || "_______________________"}
                </h2>
                
                <p style={{ fontSize: "1.2rem", lineHeight: "1.6", margin: "0 40px" }}>
                  has successfully {certType === "Merit" ? "secured First Place" : "participated"} in the 
                  <br /><strong>{certSport}</strong> tournament held during the Academic Year 2025-2026.
                </p>
                
                <div style={{ position: "absolute", bottom: "50px", left: "60px", right: "60px", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "10px", width: "200px" }}>
                    <strong>Sports Coordinator</strong>
                  </div>
                  <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "10px", width: "200px" }}>
                    <strong>Director of Physical Ed.</strong>
                  </div>
                  <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "10px", width: "200px" }}>
                    <strong>Principal</strong>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
