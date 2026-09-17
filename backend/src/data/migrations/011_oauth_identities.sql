ALTER TABLE users 
ADD COLUMN oauth_provider VARCHAR(32) NULL, 
ADD COLUMN oauth_subject VARCHAR(255) NULL, 
ADD UNIQUE KEY uq_users_oauth (oauth_provider, oauth_subject);
