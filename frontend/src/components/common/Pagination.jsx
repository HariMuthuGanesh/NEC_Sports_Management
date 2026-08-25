import React from "react";
import "./Table.css"; // Reuse existing table pagination styles

export default function Pagination({ currentPage, totalPages, onPageChange, style = {}, className = "" }) {
  if (totalPages <= 1) return null;

  return (
    <div className={`nec-table-pagination ${className}`} style={style}>
      <button
        className="nec-page-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      <span className="nec-page-info">
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="nec-page-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
}
