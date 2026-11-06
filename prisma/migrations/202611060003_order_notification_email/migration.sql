ALTER TABLE paustik_marketplace.notifications
 ADD COLUMN email_pending BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN email_sent_at TIMESTAMPTZ(6),
 ADD COLUMN email_attempt_at TIMESTAMPTZ(6),
 ADD COLUMN email_attempts INTEGER NOT NULL DEFAULT 0;
-- Do not send retrospective mail for existing notification history.
ALTER TABLE paustik_marketplace.notifications ALTER COLUMN email_pending SET DEFAULT true;
