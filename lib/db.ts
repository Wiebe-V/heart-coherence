import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SessionRecord } from "@/types";

interface CoherenceDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { "by-startedAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<CoherenceDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CoherenceDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable in this environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB<CoherenceDB>("coherence", 1, {
      upgrade(db) {
        const store = db.createObjectStore("sessions", { keyPath: "id" });
        store.createIndex("by-startedAt", "startedAt");
      },
    });
  }
  return dbPromise;
}

export async function saveSession(s: SessionRecord): Promise<void> {
  await (await getDB()).put("sessions", s);
}

/**
 * Write many sessions in one transaction. `put` keys on `id`, so importing a
 * session that already exists overwrites it in place — re-importing the same
 * backup is idempotent and merges rather than duplicates.
 */
export async function bulkPutSessions(sessions: SessionRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("sessions", "readwrite");
  await Promise.all([...sessions.map((s) => tx.store.put(s)), tx.done]);
}

export async function listSessions(): Promise<SessionRecord[]> {
  const all = await (await getDB()).getAllFromIndex("sessions", "by-startedAt");
  return all.reverse(); // newest first
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  return (await getDB()).get("sessions", id);
}

export async function deleteSession(id: string): Promise<void> {
  await (await getDB()).delete("sessions", id);
}
