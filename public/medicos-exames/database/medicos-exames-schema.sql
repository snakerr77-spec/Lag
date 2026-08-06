-- Banco base para transformar o painel de Médicos e Exames em sistema real.
-- Use em PostgreSQL, MySQL ou SQLite ajustando tipos conforme o servidor escolhido.

CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  cargo TEXT NOT NULL CHECK (cargo IN ('admin', 'medico', 'colaborador')),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  especialidade TEXT NOT NULL,
  crm TEXT,
  unidade TEXT,
  idade_atendida TEXT,
  valor_consulta TEXT,
  status TEXT DEFAULT 'Atendendo',
  observacao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medico_horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medico_id INTEGER NOT NULL,
  dia_semana TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  sala TEXT,
  tipo_atendimento TEXT,
  vagas TEXT,
  ativo INTEGER DEFAULT 1,
  FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE
);

CREATE TABLE exames (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor TEXT,
  precisa_jejum INTEGER DEFAULT 0,
  jejum_horas TEXT,
  preparo TEXT,
  prazo_resultado TEXT,
  observacao TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
