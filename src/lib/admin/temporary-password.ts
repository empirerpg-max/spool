// No 0/O/1/l/I: the admin reads this password out to someone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function temporaryPassword(length = 12): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint32Array(length));
    const p = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
    if (/[A-Za-z]/.test(p) && /\d/.test(p)) return p;
  }
}
