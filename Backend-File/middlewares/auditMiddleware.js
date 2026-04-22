'use strict';

const db = require('../db');

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

const safeJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return null;
  const out = {};
  const keys = Object.keys(body).slice(0, 50);
  for (const key of keys) {
    const lowered = key.toLowerCase();
    if (lowered.includes('password') || lowered.includes('token') || lowered.includes('secret')) {
      out[key] = '[REDACTED]';
      continue;
    }
    const val = body[key];
    if (val === null || val === undefined) continue;
    if (typeof val === 'string') out[key] = val.slice(0, 500);
    else if (typeof val === 'number' || typeof val === 'boolean') out[key] = val;
    else out[key] = '[OMITTED]';
  }
  return out;
};

// Attach after verifyAdmin so req.user is available
const auditAdmin = ({ actionPrefix = 'admin' } = {}) => {
  return (req, res, next) => {
    const method = String(req.method || '').toUpperCase();
    const shouldAudit = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (!shouldAudit) return next();

    const startedAt = Date.now();
    res.on('finish', async () => {
      try {
        const adminId = req.user?.id || null;
        const adminRole = req.user?.role || null;
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const ua = req.headers['user-agent'] || null;
        const statusCode = res.statusCode || null;

        const context = safeJson({
          params: req.params || null,
          query: req.query || null,
          body: sanitizeBody(req.body),
          ms: Date.now() - startedAt,
        });

        await dbRun(
          `INSERT INTO admin_audit_logs
           (admin_id, admin_role, action, method, path, status_code, ip_address, user_agent, context)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            adminId,
            adminRole,
            `${actionPrefix}:${method}`,
            method,
            req.originalUrl || req.path || '',
            statusCode,
            ip ? String(ip).slice(0, 200) : null,
            ua ? String(ua).slice(0, 500) : null,
            context,
          ]
        );
      } catch (err) {
        // Don't block the request lifecycle for audit failures
        if (process.env.DEBUG === 'true') {
          console.error('[auditAdmin] failed:', err.message);
        }
      }
    });

    next();
  };
};

module.exports = { auditAdmin };

