"use client";

import { useEffect } from "react";
import { rtdb } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from "firebase/database";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * usePresence
 *
 * Tracks user online/offline status using Firebase Realtime Database.
 * RTDB is used instead of Firestore because:
 * - RTDB charges by bandwidth (not per-write), making rapid heartbeats virtually free.
 * - RTDB has a native `onDisconnect()` hook that runs on the server when a socket drops.
 *   This ensures users are marked Offline even if they force-close their browser tab.
 *
 * Flow:
 * 1. When hook mounts, listen to RTDB's `.info/connected` node.
 * 2. When connected: write { status: "Online" } to RTDB presence node.
 * 3. Register onDisconnect handler to auto-set Offline in RTDB AND Firestore when socket drops.
 */
export function usePresence(uid: string | undefined) {
    useEffect(() => {
        if (!uid) return;

        const connectedRef = ref(rtdb, ".info/connected");
        const presenceRef = ref(rtdb, `presence/${uid}`);
        const firestoreUserRef = doc(db, "users", uid);

        const unsubscribe = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We are connected. Set up the disconnect handler FIRST (race condition prevention).
                onDisconnect(presenceRef).set({
                    status: "Offline",
                    lastSeen: rtdbTimestamp(),
                }).then(() => {
                    // Now write the Online status to RTDB
                    set(presenceRef, {
                        status: "Online",
                        lastSeen: rtdbTimestamp(),
                    });

                    // Sync status to Firestore so the UI can read it
                    updateDoc(firestoreUserRef, {
                        status: "Online",
                        lastSeen: serverTimestamp(),
                    }).catch(() => { }); // Ignore if user doc doesn't exist yet
                });
            } else {
                // We disconnected. onDisconnect will auto-handle RTDB.
                // Mirror the offline state to Firestore immediately.
                updateDoc(firestoreUserRef, {
                    status: "Offline",
                    lastSeen: serverTimestamp(),
                }).catch(() => { });
            }
        });

        // Backup: Try to catch tab closure for Firestore specifically
        const handleBeforeUnload = () => {
            updateDoc(firestoreUserRef, {
                status: "Offline",
                lastSeen: serverTimestamp(),
            }).catch(() => { });
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        // Cleanup: remove the RTDB listener when user signs out or component unmounts
        return () => {
            unsubscribe();
            window.removeEventListener("beforeunload", handleBeforeUnload);

            // Explicitly set offline when navigating away/logging out
            set(presenceRef, {
                status: "Offline",
                lastSeen: rtdbTimestamp(),
            });
            updateDoc(firestoreUserRef, {
                status: "Offline",
                lastSeen: serverTimestamp(),
            }).catch(() => { });
        };
    }, [uid]);
}
