/**
 * One-time backfill script: Add `nameLowercase` to all existing Firestore user documents.
 *
 * HOW TO RUN:
 * 1. Make sure you have Node.js installed
 * 2. Install firebase-admin: npm install -g firebase-admin
 * 3. Download your Firebase Service Account Key from:
 *    Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 * 4. Save that file as `serviceAccountKey.json` in the same folder as this script
 * 5. Run: node scripts/backfill-name-lowercase.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfill() {
    console.log('🔍 Fetching all users without nameLowercase...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        console.log('No users found.');
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only update if nameLowercase is missing or mismatched
        if (!data.nameLowercase && data.name) {
            batch.update(docSnap.ref, {
                nameLowercase: data.name.toLowerCase(),
            });
            count++;
            console.log(`  → Queueing update for user: "${data.name}" → "${data.name.toLowerCase()}"`);
        }
    });

    if (count === 0) {
        console.log('✅ All users already have nameLowercase. Nothing to do!');
        return;
    }

    await batch.commit();
    console.log(`\n✅ Successfully backfilled ${count} user(s).`);
}

backfill().catch(console.error);
