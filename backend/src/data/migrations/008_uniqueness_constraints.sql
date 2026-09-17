-- Uniqueness Constraints Migration
-- Run the two pre-check SELECTs below first and paste the results.
-- If either returns rows, stop and do NOT run the ALTERs until duplicates are cleaned.

-- Pre-check 1: duplicate team members
-- SELECT team_id, student_id, COUNT(*) AS cnt FROM team_members GROUP BY team_id, student_id HAVING cnt > 1;

-- Pre-check 2: duplicate OD requests per student+match
-- SELECT student_id, match_id, COUNT(*) AS cnt FROM od_requests WHERE match_id IS NOT NULL GROUP BY student_id, match_id HAVING cnt > 1;

ALTER TABLE team_members
    ADD CONSTRAINT uq_team_members_team_student UNIQUE (team_id, student_id);

ALTER TABLE od_requests
    ADD CONSTRAINT uq_od_requests_student_match UNIQUE (student_id, match_id);

