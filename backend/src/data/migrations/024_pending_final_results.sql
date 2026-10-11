-- Scheduler-completed matches have never been explicitly finalized.
-- Retain scores and participants and restore their final-result workflow.
UPDATE matches SET status = 'Ongoing' WHERE status = 'Completed' AND manual_status_override = 0 AND winner_team_id IS NULL;
