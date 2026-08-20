/**
 * Prints the MAINTAINER_KEYS digest for an email address.
 *
 *   node scripts/maintainer-hash.mjs you@gmail.com
 *
 * It reads AUTH_SECRET from .env.local (or the environment) for you, so there
 * is nothing to paste. Put the printed hex string into MAINTAINER_KEYS. The
 * email itself is never stored anywhere.
 */
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/maintainer-hash.mjs you@example.com");
  process.exit(1);
}

// Prefer an already-set env var; otherwise pull AUTH_SECRET out of .env.local.
let secret = process.env.AUTH_SECRET;
if (!secret) {
  try {
    const env = readFileSync(".env.local", "utf8");
    secret = (env.match(/^AUTH_SECRET=(.*)$/m) ?? [])[1]?.trim();
  } catch {
    // no .env.local — fall through to the error below
  }
}
if (!secret) {
  console.error("Could not find AUTH_SECRET (checked the environment and .env.local).");
  process.exit(1);
}

const digest = createHmac("sha256", secret)
  .update(email.trim().toLowerCase())
  .digest("hex");

console.log("\nAdd this to MAINTAINER_KEYS in .env.local (and your host):\n");
console.log(digest + "\n");
