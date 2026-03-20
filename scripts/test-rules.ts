/**
 * Firestore Security Rules Unit Tests
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-rules.ts
 *
 * Prerequisites:
 *   npm install -D @firebase/rules-unit-testing firebase-admin
 *
 * Requires a local Firestore emulator:
 *   firebase emulators:start --only firestore
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

const PROJECT_ID = "chatapp-test-rules";

let testEnv: RulesTestEnvironment;

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /chatRequests/{requestId} {
      allow read: if request.auth != null
        && (resource == null || resource.data.from == request.auth.uid || resource.data.to == request.auth.uid);
      allow create: if request.auth != null
        && request.resource.data.from == request.auth.uid
        && request.resource.data.keys().hasAll(['from', 'to', 'status', 'createdAt']);
      allow update, delete: if request.auth != null
        && (resource.data.from == request.auth.uid || resource.data.to == request.auth.uid);
    }
    match /messages/{messageId} {
      function isRoomParticipant(roomId) {
        return roomId.split('_').hasAny([request.auth.uid]) ||
          (exists(/databases/$(database)/documents/groups/$(roomId)) &&
           get(/databases/$(database)/documents/groups/$(roomId)).data.members.hasAny([request.auth.uid]));
      }
      allow read: if request.auth != null && isRoomParticipant(resource.data.roomId);
      allow create: if request.auth != null
        && isRoomParticipant(request.resource.data.roomId)
        && request.resource.data.author == request.auth.uid
        && request.resource.data.keys().hasAll(['roomId', 'author', 'text', 'createdAt'])
        && request.resource.data.text.size() < 5000;
      allow update: if request.auth != null && isRoomParticipant(resource.data.roomId);
      allow delete: if request.auth != null && isRoomParticipant(resource.data.roomId);
    }
    match /groups/{groupId} {
      allow read: if request.auth != null
        && resource.data.members.hasAny([request.auth.uid]);
      allow create: if request.auth != null
        && request.resource.data.members.hasAny([request.auth.uid]);
      allow update: if request.auth != null
        && (resource.data.members.hasAny([request.auth.uid])
        || request.resource.data.members.hasAny([request.auth.uid]));
    }
  }
}`,
    },
  });
}

async function teardown() {
  await testEnv.cleanup();
}

async function testUnauthenticatedRead() {
  console.log("TEST: Unauthenticated user cannot read any collection");
  const unauthed = testEnv.unauthenticatedContext();
  await assertFails(getDoc(doc(unauthed.firestore(), "users", "someuser")));
  await assertFails(getDoc(doc(unauthed.firestore(), "groups", "somegroup")));
  await assertFails(getDoc(doc(unauthed.firestore(), "messages", "somemsg")));
  console.log("  PASSED");
}

async function testGroupReadRestricted() {
  console.log("TEST: User cannot read a group they are not a member of");

  // Seed group owned by userA
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "groups", "group1"), {
      name: "Test Group",
      members: ["userA"],
      createdBy: "userA",
    });
  });

  // userB tries to read group1
  const userB = testEnv.authenticatedContext("userB");
  await assertFails(getDoc(doc(userB.firestore(), "groups", "group1")));

  // userA can read group1
  const userA = testEnv.authenticatedContext("userA");
  await assertSucceeds(getDoc(doc(userA.firestore(), "groups", "group1")));

  console.log("  PASSED");
}

async function testMessageAuthorMismatch() {
  console.log("TEST: User cannot send a message as another user");

  // Seed a group with both users
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "groups", "group2"), {
      name: "Group 2",
      members: ["userA", "userB"],
      createdBy: "userA",
    });
  });

  // userA creates message in group2 as userA — allowed
  const userA = testEnv.authenticatedContext("userA");
  await assertSucceeds(
    addDoc(collection(userA.firestore(), "messages"), {
      roomId: "group2",
      author: "userA",
      text: "Hello",
      createdAt: serverTimestamp(),
    })
  );

  // userA creates message in group2 as userB — denied
  await assertFails(
    addDoc(collection(userA.firestore(), "messages"), {
      roomId: "group2",
      author: "userB",
      text: "Sneaky",
      createdAt: serverTimestamp(),
    })
  );

  console.log("  PASSED");
}

async function testMessageTooLong() {
  console.log("TEST: User cannot create a message longer than 5000 characters");

  const userA = testEnv.authenticatedContext("userA");
  const longText = "a".repeat(5001);

  await assertFails(
    addDoc(collection(userA.firestore(), "messages"), {
      roomId: "userA_userB",
      author: "userA",
      text: longText,
      createdAt: serverTimestamp(),
    })
  );

  console.log("  PASSED");
}

async function testChatRequestRead() {
  console.log("TEST: User can read their own chat requests");

  // Seed a request from userA to userB
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "chatRequests", "req1"), {
      from: "userA",
      to: "userB",
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });

  const userA = testEnv.authenticatedContext("userA");
  await assertSucceeds(getDoc(doc(userA.firestore(), "chatRequests", "req1")));

  const userB = testEnv.authenticatedContext("userB");
  await assertSucceeds(getDoc(doc(userB.firestore(), "chatRequests", "req1")));

  // userC should NOT be able to read it
  const userC = testEnv.authenticatedContext("userC");
  await assertFails(getDoc(doc(userC.firestore(), "chatRequests", "req1")));

  console.log("  PASSED");
}

async function main() {
  await setup();
  try {
    await testUnauthenticatedRead();
    await testGroupReadRestricted();
    await testMessageAuthorMismatch();
    await testMessageTooLong();
    await testChatRequestRead();
    console.log("\nAll tests passed!");
  } finally {
    await teardown();
  }
}

main().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
