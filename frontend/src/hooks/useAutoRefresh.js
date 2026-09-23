import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Custom hook for resilient, real-time background data synchronization.
 * 
 * @param {Function} fetchFn - Async data fetching function.
 * @param {Object} options - Configuration options.
 * @param {number} [options.interval=20000] - Polling interval in milliseconds (default 20s).
 * @param {boolean} [options.enabled=true] - Whether automated polling is active.
 * @param {Array} [options.deps=[]] - Additional dependency list to trigger re-fetch.
 */
export function useAutoRefresh(fetchFn, { interval = 20000, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Keep fetchFn reference up to date
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const executeFetch = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current || !mountedRef.current) return;
    isFetchingRef.current = true;

    if (!isBackground) {
      setLoading(true);
    }

    try {
      const result = await fetchFnRef.current();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        console.warn("[useAutoRefresh] Background sync notice:", err.message);
        // Only set error if we don't already have valid data, preserving UI stability
        setError(prev => prev || err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Initial immediate fetch
    executeFetch(false);

    if (!enabled) return;

    // Polling timer
    const timerId = setInterval(() => {
      // Only poll when page is active/visible
      if (typeof document !== "undefined" && !document.hidden) {
        executeFetch(true);
      }
    }, interval);

    // Immediate re-fetch on tab focus / visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        executeFetch(true);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleVisibilityChange);
    }

    return () => {
      mountedRef.current = false;
      clearInterval(timerId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleVisibilityChange);
      }
    };
  }, [executeFetch, interval, enabled, ...deps]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: () => executeFetch(false)
  };
}

export default useAutoRefresh;
