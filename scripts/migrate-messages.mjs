/**
 * Migration script: rename message fields to match new schema
 *   message → text
 *   timestamp → createdAt
 *
 * Place serviceAccountKey.json in the scripts/ folder, then run:
 *   node scripts/migrate-messages.mjs
 */

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = join(__dirname, "serviceAccountKey.json");

let key;
try {
  key = JSON.parse(await readFile(keyPath, "utf-8"));
} catch {
  console.error(`Could not read ${keyPath}`);
  console.error("Download your service account key from:");
  console.error("Firebase Console → Project Settings → Service Accounts → Generate New Private Key");
  console.error("Save it as scripts/serviceAccountKey.json");
  process.exit(1);
}

initializeApp({ credential: cert(key) });
const db = getFirestore();

async function migrate() {
  const snap = await db.collection("messages").get();
  console.log(`Found ${snap.size} messages to check.`);

  let batch = db.batch();
  let count = 0;
  let migrated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const updates = {};

    if ("message" in data && !("text" in data)) {
      updates.text = data.message;
      updates.message = FieldValue.delete();
    }

    if ("timestamp" in data && !("createdAt" in data)) {
      updates.createdAt = data.timestamp;
      updates.timestamp = FieldValue.delete();
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
      migrated++;
    }

    if (count >= 400) {
      await batch.commit();
      console.log(`Committed batch of ${count}.`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${count}.`);
  }

  console.log(`Done. Migrated ${migrated} documents.`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
