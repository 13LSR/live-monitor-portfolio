CREATE TABLE admin_login_attempts (
  client_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_admin_login_attempts_expiry ON admin_login_attempts(expires_at);
