export function getDb(env) {
  const db = env?.DB || env?.["lag-controller-db"];
  if (!db || typeof db.prepare !== "function") {
    const error = new Error("Cloudflare D1 binding DB não está disponível.");
    error.code = "DB_BINDING_MISSING";
    throw error;
  }
  return db;
}

export function getCandidateFiles(env) {
  return env?.CANDIDATE_FILES || env?.["lag-candidate-files"] || null;
}

export function getPartnerFiles(env) {
  return env?.PARTNER_FILES || env?.["lag-partner-files"] || null;
}

export function safeErrorCode(error, fallback = "INTERNAL_ERROR") {
  const code = String(error?.code || "").trim();
  if (/^[A-Z0-9_:-]{2,80}$/.test(code)) return code;

  const message = String(error?.message || "");
  if (/no such table/i.test(message)) return "DB_SCHEMA_MISSING";
  if (/no such column/i.test(message)) return "DB_COLUMN_MISSING";
  if (/constraint/i.test(message)) return "DB_CONSTRAINT_ERROR";
  if (/D1_ERROR/i.test(message)) return "D1_ERROR";
  return fallback;
}
