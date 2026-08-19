/**
 * One-off migration for databases created before sections carried a DP year.
 *
 *   node scripts/backfill-dp-year.mjs
 *
 * - Every section without a dpYear becomes DP1 (edit them afterwards in the
 *   admin UI; anything already labelled is left alone).
 * - Every experience without a dpYear inherits it from its section, so the
 *   Discovery DP-year filter works on existing posts.
 *
 * Safe to run more than once: it only touches documents that are missing the
 * field.
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const env = readFileSync(".env.local", "utf8");
const uri = (env.match(/^MONGODB_URI=(.*)$/m) ?? [])[1]?.trim();
if (!uri) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const client = await new MongoClient(uri).connect();
const db = client.db();

const sections = await db
  .collection("sections")
  .updateMany({ dpYear: { $exists: false } }, { $set: { dpYear: "DP1" } });
console.log(`sections labelled DP1: ${sections.modifiedCount}`);

let stamped = 0;
for (const section of await db.collection("sections").find().toArray()) {
  const res = await db.collection("experiences").updateMany(
    { section: section._id, $or: [{ dpYear: { $exists: false } }, { dpYear: null }] },
    { $set: { dpYear: section.dpYear ?? "DP1" } },
  );
  stamped += res.modifiedCount;
}
console.log(`experiences stamped with a DP year: ${stamped}`);

const orphans = await db
  .collection("experiences")
  .countDocuments({ $or: [{ dpYear: { $exists: false } }, { dpYear: null }] });
if (orphans > 0) {
  console.log(
    `${orphans} experience(s) have no section, so they stay unlabelled — assign the student a section to fix.`,
  );
}

await client.close();
console.log("done");
