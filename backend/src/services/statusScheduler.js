import { syncScheduledStatuses } from './scheduledStatusService.js';

let schedulerInterval = null;
let isSyncing = false;

/**
 * Start the background status synchronization scheduler.
 * Runs once immediately upon invocation, then repeats periodically.
 */
export const startStatusScheduler = () => {
    if (schedulerInterval) {
        console.log('[StatusScheduler] Scheduler is already active.');
        return;
    }

    const intervalMs = parseInt(process.env.STATUS_SYNC_INTERVAL_MS, 10) || 15000; // Default 15s

    const runSync = async () => {
        if (isSyncing) return; // Prevent overlapping executions
        isSyncing = true;
        try {
            await syncScheduledStatuses();
        } catch (err) {
            console.error('[StatusScheduler] Background tick failed:', err.message);
        } finally {
            isSyncing = false;
        }
    };

    // Execute immediately on startup to self-heal any downtime
    runSync();

    schedulerInterval = setInterval(runSync, intervalMs);
    console.log(`[StatusScheduler] Started background status runner (Interval: ${intervalMs / 1000}s).`);
};

/**
 * Stop the background scheduler cleanly.
 */
export const stopStatusScheduler = () => {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[StatusScheduler] Scheduler stopped cleanly.');
    }
};

export default {
    startStatusScheduler,
    stopStatusScheduler
};
