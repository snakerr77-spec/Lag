PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS medical_candidates (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'public-form',
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  crm TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  availability TEXT,
  payment TEXT,
  documents TEXT,
  experience TEXT,
  notes TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','analise','entrevista','aprovado','recusado')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resume_key TEXT,
  resume_name TEXT,
  resume_type TEXT,
  resume_size INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON medical_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_city ON medical_candidates(city);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON medical_candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON medical_candidates(email);

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

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  contact TEXT,
  service TEXT,
  sent INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  paid REAL NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  contract_file_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  partner_id TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partner_files (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  uploaded_by TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  sheet_names TEXT,
  FOREIGN KEY (folder_id) REFERENCES partner_folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partner_procedures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  procedure_group TEXT,
  partner_id TEXT NOT NULL,
  city TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  source TEXT,
  source_file_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  FOREIGN KEY (source_file_id) REFERENCES partner_files(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_partners_city ON partners(city);
CREATE INDEX IF NOT EXISTS idx_partner_folders_city ON partner_folders(city);
CREATE INDEX IF NOT EXISTS idx_partner_files_folder ON partner_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_partner_procedures_partner ON partner_procedures(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_procedures_city ON partner_procedures(city);
