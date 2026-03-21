const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/firebase-messaging-sw.js');
if (!fs.existsSync(swPath)) {
  console.log('Service worker template not found, skipping injection.');
  process.exit(0);
}

let content = fs.readFileSync(swPath, 'utf8');

const replacements = {
  REPLACE_WITH_NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  REPLACE_WITH_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  REPLACE_WITH_NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  REPLACE_WITH_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  REPLACE_WITH_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  REPLACE_WITH_NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

Object.entries(replacements).forEach(([key, value]) => {
  if (value) content = content.replaceAll(key, value);
});

fs.writeFileSync(swPath, content);
console.log('Service worker env vars injected.');
