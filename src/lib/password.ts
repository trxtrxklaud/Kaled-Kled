import bcrypt from 'bcryptjs';

// ═══════════════════════════════════════════════════════════════════
// Password hashing — real bcrypt, like production apps.
//
// Parent accounts are created in-app (phone + password) rather than as
// Firebase Auth users, so their passwords MUST be hashed at rest. We
// use bcrypt (cost 10). A legacy-plaintext fallback keeps any accounts
// created before this upgrade working, and they are transparently
// re-hashed on next successful login / password change.
// ═══════════════════════════════════════════════════════════════════

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

/** True when the stored value is already a bcrypt hash. */
export function isHashed(value: string | undefined | null): boolean {
  return !!value && BCRYPT_RE.test(value);
}

/** Hash a plaintext password (synchronous; fine for UI handlers). */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

/** Verify a plaintext password against a stored hash (or legacy plaintext). */
export function verifyPassword(plain: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  if (isHashed(stored)) {
    try { return bcrypt.compareSync(plain, stored); } catch { return false; }
  }
  // Legacy plaintext value created before hashing was introduced.
  return plain === stored;
}
