import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import "./SearchableSelect.css";

/**
 * Reusable accessible combobox / searchable dropdown component.
 * Supports real-time filtering, keyboard navigation, clear button,
 * and custom rich option rendering (chips, badges, metadata).
 */
export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  getValue = (opt) => (opt && typeof opt === "object" ? (opt.value ?? opt.id ?? opt.name ?? "") : opt),
  getLabel = (opt) => (opt && typeof opt === "object" ? (opt.label ?? opt.name ?? opt.title ?? String(opt)) : String(opt ?? "")),
  getSearchText,
  renderOption,
  renderSelected,
  placeholder = "-- Select --",
  searchPlaceholder = "Type to search...",
  disabled = false,
  required = false,
  clearable = true,
  error = null,
  id,
  name,
  className = "",
  style = {},
  emptyMessage = "No matching options found."
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options list
  const safeOptions = Array.isArray(options) ? options : [];

  // Find currently selected item
  const selectedOption = safeOptions.find((opt) => String(getValue(opt)) === String(value));

  // Compute filtered options
  const filteredOptions = safeOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    if (getSearchText) {
      return String(getSearchText(opt)).toLowerCase().includes(query);
    }
    const label = String(getLabel(opt)).toLowerCase();
    const val = String(getValue(opt)).toLowerCase();
    const dept = opt && typeof opt === "object" ? String(opt.deptCode || opt.dept_code || opt.dept || "").toLowerCase() : "";
    const sport = opt && typeof opt === "object" ? String(opt.sportName || opt.sport || opt.sportId || "").toLowerCase() : "";
    const type = opt && typeof opt === "object" ? String(opt.type || "").toLowerCase() : "";
    return label.includes(query) || val.includes(query) || dept.includes(query) || sport.includes(query) || type.includes(query);
  });

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Find index of selected item in filtered list
      const activeIdx = filteredOptions.findIndex((opt) => String(getValue(opt)) === String(value));
      setHighlightedIndex(activeIdx >= 0 ? activeIdx : 0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 30);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredOptions.length > 0) {
      const highlightedEl = listRef.current.children[highlightedIndex];
      if (highlightedEl && typeof highlightedEl.scrollIntoView === "function") {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const triggerChange = (nextValue, opt) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: nextValue, name: name || selectId },
        currentTarget: { value: nextValue, name: name || selectId },
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      onChange(syntheticEvent, opt);
    }
  };

  const handleSelect = (option) => {
    const nextVal = option !== null ? String(getValue(option)) : "";
    triggerChange(nextVal, option);
    setIsOpen(false);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();
    triggerChange("", null);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`nec-searchable-select ${isOpen ? "is-open" : ""} ${className}`.trim()}
      style={style}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for native HTML form validation if required/named */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          required={required}
        />
      )}

      {/* Main Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        className={`nec-select-trigger ${error ? "has-error" : ""}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && filteredOptions[highlightedIndex]
            ? `${selectId}-opt-${highlightedIndex}`
            : undefined
        }
      >
        <span className="nec-select-value-display">
          {selectedOption ? (
            renderSelected ? (
              renderSelected(selectedOption)
            ) : (
              <span>{getLabel(selectedOption)}</span>
            )
          ) : (
            <span className="nec-select-placeholder">{placeholder}</span>
          )}
        </span>

        <span className="nec-select-controls">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="nec-select-clear-btn"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClear(e);
                }
              }}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <span className="nec-select-arrow" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="nec-select-dropdown">
          {/* Integrated Real-time Search Box */}
          <div className="nec-select-search-box">
            <Search size={14} className="nec-select-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              className="nec-select-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Filter options"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="nec-select-clear-btn"
                onClick={() => setSearchQuery("")}
                title="Clear filter text"
                aria-label="Clear filter text"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="nec-select-options-list"
            tabIndex={-1}
          >
            {filteredOptions.length === 0 ? (
              <li className="nec-select-option-empty" role="presentation">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = getValue(opt);
                const isSelected = String(optVal) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt?.id || opt?.key || `${optVal}-${idx}`}
                    id={`${selectId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`nec-select-option ${isHighlighted ? "is-highlighted" : ""} ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    {renderOption ? (
                      renderOption(opt, { isSelected, isHighlighted, query: searchQuery })
                    ) : (
                      <span>{getLabel(opt)}</span>
                    )}
                    {isSelected && !renderOption && <Check size={14} aria-hidden="true" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
