ALTER TABLE paustik_marketplace.users ADD COLUMN google_subject TEXT;
CREATE UNIQUE INDEX users_google_subject_key ON paustik_marketplace.users(google_subject);
CREATE TABLE paustik_marketplace.email_login_codes (
 id UUID NOT NULL, user_id UUID NOT NULL, token_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ(6) NOT NULL, used_at TIMESTAMPTZ(6),
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT email_login_codes_pkey PRIMARY KEY (id),
 CONSTRAINT email_login_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES paustik_marketplace.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX email_login_codes_token_hash_key ON paustik_marketplace.email_login_codes(token_hash);
CREATE INDEX email_login_codes_user_id_expires_at_idx ON paustik_marketplace.email_login_codes(user_id, expires_at);
