import React, { useState, useEffect, useRef } from "react";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { FileText, Printer, Download, Award, Trophy, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { reportsApi } from "../../services/api/apiServices";
import ErrorState from "../../components/common/ErrorState";
import "./AdminPortal.css";

export default function ReportsManager() {
  const [activeTab, setActiveTab] = useState("reports");
  const [timeframe, setTimeframe] = useState("1month");
  const [reportType, setReportType] = useState("dept_perf");
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Certificate State
  const [certName, setCertName] = useState("");
  const [certSport, setCertSport] = useState("Basketball");
  const [certType, setCertType] = useState("Merit");
  const [generating, setGenerating] = useState(false);

  const certRef = useRef(null);
  const reportRef = useRef(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.getPerformanceReport(timeframe);
      setReportData(res.departments || []);
      setSummaryData(res.summary || {});
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load performance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [timeframe]);

  const columns = [
    { key: "rank", label: "Rank", width: "70px", render: (val) => <strong>#{val}</strong> },
    { key: "dept", label: "Department", render: (val, row) => <strong>{val} ({row.code})</strong> },
    { key: "totalEvents", label: "Matches Completed", width: "130px" },
    { key: "wins", label: "Victories", width: "90px" },
    { key: "gold", label: "🥇 Gold", width: "90px" },
    { key: "silver", label: "🥈 Silver", width: "90px" },
    { key: "bronze", label: "🥉 Bronze", width: "90px" },
    { key: "points", label: "Total Points", width: "110px", render: (val) => <strong>{val} pts</strong> },
    { key: "participation", label: "Athlete Activity", width: "140px" }
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
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const timeframeLabel = timeframe === "1month" 
    ? "Past 1 Month (Current Cycle)" 
    : timeframe === "6months" 
    ? "Past 6 Months (Semester)" 
    : timeframe === "12months"
    ? "Past 12 Months (Annual Audit)"
    : "All Time Cumulative";

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 className="nec-page-title">Institutional Sports Performance & Reporting Engine</h2>
          <p className="nec-page-desc">Automated 1-month, 6-month, and 12-month departmental performance audits and certificates.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant={activeTab === "reports" ? "primary" : "outline"} icon={FileText} onClick={() => setActiveTab("reports")}>
            Performance Reports
          </Button>
          <Button variant={activeTab === "certificates" ? "primary" : "outline"} icon={Award} onClick={() => setActiveTab("certificates")}>
            Certificates
          </Button>
        </div>
      </div>

      {activeTab === "reports" && (
        <>
          <div className="nec-card" style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <label style={{ fontWeight: 600, marginRight: "8px" }}>Audit Timeframe:</label>
                <select
                  className="nec-table-search-input"
                  style={{ display: "inline-block", width: "auto" }}
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                >
                  <option value="1month">Past 1 Month (Current Cycle)</option>
                  <option value="6months">Past 6 Months (Semester Audit)</option>
                  <option value="12months">Past 12 Months (Annual Report)</option>
                  <option value="all">All-Time Cumulative</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, marginRight: "8px" }}>Report Type:</label>
                <select
                  className="nec-table-search-input"
                  style={{ display: "inline-block", width: "auto" }}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="dept_perf">Department Medal Tally & Performance</option>
                  <option value="attendance_summary">Athletic Attendance & Participation Summary</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="outline" icon={RefreshCw} onClick={loadReport} loading={loading}>Refresh</Button>
              <Button variant="outline" icon={Printer} onClick={handlePrint}>Print</Button>
              <Button variant="primary" icon={Download} onClick={() => generatePDF(reportRef, `NEC_Sports_Report_${timeframe}.pdf`)} loading={generating}>
                Export PDF
              </Button>
            </div>
          </div>

          {error ? (
            <div style={{ padding: "40px" }}>
              <ErrorState onRetry={loadReport} />
            </div>
          ) : (
            <Card title={`Official Audit Preview: ${timeframeLabel}`}>
              <div ref={reportRef} style={{ padding: "24px", backgroundColor: "#fff", color: "#111" }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, color: "var(--nec-navy, #1e3a8a)", textTransform: "uppercase" }}>National Engineering College</h2>
                  <p style={{ margin: "4px 0", color: "#444", fontSize: "0.9rem" }}>Kovilpatti — 628 503, Tamil Nadu | Department of Physical Education</p>
                  <h4 style={{ margin: "12px 0 4px", borderBottom: "2px solid var(--nec-gold, #f59e0b)", display: "inline-block", paddingBottom: "4px" }}>
                    Department Sports Performance & Medal Tally Report ({timeframeLabel})
                  </h4>
                  <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "4px" }}>
                    Completed Fixtures in Scope: <strong>{summaryData.totalCompleted || 0}</strong> | Total Matches: <strong>{summaryData.totalScheduled || 0}</strong>
                  </div>
                </div>

                <Table
                  columns={columns}
                  data={reportData}
                  searchable={false}
                  loading={loading}
                />

                <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", color: "#555", fontSize: "0.85rem", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                  <p>Report Generated On: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  <p>Authorized Signatory: <strong>Director of Physical Education, NEC</strong></p>
                </div>
              </div>
            </Card>
          )}
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
              <div 
                ref={certRef}
                style={{
                  width: "800px",
                  height: "560px",
                  padding: "40px",
                  backgroundColor: "#fff",
                  backgroundImage: "linear-gradient(to bottom right, #ffffff, #fdfbf5)",
                  border: "15px solid var(--nec-primary-dark, #1e3a8a)",
                  outline: "5px solid var(--nec-gold, #f59e0b)",
                  outlineOffset: "-25px",
                  boxSizing: "border-box",
                  textAlign: "center",
                  position: "relative",
                  fontFamily: "serif",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <Trophy size={48} color="var(--nec-gold, #f59e0b)" style={{ marginBottom: "10px" }} />
                  <h1 style={{ color: "var(--nec-primary-dark, #1e3a8a)", margin: "0", fontSize: "32px", textTransform: "uppercase", letterSpacing: "2px" }}>
                    National Engineering College
                  </h1>
                  <h3 style={{ color: "#555", margin: "5px 0 0 0", fontWeight: "normal" }}>
                    (An Autonomous Institution, Kovilpatti)
                  </h3>
                  <p style={{ color: "var(--nec-gold, #f59e0b)", fontWeight: "bold", fontSize: "1.1rem", margin: "10px 0" }}>
                    NEC SPORTS COUNCIL
                  </p>
                </div>
                
                <h2 style={{ fontSize: "42px", color: "var(--nec-primary, #2563eb)", margin: "30px 0 10px 0", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
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
