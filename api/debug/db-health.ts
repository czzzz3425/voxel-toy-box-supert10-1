import { getDb, getDbDiagnostics } from '../lib/db.js';

export default async function handler(_req: any, res: any) {
  try {
    const diagnostics = getDbDiagnostics();
    const db = getDb();
    const status = await db.healthCheck();
    return res.status(status.ok ? 200 : 503).json({
      ...status,
      diagnostics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database health error.';
    return res.status(500).json({
      ok: false,
      mode: 'noop',
      message,
      diagnostics: getDbDiagnostics(),
    });
  }
}
