CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  role TEXT,
  city TEXT NOT NULL,
  module TEXT NOT NULL,
  module_label TEXT NOT NULL,
  issue TEXT NOT NULL,
  urgency TEXT NOT NULL,
  description TEXT NOT NULL,
  page_title TEXT,
  page_url TEXT,
  browser TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  unread INTEGER NOT NULL DEFAULT 1,
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_city ON support_tickets(city);
CREATE INDEX IF NOT EXISTS idx_support_created_at ON support_tickets(created_at DESC);
