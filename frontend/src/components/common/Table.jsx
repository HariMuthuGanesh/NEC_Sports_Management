import React, { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import EmptyState from "./EmptyState";
import SkeletonLoader from "./SkeletonLoader";
import Pagination from "./Pagination";
import "./Table.css";

export default function Table({
  columns = [],
  data = [],
  searchable = true,
  searchPlaceholder = "Search records...",
  loading = false,
  emptyMessage = "No data available",
  pageSize = 8,
  className = ""
}) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("asc");
    }
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search, columns]);

  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;
    return [...filteredData].sort((a, b) => {
      let valA = a[sortCol] ?? "";
      let valB = b[sortCol] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortCol, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className={`nec-table-container ${className}`}>
      {searchable && (
        <div className="nec-table-toolbar">
          <div className="nec-search-wrapper">
            <Search className="nec-search-icon" size={16} />
            <input
              type="text"
              className="nec-table-search-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="nec-table-count">
            Showing {sortedData.length} records
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonLoader rows={5} />
      ) : paginatedData.length === 0 ? (
        <EmptyState title="No Records Found" message={emptyMessage} />
      ) : (
        <>
          <div className="nec-table-responsive-wrapper">
            <table className="nec-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width || "auto" }}
                      className={col.sortable !== false ? "sortable" : ""}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <div className="nec-th-content">
                        <span>{col.label}</span>
                        {col.sortable !== false && sortCol === col.key && (
                          sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}
