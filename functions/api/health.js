export async function onRequestGet(context) {
  const result = {
    ok: true,
    d1: false,
    candidateFiles: false,
    partnerFiles: false,
    timestamp: new Date().toISOString()
  };

  try {
    if (context.env.DB) {
      await context.env.DB.prepare("SELECT 1 AS ok").first();
      result.d1 = true;
    }
  } catch (error) {
    result.d1Error = String(error?.message || error);
  }

  result.candidateFiles = Boolean(context.env.CANDIDATE_FILES);
  result.partnerFiles = Boolean(context.env.PARTNER_FILES);

  result.ok =
    result.d1 &&
    result.candidateFiles &&
    result.partnerFiles;

  return Response.json(result, {
    status: result.ok ? 200 : 500,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
// force deploy 2026-08-07
