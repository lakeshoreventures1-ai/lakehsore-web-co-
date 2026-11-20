import crypto from "crypto";

/**
 * Protects admin endpoints with a shared secret: send
 * `Authorization: Bearer <ADMIN_TOKEN>`. If ADMIN_TOKEN isn't set, admin
 * endpoints are disabled entirely rather than left open.
 */
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: "ADMIN_TOKEN is not configured on the server." });
  }
  const given = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
