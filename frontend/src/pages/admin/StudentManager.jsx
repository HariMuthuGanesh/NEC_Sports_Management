import React, { useEffect, useState } from "react";
import { EXTERNAL_STUDENT_DATABASE } from "../../data/mock/mockData";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Users, Filter, Plus, Search, Mail, Phone, GraduationCap } from "lucide-react";
import "./AdminPortal.css";

export default function StudentManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load student directory data
    setStudents(EXTERNAL_STUDENT_DATABASE);
    setLoading(false);
  }, []);

  const columns = [
    { key: "studentId", label: "Student ID (NEC IMS)", width: "160px", render: (val) => <strong>{val}</strong> },
    {
      key: "name",
      label: "Student Name",
      render: (val, row) => (
        <div>
          <strong style={{ fontSize: "0.925rem" }}>{val}</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
            <Mail size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
            {row.email}
          </div>
        </div>
      )
    },
    { key: "dept", label: "Department", width: "130px", render: (val) => <strong>{val}</strong> },
    { key: "year", label: "Academic Year", width: "120px" },
    { key: "phone", label: "Contact Phone", width: "140px" },
    {
      key: "status",
      label: "Athletic Status",
      width: "140px",
      render: () => <Badge status="success">Verified Athlete ✓</Badge>
    }
  ];

  return (
    <div className="nec-portal-page">
      {/* Stitch Design Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Student Directory</h1>
          <p className="nec-page-desc">Manage the complete roster of enrolled student athletes across all departments, search IMS profiles, and access academic standing.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="outline" icon={Filter}>Filter Department</Button>
          <Button variant="primary" icon={Plus}>Add Student Athlete</Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={students}
        loading={loading}
        searchPlaceholder="Search student directory by name, ID, department..."
      />
    </div>
  );
}
