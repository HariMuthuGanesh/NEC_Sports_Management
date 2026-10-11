-- Retire the separate college-team-only login. Full admins retain college team access.
UPDATE users SET is_active=0, token_version=token_version+1 WHERE role='Admin' AND admin_scope='CollegeTeamOnly' AND is_active=1;
