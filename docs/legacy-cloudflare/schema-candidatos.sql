PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL CHECK (cargo IN ('admin','administrador','gerente','gestor','financeiro','colaborador','laboratorio')),
  cidade TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
