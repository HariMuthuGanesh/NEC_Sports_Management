import React from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import "./Table.css";

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  style = {},
  className = ""
}) {
  // Always render pagination bar as shown in reference design
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={`nec-table-pagination ${className}`} style={style} role="navigation" aria-label="Pagination">
      <button
        type="button"
        className="nec-pagination-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(1)}
        title="First Page"
        aria-label="First Page"
      >
        <ChevronsLeft size={16} />
      </button>
      <button
        type="button"
        className="nec-pagination-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        title="Previous Page"
        aria-label="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`nec-pagination-btn nec-pagination-num ${p === currentPage ? "active" : ""}`}
          onClick={() => onPageChange(p)}
          aria-current={p === currentPage ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="nec-pagination-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        title="Next Page"
        aria-label="Next Page"
      >
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        className="nec-pagination-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(totalPages)}
        title="Last Page"
        aria-label="Last Page"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}
