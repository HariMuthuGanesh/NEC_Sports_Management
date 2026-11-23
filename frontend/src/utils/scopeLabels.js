/**
 * Centralized Competition Scope Mapping & Display Utilities
 * 
 * Standardizes:
 * - Intramural -> "Intra College" (internal to National Engineering College)
 * - Inter-Collegiate -> "Inter College" (between institutions)
 * Standard Filter Tabs: All | Intra College | Inter College
 * 
 * Note: Database enums ('Intramural', 'Inter-Collegiate') are preserved for
 * schema safety and backwards compatibility.
 */

export const DB_SCOPES = {
  INTRAMURAL: "Intramural",
  INTER_COLLEGIATE: "Inter-Collegiate"
};

export const DISPLAY_SCOPES = {
  ALL: "All",
  INTRA_COLLEGE: "Intra College",
  INTER_COLLEGE: "Inter College"
};

export const SCOPE_FILTER_OPTIONS = [
  { id: "ALL", value: "ALL", label: "All" },
  { id: "Intramural", value: "Intramural", label: "Intra College" },
  { id: "Inter-Collegiate", value: "Inter-Collegiate", label: "Inter College" }
];

/**
 * Returns user-facing label: "Intra College" or "Inter College"
 */
export function formatScope(scope) {
  if (!scope) return DISPLAY_SCOPES.INTRA_COLLEGE;
  const s = String(scope).trim().toLowerCase();
  if (s === "inter-collegiate" || s === "inter college" || s === "inter-college" || s === "inter") {
    return DISPLAY_SCOPES.INTER_COLLEGE;
  }
  if (s === "intramural" || s === "intra college" || s === "intra-college" || s === "intra") {
    return DISPLAY_SCOPES.INTRA_COLLEGE;
  }
  return scope;
}

/**
 * Normalizes input to DB enum value: 'Intramural' or 'Inter-Collegiate'
 */
export function toDbScope(scope) {
  if (!scope || scope === "ALL") return null;
  const s = String(scope).trim().toLowerCase();
  if (s.includes("inter")) return DB_SCOPES.INTER_COLLEGIATE;
  return DB_SCOPES.INTRAMURAL;
}

/**
 * Checks whether an item matches the chosen filter scope
 */
export function matchesScope(itemScope, filterScope) {
  if (!filterScope || filterScope === "ALL" || filterScope === "All") return true;
  const formattedItem = formatScope(itemScope);
  const formattedFilter = formatScope(filterScope);
  return formattedItem === formattedFilter;
}

/**
 * Returns badge metadata for rendering
 */
export function getScopeBadge(scope) {
  const isInter = formatScope(scope) === DISPLAY_SCOPES.INTER_COLLEGE;
  return {
    label: isInter ? DISPLAY_SCOPES.INTER_COLLEGE : DISPLAY_SCOPES.INTRA_COLLEGE,
    isInter,
    icon: isInter ? "🌐" : "🏛️",
    badgeClass: isInter ? "nec-badge-inter" : "nec-badge-intra"
  };
}
