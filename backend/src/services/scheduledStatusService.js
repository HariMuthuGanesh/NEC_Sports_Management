import pool from '../config/db.js';

/**
 * Scheduled Status Activation & Lifecycle Service
 * 
 * Single source of truth for time-based status transitions across Matches, Events, and Tournaments.
 * Uses database server time (NOW() / CURRENT_DATE()) to ensure consistency regardless of server timezone.
 */

export const syncScheduledStatuses = async () => {
    const summary = {
        activatedMatches: 0,
        completedMatches: 0,
        closedEvents: 0,
        updatedTournaments: 0,
        timestamp: new Date().toISOString()
    };

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Matches: Transition Scheduled -> Ongoing when start time arrives
        // Target: Scheduled matches where scheduled_time <= NOW() and not past end time, without manual override
        const [activatedMatchesResult] = await connection.execute(`
            UPDATE matches 
            SET status = 'Ongoing',
                status_updated_at = NOW()
            WHERE status = 'Scheduled'
              AND manual_status_override = 0
              AND scheduled_time <= NOW()
              AND (scheduled_end_time IS NULL OR scheduled_end_time > NOW())
        `);
        summary.activatedMatches = activatedMatchesResult.affectedRows || 0;

        // 2. Matches: Transition Ongoing -> Completed when scheduled end time arrives
        // Target: Ongoing matches where end time has elapsed, without manual override
        const [completedMatchesResult] = await connection.execute(`
            UPDATE matches 
            SET status = 'Completed',
                status_updated_at = NOW()
            WHERE status = 'Ongoing'
              AND manual_status_override = 0
              AND (
                  (scheduled_end_time IS NOT NULL AND scheduled_end_time <= NOW())
                  OR (scheduled_time IS NOT NULL AND DATE_ADD(scheduled_time, INTERVAL COALESCE(duration_minutes, 60) MINUTE) <= NOW())
              )
        `);
        summary.completedMatches = completedMatchesResult.affectedRows || 0;

        // 3. Events: Close registrations when registration deadline passes
        // Target: Events where registration_status = 'Open' and reg_deadline <= NOW(), without manual override
        const [closedEventsResult] = await connection.execute(`
            UPDATE events 
            SET registration_status = 'Closed',
                status_updated_at = NOW()
            WHERE registration_status = 'Open'
              AND manual_status_override = 0
              AND reg_deadline IS NOT NULL
              AND reg_deadline <= NOW()
        `);
        summary.closedEvents = closedEventsResult.affectedRows || 0;

        // 4. Tournaments: Upcoming -> Ongoing when start_date arrives
        const [tournamentsOngoingResult] = await connection.execute(`
            UPDATE tournaments 
            SET status = 'Ongoing'
            WHERE status = 'Upcoming'
              AND start_date <= CURRENT_DATE()
        `);
        
        // 5. Tournaments: Ongoing -> Completed when end_date has passed
        const [tournamentsCompletedResult] = await connection.execute(`
            UPDATE tournaments 
            SET status = 'Completed'
            WHERE status = 'Ongoing'
              AND end_date IS NOT NULL
              AND end_date < CURRENT_DATE()
        `);
        summary.updatedTournaments = (tournamentsOngoingResult.affectedRows || 0) + (tournamentsCompletedResult.affectedRows || 0);

        await connection.commit();

        if (summary.activatedMatches > 0 || summary.completedMatches > 0 || summary.closedEvents > 0 || summary.updatedTournaments > 0) {
            console.log(`[StatusScheduler] Status sync applied: ${summary.activatedMatches} matches activated, ${summary.completedMatches} matches completed, ${summary.closedEvents} events closed, ${summary.updatedTournaments} tournaments updated.`);
        }

        return {
            success: true,
            data: summary
        };
    } catch (err) {
        await connection.rollback();
        console.error('[StatusScheduler] Error during scheduled status synchronization:', err);
        throw err;
    } finally {
        connection.release();
    }
};

export default {
    syncScheduledStatuses
};
