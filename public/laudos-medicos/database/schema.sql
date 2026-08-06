-- LAG Controller — D1 + R2 para laudos, imagens e portal do paciente.
-- Execute em um banco D1 novo. PDFs e imagens permanecem em bucket R2 PRIVADO.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','gestor','medico','financeiro','laboratorio','colaborador')),
  city TEXT NOT NULL CHECK (city IN ('Cerquilho','Tatuí','Embu das Artes','Itapeva')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_report_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'fa-stethoscope',
  city TEXT NOT NULL CHECK (city IN ('Cerquilho','Tatuí','Embu das Artes','Itapeva')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city, name),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS medical_report_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Cerquilho','Tatuí','Embu das Artes','Itapeva')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES medical_report_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS medical_reports (
  id TEXT PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_cpf_last4 TEXT NOT NULL,
  -- HMAC-SHA256 de CPF sem pontuação + '|' + data de nascimento.
  -- O segredo do HMAC fica apenas em PATIENT_LOOKUP_SECRET no Worker.
  patient_lookup_hash TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  category_id TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  doctor_user_id TEXT,
  city TEXT NOT NULL CHECK (city IN ('Cerquilho','Tatuí','Embu das Artes','Itapeva')),
  folder_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','revisao','finalizado')),
  patient_visible INTEGER NOT NULL DEFAULT 0 CHECK (patient_visible IN (0,1)),
  notes TEXT,
  file_name TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  r2_object_key TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES medical_report_categories(id),
  FOREIGN KEY (folder_id) REFERENCES medical_report_folders(id),
  FOREIGN KEY (doctor_user_id) REFERENCES users(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS medical_report_images (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  r2_object_key TEXT NOT NULL UNIQUE,
  patient_visible INTEGER NOT NULL DEFAULT 1 CHECK (patient_visible IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES medical_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patient_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  patient_lookup_hash TEXT NOT NULL,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS patient_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_city ON medical_report_categories(city);
CREATE INDEX IF NOT EXISTS idx_folders_city_category ON medical_report_folders(city, category_id);
CREATE INDEX IF NOT EXISTS idx_reports_patient_name ON medical_reports(patient_name);
CREATE INDEX IF NOT EXISTS idx_reports_patient_lookup ON medical_reports(patient_lookup_hash, patient_visible, status);
CREATE INDEX IF NOT EXISTS idx_reports_city_category ON medical_reports(city, category_id);
CREATE INDEX IF NOT EXISTS idx_reports_folder ON medical_reports(folder_id);
CREATE INDEX IF NOT EXISTS idx_reports_exam_date ON medical_reports(exam_date);
CREATE INDEX IF NOT EXISTS idx_report_images_report ON medical_report_images(report_id, patient_visible);
CREATE INDEX IF NOT EXISTS idx_patient_sessions_token ON patient_sessions(token_hash, expires_at, revoked_at);
